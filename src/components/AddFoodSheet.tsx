import {
  AlertTriangle,
  ArrowLeft,
  ChefHat,
  Clock3,
  Database,
  LoaderCircle,
  PackageSearch,
  Plus,
  ScanBarcode,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { rankUsuals, type UsualSuggestion } from '../memory';
import type { CatalogFood } from '../food-catalog/types';
import {
  loadUsdaCatalog,
  menuFoodToCatalog,
  searchLocalCatalog,
  type LocalCatalogResults,
} from '../food-catalog/search';
import {
  GENERIC_FOODS,
  RESTAURANTS,
  restaurantById,
} from '../breakdown/data';
import type { BreakdownFood } from '../breakdown/types';
import {
  createNutritionSnapshot,
  type FareState,
  type Food,
  type MealSlot,
  type Nutrition,
  type NutritionDataQuality,
  type NutritionProvenance,
  type SavedMeal,
} from '../model';
import {
  OpenFoodFactsClient,
  OpenFoodFactsRateLimitError,
  type OpenFoodFactsProduct,
} from '../open-food-facts';
import { addNutrition, scaleNutrition } from '../nutrition';
import type { FareStore } from '../store';
import {
  BottomSheet,
  EmptyState,
  Panel,
  SegmentedControl,
  SourceBadge,
  type SourceKind,
} from '../ui';
import { BarcodeScanner } from './BarcodeScanner';
import { ServingAmount } from './ServingAmount';

type Lane = 'usuals' | 'search' | 'restaurants' | 'quick';
type LoadingKind = 'search' | 'barcode' | null;
type Selection =
  | { kind: 'food'; food: Food }
  | { kind: 'catalog'; item: CatalogFood };

const EMPTY_CATALOG: LocalCatalogResults = { menus: [], usda: [] };

export interface AddFoodSheetProps {
  open: boolean;
  onClose: () => void;
  state: FareState;
  store: FareStore;
  dateKey: string;
  defaultMealSlot: MealSlot;
  onToast: (message: string) => void;
}

const LANES = [
  { value: 'usuals', label: 'Usuals', icon: <Sparkles /> },
  { value: 'search', label: 'Search', icon: <Search /> },
  { value: 'restaurants', label: 'Restaurants', icon: <ChefHat /> },
  { value: 'quick', label: 'Quick add', icon: <Zap /> },
] as const;

const MEAL_SLOTS: ReadonlyArray<{ value: MealSlot; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'other', label: 'Other' },
];

const EMPTY_NUMBERS = {
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
  saturatedFatG: '',
  fiberG: '',
  sugarG: '',
  sodiumMg: '',
};

const stack: CSSProperties = { display: 'grid', gap: 16 };
const compactStack: CSSProperties = { display: 'grid', gap: 10 };
const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};
const muted: CSSProperties = { color: 'var(--text-muted)', fontSize: 12, margin: 0 };

function nonNegative(raw: string): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function nutritionFromFields(fields: typeof EMPTY_NUMBERS): Nutrition {
  return {
    calories: nonNegative(fields.calories),
    proteinG: nonNegative(fields.proteinG),
    carbsG: nonNegative(fields.carbsG),
    fatG: nonNegative(fields.fatG),
    saturatedFatG: nonNegative(fields.saturatedFatG),
    fiberG: nonNegative(fields.fiberG),
    sugarG: nonNegative(fields.sugarG),
    sodiumMg: nonNegative(fields.sodiumMg),
  };
}

function sourceKind(provenance: NutritionProvenance): SourceKind {
  if (provenance.dataQuality === 'verified') return 'verified';
  if (provenance.kind === 'open-food-facts') {
    return provenance.dataQuality === 'complete' ? 'database' : 'estimated';
  }
  if (provenance.kind === 'usda' || provenance.kind === 'restaurant-guide') {
    return provenance.dataQuality === 'complete' ? 'database' : 'estimated';
  }
  if (provenance.kind === 'saved-food' || provenance.kind === 'saved-meal') return 'history';
  return 'custom';
}

