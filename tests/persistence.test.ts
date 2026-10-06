import { describe, expect, it, vi } from 'vitest';
import { createPersistenceQueue, type PersistenceStatus } from '../src/persistence';

describe('local durability', () => {
  it('reports a save failure only when both independent stores fail, and can retry', async () => {
    const local = vi.fn().mockImplementation(() => { throw new Error('Quota'); });
    const indexed = vi.fn().mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(undefined);
    const report = vi.fn();
    const queue = createPersistenceQueue(local, indexed, report);
    await queue.save({ entries: ['new entry'] });
    expect(report).toHaveBeenLastCalledWith({ status: 'error' });
    await queue.save({ entries: ['new entry'] });
    expect(report).toHaveBeenLastCalledWith({ status: 'saved', mode: 'indexeddb' });
  });

  it('accepts either successful durable copy', async () => {
    const report = vi.fn();
    await createPersistenceQueue(() => {}, async () => { throw new Error('Blocked'); }, report).save(1);
    expect(report).toHaveBeenLastCalledWith({ status: 'saved', mode: 'localStorage' });
    await createPersistenceQueue(() => { throw new Error('Blocked'); }, async () => {}, report).save(2);
    expect(report).toHaveBeenLastCalledWith({ status: 'saved', mode: 'indexeddb' });
  });

  it('serializes database writes and never lets an older success mask the newest failure', async () => {
    let finishFirst!: () => void;
    const indexed = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }))
      .mockRejectedValueOnce(new Error('Quota'));
    const reports: PersistenceStatus[] = [];
    const queue = createPersistenceQueue(() => { throw new Error('Quota'); }, indexed, (result) => reports.push(result));
    const first = queue.save('older');
    await Promise.resolve();
    const second = queue.save('newer');
    expect(indexed).toHaveBeenCalledTimes(1);
    finishFirst();
    await Promise.all([first, second, queue.settled()]);
    expect(indexed.mock.calls.map(([value]) => value)).toEqual(['older', 'newer']);
    expect(reports.map((result) => result.status)).toEqual(['saving', 'saving', 'error']);
  });
});
