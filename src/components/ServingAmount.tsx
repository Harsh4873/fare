import { type PointerEvent as ReactPointerEvent, useId, useRef } from 'react';
import type { Nutrition } from '../model';
import { scaleNutrition } from '../nutrition';
import { cx } from '../ui';

const MIN_DEFAULT = 0.25;
const MAX_DEFAULT = 6;
const STEP_DEFAULT = 0.05;
const START_DEG = 135;
const SWEEP_DEG = 270;
const CX = 110;
const CY = 104;
const RADIUS = 78;

const FRACTIONS: ReadonlyArray<readonly [number, string]> = [
  [0, ''],
  [0.25, '¼'],
  [0.5, '½'],
  [0.75, '¾'],
];

export function clampServing(value: number, min = MIN_DEFAULT, max = MAX_DEFAULT): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function snapServing(value: number, step = STEP_DEFAULT, min = MIN_DEFAULT, max = MAX_DEFAULT): number {
  const clamped = clampServing(value, min, max);
  const snapped = Math.round(clamped / step) * step;
  return Math.round(clampServing(snapped, min, max) * 100) / 100;
}

export function formatServingCount(value: number): string {
  const snapped = Math.round(value * 20) / 20;
  const whole = Math.floor(snapped + 1e-9);
  const fraction = Math.round((snapped - whole) * 100) / 100;
  const glyph = FRACTIONS.find(([amount]) => Math.abs(amount - fraction) < 0.03)?.[1];
  if (fraction < 0.03) return String(whole);
  if (glyph) return whole === 0 ? glyph : `${whole}${glyph}`;
  return snapped.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function servingNoun(count: number): string {
  return Math.abs(count - 1) < 0.04 ? 'serving' : 'servings';
}

function polar(angleDeg: number, radius = RADIUS): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(radians), y: CY + radius * Math.sin(radians) };
}

function arcPath(fromDeg: number, sweepDeg: number): string {
  const start = polar(fromDeg);
  const end = polar(fromDeg + sweepDeg);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${end.x} ${end.y}`;
}

function valueFromAngle(clientX: number, clientY: number, rect: DOMRect, min: number, max: number): number {
  const x = clientX - (rect.left + rect.width / 2);
  const y = clientY - (rect.top + rect.height / 2);
  let degrees = (Math.atan2(y, x) * 180) / Math.PI;
  let relative = degrees - START_DEG;
  while (relative < 0) relative += 360;
  while (relative >= 360) relative -= 360;
  const t = Math.min(1, Math.max(0, relative / SWEEP_DEG));
  return min + t * (max - min);
}

export interface ServingAmountProps {
  value: number;
  onChange: (value: number) => void;
  servingLabel: string;
  nutrition?: Nutrition;
  min?: number;
  max?: number;
  step?: number;
}

export function ServingAmount({
  value,
  onChange,
  servingLabel,
  nutrition,
  min = MIN_DEFAULT,
  max = MAX_DEFAULT,
  step = STEP_DEFAULT,
}: ServingAmountProps) {
  const labelId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const sliderMax = Math.max(max, Number.isFinite(value) ? value : max);
  const amount = snapServing(value, step, min, sliderMax);
  const t = sliderMax === min ? 0 : (amount - min) / (sliderMax - min);
  const thumb = polar(START_DEG + t * SWEEP_DEG);
  const scaled = nutrition ? scaleNutrition(nutrition, amount) : undefined;
  const ticks = [0.5, 1, 1.5, 2, 3, 4].filter((tick) => tick >= min && tick <= sliderMax);

  function setFromClient(clientX: number, clientY: number) {
    const node = svgRef.current;
    if (!node) return;
    onChange(snapServing(valueFromAngle(clientX, clientY, node.getBoundingClientRect(), min, sliderMax), step, min, sliderMax));
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClient(event.clientX, event.clientY);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setFromClient(event.clientX, event.clientY);
  }

  return (
    <div className="serving-amount">
      <span className="field__label" id={labelId}>How much</span>
      <div className="serving-amount__dial">
        <svg
          ref={svgRef}
          className="serving-amount__ring"
          viewBox="0 0 220 200"
          role="slider"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-valuemin={min}
          aria-valuemax={sliderMax}
          aria-valuenow={amount}
          aria-valuetext={`${formatServingCount(amount)} ${servingNoun(amount)} of ${servingLabel}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault();
              onChange(snapServing(amount + step, step, min, sliderMax));
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault();
              onChange(snapServing(amount - step, step, min, sliderMax));
            } else if (event.key === 'Home') {
              event.preventDefault();
              onChange(min);
            } else if (event.key === 'End') {
              event.preventDefault();
              onChange(sliderMax);
            }
          }}
        >
          <path className="serving-amount__track" d={arcPath(START_DEG, SWEEP_DEG)} />
          <path className="serving-amount__fill" d={arcPath(START_DEG, Math.max(0.8, t * SWEEP_DEG))} />
          {ticks.map((tick) => {
            const point = polar(START_DEG + ((tick - min) / (sliderMax - min)) * SWEEP_DEG, RADIUS);
            return <circle key={tick} className="serving-amount__tick" cx={point.x} cy={point.y} r={tick === 1 ? 3.2 : 2.2} />;
          })}
          <circle className="serving-amount__thumb" cx={thumb.x} cy={thumb.y} r="11" />
        </svg>
        <div className="serving-amount__readout" aria-hidden="true">
          <strong>{formatServingCount(amount)}</strong>
          <span>{servingNoun(amount)}</span>
          <em>{servingLabel}</em>
        </div>
      </div>
      <label className="serving-amount__spectrum">
        <span className="sr-only">Amount of {servingLabel}</span>
        <input
          className="serving-amount__range"
          type="range"
          min={min}
          max={sliderMax}
          step={step}
          value={amount}
          onChange={(event) => onChange(snapServing(Number(event.target.value), step, min, sliderMax))}
        />
        <span className="serving-amount__ends">
          <span>{formatServingCount(min)}</span>
          <span>1</span>
          <span>{formatServingCount(sliderMax)}</span>
        </span>
      </label>
      {scaled ? (
        <div className={cx('food-result__nutrition', 'serving-amount__macros')}>
          <span><strong>{Math.round(scaled.calories)}</strong> kcal</span>
          <span><strong>{scaled.proteinG.toLocaleString(undefined, { maximumFractionDigits: 1 })}g</strong> protein</span>
          <span><strong>{scaled.carbsG.toLocaleString(undefined, { maximumFractionDigits: 1 })}g</strong> carbs</span>
          <span><strong>{scaled.fatG.toLocaleString(undefined, { maximumFractionDigits: 1 })}g</strong> fat</span>
        </div>
      ) : null}
    </div>
  );
}
