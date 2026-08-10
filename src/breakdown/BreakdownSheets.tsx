/**
 * Breakdown's sheets and modals: the component picker (menu, pantry, and
 * free-text lanes), swap suggestions, source transparency, the deterministic
 * optimizer, meal comparison, and save/log dialogs.
 */

import {
  ChefHat,
  Lock,
  LockOpen,
  NotebookPen,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MealSlot, Nutrition } from '../model';
import {
  BottomSheet,
  EmptyState,
  Modal,
  SegmentedControl,
  SourceBadge,
  cx,
} from '../ui';
import {
  ConfidenceChip,
  DeltaSummary,
  formatNumber,
  metricMeta,
} from './bits';
import { DISH_TEMPLATES, RESTAURANTS, foodById, restaurantById, searchPool } from './data';
import { analyzeMeal, diffNutrition, formatSigned } from './engine';
import { optimizeMeal } from './optimize';
import { matchItems, parseMealText } from './parse';
import type {
  BreakdownFood,
  DishTemplate,
  FoodTag,
  MatchResult,
  MealComponent,
  MetricKey,
  OptimizeGoals,
  OptimizeSuggestion,
} from './types';

const SKIP = '__skip';

function foodKcal(food: BreakdownFood): number {
  return Math.round(food.nutrition.calories);
}

function sourceBadgeFor(food: BreakdownFood) {
  if (food.sourceType === 'restaurant-official') return <SourceBadge source="verified" label={restaurantById(food.restaurantId)?.name ?? 'Official'} />;
  if (food.sourceType === 'usda-generic') return <SourceBadge source="database" label="USDA" />;
  return <SourceBadge source="estimated" label="Estimate" />;
}