function catalogFromOpenFoodFacts(product: OpenFoodFactsProduct): CatalogFood {
  return {
    id: `off:${product.barcode}`,
    name: product.name,
    brand: product.brand,
    serving: product.serving,
    nutritionPerServing: product.nutritionPerServing,
    provenance: product.provenance,
    categories: product.categories,
    barcode: product.barcode,
    imageUrl: product.imageUrl,
    detail: product.nutriScore ? `Nutri-Score ${product.nutriScore}` : undefined,
  };
}

function qualityLabel(quality: NutritionDataQuality) {
  return quality === 'verified'
    ? 'High completeness'
    : quality === 'complete'
      ? 'Complete macros'
      : quality === 'partial'
        ? 'Partial nutrition'
        : 'Nutrition incomplete';
}

function formatAmount(value: number, digits = 0) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function NutritionLine({ nutrition }: { nutrition: Nutrition }) {
  return (
    <div className="food-result__nutrition" aria-label="Nutrition summary">
      <span><strong>{formatAmount(nutrition.calories)}</strong> kcal</span>
      <span><strong>{formatAmount(nutrition.proteinG, 1)}g</strong> protein</span>
      <span><strong>{formatAmount(nutrition.carbsG, 1)}g</strong> carbs</span>
      <span><strong>{formatAmount(nutrition.fatG, 1)}g</strong> fat</span>
    </div>
  );
}

