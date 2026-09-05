import { describe, expect, it } from 'vitest';

import { calculateRating, importanceWeights, normalizeAxisName } from './calculateRating';
import { createRatingAxis, defaultImportanceLevel } from './presets';
import type { MusicRatingDraft, RatingAxis } from './types';

function axis(overrides: Partial<RatingAxis> = {}): RatingAxis {
  return {
    id: 'axis-1',
    name: 'Axis',
    score: 5,
    importanceLevel: 3,
    enabled: true,
    reason: '',
    ...overrides,
  };
}

function draft(overrides: Partial<MusicRatingDraft> = {}): MusicRatingDraft {
  return {
    mode: 'simple',
    work: {
      title: '',
      artistLabel: null,
      artist: '',
      albumLabel: null,
      album: '',
      extraFields: [],
      releaseYear: '',
      coverDataUrl: null,
    },
    axes: [axis()],
    negativeItems: [],
    overallComment: '',
    personalStory: '',
    ...overrides,
  };
}

describe('importance weights', () => {
  it('maps all seven levels to the product specification', () => {
    expect(importanceWeights).toEqual({ 0: 0, 1: 0.25, 2: 0.75, 3: 1, 4: 1.5, 5: 2.5, 6: 5 });
  });

  it('uses LV3 as the default importance for new axes', () => {
    expect(defaultImportanceLevel).toBe(3);
    expect(createRatingAxis('Default axis')).toMatchObject({ importanceLevel: 3, score: 0 });
  });
});

describe('calculateRating', () => {
  it('calculates a weighted average and direct negative deduction', () => {
    const result = calculateRating(
      draft({
        axes: [
          axis({ id: 'a', score: 8, importanceLevel: 4 }),
          axis({ id: 'b', score: 7, importanceLevel: 5 }),
          axis({ id: 'c', score: 9, importanceLevel: 3 }),
        ],
        negativeItems: [{ id: 'n', name: 'Dislike', score: -1, enabled: true, reason: '' }],
      }),
    );
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.positiveScore100).toBe(77);
      expect(result.penalty100).toBe(-10);
      expect(result.score100).toBe(67);
      expect(result.contributions.map((item) => item.weightedContribution100)).toEqual([
        24, 35, 18,
      ]);
    }
  });

  it('excludes unrated, disabled, and LV0 axes from both numerator and denominator', () => {
    expect(
      calculateRating(
        draft({
          axes: [
            axis({ id: 'included', score: 8 }),
            axis({ id: 'unrated', score: 0, importanceLevel: 6 }),
            axis({ id: 'lv0', score: 10, importanceLevel: 0 }),
            axis({ id: 'disabled', score: 10, enabled: false }),
          ],
        }),
      ),
    ).toMatchObject({ status: 'ready', positiveScore100: 80, score100: 80 });
  });

  it('does not dilute a rated axis with an unrated axis', () => {
    const result = calculateRating(
      draft({
        axes: [
          axis({ id: 'rated', score: 10, importanceLevel: 1 }),
          axis({ id: 'unrated', score: 0, importanceLevel: 6 }),
        ],
      }),
    );

    expect(result).toMatchObject({ status: 'ready', positiveScore100: 100, score100: 100 });
    if (result.status === 'ready') {
      expect(result.contributions.map((item) => item.axisId)).toEqual(['rated']);
    }
  });

  it('clamps multiple negative deductions', () => {
    expect(
      calculateRating(
        draft({
          axes: [axis({ score: 2 })],
          negativeItems: [
            { id: 'n1', name: 'One', score: -3, enabled: true, reason: '' },
            { id: 'n2', name: 'Two', score: -4, enabled: true, reason: '' },
          ],
        }),
      ),
    ).toMatchObject({ status: 'ready', penalty100: -70, score100: 0 });
  });

  it('retains one-decimal aggregate precision when all base ratings are whole stars', () => {
    const result = calculateRating(
      draft({
        axes: [
          axis({ id: 'a', score: 7, importanceLevel: 1 }),
          axis({ id: 'b', score: 8, importanceLevel: 2 }),
        ],
      }),
    );

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.positiveScore100).toBe(77.5);
      expect(result.score100).toBe(77.5);
    }
  });

  it('returns an uncalculable result without a weighted axis', () => {
    expect(calculateRating(draft({ axes: [axis({ importanceLevel: 0 })] }))).toMatchObject({
      status: 'uncalculable',
    });
  });

  it('returns an uncalculable result when every enabled axis is unrated', () => {
    expect(calculateRating(draft({ axes: [axis({ score: 0 })] }))).toMatchObject({
      status: 'uncalculable',
      contributions: [],
    });
  });
});

describe('normalizeAxisName', () => {
  it('normalizes spacing, case, and full-width characters', () => {
    expect(normalizeAxisName(' Ａxis ')).toBe('axis');
  });
});
