import { describe, expect, it } from 'vitest';
import { moveEntries, restoreEntry } from '../src/entry-actions';
import { createStarterState, createNutritionSnapshot, type FoodEntry } from '../src/model';
import { mergeStates } from '../src/sync-core';
import { parseFareState } from '../src/store';
import { summarizeDay } from '../src/nutrition';

const now = '2026-09-08T12:00:00.000Z';
const later = '2026-09-08T12:01:00.000Z';
function entry(id: string): FoodEntry {
  const nutrition = { calories: 250, proteinG: 10, carbsG: 30, fatG: 10, saturatedFatG: 1, fiberG: 1, sugarG: 1, sodiumMg: 10 };
  return { id, createdAt: now, updatedAt: now, consumedAt: now, consumedMinute: 720, dateKey: '2026-09-08', mealSlot: 'lunch', origin: 'food', foodId: 'food-1', note: 'extra rice',
    snapshot: createNutritionSnapshot({ name: 'Rice bowl', serving: { quantity: 1, unit: 'bowl', label: '1 bowl' }, servings: 1, nutritionPerServing: nutrition, nutrition,
      provenance: { kind: 'manual', providerName: 'Manual', dataQuality: 'complete', warnings: [] } }) };
}

describe('diary moves and undo', () => {
  it('moves a whole meal while preserving identity, portions, notes, timestamps and daily totals', () => {
    const original = [entry('a'), entry('b')];
    const moved = moveEntries(original, ['a', 'b'], 'dinner', later);
    expect(moved.map((item) => item.mealSlot)).toEqual(['dinner', 'dinner']);
    for (let i = 0; i < original.length; i++) {
      expect(moved[i]).toEqual({ ...original[i], mealSlot: 'dinner', updatedAt: later });
      expect(moved[i].snapshot).toBe(original[i].snapshot);
    }
    expect(summarizeDay(moved, '2026-09-08').totals).toEqual(summarizeDay(original, '2026-09-08').totals);
    expect(original[0].mealSlot).toBe('lunch');
  });
  it('ignores deleted, unselected, and already-moved entries', () => {
    expect(moveEntries([entry('a'), { ...entry('b'), deleted: true, deletedAt: now }, { ...entry('c'), mealSlot: 'dinner' }], ['b', 'c'], 'dinner', later)).toEqual([]);
  });
  it('restores one active copy without resurrecting a permanent synced tombstone', () => {
    const deleted = { ...entry('a'), deleted: true, deletedAt: now };
    const restored = restoreEntry(deleted, later);
    expect(restored.id).not.toBe(deleted.id);
    expect(restored.snapshot).toBe(deleted.snapshot);
    expect(restored).not.toHaveProperty('deleted');
    expect(restored).not.toHaveProperty('deletedAt');
    const local = createStarterState(now); local.entries.push(deleted, restored);
    const remote = createStarterState(now); remote.entries.push(deleted);
    const merged = parseFareState(mergeStates(local, remote));
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries.find((entry) => entry.id === deleted.id)?.deleted).toBe(true);
    expect(summarizeDay(merged.entries, '2026-09-08').entryCount).toBe(1);
  });
});
