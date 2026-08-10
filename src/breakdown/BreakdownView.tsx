/**
 * Breakdown: shows exactly where a meal's calories and macros come from, how
 * reliable each number is, and which ingredient changes pay off the most.
 *
 * All arithmetic is deterministic and every value is traceable to a source —
 * official restaurant guides first, USDA staples next, labelled estimates last.
 */

import {
  ArrowRightLeft,
  BookmarkPlus,
  ChefHat,
  GitCompare,
  Info,
  Layers,
  NotebookPen,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wand2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { minuteOfDay, toDateKey } from '../dates';
import { createId, type FareState, type Nutrition } from '../model';
import type { FareStore } from '../store';
import {
  EmptyState,
  Panel,
  SectionHeading,
  SegmentedControl,
  cx,
} from '../ui';
import {
  AddComponentsSheet,
  CompareModal,
  LogMealModal,
  OptimizeModal,
  SaveVariantModal,
  SourceModal,
  SwapSheet,
  describeCompositionChanges,
} from './BreakdownSheets';
import {
  ConfidenceChip,
  DeltaSummary,
  METRIC_META,
  QuantityStepper,
  formatNumber,
  metricMeta,
} from './bits';
import { useBreakdownMeals, buildDiarySnapshot } from './breakdown-store';
import { expandTemplate, restaurantById, RESTAURANTS } from './data';
import { analyzeMeal, buildInsights, diffNutrition } from './engine';
import type {
  BreakdownFood,
  BreakdownMeal,
  DishTemplate,
  Insight,
  MealComponent,
  MetricKey,
  OptimizeSuggestion,
} from './types';

type SortMode = 'share' | 'protein' | 'fiber';

interface LastChange {
  readonly description: string;
  readonly delta: Nutrition;
}

export interface BreakdownViewProps {
  state: FareState;
  store: FareStore;
  onToast: (message: string) => void;
}

function InsightRow({ insight }: { insight: Insight }) {
  const icon = insight.tone === 'warning' ? <TriangleAlert /> : insight.tone === 'positive' ? <Sparkles /> : <Info />;
  return (
    <div className={cx('insight-row', `insight-row--${insight.tone}`)}>
      <span className="insight-row__icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{insight.title}</strong>
        <p>{insight.body}</p>
      </div>
    </div>
  );
}

export function BreakdownView({ state, store, onToast }: BreakdownViewProps) {
  const [components, setComponents] = useState<readonly MealComponent[]>([]);
  const [mealName, setMealName] = useState('');
  const [restaurantId, setRestaurantId] = useState<string | undefined>(undefined);
  const [original, setOriginal] = useState<readonly MealComponent[] | null>(null);
  const [lastChange, setLastChange] = useState<LastChange | null>(null);
  const [metric, setMetric] = useState<MetricKey>('calories');
  const [sortMode, setSortMode] = useState<SortMode>('share');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<MealComponent | null>(null);
  const [sourceTarget, setSourceTarget] = useState<MealComponent | null>(null);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const variants = useBreakdownMeals();
  const analysis = useMemo(() => analyzeMeal(components), [components]);
  const insights = useMemo(() => buildInsights(analysis), [analysis]);
  const restaurant = restaurantById(restaurantId);
  const compositionChanges = useMemo(
    () => (original ? describeCompositionChanges(original, components) : []),
    [original, components],
  );
  const previousLog = useMemo(() => {
    const needle = restaurant?.name.toLowerCase();
    return state.entries
      .filter((entry) => !entry.deleted
        && entry.snapshot.provenance.providerName === 'Fare Breakdown'
        && (!needle || entry.snapshot.name.toLowerCase().includes(needle)))
      .sort((left, right) => right.consumedAt.localeCompare(left.consumedAt))[0];
  }, [state.entries, restaurant]);

  function applyComponents(next: readonly MealComponent[], description: string) {
    const delta = diffNutrition(analysis.totals, analyzeMeal(next).totals);
    setComponents(next);
    setLastChange({ description, delta });
  }

  function addFood(food: BreakdownFood, quantity: number) {
    const existing = components.find((component) => component.food.id === food.id && component.food.sourceType === food.sourceType);
    if (existing) {
      applyComponents(
        components.map((component) => component.id === existing.id
          ? { ...component, quantity: Math.round((component.quantity + quantity) * 100) / 100 }
          : component),
        `Added ${food.name}`,
      );
      return;
    }
    applyComponents([...components, { id: createId('comp'), food, quantity }], `Added ${food.name}`);
  }

  function addTemplate(template: DishTemplate) {
    const expanded = expandTemplate(template);
    if (!expanded.length) return;
    applyComponents([...components, ...expanded], `Added ${template.name} (recipe estimate)`);
  }

  function setQuantity(component: MealComponent, quantity: number) {
    if (Math.abs(quantity - component.quantity) < 1e-9) return;
    applyComponents(
      components.map((candidate) => candidate.id === component.id ? { ...candidate, quantity } : candidate),
      `${component.food.name} ×${formatNumber(component.quantity, 2)} → ×${formatNumber(quantity, 2)}`,
    );
  }

  function removeComponent(component: MealComponent) {
    applyComponents(
      components.filter((candidate) => candidate.id !== component.id),
      `Removed ${component.food.name}`,
    );
  }

  function swapComponent(component: MealComponent, food: BreakdownFood) {
    applyComponents(
      components.map((candidate) => candidate.id === component.id ? { ...candidate, food } : candidate),
      `${component.food.name} → ${food.name}`,
    );
    setSwapTarget(null);
  }

  function applySuggestion(suggestion: OptimizeSuggestion) {
    setComponents(suggestion.components);
    setLastChange({
      description: suggestion.changes.map((change) => change.description).join(' · '),
      delta: suggestion.delta,
    });
    setOptimizeOpen(false);
    onToast('Optimization applied. Compare shows the difference from your original build.');
  }

  function loadVariant(meal: BreakdownMeal) {
    setComponents(meal.components);
    setOriginal(meal.components);
    setMealName(meal.name);
    setRestaurantId(meal.restaurantId);
    setLastChange(null);
    onToast(`Loaded “${meal.name}”.`);
  }

  function startOver() {
    setComponents([]);
    setOriginal(null);
    setMealName('');
    setRestaurantId(undefined);
    setLastChange(null);
  }

  function closePicker() {
    setPickerOpen(false);
    if (original === null && components.length > 0) setOriginal(components);
  }

  function fallbackName() {
    return mealName.trim() || (restaurant ? `${restaurant.name} meal` : 'Breakdown meal');
  }

  function logMeal(slot: Parameters<typeof store.addEntry>[0]['mealSlot']) {
    const now = new Date();
    const entry = store.addEntry({
      dateKey: toDateKey(now),
      consumedAt: now.toISOString(),
      consumedMinute: minuteOfDay(now),
      mealSlot: slot,
      origin: 'quick-add',
      snapshot: buildDiarySnapshot(fallbackName(), analysis),
    });
    onToast(entry ? `${fallbackName()} logged to ${slot}.` : 'The meal could not be logged.');
  }

  const sortedContributions = useMemo(() => {
    const list = [...analysis.contributions];
    if (sortMode === 'protein') return list.sort((a, b) => b.proteinEfficiency - a.proteinEfficiency);
    if (sortMode === 'fiber') return list.sort((a, b) => b.fiberEfficiency - a.fiberEfficiency);
    return list.sort((a, b) => b.nutrition[metric] - a.nutrition[metric]);
  }, [analysis.contributions, sortMode, metric]);

  const meta = metricMeta(metric);
  const barMax = useMemo(() => {
    if (sortMode === 'protein') return Math.max(1, ...sortedContributions.map((c) => c.proteinEfficiency));
    if (sortMode === 'fiber') return Math.max(1, ...sortedContributions.map((c) => c.fiberEfficiency));
    return Math.max(1e-9, ...sortedContributions.map((c) => c.nutrition[metric]));
  }, [sortedContributions, sortMode, metric]);

  const showRange = analysis.hasEstimates && analysis.calorieRange.low !== analysis.calorieRange.high;

  if (components.length === 0) {
    return (
      <div className="page page-stack">
        <SectionHeading
          size="large"
          eyebrow="Fare / Breakdown"
          title="Where do the numbers come from?"
          description="Build a meal from official restaurant data, pantry staples, or plain words — then see exactly which components drive the calories, protein, and fiber."
        />
        <Panel variant="raised" padding="roomy">
          <SectionHeading title="Start from a restaurant" size="small" description="Curated from each chain's published nutrition guide." />
          <div className="restaurant-tiles">
            {RESTAURANTS.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                className="restaurant-tile"
                onClick={() => { setRestaurantId(candidate.id); setPickerOpen(true); }}
              >
                <span className="restaurant-tile__icon"><ChefHat /></span>
                <strong>{candidate.name}</strong>
                <span>{candidate.items.length} items · checked {candidate.lastVerified}</span>
              </button>
            ))}
            <button type="button" className="restaurant-tile restaurant-tile--alt" onClick={() => setPickerOpen(true)}>
              <span className="restaurant-tile__icon"><Wand2 /></span>
              <strong>Anything else</strong>
              <span>Pantry staples, Indian dishes, or describe it in words</span>
            </button>
          </div>
        </Panel>
        {variants.savedMeals.length > 0 && (
          <Panel>
            <SectionHeading title="Saved variants" size="small" description="Versions you kept on this device." />
            <div className="list">
              {variants.savedMeals.map((meal) => (
                <article className="list-row" key={meal.id}>
                  <span className="list-row__icon"><Layers /></span>
                  <span className="list-row__copy">
                    <strong className="list-row__title">{meal.name}</strong>
                    <span className="list-row__detail">{meal.components.length} components · {formatNumber(analyzeMeal(meal.components).totals.calories)} kcal</span>
                  </span>
                  <button type="button" className="button button--secondary button--small" onClick={() => loadVariant(meal)}>Load</button>
                  <button type="button" className="icon-button icon-button--danger icon-button--small" aria-label={`Delete ${meal.name}`} title={`Delete ${meal.name}`} onClick={() => variants.deleteMeal(meal.id)}><Trash2 /></button>
                </article>
              ))}
            </div>
          </Panel>
        )}
        <AddComponentsSheet
          open={pickerOpen}
          onClose={closePicker}
          restaurantId={restaurantId}
          onPickRestaurant={setRestaurantId}
          onAddFood={addFood}
          onAddTemplate={addTemplate}
          mealCalories={analysis.totals.calories}
          componentCount={components.length}
        />
      </div>
    );
  }

  return (
    <div className="page page-stack">
      <SectionHeading
        size="large"
        eyebrow={restaurant ? `Fare / Breakdown / ${restaurant.name}` : 'Fare / Breakdown'}
        title={
          <input
            className="breakdown-name"
            value={mealName}
            onChange={(event) => setMealName(event.target.value)}
            placeholder={restaurant ? `${restaurant.name} meal` : 'Name this meal'}
            aria-label="Meal name"
          />
        }
        action={
          <div className="breakdown-actions">
            <button type="button" className="button button--secondary button--small" onClick={() => setPickerOpen(true)}><Plus /> Add items</button>
            <button type="button" className="button button--secondary button--small" onClick={() => setOptimizeOpen(true)}><SlidersHorizontal /> Optimize</button>
            <button type="button" className="button button--secondary button--small" disabled={!original || compositionChanges.length === 0} onClick={() => setCompareOpen(true)}><GitCompare /> Compare</button>
            <button type="button" className="button button--secondary button--small" onClick={() => setSaveOpen(true)}><BookmarkPlus /> Save</button>
            <button type="button" className="button button--primary button--small" onClick={() => setLogOpen(true)}><NotebookPen /> Log</button>
            <button type="button" className="button button--outline button--small" onClick={startOver}><RotateCcw /> Start over</button>
          </div>
        }
      />

      <Panel variant="raised" padding="roomy" className="breakdown-hero">
        <div className="breakdown-hero__total">
          <span className="eyebrow">Estimated total</span>
          <strong className="breakdown-hero__kcal">
            {analysis.hasEstimates ? '≈ ' : ''}{formatNumber(analysis.totals.calories)}
            <small> kcal</small>
          </strong>
          {showRange && (
            <span className="breakdown-hero__range">
              likely {formatNumber(analysis.calorieRange.low)}–{formatNumber(analysis.calorieRange.high)} kcal depending on portions
            </span>
          )}
          <div className="breakdown-hero__badges">
            <ConfidenceChip confidence={analysis.confidence} />
            {restaurant && <span className="fine-print">Official {restaurant.name} data, checked {restaurant.lastVerified}</span>}
          </div>
        </div>
        <div className="breakdown-hero__macros">
          {METRIC_META.filter((entry) => entry.key !== 'calories').map((entry) => (
            <div className={cx('macro-tile', `macro-tile--${entry.key}`)} key={entry.key}>
              <span className="macro-tile__label">{entry.label}</span>
              <strong>{formatNumber(analysis.totals[entry.key], entry.digits)}<small> {entry.unit}</small></strong>
            </div>
          ))}
        </div>
        {lastChange && (
          <div className="delta-banner" role="status">
            <span className="delta-banner__label">{lastChange.description}</span>
            <DeltaSummary delta={lastChange.delta} />
          </div>
        )}
        {previousLog && (
          <p className="breakdown-hero__history">
            Last time you logged “{previousLog.snapshot.name}” ({previousLog.dateKey}) it was {formatNumber(previousLog.snapshot.nutrition.calories)} kcal — this build is {formatNumber(Math.abs(analysis.totals.calories - previousLog.snapshot.nutrition.calories))} kcal {analysis.totals.calories >= previousLog.snapshot.nutrition.calories ? 'more' : 'less'}.
          </p>
        )}
      </Panel>

      <Panel className="breakdown-chart">
        <div className="breakdown-chart__controls">
          <SectionHeading title={`Where the ${meta.short === 'kcal' ? 'calories' : meta.short} came from`} size="small" />
          <div className="breakdown-chart__switches">
            <div className="metric-switch">
              <SegmentedControl
                value={metric}
                onChange={setMetric}
                label="Breakdown metric"
                size="small"
                options={METRIC_META.map((entry) => ({ value: entry.key, label: entry.label }))}
              />
            </div>
            <SegmentedControl
              value={sortMode}
              onChange={setSortMode}
              label="Sort components"
              size="small"
              options={[
                { value: 'share', label: 'Share' },
                { value: 'protein', label: 'Protein / 100 kcal' },
                { value: 'fiber', label: 'Fiber / 100 kcal' },
              ]}
            />
          </div>
        </div>
        <div className="contribution-list">
          {sortedContributions.map((contribution) => {
            const value = sortMode === 'protein'
              ? contribution.proteinEfficiency
              : sortMode === 'fiber'
                ? contribution.fiberEfficiency
                : contribution.nutrition[metric];
            const share = contribution.share[metric];
            return (
              <button
                type="button"
                className="contribution-row"
                key={contribution.component.id}
                onClick={() => setSourceTarget(contribution.component)}
                title="See the source of this value"
              >
                <span className="contribution-row__head">
                  <span className="contribution-row__name">
                    {contribution.component.food.name}
                    {contribution.component.quantity !== 1 && <em> ×{formatNumber(contribution.component.quantity, 2)}</em>}
                  </span>
                  <span className="contribution-row__value">
                    {sortMode === 'share'
                      ? `${formatNumber(value, meta.digits)} ${meta.unit} · ${formatNumber(share * 100)}%`
                      : `${formatNumber(value, 1)} g / 100 kcal`}
                  </span>
                </span>
                <span className="contribution-row__track">
                  <span
                    className={cx('contribution-row__bar', `contribution-row__bar--${metric}`)}
                    style={{ width: `${Math.max(2, (value / barMax) * 100)}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="card-grid card-grid--two breakdown-lower">
        <Panel>
          <SectionHeading
            title="Components"
            size="small"
            description="Tap a row for its source. Every edit recalculates instantly."
            action={<button type="button" className="text-button" onClick={() => setPickerOpen(true)}><Plus /> Add</button>}
          />
          <div className="component-list">
            {analysis.contributions.map((contribution) => {
              const component = contribution.component;
              return (
                <article className="component-row" key={component.id}>
                  <button type="button" className="component-row__main" onClick={() => setSourceTarget(component)}>
                    <span className="component-row__copy">
                      <strong>{component.food.name}</strong>
                      <span className="component-row__detail">
                        ×{formatNumber(component.quantity, 2)} · {component.food.servingLabel}
                      </span>
                      <span className="component-row__badges">
                        <ConfidenceChip confidence={component.food.confidence} compact />
                        <span className="component-row__source">{component.food.sourceType === 'restaurant-official' ? restaurantById(component.food.restaurantId)?.name ?? 'Official' : component.food.sourceType === 'usda-generic' ? 'USDA' : 'Estimate'}</span>
                      </span>
                    </span>
                    <span className="component-row__value">
                      {formatNumber(contribution.nutrition.calories)}<small> kcal</small>
                      <span className="component-row__share">{formatNumber(contribution.share.calories * 100)}%</span>
                    </span>
                  </button>
                  <div className="component-row__tools">
                    <QuantityControls component={component} onSetQuantity={setQuantity} onSwap={() => setSwapTarget(component)} onRemove={() => removeComponent(component)} />
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>

        <div className="page-stack breakdown-side">
          <Panel>
            <SectionHeading title="What is costing you" size="small" description="Deterministic reads on this exact meal — no guesswork." />
            {insights.length ? (
              <div className="insight-list">{insights.map((insight) => <InsightRow key={insight.id} insight={insight} />)}</div>
            ) : (
              <EmptyState compact title="Add components" description="Insights appear once the meal has substance." />
            )}
          </Panel>
          <Panel>
            <SectionHeading title="Saved variants" size="small" action={<button type="button" className="text-button" onClick={() => setSaveOpen(true)}><BookmarkPlus /> Save current</button>} />
            {variants.savedMeals.length ? (
              <div className="list">
                {variants.savedMeals.map((meal) => (
                  <article className="list-row" key={meal.id}>
                    <span className="list-row__icon"><Layers /></span>
                    <span className="list-row__copy">
                      <strong className="list-row__title">{meal.name}</strong>
                      <span className="list-row__detail">{meal.components.length} components · {formatNumber(analyzeMeal(meal.components).totals.calories)} kcal</span>
                    </span>
                    <button type="button" className="button button--secondary button--small" onClick={() => loadVariant(meal)}>Load</button>
                    <button type="button" className="icon-button icon-button--danger icon-button--small" aria-label={`Delete ${meal.name}`} title={`Delete ${meal.name}`} onClick={() => variants.deleteMeal(meal.id)}><Trash2 /></button>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState compact title="No variants yet" description="Save “Salata Heavy” and “Salata Cut” style versions for quick reuse." />
            )}
          </Panel>
        </div>
      </div>

      <AddComponentsSheet
        open={pickerOpen}
        onClose={closePicker}
        restaurantId={restaurantId}
        onPickRestaurant={setRestaurantId}
        onAddFood={addFood}
        onAddTemplate={addTemplate}
        mealCalories={analysis.totals.calories}
        componentCount={components.length}
      />
      <SwapSheet component={swapTarget} onClose={() => setSwapTarget(null)} onSwap={swapComponent} />
      <SourceModal component={sourceTarget} onClose={() => setSourceTarget(null)} onSetQuantity={(component, quantity) => { setQuantity(component, quantity); setSourceTarget(null); }} />
      <OptimizeModal open={optimizeOpen} onClose={() => setOptimizeOpen(false)} components={components} restaurantId={restaurantId} onApply={applySuggestion} />
      {original && (
        <CompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          original={{ label: 'Original', components: original }}
          current={{ label: mealName.trim() || 'Current', components }}
        />
      )}
      <SaveVariantModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        defaultName={fallbackName()}
        onSave={(name) => { variants.saveMeal(name, components, restaurantId); onToast(`“${name}” saved on this device.`); }}
      />
      <LogMealModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        mealName={fallbackName()}
        calories={analysis.totals.calories}
        onLog={logMeal}
      />
    </div>
  );
}

function QuantityControls({
  component,
  onSetQuantity,
  onSwap,
  onRemove,
}: {
  component: MealComponent;
  onSetQuantity: (component: MealComponent, quantity: number) => void;
  onSwap: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <QuantityStepper value={component.quantity} onChange={(next) => onSetQuantity(component, next)} label={component.food.name} />
      <button type="button" className="icon-button icon-button--small" aria-label={`Swap ${component.food.name}`} title={`Swap ${component.food.name}`} onClick={onSwap}><ArrowRightLeft /></button>
      <button type="button" className="icon-button icon-button--danger icon-button--small" aria-label={`Remove ${component.food.name}`} title={`Remove ${component.food.name}`} onClick={onRemove}><Trash2 /></button>
    </>
  );
}
