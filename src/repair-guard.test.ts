import { describe, expect, it } from 'vitest';
import {
  classifyRepairFailure,
  RepairScheduler,
  repairSignature,
} from './repair-guard';

const REJECTION = { code: 'permission-denied', message: 'Missing or insufficient permissions.' };
const NETWORK_FAILURE = { code: 'unavailable', message: 'The backend is unreachable.' };

function repair(updatedAt: string) {
  return [{
    path: 'fare_users/owner/entries/entry-1',
    data: { id: 'entry-1', updatedAt },
  }];
}

describe('repair identity', () => {
  it('treats the same writes in any order as one repair, and different data as another', () => {
    const first = { path: 'fare_users/owner/foods/a', data: { id: 'a', updatedAt: '2026-07-01T00:00:00.000Z' } };
    const second = { path: 'fare_users/owner/foods/b', data: { id: 'b', updatedAt: '2026-07-01T00:00:00.000Z' } };
    expect(repairSignature([first, second])).toBe(repairSignature([second, first]));
    expect(repairSignature(repair('2026-07-01T00:00:00.000Z')))
      .not.toBe(repairSignature(repair('2026-07-02T00:00:00.000Z')));
  });

  it('classifies rule rejections as permanent and connectivity failures as transient', () => {
    expect(classifyRepairFailure(REJECTION)).toBe('permanent');
    expect(classifyRepairFailure({ code: 'invalid-argument' })).toBe('permanent');
    expect(classifyRepairFailure(NETWORK_FAILURE)).toBe('transient');
    expect(classifyRepairFailure(new Error('boom'))).toBe('transient');
  });
});

describe('a rejected repair does not loop', () => {
  it('never re-issues a repair the ruleset refused, however many snapshots arrive', () => {
    const scheduler = new RepairScheduler();
    const signature = repairSignature(repair('2026-07-01T00:00:00.000Z'));
    let attempts = 0;
    let now = 0;

    // Every clean snapshot re-derives the identical repair. Before the fix this
    // wrote to Firestore each time; a tombstone divergence never resolves, so
    // the sequence had no end.
    for (let snapshot = 0; snapshot < 500; snapshot += 1) {
      now += 60_000;
      if (scheduler.shouldAttempt(signature, now)) {
        attempts += 1;
        scheduler.markInFlight(signature);
        scheduler.recordFailure(signature, classifyRepairFailure(REJECTION), now);
      }
    }

    expect(attempts).toBe(1);
    expect(scheduler.nextAttemptDelay(signature, now)).toBeNull();
    expect(scheduler.hasAbandonedRepairs()).toBe(true);
  });

  it('keeps a refused repair refused across a reconnect', () => {
    const scheduler = new RepairScheduler();
    const signature = repairSignature(repair('2026-07-01T00:00:00.000Z'));
    scheduler.markInFlight(signature);
    scheduler.recordFailure(signature, 'permanent', 0);

    scheduler.clearTransientBackoff();

    expect(scheduler.shouldAttempt(signature, 10_000_000)).toBe(false);
  });

  it('does not re-enter a repair that is still in flight', () => {
    const scheduler = new RepairScheduler();
    const signature = repairSignature(repair('2026-07-01T00:00:00.000Z'));
    scheduler.markInFlight(signature);
    expect(scheduler.shouldAttempt(signature, 1_000_000)).toBe(false);
  });
});

describe('exponential backoff with a ceiling', () => {
  it('doubles the wait between transient retries and stops at the ceiling', () => {
    const scheduler = new RepairScheduler({ baseDelayMs: 1_000, ceilingMs: 8_000, maxAttempts: 100 });
    const signature = 'transient-repair';
    const delays: number[] = [];
    let now = 0;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      expect(scheduler.shouldAttempt(signature, now)).toBe(true);
      scheduler.markInFlight(signature);
      scheduler.recordFailure(signature, 'transient', now);
      const delay = scheduler.nextAttemptDelay(signature, now);
      expect(delay).not.toBeNull();
      delays.push(delay as number);
      expect(scheduler.shouldAttempt(signature, now + (delay as number) - 1)).toBe(false);
      now += delay as number;
    }

    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 8_000, 8_000]);
  });

  it('gives up on a transient repair once the attempt budget is spent', () => {
    const scheduler = new RepairScheduler({ baseDelayMs: 1, ceilingMs: 10, maxAttempts: 3 });
    const signature = 'doomed-repair';
    let attempts = 0;
    let now = 0;

    for (let snapshot = 0; snapshot < 200; snapshot += 1) {
      now += 1_000;
      if (scheduler.shouldAttempt(signature, now)) {
        attempts += 1;
        scheduler.markInFlight(signature);
        scheduler.recordFailure(signature, 'transient', now);
      }
    }

    expect(attempts).toBe(3);
    expect(scheduler.nextAttemptDelay(signature, now)).toBeNull();
  });

  it('retries a transient repair after a reconnect', () => {
    const scheduler = new RepairScheduler({ baseDelayMs: 60_000 });
    const signature = 'offline-repair';
    scheduler.markInFlight(signature);
    scheduler.recordFailure(signature, 'transient', 0);
    expect(scheduler.shouldAttempt(signature, 1_000)).toBe(false);

    scheduler.clearTransientBackoff();

    expect(scheduler.shouldAttempt(signature, 1_000)).toBe(true);
  });

  it('forgets a repair that succeeded so a later divergence is repairable', () => {
    const scheduler = new RepairScheduler();
    const signature = 'recoverable-repair';
    scheduler.markInFlight(signature);
    scheduler.recordFailure(signature, 'transient', 0);
    scheduler.markInFlight(signature);
    scheduler.recordSuccess(signature);

    expect(scheduler.shouldAttempt(signature, 0)).toBe(true);
    expect(scheduler.hasAbandonedRepairs()).toBe(false);
  });

  it('drops every record when the account changes', () => {
    const scheduler = new RepairScheduler();
    scheduler.markInFlight('a');
    scheduler.recordFailure('a', 'permanent', 0);
    scheduler.reset();
    expect(scheduler.shouldAttempt('a', 0)).toBe(true);
    expect(scheduler.hasAbandonedRepairs()).toBe(false);
  });
});
