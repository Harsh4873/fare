import { describe, expect, it } from 'vitest';
import { createStarterState, type FareState, type Food } from './model';
import {
  isCloudSingleton,
  latestStateTimestamp,
  materializeCloudState,
  mergeStates,
  omitUndefinedDeep,
  resolveClockSkew,
  resolveInitialSync,
  selectNewer,
  serializeEntityDocument,
  serializeSingletonDocument,
  stableStringify,
  timestampAfter,
  timestampAfterState,
} from './sync-core';

const FIRST = '2026-07-01T10:00:00.000Z';
const LATER = '2026-07-02T10:00:00.000Z';
/** What a device whose clock runs an hour fast would stamp at FIRST. */
const FAST_CLOCK = '2026-07-01T11:00:00.000Z';

function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    id: 'food-1',
    name: 'Cafe Latte Protein Shake',
    brand: 'Premier Protein',
    aliases: ['latte shake'],
    serving: { quantity: 1, unit: 'bottle', label: '1 bottle' },
    nutritionPerServing: {
      calories: 160,
      proteinG: 30,
      carbsG: 5,
      fatG: 3,
      saturatedFatG: 1,
      fiberG: 1,
      sugarG: 1,
      sodiumMg: 400,
    },
    provenance: {
      kind: 'manual',
      providerName: 'Fare',
      dataQuality: 'complete',
      warnings: [],
    },
    pinned: false,
    createdAt: FIRST,
    updatedAt: FIRST,
    ...overrides,
  };
}

function makeState(overrides: Partial<FareState> = {}): FareState {
  return { ...createStarterState(FIRST), foods: [makeFood()], ...overrides };
}

