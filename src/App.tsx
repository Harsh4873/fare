import {
  Archive,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Cloud,
  CloudOff,
  Copy,
  Download,
  LoaderCircle,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AddFoodSheet } from './components/AddFoodSheet';
import { ServingAmount } from './components/ServingAmount';
import { addDays, dateRange, fromDateKey, toDateKey } from './dates';
import {
  createNutritionSnapshot,
  type FareState,
  type FoodEntry,
  type MealSlot,
  type Nutrition,
} from './model';
import { addNutrition, scaleNutrition, summarizeDay } from './nutrition';
import { parseFareState, type FareStore, useFareStore } from './store';
import {
  BrandMark,
  CircularProgress,
  EmptyState,
  IconButton,
  MacroBar,
  Modal,
  Panel,
  SectionHeading,
  SegmentedControl,
  SourceBadge,
  Toast,
} from './ui';
import { useFareSync, type FareSync } from './useFareSync';

type Route = 'today' | 'history' | 'insights' | 'profile';

interface NavItem {
  id: Route;
  label: string;
  icon: LucideIcon;
}

const NAVIGATION: NavItem[] = [
  { id: 'today', label: 'Today', icon: Utensils },
  { id: 'history', label: 'History', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: CircleUserRound },
];

const MEALS: Array<{ id: MealSlot; label: string; time: string }> = [
  { id: 'breakfast', label: 'Breakfast', time: 'Morning' },
  { id: 'lunch', label: 'Lunch', time: 'Midday' },
  { id: 'dinner', label: 'Dinner', time: 'Evening' },
  { id: 'snack', label: 'Snacks', time: 'Any time' },
  { id: 'other', label: 'Other', time: 'Flexible' },
];

function currentRoute(): Route {
  const value = window.location.hash.replace('#', '');
  if (value === 'usuals' || value === 'breakdown') return 'today';
  return NAVIGATION.some((item) => item.id === value) ? value as Route : 'today';
}

function setRoute(route: Route) {
  window.location.hash = route;
}

function formatDate(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options).format(fromDateKey(dateKey));
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function sourceBadge(entry: FoodEntry) {
  const kind = entry.snapshot.provenance.kind;
  if (kind === 'open-food-facts') return <SourceBadge source="database" label="Community label" />;
  if (kind === 'usda') return <SourceBadge source="database" label="USDA" />;
  if (kind === 'restaurant-guide') return <SourceBadge source="verified" label={entry.snapshot.provenance.providerName} />;
  if (kind === 'manual') return <SourceBadge source="custom" label="Custom" />;
  return <SourceBadge source="history" label="Your history" />;
}

function downloadFile(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportDiaryCsv(state: FareState) {
  const header = ['date', 'meal', 'food', 'brand', 'servings', 'serving', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'source'];
  const rows = state.entries
    .filter((entry) => !entry.deleted)
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.consumedAt.localeCompare(right.consumedAt))
    .map((entry) => [
      entry.dateKey,
      entry.mealSlot,
      entry.snapshot.name,
      entry.snapshot.brand ?? '',
      entry.snapshot.servings,
      entry.snapshot.serving.label,
      entry.snapshot.nutrition.calories,
      entry.snapshot.nutrition.proteinG,
      entry.snapshot.nutrition.carbsG,
      entry.snapshot.nutrition.fatG,
      entry.snapshot.nutrition.fiberG,
      entry.snapshot.provenance.providerName,
    ].map(csvEscape).join(','));
  return [header.join(','), ...rows].join('\n');
}

function SyncPill({ sync, onClick }: { sync: FareSync; onClick: () => void }) {
  const label = sync.status === 'synced' ? 'Synced'
    : sync.status === 'syncing' ? 'Syncing'
      : sync.status === 'offline' ? 'Offline'
        : sync.status === 'signed-out' ? 'Sign in'
          : 'Needs attention';
  return (
    <button type="button" className={`sync-pill sync-pill--${sync.status}`} onClick={onClick} title={sync.message}>
      {sync.status === 'syncing' ? <LoaderCircle className="spin" /> : sync.status === 'offline' ? <CloudOff /> : <Cloud />}
      <span>{label}</span>
    </button>
  );
}

