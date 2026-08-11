import { stableStringify } from './sync-core';

/**
 * Fare re-derives a "repair" write from every clean cloud snapshot, so a repair
 * the server refuses used to be re-issued on the very next snapshot — rejected,
 * rolled back, re-derived, forever. This guard makes an identical repair
 * non-repeatable once it has been rejected, and rate-limits everything else
 * behind exponential backoff with a ceiling.
 */

export type RepairOutcome = 'permanent' | 'transient';

export interface RepairSchedulerOptions {
  baseDelayMs?: number;
  ceilingMs?: number;
  maxAttempts?: number;
}

interface RepairRecord {
  attempts: number;
  nextAttemptAt: number;
  /** The server refused this exact write; retrying can only be refused again. */
  rejected: boolean;
  inFlight: boolean;
}

export const DEFAULT_REPAIR_BASE_DELAY_MS = 2_000;
export const DEFAULT_REPAIR_CEILING_MS = 300_000;
export const DEFAULT_REPAIR_MAX_ATTEMPTS = 6;

/** Identifies a repair by exactly what it would write, order-independently. */
export function repairSignature(writes: Array<{ path: string; data: unknown }>): string {
  return stableStringify(
    writes
      .map((write) => ({ path: write.path, data: stableStringify(write.data) }))
      .sort((left, right) => (left.path === right.path
        ? left.data.localeCompare(right.data)
        : left.path.localeCompare(right.path))),
  );
}

/**
 * A rule rejection or a malformed document never succeeds on retry; anything
 * else (a dropped connection, a backend blip) may.
 */
export function classifyRepairFailure(error: unknown): RepairOutcome {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
  return code.includes('permission-denied') || code.includes('invalid-argument')
    ? 'permanent'
    : 'transient';
}

export class RepairScheduler {
  private readonly baseDelayMs: number;
  private readonly ceilingMs: number;
  private readonly maxAttempts: number;
  private readonly records = new Map<string, RepairRecord>();

  constructor(options: RepairSchedulerOptions = {}) {
    this.baseDelayMs = options.baseDelayMs ?? DEFAULT_REPAIR_BASE_DELAY_MS;
    this.ceilingMs = options.ceilingMs ?? DEFAULT_REPAIR_CEILING_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_REPAIR_MAX_ATTEMPTS;
  }

  private record(signature: string): RepairRecord {
    return this.records.get(signature)
      ?? { attempts: 0, nextAttemptAt: 0, rejected: false, inFlight: false };
  }

  private exhausted(record: RepairRecord): boolean {
    return record.rejected || record.attempts >= this.maxAttempts;
  }

  shouldAttempt(signature: string, now: number): boolean {
    const record = this.records.get(signature);
    if (!record) return true;
    if (record.inFlight || this.exhausted(record)) return false;
    return now >= record.nextAttemptAt;
  }

  markInFlight(signature: string): void {
    this.records.set(signature, { ...this.record(signature), inFlight: true });
  }

  recordSuccess(signature: string): void {
    this.records.delete(signature);
  }

  recordFailure(signature: string, outcome: RepairOutcome, now: number): void {
    const record = this.record(signature);
    const attempts = record.attempts + 1;
    const delay = Math.min(this.baseDelayMs * 2 ** (attempts - 1), this.ceilingMs);
    this.records.set(signature, {
      attempts,
      nextAttemptAt: now + delay,
      rejected: record.rejected || outcome === 'permanent',
      inFlight: false,
    });
  }

  /** Milliseconds until this repair may run again, or null when it never may. */
  nextAttemptDelay(signature: string, now: number): number | null {
    const record = this.records.get(signature);
    if (!record) return 0;
    if (this.exhausted(record)) return null;
    return Math.max(0, record.nextAttemptAt - now);
  }

  /** True once some repair has been given up on, so status can say so. */
  hasAbandonedRepairs(): boolean {
    for (const record of this.records.values()) {
      if (this.exhausted(record)) return true;
    }
    return false;
  }

  /** Reconnecting is new information for transient failures only. */
  clearTransientBackoff(): void {
    for (const [signature, record] of [...this.records]) {
      if (!record.rejected && !record.inFlight) this.records.delete(signature);
    }
  }

  reset(): void {
    this.records.clear();
  }
}