function PickerFoodRow({ food, onAdd }: { food: BreakdownFood; onAdd: (food: BreakdownFood) => void }) {
  return (
    <button type="button" className="picker-item" onClick={() => onAdd(food)}>
      <span className="picker-item__copy">
        <strong>{food.name}</strong>
        <span>{food.servingLabel} · {formatNumber(food.nutrition.proteinG)} g protein</span>
      </span>
      <span className="picker-item__value">{formatNumber(foodKcal(food))} kcal</span>
      <span className="picker-item__add" aria-hidden="true"><Plus /></span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Add components sheet                                                */
/* ------------------------------------------------------------------ */

type PickerLane = 'menu' | 'pantry' | 'describe';

/** One chosen addition from the picker: a food or a dish template, times a quantity. */
export type PickerSelection =
  | { readonly food: BreakdownFood; readonly quantity: number }
  | { readonly template: DishTemplate; readonly quantity: number };

export interface AddComponentsSheetProps {
  open: boolean;
  onClose: () => void;
  restaurantId?: string;
  onPickRestaurant: (id: string | undefined) => void;
  onAddFood: (food: BreakdownFood, quantity: number) => void;
  /** Batch add: called once with every matched item so no update is lost. */
  onAddMany: (picks: readonly PickerSelection[]) => void;
  mealCalories: number;
  componentCount: number;
}

export function AddComponentsSheet({
  open,
  onClose,
  restaurantId,
  onPickRestaurant,
  onAddFood,
  onAddMany,
  mealCalories,
  componentCount,
}: AddComponentsSheetProps) {
  const [lane, setLane] = useState<PickerLane>('menu');
  const [pantryQuery, setPantryQuery] = useState('');
  const [describeText, setDescribeText] = useState('');
  const [matches, setMatches] = useState<readonly MatchResult[] | null>(null);
  const [choices, setChoices] = useState<Record<number, string>>({});

  const restaurant = restaurantById(restaurantId);
  const pantry = useMemo(() => searchPool(undefined), []);
  const pantryResults = useMemo(() => {
    const query = pantryQuery.trim().toLowerCase();
    if (!query) return pantry;
    return pantry.filter((food) =>
      food.name.toLowerCase().includes(query) ||
      (food.aliases ?? []).some((alias) => alias.includes(query)));
  }, [pantry, pantryQuery]);
  const pantryCategories = useMemo(() => {
    const groups = new Map<string, BreakdownFood[]>();
    for (const food of pantryResults) {
      const list = groups.get(food.category) ?? [];
      list.push(food);
      groups.set(food.category, list);
    }
    return [...groups.entries()];
  }, [pantryResults]);

  function runParse() {
    const parsed = parseMealText(describeText);
    const results = matchItems(parsed, {
      restaurantId,
      foods: searchPool(restaurantId),
      templates: DISH_TEMPLATES,
    });
    setMatches(results);
    setChoices({});
  }

  function choiceFor(result: MatchResult, index: number): string {
    const explicit = choices[index];
    if (explicit !== undefined) return explicit;
    if (result.template) return `template:${result.template.id}`;
    if (result.food) return result.food.id;
    return SKIP;
  }

  function addMatched() {
    if (!matches) return;
    const picks: PickerSelection[] = [];
    matches.forEach((result, index) => {
      const choice = choiceFor(result, index);
      if (choice === SKIP) return;
      if (choice.startsWith('template:')) {
        const template = DISH_TEMPLATES.find((candidate) => candidate.id === choice.slice('template:'.length));
        if (template) picks.push({ template, quantity: result.item.quantity });
        return;
      }
      const food = foodById(choice);
      if (food) picks.push({ food, quantity: result.item.quantity });
    });
    if (picks.length > 0) {
      onAddMany(picks);
      setDescribeText('');
      setMatches(null);
      setChoices({});
    }
  }

  const matchedCount = matches
    ? matches.filter((result, index) => choiceFor(result, index) !== SKIP).length
    : 0;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Build your meal"
      description={restaurant ? `${restaurant.name} · official nutrition guide` : 'Pick a restaurant menu, pantry staples, or describe the meal in words.'}
      width="large"
      footer={
        <div className="picker-footer">
          <span className="picker-footer__total">
            {componentCount ? `${componentCount} component${componentCount === 1 ? '' : 's'} · ${formatNumber(mealCalories)} kcal so far` : 'Nothing added yet'}
          </span>
          <button type="button" className="button button--primary" onClick={onClose}>Done</button>
        </div>
      }
    >
      <div className="picker">
        <SegmentedControl
          value={lane}
          onChange={setLane}
          label="Add components lane"
          fullWidth
          options={[
            { value: 'menu', label: 'Restaurant', icon: <ChefHat /> },
            { value: 'pantry', label: 'Pantry', icon: <Search /> },
            { value: 'describe', label: 'Describe it', icon: <Wand2 /> },
          ]}
        />

        {lane === 'menu' && !restaurant && (
          <div className="restaurant-tiles">
            {RESTAURANTS.map((candidate) => (
              <button type="button" key={candidate.id} className="restaurant-tile" onClick={() => onPickRestaurant(candidate.id)}>
                <strong>{candidate.name}</strong>
                <span>{candidate.items.length} items · official data</span>
                <SourceBadge source="verified" label={`Checked ${candidate.lastVerified}`} />
              </button>
            ))}
          </div>
        )}

        {lane === 'menu' && restaurant && (
          <div className="picker-menu">
            <div className="picker-menu__switch">
              {RESTAURANTS.map((candidate) => (
                <button
                  type="button"
                  key={candidate.id}
                  className={cx('chip-button', candidate.id === restaurant.id && 'is-active')}
                  onClick={() => onPickRestaurant(candidate.id)}
                >
                  {candidate.name}
                </button>
              ))}
              <button type="button" className="chip-button" onClick={() => onPickRestaurant(undefined)}>All restaurants</button>
            </div>
            {restaurant.categories.map((category) => {
              const items = restaurant.items.filter((item) => item.category === category);
              if (!items.length) return null;
              return (
                <section className="picker-group" key={category}>
                  <h4 className="picker-group__title">{category}</h4>
                  <div className="picker-group__items">
                    {items.map((food) => <PickerFoodRow key={food.id} food={food} onAdd={(picked) => onAddFood(picked, 1)} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {lane === 'pantry' && (
          <div className="picker-menu">
            <label className="field">
              <span className="field__label">Search pantry staples</span>
              <span className="input-shell">
                <input
                  className="input"
                  value={pantryQuery}
                  onChange={(event) => setPantryQuery(event.target.value)}
                  placeholder="paneer, lentils, olive oil…"
                />
              </span>
            </label>
            <p className="fine-print">USDA-derived values. Nutrition is reliable; your portion is the estimate, so adjust quantities after adding.</p>
            {pantryCategories.map(([category, items]) => (
              <section className="picker-group" key={category}>
                <h4 className="picker-group__title">{category}</h4>
                <div className="picker-group__items">
                  {items.map((food) => <PickerFoodRow key={food.id} food={food} onAdd={(picked) => onAddFood(picked, 1)} />)}
                </div>
              </section>
            ))}
            {!pantryCategories.length && <EmptyState compact title="No pantry match" description="Try a simpler word, or describe the whole meal instead." />}
          </div>
        )}

        {lane === 'describe' && (
          <div className="picker-describe">
            <label className="field">
              <span className="field__label">Describe the meal</span>
              <textarea
                className="textarea"
                rows={3}
                value={describeText}
                onChange={(event) => setDescribeText(event.target.value)}
                placeholder="salata wrap with cool cucumber tortilla, falafel, avocado, edamame, black beans, chickpeas, veggies and 2 spicy chipotle ranch"
              />
            </label>
            <div className="picker-describe__actions">
              <button type="button" className="button button--secondary" disabled={!describeText.trim()} onClick={runParse}>
                <Sparkles /> Match ingredients
              </button>
              {restaurant && <span className="fine-print">Matching against the {restaurant.name} menu first.</span>}
            </div>
            {matches && (
              <div className="parse-results">
                {matches.length === 0 && <EmptyState compact title="Nothing to match" description="Add ingredient names separated by commas." />}
                {matches.map((result, index) => {
                  const choice = choiceFor(result, index);
                  const options: Array<{ value: string; label: string }> = [];
                  if (result.template) options.push({ value: `template:${result.template.id}`, label: `${result.template.name} (recipe estimate)` });
                  if (result.food) options.push({ value: result.food.id, label: `${result.food.name} · ${formatNumber(foodKcal(result.food))} kcal` });
                  for (const alternative of result.alternatives) {
                    if (!options.some((option) => option.value === alternative.id)) {
                      options.push({ value: alternative.id, label: `${alternative.name} · ${formatNumber(foodKcal(alternative))} kcal` });
                    }
                  }
                  options.push({ value: SKIP, label: 'Skip this item' });
                  const unmatched = !result.food && !result.template;
                  return (
                    <div className={cx('parse-row', unmatched && choice === SKIP && 'parse-row--unmatched')} key={`${result.item.text}-${index}`}>
                      <span className="parse-row__query">
                        <strong>{result.item.text}</strong>
                        {result.item.quantity !== 1 && <span className="parse-row__qty">×{formatNumber(result.item.quantity, 2)}</span>}
                        {unmatched && <span className="parse-row__miss">no confident match</span>}
                      </span>
                      <select
                        className="select"
                        value={choice}
                        aria-label={`Match for ${result.item.text}`}
                        onChange={(event) => setChoices((current) => ({ ...current, [index]: event.target.value }))}
                      >
                        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                  );
                })}
                {matches.length > 0 && (
                  <button type="button" className="button button--primary" disabled={!matchedCount} onClick={addMatched}>
                    <Plus /> Add {matchedCount} item{matchedCount === 1 ? '' : 's'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Swap sheet                                                          */
/* ------------------------------------------------------------------ */

export interface SwapSheetProps {
  component: MealComponent | null;
  onClose: () => void;
  onSwap: (component: MealComponent, food: BreakdownFood) => void;
}

export function SwapSheet({ component, onClose, onSwap }: SwapSheetProps) {
  const candidates = useMemo(() => {
    if (!component) return [];
    const pool = component.food.restaurantId
      ? restaurantById(component.food.restaurantId)?.items ?? []
      : searchPool(undefined);
    return pool
      .filter((food) => food.category === component.food.category && food.id !== component.food.id)
      .sort((left, right) => left.nutrition.calories - right.nutrition.calories);
  }, [component]);

  if (!component) return null;
  const currentKcal = component.food.nutrition.calories * component.quantity;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={`Swap ${component.food.name}`}
      description={`Same shelf: ${component.food.category.toLowerCase()}${component.food.restaurantId ? ` at ${restaurantById(component.food.restaurantId)?.name ?? 'this restaurant'}` : ''}. Quantity ×${formatNumber(component.quantity, 2)} stays.`}
      width="medium"
    >
      {candidates.length ? (
        <div className="swap-list">
          {candidates.map((food) => {
            const nextKcal = food.nutrition.calories * component.quantity;
            const saving = Math.round(currentKcal - nextKcal);
            return (
              <button type="button" key={food.id} className="swap-row" onClick={() => onSwap(component, food)}>
                <span className="swap-row__copy">
                  <strong>{food.name}</strong>
                  <span>{food.servingLabel} · {formatNumber(food.nutrition.proteinG)} g protein</span>
                </span>
                <span className="swap-row__value">{formatNumber(nextKcal)} kcal</span>
                <span className={cx('swap-row__delta', saving > 0 ? 'is-down' : saving < 0 ? 'is-up' : 'is-flat')}>
                  {saving > 0 ? `Save ${formatNumber(saving)} kcal` : saving < 0 ? `${formatSigned(-saving)} kcal` : 'Same kcal'}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState compact title="No swaps on this shelf" description="This category has no alternative items in the catalog." />
      )}
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Source transparency modal                                           */
/* ------------------------------------------------------------------ */

export interface SourceModalProps {
  component: MealComponent | null;
  onClose: () => void;
  onSetQuantity: (component: MealComponent, quantity: number) => void;
}

export function SourceModal({ component, onClose, onSetQuantity }: SourceModalProps) {
  if (!component) return null;
  const { food } = component;
  const rows: Array<{ key: MetricKey; value: number }> = (['calories', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'sodiumMg'] as MetricKey[])
    .map((key) => ({ key, value: food.nutrition[key] }));
  return (
    <Modal
      open
      onClose={onClose}
      title={food.name}
      description={`${food.servingLabel}${food.servingGrams ? ` · about ${formatNumber(food.servingGrams)} g` : ''}`}
      width="small"
    >
      <div className="source-detail">
        <div className="source-detail__badges">
          {sourceBadgeFor(food)}
          <ConfidenceChip confidence={food.confidence} />
        </div>
        <dl className="source-detail__grid">
          {rows.map((row) => {
            const meta = metricMeta(row.key);
            return (
              <div key={row.key}>
                <dt>{meta.label}</dt>
                <dd>{formatNumber(row.value, meta.digits)} {meta.unit}</dd>
              </div>
            );
          })}
        </dl>
        <p className="source-detail__origin">
          Source: {food.sourceUrl ? <a href={food.sourceUrl} target="_blank" rel="noreferrer">{food.sourceName}</a> : food.sourceName}
          {food.lastVerified ? ` · last checked ${food.lastVerified}` : ''}
        </p>
        <p className="fine-print">{describeConfidence(food)}</p>
        {food.portionOptions && food.portionOptions.length > 0 && (
          <div className="source-detail__portions">
            <span className="field__label">Portion guess</span>
            <div className="source-detail__portion-chips">
              {food.portionOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={cx('chip-button', Math.abs(option - component.quantity) < 1e-9 && 'is-active')}
                  onClick={() => onSetQuantity(component, option)}
                >
                  ×{formatNumber(option, 2)}{food.servingGrams ? ` (${formatNumber(food.servingGrams * option)} g)` : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function describeConfidence(food: BreakdownFood): string {
  if (food.sourceType === 'restaurant-official') return 'Official nutrition information published by the restaurant.';
  if (food.sourceType === 'usda-generic') return 'Nutrition source is reliable, but your portion size is estimated — adjust the quantity to match your plate.';
  if (food.sourceType === 'reconstruction') return 'This dish was reconstructed from likely ingredients. Values may vary substantially depending on preparation and serving size.';
  return 'Estimated value. Treat it as a rough guide, not a measurement.';
}

/* ------------------------------------------------------------------ */
/* Optimize modal                                                      */
/* ------------------------------------------------------------------ */

export interface OptimizeModalProps {
  open: boolean;
  onClose: () => void;
  components: readonly MealComponent[];
  restaurantId?: string;
  onApply: (suggestion: OptimizeSuggestion) => void;
}

export function OptimizeModal({ open, onClose, components, restaurantId, onApply }: OptimizeModalProps) {
  const [maxCalories, setMaxCalories] = useState('');
  const [minProtein, setMinProtein] = useState('');
  const [minFiber, setMinFiber] = useState('');
  const [maxChanges, setMaxChanges] = useState<'1' | '2' | '3'>('2');
  const [allowRemovals, setAllowRemovals] = useState(true);
  const [allowQuantity, setAllowQuantity] = useState(true);
  const [allowSwaps, setAllowSwaps] = useState(true);
  const [dietary, setDietary] = useState<'any' | 'vegetarian' | 'vegan'>('any');
  const [locked, setLocked] = useState<readonly string[]>([]);
  const [result, setResult] = useState<{
    base: readonly MealComponent[];
    list: readonly OptimizeSuggestion[];
  } | null>(null);
  // Suggestions are only valid for the exact meal they were computed from;
  // any edit changes the components identity and hides stale results.
  const suggestions = result && result.base === components ? result.list : null;

  const currentTotals = useMemo(() => analyzeMeal(components).totals, [components]);

  function parseGoal(raw: string): number | undefined {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  function goals(): OptimizeGoals {
    const requireTags: FoodTag[] = dietary === 'vegan' ? ['vegan'] : dietary === 'vegetarian' ? ['vegetarian'] : [];
    return {
      maxCalories: parseGoal(maxCalories),
      minProteinG: parseGoal(minProtein),
      minFiberG: parseGoal(minFiber),
      maxChanges: Number(maxChanges),
      lockedComponentIds: locked,
      allowRemovals,
      allowQuantityChanges: allowQuantity,
      allowSwaps,
      requireTags: requireTags.length ? requireTags : undefined,
    };
  }

  function run() {
    setResult({ base: components, list: optimizeMeal(components, goals(), searchPool(restaurantId)) });
  }

  const goalsSet = Boolean(parseGoal(maxCalories) || parseGoal(minProtein) || parseGoal(minFiber));
  const alreadyMeets = (() => {
    const target = goals();
    if (target.maxCalories !== undefined && currentTotals.calories > target.maxCalories) return false;
    if (target.minProteinG !== undefined && currentTotals.proteinG < target.minProteinG) return false;
    if (target.minFiberG !== undefined && currentTotals.fiberG < target.minFiberG) return false;
    return true;
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Optimize this meal"
      description="Deterministic search over real menu options — your constraints always win."
      width="large"
      footer={
        <>
          <button type="button" className="button button--secondary" onClick={onClose}>Close</button>
          <button type="button" className="button button--primary" disabled={!goalsSet || components.length === 0} onClick={run}>
            <SlidersHorizontal /> Find changes
          </button>
        </>
      }
    >
      <div className="optimize">
        <div className="form-grid">
          <label className="field">
            <span className="field__label">Calories at most</span>
            <span className="input-shell">
              <input className="input" type="number" min="0" step="10" value={maxCalories} placeholder="800" onChange={(event) => setMaxCalories(event.target.value)} />
              <span className="input-affix">kcal</span>
            </span>
          </label>
          <label className="field">
            <span className="field__label">Protein at least</span>
            <span className="input-shell">
              <input className="input" type="number" min="0" step="1" value={minProtein} placeholder="35" onChange={(event) => setMinProtein(event.target.value)} />
              <span className="input-affix">g</span>
            </span>
          </label>
          <label className="field">
            <span className="field__label">Fiber at least</span>
            <span className="input-shell">
              <input className="input" type="number" min="0" step="1" value={minFiber} placeholder="15" onChange={(event) => setMinFiber(event.target.value)} />
              <span className="input-affix">g</span>
            </span>
          </label>
          <div className="field">
            <span className="field__label">Most changes</span>
            <SegmentedControl value={maxChanges} onChange={setMaxChanges} label="Maximum ingredient changes" options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} size="small" />
          </div>
        </div>

        <div className="optimize__toggles">
          {([
            ['Remove items', allowRemovals, setAllowRemovals],
            ['Adjust quantities', allowQuantity, setAllowQuantity],
            ['Swap items', allowSwaps, setAllowSwaps],
          ] as const).map(([label, value, setter]) => (
            <label className="optimize__toggle" key={label}>
              <input type="checkbox" checked={value} onChange={(event) => setter(event.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
          <SegmentedControl
            value={dietary}
            onChange={setDietary}
            label="Dietary swaps"
            size="small"
            options={[{ value: 'any', label: 'Any swap' }, { value: 'vegetarian', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' }]}
          />
        </div>

        <div className="optimize__locks">
          <span className="field__label">Keep these untouched</span>
          <div className="optimize__lock-chips">
            {components.map((component) => {
              const isLocked = locked.includes(component.id);
              return (
                <button
                  type="button"
                  key={component.id}
                  className={cx('chip-button', isLocked && 'is-active')}
                  aria-pressed={isLocked}
                  onClick={() => setLocked((current) => isLocked ? current.filter((id) => id !== component.id) : [...current, component.id])}
                >
                  {isLocked ? <Lock /> : <LockOpen />} {component.food.name}
                </button>
              );
            })}
          </div>
        </div>

        {suggestions !== null && (
          <div className="optimize__results">
            {suggestions.length === 0 && (
              <EmptyState
                compact
                title={alreadyMeets && goalsSet ? 'Already meets your goals' : 'No change found within limits'}
                description={alreadyMeets && goalsSet ? 'This meal satisfies every constraint as it stands.' : 'Try allowing one more change, unlocking an item, or relaxing a constraint.'}
              />
            )}
            {suggestions.map((suggestion, index) => (
              <div className="optimize-suggestion" key={index}>
                <div className="optimize-suggestion__head">
                  <strong>{index === 0 ? 'Recommended' : `Alternative ${index}`}</strong>
                  <span className={cx('goal-chip', suggestion.meetsAllGoals ? 'goal-chip--met' : 'goal-chip--close')}>
                    {suggestion.meetsAllGoals ? 'Meets every goal' : 'Closest fit'}
                  </span>
                </div>
                <ul className="optimize-suggestion__changes">
                  {suggestion.changes.map((change) => <li key={change.componentId + change.kind}>{change.description}</li>)}
                </ul>
                <div className="optimize-suggestion__totals">
                  <span>{formatNumber(suggestion.totals.calories)} kcal · {formatNumber(suggestion.totals.proteinG)} g protein · {formatNumber(suggestion.totals.fiberG)} g fiber</span>
                  <DeltaSummary delta={suggestion.delta} />
                </div>
                <button type="button" className="button button--primary button--small" onClick={() => onApply(suggestion)}>
                  Apply changes
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Compare modal                                                       */
/* ------------------------------------------------------------------ */

export interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  original: { label: string; components: readonly MealComponent[] };
  current: { label: string; components: readonly MealComponent[] };
}

function componentCounts(components: readonly MealComponent[]): Map<string, { name: string; quantity: number }> {
  const map = new Map<string, { name: string; quantity: number }>();
  for (const component of components) {
    const entry = map.get(component.food.id) ?? { name: component.food.name, quantity: 0 };
    entry.quantity += component.quantity;
    map.set(component.food.id, entry);
  }
  return map;
}

export function describeCompositionChanges(
  before: readonly MealComponent[],
  after: readonly MealComponent[],
): string[] {
  const beforeMap = componentCounts(before);
  const afterMap = componentCounts(after);
  const changes: string[] = [];
  for (const [id, prior] of beforeMap) {
    const next = afterMap.get(id);
    if (!next) changes.push(`Removed ${prior.name}`);
    else if (Math.abs(next.quantity - prior.quantity) > 1e-9) {
      changes.push(`${prior.name} ×${formatNumber(prior.quantity, 2)} → ×${formatNumber(next.quantity, 2)}`);
    }
  }
  for (const [id, next] of afterMap) {
    if (!beforeMap.has(id)) changes.push(`Added ${next.name}${next.quantity !== 1 ? ` ×${formatNumber(next.quantity, 2)}` : ''}`);
  }
  return changes;
}

export function CompareModal({ open, onClose, original, current }: CompareModalProps) {
  const originalAnalysis = useMemo(() => analyzeMeal(original.components), [original.components]);
  const currentAnalysis = useMemo(() => analyzeMeal(current.components), [current.components]);
  const delta: Nutrition = diffNutrition(originalAnalysis.totals, currentAnalysis.totals);
  const changes = describeCompositionChanges(original.components, current.components);
  const keys: MetricKey[] = ['calories', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'sodiumMg'];
  return (
    <Modal open={open} onClose={onClose} title="Compare versions" description="Original build vs the meal as it stands now." width="medium">
      <div className="compare">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">{original.label}</th>
              <th scope="col">{current.label}</th>
              <th scope="col">Difference</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const meta = metricMeta(key);
              const value = delta[key];
              return (
                <tr key={key}>
                  <th scope="row">{meta.label}</th>
                  <td>{formatNumber(originalAnalysis.totals[key], meta.digits)} {meta.unit}</td>
                  <td>{formatNumber(currentAnalysis.totals[key], meta.digits)} {meta.unit}</td>
                  <td className={cx('compare-delta', Math.round(value) === 0 ? 'is-flat' : value < 0 ? 'is-down' : 'is-up')}>
                    {formatSigned(value)} {meta.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="compare__changes">
          <span className="field__label">Changes</span>
          {changes.length ? (
            <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul>
          ) : (
            <p className="fine-print">No composition changes yet — edit the meal to see the difference here.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Save + log dialogs                                                  */
/* ------------------------------------------------------------------ */

export interface SaveVariantModalProps {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  onSave: (name: string) => void;
}

export function SaveVariantModal({ open, onClose, defaultName, onSave }: SaveVariantModalProps) {
  const [name, setName] = useState(defaultName);
  const wasOpen = useRef(false);
  useEffect(() => {
    // Re-seed the field each time the dialog opens so a renamed meal or
    // switched restaurant is reflected, without clobbering typing mid-edit.
    if (open && !wasOpen.current) setName(defaultName);
    wasOpen.current = open;
  }, [open, defaultName]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save this version"
      description="Variants live on this device for quick reuse — they are not diary entries."
      width="small"
      footer={
        <>
          <button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="button button--primary" disabled={!name.trim()} onClick={() => { onSave(name.trim()); onClose(); }}>Save variant</button>
        </>
      }
    >
      <label className="field">
        <span className="field__label">Variant name</span>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Salata Cut" autoFocus />
      </label>
    </Modal>
  );
}

export interface LogMealModalProps {
  open: boolean;
  onClose: () => void;
  mealName: string;
  calories: number;
  onLog: (slot: MealSlot) => void;
}

const SLOT_OPTIONS: ReadonlyArray<{ value: MealSlot; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'other', label: 'Other' },
];

export function LogMealModal({ open, onClose, mealName, calories, onLog }: LogMealModalProps) {
  const [slot, setSlot] = useState<MealSlot>('lunch');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log to today's diary"
      description={`${mealName} · ${formatNumber(calories)} kcal as one immutable snapshot.`}
      width="small"
      footer={
        <>
          <button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="button button--primary" onClick={() => { onLog(slot); onClose(); }}><NotebookPen /> Log meal</button>
        </>
      }
    >
      <label className="field">
        <span className="field__label">Meal</span>
        <select className="select" value={slot} onChange={(event) => setSlot(event.target.value as MealSlot)}>
          {SLOT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </Modal>
  );
}
