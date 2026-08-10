/**
 * Small shared presentational pieces for the Breakdown feature.
 */

import { Minus, Plus } from 'lucide-react';
import type { Nutrition } from '../model';
import { IconButton, cx } from '../ui';
import { confidenceCopy, formatSigned } from './engine';
import type { Confidence, MetricKey } from './types';

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

export interface MetricMeta {
  readonly key: MetricKey;
  readonly label: string;
  readonly short: string;
  readonly unit: string;
  readonly digits: number;
}

export const METRIC_META: readonly MetricMeta[] = [
  { key: 'calories', label: 'Calories', short: 'kcal', unit: 'kcal', digits: 0 },
  { key: 'proteinG', label: 'Protein', short: 'protein', unit: 'g', digits: 0 },
  { key: 'carbsG', label: 'Carbs', short: 'carbs', unit: 'g', digits: 0 },
  { key: 'fatG', label: 'Fat', short: 'fat', unit: 'g', digits: 0 },
  { key: 'fiberG', label: 'Fiber', short: 'fiber', unit: 'g', digits: 0 },
  { key: 'sodiumMg', label: 'Sodium', short: 'sodium', unit: 'mg', digits: 0 },
];

export function metricMeta(key: MetricKey): MetricMeta {
  return METRIC_META.find((meta) => meta.key === key) ?? METRIC_META[0];
}

export function metricValue(nutrition: Nutrition, key: MetricKey): number {
  return nutrition[key];
}

export function ConfidenceChip({ confidence, compact = false }: { confidence: Confidence; compact?: boolean }) {
  const copy = confidenceCopy(confidence);
  return (
    <span
      className={cx('confidence-chip', `confidence-chip--${confidence}`, compact && 'confidence-chip--compact')}
      title={copy.description}
    >
      <span className="confidence-chip__dot" aria-hidden="true" />
      {compact ? confidence : copy.label}
    </span>
  );
}

/**
 * Renders signed nutrition deltas: calories and protein always, the other
 * macros only when they moved by at least a gram. Coloring is goal-aware:
 * fewer calories/sodium reads as a win, more protein/fiber reads as a win,
 * and carbs/fat changes stay neutral.
 */
export function DeltaSummary({ delta, className }: { delta: Nutrition; className?: string }) {
  const parts: Array<{ key: MetricKey; text: string; tone: 'good' | 'bad' | 'flat' }> = [];
  const include: MetricKey[] = ['calories', 'proteinG', 'carbsG', 'fatG', 'fiberG'];
  for (const key of include) {
    const value = delta[key];
    const meta = metricMeta(key);
    const always = key === 'calories' || key === 'proteinG';
    if (!always && Math.abs(value) < 1) continue;
    const tone = Math.round(value) === 0 ? 'flat'
      : key === 'calories' || key === 'sodiumMg' ? (value < 0 ? 'good' : 'bad')
        : key === 'proteinG' || key === 'fiberG' ? (value > 0 ? 'good' : 'bad')
          : 'flat';
    parts.push({
      key,
      text: `${formatSigned(value)} ${meta.unit === 'kcal' ? 'kcal' : `g ${meta.short}`}`,
      tone,
    });
  }
  return (
    <span className={cx('delta-summary', className)}>
      {parts.map((part) => (
        <span key={part.key} className={cx('delta-summary__part', `delta-summary__part--${part.tone}`)}>
          {part.text}
        </span>
      ))}
    </span>
  );
}

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export function QuantityStepper({ value, onChange, label, min = 0.5, max = 12, step = 0.5 }: QuantityStepperProps) {
  const decimals = value % 1 === 0 ? 0 : 1;
  return (
    <span className="qty-stepper" role="group" aria-label={`${label} servings`}>
      <IconButton
        label={`Fewer ${label}`}
        size="small"
        disabled={value - step < min - 1e-9}
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
      >
        <Minus />
      </IconButton>
      <span className="qty-stepper__value">×{formatNumber(value, decimals)}</span>
      <IconButton
        label={`More ${label}`}
        size="small"
        disabled={value + step > max + 1e-9}
        onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
      >
        <Plus />
      </IconButton>
    </span>
  );
}
