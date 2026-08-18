import { describe, expect, it } from 'vitest';
import {
  clampServing,
  formatServingCount,
  servingNoun,
  snapServing,
} from '../src/components/ServingAmount';

describe('serving amount formatting', () => {
  it('uses fractions instead of 1x/2x labels', () => {
    expect(formatServingCount(0.5)).toBe('½');
    expect(formatServingCount(1)).toBe('1');
    expect(formatServingCount(1.5)).toBe('1½');
    expect(formatServingCount(2.25)).toBe('2¼');
    expect(servingNoun(1)).toBe('serving');
    expect(servingNoun(1.5)).toBe('servings');
  });

  it('snaps the slider onto a small step without dropping below the floor', () => {
    expect(snapServing(1.03)).toBe(1.05);
    expect(clampServing(0)).toBe(0.25);
    expect(clampServing(99)).toBe(6);
  });
});
