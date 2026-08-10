/**
 * Breakdown's deterministic meal optimizer.
 *
 * A bounded combinatorial search over real catalog options: remove a
 * component, adjust its quantity, or swap it for a same-shelf alternative.
 * User constraints always win — locked components are never touched, and the
 * change budget keeps suggestions recognizable. No randomness, no AI.
 */

import { EMPTY_NUTRITION, type Nutrition } from '../model';
import { addNutrition, scaleNutrition } from '../nutrition';
import { diffNutrition } from './engine';
import type {
  BreakdownFood,
  MealComponent,
  OptimizeChange,
  OptimizeGoals,
  OptimizeSuggestion,
} from './types';

const CHANGE_PENALTY = 15;
const PROTEIN_WEIGHT = 10;
const FIBER_WEIGHT = 8;
const SODIUM_WEIGHT = 0.05;
const COMBINATION_GUARD = 60_000;
const SWAP_CANDIDATE_CAP = 5;
const PRUNED_COMPONENT_CAP = 8;

interface Move {
  readonly change: OptimizeChange;
  /** Resulting component; undefined removes it from the meal. */
  readonly result?: MealComponent;
}

function totalsOf(components: readonly MealComponent[]): Nutrition {
  if (!components.length) return { ...EMPTY_NUTRITION };
  return addNutrition(
    ...components.map((component) => scaleNutrition(component.food.nutrition, component.quantity)),
  );
}

function goalPenalty(totals: Nutrition, goals: OptimizeGoals): number {
  let penalty = 0;
  if (goals.maxCalories !== undefined) penalty += Math.max(0, totals.calories - goals.maxCalories);
  if (goals.minProteinG !== undefined) penalty += Math.max(0, goals.minProteinG - totals.proteinG) * PROTEIN_WEIGHT;
  if (goals.minFiberG !== undefined) penalty += Math.max(0, goals.minFiberG - totals.fiberG) * FIBER_WEIGHT;
  if (goals.maxSodiumMg !== undefined) penalty += Math.max(0, totals.sodiumMg - goals.maxSodiumMg) * SODIUM_WEIGHT;
  return penalty;
}

