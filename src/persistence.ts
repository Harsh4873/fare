export type PersistenceStatus = {
  status: 'saving' | 'saved' | 'error';
  mode?: 'indexeddb' | 'localStorage';
};

/** Keep asynchronous writes ordered, and report only the newest save's status. */
export function createPersistenceQueue<T>(
  writeLocal: (value: T) => void,
  writeIndexed: (value: T) => Promise<void>,
  report: (result: PersistenceStatus) => void,
) {
  let revision = 0;
  let pending = Promise.resolve();
  return {
    save(value: T): Promise<void> {
      const current = ++revision;
      let localSaved = false;
      try { writeLocal(value); localSaved = true; } catch { /* Try the independent database copy. */ }
      report(localSaved ? { status: 'saved', mode: 'localStorage' } : { status: 'saving' });
      pending = pending.then(async () => {
        let result: PersistenceStatus;
        try {
          await writeIndexed(value);
          result = { status: 'saved', mode: 'indexeddb' };
        } catch {
          result = localSaved ? { status: 'saved', mode: 'localStorage' } : { status: 'error' };
        }
        if (current === revision) report(result);
      });
      return pending;
    },
    settled: () => pending,
  };
}