describe('canonical serialization', () => {
  it('sorts keys and omits undefined values recursively', () => {
    expect(stableStringify({ b: 1, a: 2, c: undefined })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(omitUndefinedDeep({ a: undefined, b: { c: undefined, d: null }, e: [1, undefined] }))
      .toEqual({ b: { d: null }, e: [1] });
  });
});

describe('deterministic last-write-wins', () => {
  it('selects the later timestamp regardless of argument order', () => {
    const oldFood = makeFood({ name: 'Old', updatedAt: FIRST });
    const newFood = makeFood({ name: 'New', updatedAt: LATER });
    expect(selectNewer(oldFood, newFood).name).toBe('New');
    expect(selectNewer(newFood, oldFood).name).toBe('New');
  });

  it('uses a deterministic tie-break for simultaneous changes', () => {
    const apple = makeFood({ name: 'Apple' });
    const zebra = makeFood({ name: 'Zebra' });
    expect(selectNewer(apple, zebra)).toBe(selectNewer(zebra, apple));
  });

  it('lets a newer tombstone defeat an older edit', () => {
    const edit = makeFood({ name: 'Edited', updatedAt: FIRST });
    const deletion = makeFood({ deleted: true, deletedAt: LATER, updatedAt: LATER });
    expect(selectNewer(edit, deletion).deleted).toBe(true);
  });

  it('treats deletion as terminal even against a newer clock reading', () => {
    // The shared ruleset refuses any update that clears `deleted: true`, so a
    // merge that resurrects a tombstone can only produce a rejected write.
    const deletion = makeFood({ deleted: true, deletedAt: FIRST, updatedAt: FIRST });
    const resurrection = makeFood({ name: 'Back from the dead', updatedAt: LATER });
    expect(selectNewer(resurrection, deletion).deleted).toBe(true);
    expect(selectNewer(deletion, resurrection).deleted).toBe(true);
  });
});

describe('clock skew defence', () => {
  it('stamps strictly past every reading it has seen', () => {
    const stamp = timestampAfter(FIRST, Date.parse(LATER));
    expect(Date.parse(stamp)).toBeGreaterThan(Date.parse(LATER));
    expect(Date.parse(timestampAfter(undefined, 'not a date'))).toBeGreaterThanOrEqual(Date.now() - 1_000);
  });

  it('keeps an offline edit newer after a future cloud state is persisted and reloaded', () => {
    const fastCloud = makeState({
      profile: {
        ...createStarterState(FIRST).profile,
        displayName: 'Fast device',
        updatedAt: FAST_CLOCK,
      },
      foods: [makeFood({ name: 'Shared', updatedAt: FAST_CLOCK })],
    });
    // JSON round-trip models closing the app and hydrating the same observed
    // state later while the device clock is still slow.
    const reloaded = JSON.parse(JSON.stringify(fastCloud)) as FareState;
    const editStamp = timestampAfterState(reloaded, Date.parse(FIRST));
    const offlineEdit = {
      ...reloaded,
      foods: [makeFood({ name: 'Offline edit', updatedAt: editStamp })],
    };

    expect(Date.parse(editStamp)).toBeGreaterThan(latestStateTimestamp(fastCloud));
    expect(resolveInitialSync(offlineEdit, fastCloud).state.foods[0].name).toBe('Offline edit');
  });

  it('lifts a genuine local edit past a faster device instead of losing forever', () => {
    // The remote record was written by a device an hour ahead. Without the
    // bump this edit loses every merge and is rolled back on every snapshot.
    const previousRemote = makeState({ foods: [makeFood({ name: 'Shared' })] });
    const incomingRemote = makeState({ foods: [makeFood({ name: 'Fast device', updatedAt: FAST_CLOCK })] });
    const local = makeState({ foods: [makeFood({ name: 'Slow device edit', updatedAt: FIRST })] });

    const corrected = resolveClockSkew(local, incomingRemote, previousRemote);
    expect(Date.parse(corrected.foods[0].updatedAt)).toBeGreaterThan(Date.parse(FAST_CLOCK));
    expect(mergeStates(corrected, incomingRemote).foods[0].name).toBe('Slow device edit');
  });

  it('leaves the cloud copy and the last adopted snapshot alone', () => {
    const remoteFood = makeFood({ name: 'Fast device', updatedAt: FAST_CLOCK });
    const incomingRemote = makeState({ foods: [remoteFood] });

    // Nothing changed locally: the local copy still is the cloud copy.
    const unchanged = resolveClockSkew(makeState({ foods: [remoteFood] }), incomingRemote, makeState());
    expect(unchanged.foods[0].updatedAt).toBe(FAST_CLOCK);

    // The local copy is the snapshot this device last adopted, so a newer
    // remote edit must still win.
    const adopted = makeState({ foods: [makeFood({ name: 'Adopted', updatedAt: FIRST })] });
    const settled = resolveClockSkew(adopted, incomingRemote, adopted);
    expect(settled.foods[0].updatedAt).toBe(FIRST);
    expect(mergeStates(settled, incomingRemote).foods[0].name).toBe('Fast device');
  });

  it('never lifts a record past a remote tombstone', () => {
    const previousRemote = makeState({ foods: [makeFood({ name: 'Shared' })] });
    const incomingRemote = makeState({
      foods: [makeFood({ deleted: true, deletedAt: FAST_CLOCK, updatedAt: FAST_CLOCK })],
    });
    const local = makeState({ foods: [makeFood({ name: 'Still here', updatedAt: FIRST })] });

    const corrected = resolveClockSkew(local, incomingRemote, previousRemote);
    expect(corrected.foods[0].updatedAt).toBe(FIRST);
  });

  it('adopts the first snapshot as-is because nothing counts as a local change yet', () => {
    const local = makeState({ foods: [makeFood({ name: 'Local', updatedAt: FIRST })] });
    const incomingRemote = makeState({ foods: [makeFood({ name: 'Remote', updatedAt: FAST_CLOCK })] });
    expect(resolveClockSkew(local, incomingRemote, null)).toBe(local);
  });
});

describe('rejected repairs are never generated', () => {
  it('produces no upload when a fast clock would resurrect a cloud tombstone', () => {
    // A6: the client used to re-derive this repair from every clean snapshot,
    // the ruleset refused it every time, and the divergence never resolved.
    const cloud = makeState({
      foods: [makeFood({ deleted: true, deletedAt: FIRST, updatedAt: FIRST })],
    });
    const local = makeState({ foods: [makeFood({ name: 'Fast clock copy', updatedAt: FAST_CLOCK })] });

    const corrected = resolveClockSkew(local, cloud, cloud);
    const resolution = resolveInitialSync(corrected, cloud);

    expect(resolution.uploadFoods).toEqual([]);
    expect(resolution.state.foods[0].deleted).toBe(true);

    // The client has adopted the tombstone, so the next snapshot is clean too.
    const settled = resolveInitialSync(resolveClockSkew(resolution.state, cloud, cloud), cloud);
    expect(settled.uploadFoods).toEqual([]);
  });

  it('still uploads a local deletion, which the ruleset allows', () => {
    const cloud = makeState({ foods: [makeFood({ name: 'Live', updatedAt: FIRST })] });
    const local = makeState({
      foods: [makeFood({ deleted: true, deletedAt: LATER, updatedAt: LATER })],
    });
    const resolution = resolveInitialSync(local, cloud);
    expect(resolution.uploadFoods.map((food) => food.deleted)).toEqual([true]);
  });
});

describe('Fare state merge', () => {
  it('merges every singleton independently', () => {
    const local = makeState({
      profile: { displayName: 'Test User', onboardingComplete: true, updatedAt: LATER },
      targets: { ...createStarterState(FIRST).targets, calories: 2_100, updatedAt: FIRST },
    });
    const remote = makeState({
      profile: { displayName: '', onboardingComplete: false, updatedAt: FIRST },
      targets: { ...createStarterState(FIRST).targets, calories: 2_300, updatedAt: LATER },
    });
    const merged = mergeStates(local, remote);
    expect(merged.profile.displayName).toBe('Test User');
    expect(merged.targets.calories).toBe(2_300);
  });

  it('unions collection records and returns canonical id order', () => {
    const local = makeState({ foods: [makeFood({ id: 'z-food' })] });
    const remote = makeState({ foods: [makeFood({ id: 'a-food' })] });
    expect(mergeStates(local, remote).foods.map((food) => food.id)).toEqual(['a-food', 'z-food']);
    expect(stableStringify(mergeStates(local, remote))).toBe(stableStringify(mergeStates(remote, local)));
  });
});

describe('initial sync resolution', () => {
  it('uploads all local singleton and collection records to an empty cloud', () => {
    const resolution = resolveInitialSync(makeState(), null);
    expect(resolution.uploadProfile).toBe(true);
    expect(resolution.uploadTargets).toBe(true);
    expect(resolution.uploadSettings).toBe(true);
    expect(resolution.uploadFoods.map((food) => food.id)).toEqual(['food-1']);
  });

  it('uploads only missing or locally newer records', () => {
    const local = makeState({
      foods: [
        makeFood({ id: 'shared' }),
        makeFood({ id: 'local-only' }),
        makeFood({ id: 'conflict', name: 'Local newer', updatedAt: LATER }),
      ],
    });
    const cloud = makeState({
      foods: [
        makeFood({ id: 'shared' }),
        makeFood({ id: 'cloud-only' }),
        makeFood({ id: 'conflict', name: 'Cloud older', updatedAt: FIRST }),
      ],
    });
    const resolution = resolveInitialSync(local, cloud);
    expect(resolution.uploadFoods.map((food) => food.id).sort()).toEqual(['conflict', 'local-only']);
    expect(resolution.state.foods.map((food) => food.id)).toEqual(['cloud-only', 'conflict', 'local-only', 'shared']);
  });
});

describe('cloud materialization and serialization', () => {
  it('uses local singleton fallbacks while keeping cloud entity arrays', () => {
    const fallback = makeState();
    const raw = materializeCloudState(
      { profile: null, targets: null, settings: null },
      [makeFood({ id: 'cloud-food' })],
      [],
      [],
      fallback,
    ) as FareState;
    expect(raw.profile).toBe(fallback.profile);
    expect(raw.foods[0].id).toBe('cloud-food');
  });

  it('strips undefined fields and recognizes stamped singleton documents', () => {
    const { data } = serializeEntityDocument(makeFood({ brand: undefined }));
    expect('brand' in data).toBe(false);
    const profile = serializeSingletonDocument(makeState().profile);
    expect(isCloudSingleton(profile)).toBe(true);
    expect(isCloudSingleton({ displayName: 'missing timestamp' })).toBe(false);
  });
});