interface TodayViewProps {
  state: FareState;
  store: FareStore;
  dateKey: string;
  onDateChange: (date: string) => void;
  onAdd: (slot: MealSlot) => void;
  onEdit: (entry: FoodEntry) => void;
  onToast: (message: string) => void;
}

function TodayView({ state, store, dateKey, onDateChange, onAdd, onEdit, onToast }: TodayViewProps) {
  const summary = summarizeDay(state.entries, dateKey);
  const isToday = dateKey === toDateKey(new Date());
  const remaining = Math.max(0, state.targets.calories - summary.totals.calories);
  const yesterdayKey = addDays(dateKey, -1);

  function copyYesterdaySlot(slot: MealSlot, label: string) {
    const copied = store.copyDay(yesterdayKey, dateKey, slot);
    const meal = label.toLowerCase();
    onToast(copied.length
      ? `Copied yesterday’s ${meal} (${copied.length} item${copied.length === 1 ? '' : 's'}).`
      : `No ${meal} logged yesterday.`);
  }

  return (
    <div className="page page-stack">
      <div className="date-toolbar">
        <IconButton label="Previous day" onClick={() => onDateChange(addDays(dateKey, -1))}><ChevronLeft /></IconButton>
        <button type="button" className="date-toolbar__label" onClick={() => onDateChange(toDateKey(new Date()))}>
          <span>{isToday ? 'Today' : formatDate(dateKey, { weekday: 'long' })}</span>
          <strong>{formatDate(dateKey, { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
        </button>
        <IconButton label="Next day" onClick={() => onDateChange(addDays(dateKey, 1))}><ChevronRight /></IconButton>
      </div>

      <Panel variant="raised" padding="roomy" className="summary-card">
        <div className="summary-card__hero">
          <CircularProgress
            value={summary.totals.calories}
            max={state.targets.calories}
            label={formatNumber(summary.totals.calories)}
            detail={state.settings.showMacroTargets ? `${formatNumber(remaining)} kcal remaining` : `${summary.entryCount} logged`}
          />
          <div className="summary-card__copy">
            <span className="eyebrow">Daily intake</span>
            <h2>{summary.entryCount ? `${summary.entryCount} item${summary.entryCount === 1 ? '' : 's'} logged` : 'Your plate is open'}</h2>
            <p>{summary.entryCount ? 'Every item is saved as its own nutrition snapshot.' : 'Start with an Usual, search, or pick a restaurant menu.'}</p>
          </div>
        </div>
        {state.settings.showMacroTargets && (
          <div className="summary-card__macros">
            <MacroBar label="Protein" tone="protein" value={summary.totals.proteinG} target={state.targets.proteinG} valueLabel={`${formatNumber(summary.totals.proteinG)} / ${state.targets.proteinG} g`} />
            <MacroBar label="Carbs" tone="carbs" value={summary.totals.carbsG} target={state.targets.carbsG} valueLabel={`${formatNumber(summary.totals.carbsG)} / ${state.targets.carbsG} g`} />
            <MacroBar label="Fat" tone="fat" value={summary.totals.fatG} target={state.targets.fatG} valueLabel={`${formatNumber(summary.totals.fatG)} / ${state.targets.fatG} g`} />
          </div>
        )}
        <p className="summary-card__caption">Targets are yours to set. Fare tracks; it does not prescribe.</p>
      </Panel>

      <div className="meal-stack">
        {MEALS.map((meal) => {
          const entries = state.entries
            .filter((entry) => !entry.deleted && entry.dateKey === dateKey && entry.mealSlot === meal.id)
            .sort((left, right) => left.consumedAt.localeCompare(right.consumedAt));
          const yesterdayEntries = state.entries.filter((entry) =>
            !entry.deleted && entry.dateKey === yesterdayKey && entry.mealSlot === meal.id,
          );
          const total = addNutrition(...entries.map((entry) => entry.snapshot.nutrition));
          return (
            <section className="meal-section" key={meal.id}>
              <header className="meal-section__header">
                <div><h3 className="meal-section__title">{meal.label}<span className="meal-section__time">{meal.time}</span></h3></div>
                <span className="meal-section__total">{formatNumber(total.calories)} kcal</span>
              </header>
              {entries.length > 0 && (
                <div className="meal-section__items">
                  {entries.map((entry) => (
                    <article className="food-row food-row--interactive" key={entry.id}>
                      <button type="button" className="food-row__main" onClick={() => onEdit(entry)}>
                        <span className="food-row__icon"><Utensils /></span>
                        <span className="food-row__copy">
                          <span className="food-row__heading">
                            <strong className="food-row__title">{entry.snapshot.name}</strong>
                            <span className="food-row__value">{formatNumber(entry.snapshot.nutrition.calories)}<small> kcal</small></span>
                          </span>
                          <span className="food-row__detail">{entry.snapshot.brand ? `${entry.snapshot.brand} · ` : ''}{formatNumber(entry.snapshot.servings, 2)} × {entry.snapshot.serving.label}</span>
                          <span className="food-row__source">{sourceBadge(entry)}</span>
                        </span>
                      </button>
                      <div className="food-row__quick-actions">
                        <IconButton label={`Repeat ${entry.snapshot.name}`} size="small" onClick={() => {
                          store.copyEntry(entry.id, dateKey, meal.id);
                          onToast(`${entry.snapshot.name} logged again.`);
                        }}><RefreshCw /></IconButton>
                        <IconButton label={`Delete ${entry.snapshot.name}`} variant="danger" size="small" onClick={() => {
                          store.deleteEntry(entry.id);
                          onToast(`${entry.snapshot.name} removed.`);
                        }}><Trash2 /></IconButton>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <footer className="meal-section__footer">
                <div className={`meal-section__actions${yesterdayEntries.length ? ' meal-section__actions--split' : ''}`}>
                  {yesterdayEntries.length > 0 ? (
                    <button
                      type="button"
                      className="meal-copy"
                      onClick={() => copyYesterdaySlot(meal.id, meal.label)}
                    >
                      <Copy /> Copy yesterday
                    </button>
                  ) : null}
                  <button type="button" className="meal-add" onClick={() => onAdd(meal.id)}><Plus /> Add to {meal.label.toLowerCase()}</button>
                </div>
              </footer>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function HistoryView({ state, onSelectDate }: { state: FareState; onSelectDate: (date: string) => void }) {
  const today = toDateKey(new Date());
  const days = dateRange(addDays(today, -20), today).reverse().map((dateKey) => summarizeDay(state.entries, dateKey));
  return (
    <div className="page page-stack">
      <SectionHeading size="large" eyebrow="Diary archive" title="History" description="Review logged days without treating a blank day as zero intake." />
      <div className="history-list">
        {days.map((day) => (
          <button type="button" className={`history-day${day.entryCount ? '' : ' history-day--empty'}`} key={day.dateKey} onClick={() => onSelectDate(day.dateKey)}>
            <span className="history-day__date">{formatDate(day.dateKey, { weekday: 'short', month: 'short', day: 'numeric' })}<span>{day.entryCount ? `${day.entryCount} logged` : 'Not logged'}</span></span>
            <span className="history-day__macros">
              <span className="history-day__macro">Protein<strong>{formatNumber(day.totals.proteinG)} g</strong></span>
              <span className="history-day__macro">Carbs<strong>{formatNumber(day.totals.carbsG)} g</strong></span>
              <span className="history-day__macro">Fat<strong>{formatNumber(day.totals.fatG)} g</strong></span>
            </span>
            <strong className="history-day__calories">{day.entryCount ? formatNumber(day.totals.calories) : '—'}<small>{day.entryCount ? ' kcal' : ''}</small></strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function InsightsView({ state }: { state: FareState }) {
  const [range, setRange] = useState<'7' | '30'>('7');
  const count = Number(range);
  const today = toDateKey(new Date());
  const days = dateRange(addDays(today, -(count - 1)), today).map((dateKey) => summarizeDay(state.entries, dateKey));
  const logged = days.filter((day) => day.entryCount > 0);
  const totals = addNutrition(...logged.map((day) => day.totals));
  const average = scaleNutrition(totals, logged.length ? 1 / logged.length : 0);
  const maxCalories = Math.max(state.targets.calories, ...days.map((day) => day.totals.calories), 1);
  const frequency = new Map<string, { name: string; count: number; calories: number }>();
  state.entries.filter((entry) => !entry.deleted && days.some((day) => day.dateKey === entry.dateKey)).forEach((entry) => {
    const key = `${entry.snapshot.name}|${entry.snapshot.brand ?? ''}`.toLocaleLowerCase();
    const current = frequency.get(key) ?? { name: entry.snapshot.name, count: 0, calories: 0 };
    current.count += 1;
    current.calories += entry.snapshot.nutrition.calories;
    frequency.set(key, current);
  });
  const frequent = [...frequency.values()].sort((left, right) => right.count - left.count || right.calories - left.calories).slice(0, 6);
  const byMeal = MEALS.map((meal) => ({ meal, total: addNutrition(...logged.map((day) => day.byMeal[meal.id])).calories })).sort((left, right) => right.total - left.total);

  return (
    <div className="page page-stack">
      <SectionHeading size="large" eyebrow="Patterns, not judgment" title="Insights" description="Averages use logged days only. Missing days remain missing—not zero." action={<SegmentedControl value={range} onChange={setRange} label="Insight range" options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} size="small" />} />
      <div className="card-grid card-grid--four">
        <article className="stat-card stat-card--calories"><span className="stat-card__header">Average calories</span><strong className="stat-card__value">{formatNumber(average.calories)}</strong><span className="stat-card__detail">Across {logged.length} logged day{logged.length === 1 ? '' : 's'}</span></article>
        <article className="stat-card stat-card--protein"><span className="stat-card__header">Average protein</span><strong className="stat-card__value">{formatNumber(average.proteinG)} g</strong><span className="stat-card__detail">Logged-day average</span></article>
        <article className="stat-card stat-card--carbs"><span className="stat-card__header">Average carbs</span><strong className="stat-card__value">{formatNumber(average.carbsG)} g</strong><span className="stat-card__detail">Logged-day average</span></article>
        <article className="stat-card stat-card--fat"><span className="stat-card__header">Average fat</span><strong className="stat-card__value">{formatNumber(average.fatG)} g</strong><span className="stat-card__detail">Logged-day average</span></article>
      </div>

      <Panel className="chart-card">
        <div className="chart-header"><div><h3 className="chart-title">Calories by day</h3><p className="chart-caption">Blank bars are unlogged days.</p></div><SourceBadge source="history" label={`${logged.length}/${count} days logged`} /></div>
        <div className="bar-chart" role="img" aria-label={`Calorie totals across the last ${count} days`}>
          {days.map((day) => (
            <div className="bar-chart__group" key={day.dateKey} title={day.entryCount ? `${formatNumber(day.totals.calories)} calories` : 'Not logged'}>
              <span className={`bar-chart__bar${day.entryCount ? '' : ' is-empty'}`} style={{ height: day.entryCount ? `${Math.max(3, (day.totals.calories / maxCalories) * 100)}%` : '3%' }} />
              <span className="bar-chart__label">{formatDate(day.dateKey, { weekday: 'narrow' })}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="card-grid card-grid--two">
        <Panel><SectionHeading title="Most repeated" size="small" description="Foods that keep showing up in your log." />{frequent.length ? <div className="list">{frequent.map((item, index) => <div className="list-row" key={item.name}><span className="list-row__icon">{index + 1}</span><span className="list-row__copy"><strong className="list-row__title">{item.name}</strong><span className="list-row__detail">{item.count} logs</span></span><span className="list-row__value">{formatNumber(item.calories)} kcal</span></div>)}</div> : <EmptyState compact title="Log a few foods first" description="Repeat patterns will show here." />}</Panel>
        <Panel><SectionHeading title="Meal contribution" size="small" description="Calories by meal across logged days." /><div className="list">{byMeal.map(({ meal, total }) => <div className="list-row" key={meal.id}><span className="list-row__copy"><strong className="list-row__title">{meal.label}</strong><span className="list-row__detail">{totals.calories ? `${formatNumber((total / totals.calories) * 100)}% of logged calories` : 'No data'}</span></span><span className="list-row__value">{formatNumber(total)} kcal</span></div>)}</div></Panel>
      </div>
    </div>
  );
}

function ProfileView({ state, store, sync, onToast }: { state: FareState; store: FareStore; sync: FareSync; onToast: (message: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [targets, setTargets] = useState({ ...state.targets });
  useEffect(() => setTargets({ ...state.targets }), [state.targets]);

  function saveTargets(event: React.FormEvent) {
    event.preventDefault();
    store.updateTargets({
      calories: Math.max(0, Number(targets.calories)),
      proteinG: Math.max(0, Number(targets.proteinG)),
      carbsG: Math.max(0, Number(targets.carbsG)),
      fatG: Math.max(0, Number(targets.fatG)),
      fiberG: Math.max(0, Number(targets.fiberG)),
      sodiumMg: Math.max(0, Number(targets.sodiumMg)),
    });
    onToast('Your targets were saved.');
  }

  async function importBackup(file: File) {
    try {
      const state = parseFareState(JSON.parse(await file.text()));
      if (!window.confirm(`Replace Fare with the backup from “${file.name}”? Current records missing from the file become synced deletions.`)) return;
      store.replaceState(state);
      onToast('Backup imported.');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'That backup could not be read.');
    }
  }

  return (
    <div className="page page-stack">
      <SectionHeading size="large" eyebrow="Private by default" title="Profile + data" description="Control targets, appearance, Google sync, and portable backups." />
      <div className="profile-grid">
        <Panel className="profile-card">
          <div className="profile-avatar">{(state.profile.displayName || sync.user?.displayName || sync.user?.email || '?').slice(0, 1).toUpperCase()}</div>
          <h3 className="profile-name">{state.profile.displayName || sync.user?.displayName || 'Your profile'}</h3>
          <p className="profile-email">{sync.user?.email ?? 'Stored only on this device'}</p>
          <div className={`sync-status sync-status--${sync.status === 'action-needed' ? 'error' : sync.status}`}><span className="sync-status__dot" />{sync.status === 'signed-out' ? 'Local only' : sync.status.replace('-', ' ')}</div>
          {sync.message && <p className="fine-print">{sync.message}</p>}
          {sync.user ? <button type="button" className="button button--secondary button--full" disabled={sync.signingOut} onClick={() => void sync.signOut()}>{sync.signingOut ? <LoaderCircle className="spin" /> : <LogOut />} Sign out + clear device</button> : <button type="button" className="button button--primary button--full" onClick={() => void sync.signIn()}><LogIn /> Sign in with Google</button>}
        </Panel>
        <Panel>
          <SectionHeading title="Daily targets" size="small" description="Enter targets you chose yourself or received from a qualified professional." />
          <form className="form-grid" onSubmit={saveTargets}>
            {([
              ['calories', 'Calories', 'kcal'],
              ['proteinG', 'Protein', 'g'],
              ['carbsG', 'Carbohydrates', 'g'],
              ['fatG', 'Fat', 'g'],
              ['fiberG', 'Fiber', 'g'],
              ['sodiumMg', 'Sodium', 'mg'],
            ] as const).map(([key, label, unit]) => <label className="field" key={key}><span className="field__label">{label}</span><span className="input-shell"><input className="input" type="number" min="0" step="1" value={targets[key]} onChange={(event) => setTargets((current) => ({ ...current, [key]: Number(event.target.value) }))} /><span className="input-affix">{unit}</span></span></label>)}
            <div className="form-grid__full"><button type="submit" className="button button--primary">Save targets</button></div>
          </form>
        </Panel>
      </div>

      <div className="card-grid card-grid--two">
        <Panel>
          <SectionHeading title="Appearance + display" size="small" />
          <div className="settings-list">
            <div className="settings-row"><span className="settings-row__copy"><strong>Theme</strong><span>System follows your iPhone or Mac.</span></span><SegmentedControl value={state.settings.theme} onChange={(theme) => store.updateSettings({ theme })} label="Theme" options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} size="small" /></div>
            <label className="settings-row"><span className="settings-row__copy"><strong>Show targets</strong><span>Hide goal visuals while still tracking intake.</span></span><span className="switch"><input type="checkbox" checked={state.settings.showMacroTargets} onChange={(event) => store.updateSettings({ showMacroTargets: event.target.checked })} /><span className="switch__track" /></span></label>
            <div className="settings-row"><span className="settings-row__copy"><strong>Week starts</strong><span>Used by weekly summaries.</span></span><SegmentedControl value={String(state.settings.weekStartsOn) as '0' | '1'} onChange={(value) => store.updateSettings({ weekStartsOn: Number(value) as 0 | 1 })} label="Week starts" options={[{ value: '1', label: 'Mon' }, { value: '0', label: 'Sun' }]} size="small" /></div>
          </div>
        </Panel>
        <Panel>
          <SectionHeading title="Backups + export" size="small" description="Your diary remains portable even if sync is off." />
          <div className="data-actions">
            <button type="button" className="button button--secondary" onClick={() => downloadFile(`fare-backup-${toDateKey(new Date())}.json`, 'application/json', JSON.stringify(state, null, 2))}><Download /> Export JSON</button>
            <button type="button" className="button button--secondary" onClick={() => downloadFile(`fare-diary-${toDateKey(new Date())}.csv`, 'text/csv', exportDiaryCsv(state))}><Download /> Export CSV</button>
            <button type="button" className="button button--outline" onClick={() => fileRef.current?.click()}><Upload /> Import backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importBackup(file); }} />
            <button type="button" className="button button--danger" onClick={() => { if (window.confirm('Reset every Fare food, meal, and diary entry? Export a backup first.')) store.resetState(); }}><RotateCcw /> Reset Fare</button>
          </div>
        </Panel>
      </div>

      <Panel variant="soft">
        <div className="privacy-grid">
          <div><ShieldCheck /><strong>Account locked</strong><span>Only the approved verified Google account can read synced Fare documents.</span></div>
          <div><Archive /><strong>Immutable diary</strong><span>External food updates and saved-food edits never rewrite past entries.</span></div>
          <div><CloudOff /><strong>Local first</strong><span>Logging works offline; pending changes reconcile after reconnecting.</span></div>
        </div>
        <p className="fine-print">Generic foods come from USDA FoodData Central (public domain). Packaged-food data comes from Open Food Facts under its database/content licenses and may be incomplete. Compare community data with the package label. Fare provides tracking tools, not medical advice.</p>
      </Panel>
    </div>
  );
}

function EntryEditor({ entry, store, onClose }: { entry: FoodEntry | null; store: FareStore; onClose: () => void }) {
  const [servings, setServings] = useState(1);
  const [mealSlot, setMealSlot] = useState<MealSlot>('other');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!entry) return;
    setServings(entry.snapshot.servings);
    setMealSlot(entry.mealSlot);
    setNote(entry.note ?? '');
  }, [entry]);
  return <Modal open={Boolean(entry)} onClose={onClose} title="Edit logged food" description={entry?.snapshot.name} width="small" footer={<><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button><button type="button" className="button button--primary" onClick={() => {
    if (!entry) return;
    const safeServings = Math.max(0.01, servings);
    store.updateEntry(entry.id, {
      mealSlot,
      note: note.trim() || undefined,
      snapshot: createNutritionSnapshot({ ...entry.snapshot, servings: safeServings, nutrition: scaleNutrition(entry.snapshot.nutritionPerServing, safeServings) }),
    });
    onClose();
  }}>Save changes</button></>}>
    {entry && <div className="form-grid"><div className="form-grid__full"><ServingAmount value={servings} onChange={setServings} servingLabel={entry.snapshot.serving.label} nutrition={entry.snapshot.nutritionPerServing} /></div><label className="field"><span className="field__label">Meal</span><select className="select" value={mealSlot} onChange={(event) => setMealSlot(event.target.value as MealSlot)}>{MEALS.map((meal) => <option value={meal.id} key={meal.id}>{meal.label}</option>)}</select></label><label className="field form-grid__full"><span className="field__label">Note <span className="field__optional">optional</span></span><textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} /></label></div>}
  </Modal>;
}

function Onboarding({ state, store }: { state: FareState; store: FareStore }) {
  const [name, setName] = useState(state.profile.displayName);
  return <Modal open={!state.profile.onboardingComplete} onClose={() => store.updateProfile({ displayName: name.trim(), onboardingComplete: true })} title="Welcome to Fare" description="Food memory that gets faster every time you use it." width="small" footer={<button type="button" className="button button--primary button--full" onClick={() => store.updateProfile({ displayName: name.trim(), onboardingComplete: true })}>Start logging</button>}><div className="onboarding-stack"><BrandMark size={76} /><div><span className="eyebrow">Private + local first</span><h3>Log once. Find it faster next time.</h3><p>Fare puts your Usuals ahead of the public database and preserves every logged nutrition snapshot.</p></div><label className="field"><span className="field__label">What should Fare call you?</span><input className="input" value={name} placeholder="Your name" autoComplete="given-name" onChange={(event) => setName(event.target.value)} /></label><div className="notice notice--warning">Starter targets are placeholders, not recommendations. Review them in Profile whenever you are ready.</div></div></Modal>;
}

export default function App() {
  const store = useFareStore();
  const sync = useFareSync(store);
  const [route, setCurrentRoute] = useState<Route>(currentRoute);
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [addOpen, setAddOpen] = useState(false);
  const [defaultMeal, setDefaultMeal] = useState<MealSlot>('snack');
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [toast, setToast] = useState<string>();
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  useEffect(() => {
    const onHash = () => setCurrentRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystemTheme(media.matches ? 'light' : 'dark');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const state = store.state;
  const resolvedTheme = state?.settings.theme === 'system' || !state ? systemTheme : state.settings.theme;
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'light' ? '#f6efe2' : '#171510');
  }, [resolvedTheme]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const routeMeta = NAVIGATION.find((item) => item.id === route) ?? NAVIGATION[0];
  const openAdd = (slot: MealSlot = 'snack') => { setDefaultMeal(slot); setAddOpen(true); };

  if (!state) return <div className="loading-screen"><BrandMark size={62} /><LoaderCircle className="spin" /><span>Opening your local food memory…</span></div>;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <a href="#today" className="app-brand"><BrandMark size={46} decorative /><span><strong>Fare</strong><small>harsh.bet / fare</small></span></a>
        <nav className="app-nav" aria-label="Fare views"><span className="app-nav__label">Your log</span>{NAVIGATION.map(({ id, label, icon: Icon }) => <a href={`#${id}`} key={id} className={`app-nav__item${route === id ? ' is-active' : ''}`} aria-current={route === id ? 'page' : undefined}><Icon /><span>{label}</span></a>)}</nav>
        <div className="app-sidebar__footer"><SyncPill sync={sync} onClick={() => setRoute('profile')} /><p>Local first. Private sync when you choose.</p></div>
      </aside>
      <main className="app-main">
        <header className="app-header"><div><span className="app-header__eyebrow">Fare / {formatDate(dateKey, { month: 'short', day: 'numeric' })}</span><h1 className="app-header__title">{routeMeta.label}</h1></div><div className="app-header__actions"><SyncPill sync={sync} onClick={() => setRoute('profile')} /><button type="button" className="button button--primary" onClick={() => openAdd()}><Plus /> Log food</button></div></header>
        {route === 'today' && <TodayView state={state} store={store} dateKey={dateKey} onDateChange={setDateKey} onAdd={openAdd} onEdit={setEditingEntry} onToast={setToast} />}
        {route === 'history' && <HistoryView state={state} onSelectDate={(date) => { setDateKey(date); setRoute('today'); }} />}
        {route === 'insights' && <InsightsView state={state} />}
        {route === 'profile' && <ProfileView state={state} store={store} sync={sync} onToast={setToast} />}
      </main>
      <nav className="bottom-nav" aria-label="Fare views">{NAVIGATION.map(({ id, label, icon: Icon }) => <a href={`#${id}`} key={id} className={`bottom-nav__item${route === id ? ' is-active' : ''}`} aria-current={route === id ? 'page' : undefined}><Icon /><span>{label}</span></a>)}</nav>
      <button type="button" className="floating-add" onClick={() => openAdd()} aria-label="Log food"><Plus /></button>
      <AddFoodSheet open={addOpen} onClose={() => setAddOpen(false)} state={state} store={store} dateKey={dateKey} defaultMealSlot={defaultMeal} onToast={setToast} />
      <EntryEditor entry={editingEntry} store={store} onClose={() => setEditingEntry(null)} />
      <Onboarding state={state} store={store} />
      {sync.signingOut && <div className="blocking-scrim"><LoaderCircle className="spin" /><strong>Finishing sync before clearing this device…</strong></div>}
      {toast && <div className="toast-region"><Toast message={toast} onDismiss={() => setToast(undefined)} /></div>}
    </div>
  );
}
