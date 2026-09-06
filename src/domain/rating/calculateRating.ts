import type { ImportanceLevel, MusicRatingDraft, RatingAxis, RatingResult } from './types';

export const ratingAlgorithmVersion = 'music-linear-100-v4';

export const unratedAxisScore = 0;
export const minimumRatedAxisScore = 1;

export const importanceWeights: Record<ImportanceLevel, number> = {
  0: 0,
  1: 0.25,
  2: 0.75,
  3: 1,
  4: 1.5,
  5: 2.5,
  6: 5,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToOneDecimal(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function normalizeAxisName(name: string): string {
  return name.normalize('NFKC').trim().toLocaleLowerCase();
}

export function isRatedAxis(axis: Pick<RatingAxis, 'enabled' | 'score'>): boolean {
  return (
    axis.enabled &&
    Number.isFinite(axis.score) &&
    Number.isInteger(axis.score) &&
    axis.score >= minimumRatedAxisScore &&
    axis.score <= 10
  );
}

export function calculateRating(
  draft: Pick<MusicRatingDraft, 'axes' | 'negativeItems'>,
): RatingResult {
  const calculatedAxes = draft.axes
    .filter((axis) => isRatedAxis(axis) && importanceWeights[axis.importanceLevel] > 0)
    .map((axis) => ({ axis, weight: importanceWeights[axis.importanceLevel] }));
  const totalWeight = calculatedAxes.reduce((sum, { weight }) => sum + weight, 0);

  if (totalWeight === 0) {
    return { status: 'uncalculable', contributions: [] };
  }

  const contributions = calculatedAxes.map(({ axis, weight }) => ({
    axisId: axis.id,
    axisName: axis.name,
    score: axis.score,
    weight,
    weightedContribution100: (axis.score * weight * 10) / totalWeight,
  }));
  const positiveScore100 = contributions.reduce(
    (sum, item) => sum + item.weightedContribution100,
    0,
  );
  const penalty100 =
    draft.negativeItems.filter((item) => item.enabled).reduce((sum, item) => sum + item.score, 0) *
    10;
  const rawScore100 = clamp(positiveScore100 + penalty100, 0, 100);

  return {
    status: 'ready',
    positiveScore100,
    penalty100,
    score100: roundToOneDecimal(rawScore100),
    contributions,
  };
}