function ProvenanceNote({ provenance }: { provenance: NutritionProvenance }) {
  return (
    <Panel variant="soft" padding="compact" style={compactStack}>
      <div style={row}>
        <SourceBadge source={sourceKind(provenance)} label={`${provenance.providerName} · ${qualityLabel(provenance.dataQuality)}`} />
        {provenance.sourceUrl ? (
          <a
            className="text-button"
            href={provenance.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
        ) : null}
      </div>
      {provenance.warnings.length > 0 ? (
        <div className="notice notice--warning" role="note">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            {provenance.warnings.map((warning) => <div key={warning}>{warning}</div>)}
          </div>
        </div>
      ) : (
        <p style={muted}>Nutrition is stored as a snapshot when you log it, so earlier diary entries never change silently.</p>
      )}
    </Panel>
  );
}

function FoodResult({
  name,
  brand,
  servingLabel,
  nutrition,
  provenance,
  detail,
  onSelect,
}: {
  name: string;
  brand?: string;
  servingLabel: string;
  nutrition: Nutrition;
  provenance: NutritionProvenance;
  detail?: string;
  onSelect: () => void;
}) {
  return (
    <div className="food-result">
      <div>
        <div className="food-result__name">{name}</div>
        <div className="food-result__brand">
          {[brand, servingLabel, detail].filter(Boolean).join(' · ')}
        </div>
        <NutritionLine nutrition={nutrition} />
        <div style={{ marginTop: 8 }}>
          <SourceBadge source={sourceKind(provenance)} label={provenance.providerName} />
        </div>
      </div>
      <div className="food-result__actions">
        <button type="button" className="button button--secondary button--small" onClick={onSelect}>
          Add
        </button>
      </div>
    </div>
  );
}

function servesOfficialData(items: readonly BreakdownFood[]): boolean {
  return items[0]?.sourceType === 'restaurant-official';
}

function formatMenuKcal(food: BreakdownFood): string {
  return Math.round(food.nutrition.calories).toLocaleString();
}

function mealNutrition(meal: SavedMeal): Nutrition {
  return addNutrition(...meal.items.map((item) =>
    scaleNutrition(item.snapshot.nutritionPerServing, item.servings),
  ));
}

function shouldAutoFocusSearch() {
  // On touch devices auto-focus pops the keyboard mid sheet animation, so only desktop pointers get it.
  return typeof window !== 'undefined'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function friendlyApiError(error: unknown) {
  if (!navigator.onLine) return 'You are offline. Local foods and Usuals still work.';
  if (error instanceof OpenFoodFactsRateLimitError) {
    return `Open Food Facts needs a short pause. Try again in ${Math.max(1, Math.ceil(error.retryAfterMs / 1_000))} seconds.`;
  }
  if (error instanceof RangeError) return error.message;
  return 'Open Food Facts could not be reached. Your local Fare data is unchanged.';
}

export function AddFoodSheet({
  open,
  onClose,
  state,
  store,
  dateKey,
  defaultMealSlot,
  onToast,
}: AddFoodSheetProps) {
  const apiRef = useRef<OpenFoodFactsClient | null>(null);
  if (!apiRef.current) apiRef.current = new OpenFoodFactsClient();

  const requestRef = useRef<AbortController | null>(null);
  const [lane, setLane] = useState<Lane>('usuals');
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultMealSlot);
  const [query, setQuery] = useState('');
  const [apiQuery, setApiQuery] = useState('');
  const [apiProducts, setApiProducts] = useState<readonly OpenFoodFactsProduct[]>([]);
  const [loading, setLoading] = useState<LoadingKind>(null);
  const [error, setError] = useState<string>();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>();
  const [servings, setServings] = useState(1);
  const [note, setNote] = useState('');
  const [catalogReady, setCatalogReady] = useState(false);
  const [quickName, setQuickName] = useState('Quick add');
  const [quickFields, setQuickFields] = useState({ ...EMPTY_NUMBERS });
  const [menuId, setMenuId] = useState<string>();
  const [menuQuery, setMenuQuery] = useState('');

  const localUsuals = useMemo(() => rankUsuals(state, {
    dateKey,
    mealSlot,
    minuteOfDay: new Date().getHours() * 60 + new Date().getMinutes(),
    limit: 10,
  }), [dateKey, mealSlot, state]);

  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    return rankUsuals(state, {
      dateKey,
      mealSlot,
      minuteOfDay: new Date().getHours() * 60 + new Date().getMinutes(),
      query,
      limit: 20,
    });
  }, [dateKey, mealSlot, query, state]);

  const catalogHits = useMemo(() => {
    if (!catalogReady || query.trim().length < 2) return EMPTY_CATALOG;
    return searchLocalCatalog(query, { limit: 12 });
  }, [catalogReady, query]);

  const selectedRestaurant = restaurantById(menuId);
  const restaurantFoods = useMemo(() => {
    const all = menuId === 'pantry' ? GENERIC_FOODS : selectedRestaurant?.items ?? [];
    const needle = menuQuery.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((food) =>
      food.name.toLowerCase().includes(needle)
      || food.category.toLowerCase().includes(needle)
      || (food.aliases ?? []).some((alias) => alias.toLowerCase().includes(needle)),
    );
  }, [menuId, menuQuery, selectedRestaurant]);
  const restaurantCategories = useMemo(() => {
    const groups = new Map<string, BreakdownFood[]>();
    for (const food of restaurantFoods) {
      const list = groups.get(food.category) ?? [];
      list.push(food);
      groups.set(food.category, list);
    }
    const preferred = menuId === 'pantry' ? [] : selectedRestaurant?.categories ?? [];
    const ordered: Array<[string, BreakdownFood[]]> = [];
    for (const category of preferred) {
      const foods = groups.get(category);
      if (foods) ordered.push([category, foods]);
    }
    for (const [category, foods] of groups) {
      if (!preferred.includes(category)) ordered.push([category, foods]);
    }
    return ordered;
  }, [menuId, restaurantFoods, selectedRestaurant]);

  useEffect(() => {
    if (open) {
      setMealSlot(defaultMealSlot);
      setLane('usuals');
      setSelection(undefined);
      setError(undefined);
      setServings(1);
      setNote('');
      setMenuId(undefined);
      setMenuQuery('');
      void loadUsdaCatalog().then(() => setCatalogReady(true));
      return;
    }
    requestRef.current?.abort();
    requestRef.current = null;
    setScannerOpen(false);
    setLoading(null);
  }, [defaultMealSlot, open]);

  useEffect(() => () => requestRef.current?.abort(), []);

  function closeSheet() {
    requestRef.current?.abort();
    requestRef.current = null;
    setScannerOpen(false);
    setSelection(undefined);
    setLoading(null);
    onClose();
  }

  function beginFood(food: Food) {
    setSelection({ kind: 'food', food });
    setServings(1);
    setNote('');
    setError(undefined);
  }

  function beginCatalog(item: CatalogFood) {
    setSelection({ kind: 'catalog', item });
    setServings(1);
    setNote('');
    setError(undefined);
  }

  function logMeal(meal: SavedMeal) {
    const entries = store.logMeal(meal, { dateKey, mealSlot });
    if (entries.length === 0) {
      setError('This saved meal does not contain any foods yet.');
      return;
    }
    onToast(`${meal.name} added to ${mealSlot}.`);
    closeSheet();
  }

  function selectUsual(suggestion: UsualSuggestion) {
    if (suggestion.food) beginFood(suggestion.food);
    else if (suggestion.meal) logMeal(suggestion.meal);
  }

  async function searchDatabase(event: FormEvent) {
    event.preventDefault();
    const submitted = query.trim();
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading('search');
    setError(undefined);
    try {
      const result = await apiRef.current!.searchOnSubmit(submitted, {
        limit: 12,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setApiQuery(result.query);
      setApiProducts(result.products);
      if (result.products.length === 0) {
        setError(`No packaged products matched “${result.query}”. USDA and restaurant foods above still work, or use Quick add.`);
      }
    } catch (nextError) {
      if (!controller.signal.aborted) setError(friendlyApiError(nextError));
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(null);
      }
    }
  }

  const lookupBarcode = useCallback(async (barcode: string) => {
    setScannerOpen(false);
    setLane('search');
    setError(undefined);

    const saved = state.foods.find((food) => !food.deleted && food.barcode === barcode);
    if (saved) {
      beginFood(saved);
      onToast('Found this barcode in your Fare library.');
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading('barcode');
    try {
      const product = await apiRef.current!.lookupBarcode(barcode, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!product) {
        setError('That barcode is not in Open Food Facts yet. Quick-add it instead.');
        setLane('quick');
        return;
      }
      beginCatalog(catalogFromOpenFoodFacts(product));
    } catch (nextError) {
      if (!controller.signal.aborted) setError(friendlyApiError(nextError));
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(null);
      }
    }
  }, [onToast, state.foods]);

  function confirmFood() {
    if (!selection) return;
    const count = servings;
    if (!Number.isFinite(count) || count <= 0) {
      setError('Choose an amount greater than zero.');
      return;
    }

    let food: Food | undefined;
    if (selection.kind === 'food') {
      food = selection.food;
    } else {
      const item = selection.item;
      food = state.foods.find((candidate) =>
        !candidate.deleted && (
          Boolean(item.barcode && candidate.barcode === item.barcode)
          || Boolean(
            item.provenance.externalId
            && candidate.provenance.kind === item.provenance.kind
            && candidate.provenance.externalId === item.provenance.externalId
          )
        ),
      );
      food ??= store.addFood({
        name: item.name,
        brand: item.brand,
        aliases: [...(item.aliases ?? []), ...item.categories.slice(0, 6)],
        imageUrl: item.imageUrl,
        barcode: item.barcode,
        serving: {
          ...item.serving,
          quantity: Math.max(0.000001, item.serving.quantity),
        },
        nutritionPerServing: item.nutritionPerServing,
        provenance: item.provenance,
        pinned: false,
      });
    }

    if (!food) {
      setError('Fare could not save this food. Try again.');
      return;
    }
    const entry = store.logFood(food, {
      dateKey,
      mealSlot,
      servings: count,
      note: note.trim() || undefined,
    });
    if (!entry) {
      setError('Fare could not add this diary entry. Try again.');
      return;
    }
    onToast(`${food.name} added to ${mealSlot}.`);
    closeSheet();
  }

  function submitQuickAdd(event: FormEvent) {
    event.preventDefault();
    const nutrition = nutritionFromFields(quickFields);
    if (nutrition.calories <= 0) {
      setError('Enter calories for this quick add.');
      return;
    }
    const hasMacros = nutrition.proteinG > 0 || nutrition.carbsG > 0 || nutrition.fatG > 0;
    const warnings = hasMacros ? [] : ['Macros were not entered for this quick add.'];
    const name = quickName.trim() || 'Quick add';
    const entry = store.addEntry({
      dateKey,
      consumedAt: new Date().toISOString(),
      mealSlot,
      origin: 'quick-add',
      snapshot: createNutritionSnapshot({
        name,
        serving: { quantity: 1, unit: 'entry', label: '1 quick entry' },
        servings: 1,
        nutritionPerServing: nutrition,
        nutrition,
        provenance: {
          kind: 'manual',
          providerName: 'Fare quick add',
          dataQuality: hasMacros ? 'complete' : 'partial',
          warnings,
        },
      }),
    });
    if (!entry) {
      setError('Fare could not add this diary entry. Try again.');
      return;
    }
    onToast(`${name} added to ${mealSlot}.`);
    closeSheet();
  }

  const selectedName = selection?.kind === 'food' ? selection.food.name : selection?.item.name;
  const selectedBrand = selection?.kind === 'food' ? selection.food.brand : selection?.item.brand;
  const selectedServing = selection?.kind === 'food' ? selection.food.serving : selection?.item.serving;
  const selectedNutrition = selection?.kind === 'food'
    ? selection.food.nutritionPerServing
    : selection?.item.nutritionPerServing;
  const selectedProvenance = selection?.kind === 'food'
    ? selection.food.provenance
    : selection?.item.provenance;
  const servingCount = servings;

  function renderSuggestion(suggestion: UsualSuggestion) {
    const nutrition = suggestion.food
      ? suggestion.food.nutritionPerServing
      : suggestion.meal
        ? mealNutrition(suggestion.meal)
        : undefined;
    if (!nutrition) return null;
    return (
      <FoodResult
        key={`${suggestion.kind}-${suggestion.id}`}
        name={suggestion.name}
        brand={suggestion.brand}
        servingLabel={suggestion.kind === 'meal' ? `${suggestion.meal?.items.length ?? 0} foods` : suggestion.food?.serving.label ?? '1 serving'}
        nutrition={nutrition}
        provenance={suggestion.food?.provenance ?? {
          kind: 'saved-meal',
          providerName: 'Saved meal',
          dataQuality: 'complete',
          warnings: [],
        }}
        detail={suggestion.timesLogged > 0 ? `logged ${suggestion.timesLogged}×` : 'saved locally'}
        onSelect={() => selectUsual(suggestion)}
      />
    );
  }

  function nutritionFields(
    values: typeof EMPTY_NUMBERS,
    setValues: (values: typeof EMPTY_NUMBERS) => void,
  ) {
    const fields: Array<{ key: keyof typeof EMPTY_NUMBERS; label: string; suffix: string; required?: boolean }> = [
      { key: 'calories', label: 'Calories', suffix: 'kcal', required: true },
      { key: 'proteinG', label: 'Protein', suffix: 'g' },
      { key: 'carbsG', label: 'Carbs', suffix: 'g' },
      { key: 'fatG', label: 'Fat', suffix: 'g' },
      { key: 'fiberG', label: 'Fiber', suffix: 'g' },
      { key: 'sugarG', label: 'Sugar', suffix: 'g' },
      { key: 'saturatedFatG', label: 'Saturated fat', suffix: 'g' },
      { key: 'sodiumMg', label: 'Sodium', suffix: 'mg' },
    ];
    return fields.map((field) => (
      <label className="field" key={field.key}>
        <span className="field__label">{field.label}{field.required ? '' : ' (optional)'}</span>
        <span className="input-shell">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            required={field.required}
            value={values[field.key]}
            onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
          />
          <span className="input-affix">{field.suffix}</span>
        </span>
      </label>
    ));
  }

  const sheetTitle = selection ? 'Choose the amount' : 'Add food';
  const sheetDescription = selection
    ? `Log ${selectedName ?? 'this food'} without changing its saved nutrition.`
    : 'Fare checks your own history first. Online food data is fetched only when you ask.';

  return (
    <>
      <BottomSheet
        open={open}
        onClose={closeSheet}
        title={sheetTitle}
        description={sheetDescription}
        width="large"
        className="add-food-sheet"
      >
        {selection && selectedServing && selectedNutrition && selectedProvenance ? (
          <div style={stack}>
            <button type="button" className="text-button" style={{ justifySelf: 'start' }} onClick={() => {
              setSelection(undefined);
              setError(undefined);
            }}>
              <ArrowLeft size={16} /> Back to foods
            </button>

            <Panel variant="outline" padding="default" style={stack}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-strong)', fontSize: 20 }}>{selectedName}</h3>
                <p style={{ ...muted, marginTop: 3 }}>
                  {[selectedBrand, selectedServing.label].filter(Boolean).join(' · ')}
                </p>
              </div>
              <ServingAmount
                value={servings}
                onChange={setServings}
                servingLabel={selectedServing.label}
                nutrition={selectedNutrition}
              />
              <label className="field">
                <span className="field__label">Note <span className="field__optional">optional</span></span>
                <input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. after workout" />
              </label>
            </Panel>

            <ProvenanceNote provenance={selectedProvenance} />
            {selection.kind === 'catalog' && selection.item.provenance.kind === 'open-food-facts' ? (
              <p style={muted}>
                Product data is provided by Open Food Facts under its database terms. Fare saves this exact nutrition version before logging it.
              </p>
            ) : null}
            {selection.kind === 'catalog' && selection.item.provenance.kind === 'usda' ? (
              <p style={muted}>
                USDA FoodData Central values are for a typical portion. Fare stores this snapshot when you log it, so later catalog updates never rewrite this day.
              </p>
            ) : null}
            {selection.kind === 'catalog' && selection.item.provenance.kind === 'restaurant-guide' ? (
              <p style={muted}>
                Restaurant values come from a published nutrition guide. Fare stores this snapshot when you log it, so later menu updates never rewrite this day.
              </p>
            ) : null}
            {error ? <div className="notice notice--danger" role="alert"><AlertTriangle size={17} /> {error}</div> : null}
            <button type="button" className="button button--primary button--large button--full" onClick={confirmFood}>
              Add {formatAmount(scaleNutrition(selectedNutrition, servingCount).calories)} kcal to {mealSlot}
            </button>
          </div>
        ) : (
          <div style={stack}>
            <div style={compactStack}>
              <span className="field__label">Add to</span>
              <SegmentedControl
                value={mealSlot}
                options={MEAL_SLOTS}
                onChange={setMealSlot}
                label="Meal slot"
                fullWidth
                size="small"
              />
            </div>

            <SegmentedControl
              value={lane}
              options={LANES}
              onChange={(next) => {
                setLane(next);
                setError(undefined);
              }}
              label="Add food method"
              className="add-food-sheet__tabs"
            />

            {error ? <div className="notice notice--danger" role="alert"><AlertTriangle size={17} /> {error}</div> : null}
            {loading === 'barcode' ? (
              <div className="notice" role="status"><LoaderCircle className="spin" size={17} /> Looking up barcode…</div>
            ) : null}

            {lane === 'usuals' ? (
              <div className="add-food-sheet__results">
                <div style={{ ...row, marginBottom: 6 }}>
                  <div>
                    <strong style={{ color: 'var(--text-strong)' }}>Likely right now</strong>
                    <p style={muted}><Clock3 size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Based on this meal, weekday, time, and your history.</p>
                  </div>
                </div>
                {localUsuals.length > 0 ? localUsuals.map(renderSuggestion) : (
                  <EmptyState
                    compact
                    icon={<Sparkles />}
                    title="Your Usuals will learn quickly"
                    description="Log a few foods and Fare will rank what you normally choose around this time. There is nothing to pin or edit."
                    action={<button type="button" className="button button--secondary button--small" onClick={() => setLane('search')}>Find a food</button>}
                  />
                )}
              </div>
            ) : null}

            {lane === 'search' ? (
              <div style={stack}>
                <form onSubmit={searchDatabase} style={compactStack}>
                  <div className="add-food-sheet__search">
                    <div className="input-shell">
                      <Search aria-hidden="true" />
                      <input
                        className="input"
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setError(undefined);
                        }}
                        placeholder="Search foods or products"
                        autoComplete="off"
                        inputMode="search"
                        enterKeyHint="search"
                        autoFocus={shouldAutoFocusSearch()}
                      />
                    </div>
                  </div>
                  <div className="add-food-sheet__search-actions">
                    <button type="button" className="button button--secondary button--small" onClick={() => setScannerOpen(true)}>
                      <ScanBarcode size={17} /> Scan barcode
                    </button>
                    <button type="submit" className="button button--outline button--small" disabled={loading === 'search' || query.trim().length < 2}>
                      {loading === 'search' ? <LoaderCircle className="spin" size={17} /> : <Database size={17} />}
                      Search packaged foods
                    </button>
                  </div>
                  <p style={muted}>Typing searches this device, USDA foods, and restaurant menus. Open Food Facts is contacted only when you press packaged search.</p>
                </form>

                {query.trim() ? (
                  <section>
                    <div style={row}>
                      <strong style={{ color: 'var(--text-strong)' }}>On this device</strong>
                      <SourceBadge source="history" label="Private + instant" />
                    </div>
                    {localResults.length > 0 ? localResults.map(renderSuggestion) : (
                      <p style={{ ...muted, padding: '14px 0' }}>No saved matches yet. USDA and menu foods appear below as you type, or search packaged products.</p>
                    )}
                  </section>
                ) : (
                  <EmptyState compact icon={<PackageSearch />} title="Start with your own library" description="Logged foods, USDA survey items, and restaurant menus are searched as you type." />
                )}

                {catalogHits.menus.length > 0 ? (
                  <section>
                    <div style={{ ...row, marginBottom: 5 }}>
                      <strong style={{ color: 'var(--text-strong)' }}>Pantry and menus</strong>
                      <SourceBadge source="database" label={`${catalogHits.menus.length} matches`} />
                    </div>
                    {catalogHits.menus.map((item) => (
                      <FoodResult
                        key={item.id}
                        name={item.name}
                        brand={item.brand}
                        servingLabel={item.serving.label}
                        nutrition={item.nutritionPerServing}
                        provenance={item.provenance}
                        detail={item.detail}
                        onSelect={() => beginCatalog(item)}
                      />
                    ))}
                  </section>
                ) : null}

                {catalogHits.usda.length > 0 ? (
                  <section>
                    <div style={{ ...row, marginBottom: 5 }}>
                      <strong style={{ color: 'var(--text-strong)' }}>USDA foods</strong>
                      <SourceBadge source="database" label={`${catalogHits.usda.length} matches`} />
                    </div>
                    {catalogHits.usda.map((item) => (
                      <FoodResult
                        key={item.id}
                        name={item.name}
                        brand={item.brand}
                        servingLabel={item.serving.label}
                        nutrition={item.nutritionPerServing}
                        provenance={item.provenance}
                        detail={item.detail}
                        onSelect={() => beginCatalog(item)}
                      />
                    ))}
                    <p style={{ ...muted, marginTop: 12 }}>USDA FoodData Central survey foods. Values are for the listed typical portion.</p>
                  </section>
                ) : null}

                {apiQuery ? (
                  <section>
                    <div style={{ ...row, marginBottom: 5 }}>
                      <strong style={{ color: 'var(--text-strong)' }}>Packaged foods · “{apiQuery}”</strong>
                      <SourceBadge source="database" label={`${apiProducts.length} results`} />
                    </div>
                    {apiProducts.map((product) => (
                      <FoodResult
                        key={product.barcode}
                        name={product.name}
                        brand={product.brand}
                        servingLabel={product.serving.label}
                        nutrition={product.nutritionPerServing}
                        provenance={product.provenance}
                        detail={product.nutriScore ? `Nutri-Score ${product.nutriScore}` : undefined}
                        onSelect={() => beginCatalog(catalogFromOpenFoodFacts(product))}
                      />
                    ))}
                    <p style={{ ...muted, marginTop: 12 }}>Community-contributed data from Open Food Facts. Compare nutrition with the package label.</p>
                  </section>
                ) : null}
              </div>
            ) : null}

            {lane === 'restaurants' ? (
              <div className="add-food-sheet__results">
                {!menuId ? (
                  <div className="picker-menu">
                    <p style={muted}>Chain menus use published nutrition guides. The Indian menu uses typical-dish estimates. Logging stores a snapshot, so later menu updates never rewrite this day.</p>
                    <div className="restaurant-tiles">
                      {RESTAURANTS.map((candidate) => (
                        <button type="button" key={candidate.id} className="restaurant-tile" onClick={() => { setMenuId(candidate.id); setMenuQuery(''); }}>
                          <span className="restaurant-tile__icon"><ChefHat /></span>
                          <strong>{candidate.name}</strong>
                          <span>{candidate.items.length} items · {servesOfficialData(candidate.items) ? 'official data' : 'typical-dish estimates'}</span>
                        </button>
                      ))}
                      <button type="button" className="restaurant-tile restaurant-tile--alt" onClick={() => { setMenuId('pantry'); setMenuQuery(''); }}>
                        <span className="restaurant-tile__icon"><PackageSearch /></span>
                        <strong>Pantry staples</strong>
                        <span>{GENERIC_FOODS.length} USDA-derived items</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="picker-menu">
                    <button type="button" className="text-button" style={{ justifySelf: 'start' }} onClick={() => { setMenuId(undefined); setMenuQuery(''); }}>
                      <ArrowLeft size={16} /> All restaurants
                    </button>
                    <div style={{ ...row, marginBottom: 2 }}>
                      <div>
                        <strong style={{ color: 'var(--text-strong)' }}>{menuId === 'pantry' ? 'Pantry staples' : selectedRestaurant?.name}</strong>
                        <p style={muted}>
                          {menuId === 'pantry'
                            ? 'Typical portions from USDA-derived pantry data.'
                            : servesOfficialData(selectedRestaurant?.items ?? [])
                              ? `Published nutrition guide · checked ${selectedRestaurant?.lastVerified}`
                              : `Typical-dish estimates · checked ${selectedRestaurant?.lastVerified}`}
                        </p>
                      </div>
                      <SourceBadge
                        source={menuId === 'pantry' ? 'database' : servesOfficialData(selectedRestaurant?.items ?? []) ? 'verified' : 'estimated'}
                        label={`${restaurantFoods.length} items`}
                      />
                    </div>
                    <label className="field">
                      <span className="field__label">Filter this menu</span>
                      <input
                        className="input"
                        value={menuQuery}
                        onChange={(event) => setMenuQuery(event.target.value)}
                        placeholder="Chicken, dressing, rice…"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </label>
                    {restaurantCategories.length > 0 ? restaurantCategories.map(([category, foods]) => (
                      <section className="picker-group" key={category}>
                        <h4 className="picker-group__title">{category}</h4>
                        <div className="picker-group__items">
                          {foods.map((food) => (
                            <button
                              type="button"
                              className="picker-item"
                              key={food.id}
                              onClick={() => beginCatalog(menuFoodToCatalog(food))}
                            >
                              <span className="picker-item__copy">
                                <strong>{food.name}</strong>
                                <span>{food.servingLabel} · {Math.round(food.nutrition.proteinG)} g protein</span>
                              </span>
                              <span className="picker-item__value">{formatMenuKcal(food)} kcal</span>
                              <span className="picker-item__add" aria-hidden="true"><Plus /></span>
                            </button>
                          ))}
                        </div>
                      </section>
                    )) : (
                      <EmptyState compact icon={<Search />} title="Nothing in this menu matches" description="Clear the filter or pick a different restaurant." />
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {lane === 'quick' ? (
              <form style={stack} onSubmit={submitQuickAdd}>
                <Panel variant="soft" padding="compact">
                  <p style={muted}>For a known calorie or macro total you do not need a reusable food.</p>
                </Panel>
                <label className="field">
                  <span className="field__label">Label <span className="field__optional">optional</span></span>
                  <input className="input" value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Quick add" />
                </label>
                <div className="form-grid">{nutritionFields(quickFields, setQuickFields)}</div>
                <button type="submit" className="button button--primary button--large button--full">Add to {mealSlot}</button>
              </form>
            ) : null}
          </div>
        )}
      </BottomSheet>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={lookupBarcode}
      />
    </>
  );
}
