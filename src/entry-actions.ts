import { createId, type FoodEntry, type MealSlot } from './model';

export function moveEntries(entries: readonly FoodEntry[], ids: readonly string[], mealSlot: MealSlot, updatedAt: string): FoodEntry[] {
  const selected = new Set(ids);
  return entries.filter((entry) => selected.has(entry.id) && !entry.deleted && entry.mealSlot !== mealSlot)
    .map((entry) => ({ ...entry, mealSlot, updatedAt }));
}

export function restoreEntry(entry: FoodEntry, updatedAt: string): FoodEntry {
  const { deleted: _deleted, deletedAt: _deletedAt, ...active } = entry;
  // Deletions are permanent sync tombstones. Undo adds a fresh identity while
  // retaining the original consumption time and exact nutrition snapshot.
  return { ...active, id: createId('entry'), createdAt: updatedAt, updatedAt };
}