function meetsGoals(totals: Nutrition, goals: OptimizeGoals): boolean {
  if (goals.maxCalories !== undefined && totals.calories > goals.maxCalories) return false;
  if (goals.minProteinG !== undefined && totals.proteinG < goals.minProteinG) return false;
  if (goals.minFiberG !== undefined && totals.fiberG < goals.minFiberG) return false;
  if (goals.maxSodiumMg !== undefined && totals.sodiumMg > goals.maxSodiumMg) return false;
  return true;
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function swapCandidates(
  component: MealComponent,
  goals: OptimizeGoals,
  pool: readonly BreakdownFood[],
): readonly BreakdownFood[] {
  const required = goals.requireTags ?? [];
  return pool
    .filter((food) =>
      food.id !== component.food.id &&
      food.category === component.food.category &&
      food.restaurantId === component.food.restaurantId &&
      required.every((tag) => (food.tags ?? []).includes(tag)))
    .sort((left, right) =>
      left.nutrition.calories - right.nutrition.calories || left.id.localeCompare(right.id))
    .slice(0, SWAP_CANDIDATE_CAP);
}

function movesFor(
  component: MealComponent,
  goals: OptimizeGoals,
  baselineTotals: Nutrition,
  pool: readonly BreakdownFood[],
): readonly Move[] {
  const moves: Move[] = [];
  const name = component.food.name;

  if (goals.allowRemovals) {
    moves.push({
      change: {
        kind: 'remove',
        componentId: component.id,
        description: `Remove ${name}`,
        before: component,
      },
    });
  }

  if (goals.allowQuantityChanges) {
    const options = new Set<number>();
    for (const candidate of [component.quantity - 1, component.quantity - 0.5]) {
      if (candidate >= 0.5) options.add(Math.round(candidate * 100) / 100);
    }
    const proteinPer100 = component.food.nutrition.calories > 0
      ? (component.food.nutrition.proteinG / component.food.nutrition.calories) * 100
      : 0;
    const proteinShortfall = goals.minProteinG !== undefined
      && baselineTotals.proteinG < goals.minProteinG;
    if (proteinShortfall && proteinPer100 >= 6) {
      options.add(Math.round((component.quantity + 1) * 100) / 100);
    }
    for (const quantity of [...options].sort((a, b) => a - b)) {
      if (Math.abs(quantity - component.quantity) < 1e-9) continue;
      moves.push({
        change: {
          kind: 'quantity',
          componentId: component.id,
          description: `${name} ×${formatQuantity(component.quantity)} → ×${formatQuantity(quantity)}`,
          before: component,
          after: { ...component, quantity },
        },
        result: { ...component, quantity },
      });
    }
  }

  if (goals.allowSwaps) {
    for (const food of swapCandidates(component, goals, pool)) {
      const swapped: MealComponent = { ...component, food };
      moves.push({
        change: {
          kind: 'swap',
          componentId: component.id,
          description: `Swap ${name} → ${food.name}`,
          before: component,
          after: swapped,
        },
        result: swapped,
      });
    }
  }

  return moves;
}

function combinationEstimate(moveCounts: readonly number[], maxChanges: number): number {
  // Upper bound: product over the maxChanges largest move lists times the
  // number of ways to pick the components. Cheap and pessimistic on purpose.
  const sorted = [...moveCounts].sort((a, b) => b - a);
  let perPick = 1;
  for (let i = 0; i < Math.min(maxChanges, sorted.length); i += 1) perPick *= Math.max(1, sorted[i]);
  let picks = 0;
  const n = moveCounts.length;
  const k = Math.min(maxChanges, n);
  let choose = 1;
  for (let i = 1; i <= k; i += 1) {
    choose = (choose * (n - i + 1)) / i;
    picks += choose;
  }
  return perPick * picks;
}

export function optimizeMeal(
  components: readonly MealComponent[],
  goals: OptimizeGoals,
  swapPool: readonly BreakdownFood[] = [],
): readonly OptimizeSuggestion[] {
  if (!components.length) return [];
  const baselineTotals = totalsOf(components);
  if (meetsGoals(baselineTotals, goals)) return [];
  const baselineScore = goalPenalty(baselineTotals, goals);
  const maxChanges = Math.max(1, Math.min(3, Math.floor(goals.maxChanges)));

  const locked = new Set(goals.lockedComponentIds);
  let candidates = components
    .map((component) => ({
      component,
      moves: locked.has(component.id)
        ? ([] as readonly Move[])
        : movesFor(component, goals, baselineTotals, swapPool),
    }))
    .filter((entry) => entry.moves.length > 0);

  if (combinationEstimate(candidates.map((entry) => entry.moves.length), maxChanges) > COMBINATION_GUARD) {
    candidates = [...candidates]
      .sort((left, right) =>
        right.component.food.nutrition.calories * right.component.quantity -
        left.component.food.nutrition.calories * left.component.quantity)
      .slice(0, PRUNED_COMPONENT_CAP);
  }

  const best = new Map<string, OptimizeSuggestion>();

  const evaluate = (moves: readonly Move[]) => {
    const byId = new Map(moves.map((move) => [move.change.componentId, move]));
    const resulting: MealComponent[] = [];
    for (const component of components) {
      const move = byId.get(component.id);
      if (!move) {
        resulting.push(component);
        continue;
      }
      if (move.result) resulting.push(move.result);
    }
    const totals = totalsOf(resulting);
    const score = goalPenalty(totals, goals) + moves.length * CHANGE_PENALTY;
    if (score >= baselineScore) return;
    const key = (['calories', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'sodiumMg'] as const)
      .map((metric) => Math.round(totals[metric] * 10))
      .join('|');
    const existing = best.get(key);
    if (existing && existing.score <= score) return;
    best.set(key, {
      changes: moves.map((move) => move.change),
      components: resulting,
      totals,
      delta: diffNutrition(baselineTotals, totals),
      meetsAllGoals: meetsGoals(totals, goals),
      score,
    });
  };

  const chosen: Move[] = [];
  const explore = (startIndex: number) => {
    for (let index = startIndex; index < candidates.length; index += 1) {
      for (const move of candidates[index].moves) {
        chosen.push(move);
        evaluate(chosen);
        if (chosen.length < maxChanges) explore(index + 1);
        chosen.pop();
      }
    }
  };
  explore(0);

  return [...best.values()]
    .sort((left, right) =>
      left.score - right.score ||
      left.changes.length - right.changes.length ||
      left.changes.map((change) => change.description).join('|')
        .localeCompare(right.changes.map((change) => change.description).join('|')))
    .slice(0, 3);
}
