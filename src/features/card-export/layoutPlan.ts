import { isRatedAxis } from '../../domain/rating/calculateRating';
import type { MusicRatingDraft, RatingAxis } from '../../domain/rating/types';
import type { CardContentProfile, CardLayoutPlan, CardOptions, RatioConfig } from './types';

const CJK_OR_FULL_WIDTH = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uff01-\uff60\uffe0-\uffee]/u;

export function estimateTextUnits(value: string | undefined): number {
  return [...(value?.trim() ?? '')].reduce(
    (units, character) => units + (CJK_OR_FULL_WIDTH.test(character) ? 1 : 0.55),
    0,
  );
}

export function estimateLines(textUnits: number, unitsPerLine: number): number {
  if (textUnits <= 0 || unitsPerLine <= 0) return 0;
  return Math.ceil(textUnits / unitsPerLine);
}

function hasReason(axis: RatingAxis): boolean {
  return isRatedAxis(axis) && axis.reason.trim().length > 0;
}

export function profileCardContent(
  draft: MusicRatingDraft,
  options: Pick<CardOptions, 'showReasons' | 'showStory'>,
): CardContentProfile {
  const enabledAxes = draft.axes.filter(isRatedAxis);
  const reasonAxes = options.showReasons ? enabledAxes.filter(hasReason) : [];

  return {
    hasCover: Boolean(draft.work.coverDataUrl),
    enabledAxisCount: enabledAxes.length,
    axisReasonCount: reasonAxes.length,
    axisReasonUnits: reasonAxes.reduce((sum, axis) => sum + estimateTextUnits(axis.reason), 0),
    negativeItemCount: draft.negativeItems.filter((item) => item.enabled).length,
    commentUnits: estimateTextUnits(draft.overallComment),
    storyUnits: options.showStory ? estimateTextUnits(draft.personalStory) : 0,
  };
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function resolveCardLayout(
  config: RatioConfig,
  profile: CardContentProfile,
  fallbackLevel: 0 | 1 | 2 = 0,
): CardLayoutPlan {
  const hasNarrative = profile.commentUnits > 0 || profile.storyUnits > 0;
  const hasReasons = profile.axisReasonCount > 0 || profile.enabledAxisCount > 0;

  const reasonLines = estimateLines(
    profile.axisReasonUnits,
    Math.max(16, config.charsPerLine * 0.72),
  );
  const commentLines = estimateLines(profile.commentUnits, config.charsPerLine);
  const storyLines = estimateLines(profile.storyUnits, config.charsPerLine);
  const usableHeight = config.height * 0.78;
  const fixedHeaderHeight = config.height * (profile.hasCover ? 0.2 : 0.16);
  const minimumChartHeight = config.height * (config.family === 'portrait' ? 0.15 : 0.18);
  const breakdownHeight = profile.enabledAxisCount * 26;
  const demand =
    fixedHeaderHeight +
    minimumChartHeight +
    (profile.axisReasonCount > 0 ? breakdownHeight + reasonLines * 20 : 0) +
    Math.min(commentLines, config.maxCommentLines) * 22 +
    Math.min(storyLines, config.maxStoryLines) * 18;
  const ratio = demand / usableHeight;
  const density = ratio < 0.65 ? 'sparse' : ratio <= 0.95 ? 'balanced' : 'dense';
  const compactness = fallbackLevel + (density === 'dense' ? 1 : 0);

  // Content-to-ratio adaptive chart sizing
  let chartSize: number;
  let legendColumns: 1 | 2;

  if (config.family === 'square') {
    if (!hasNarrative && profile.axisReasonCount === 0) {
      chartSize = 280;
      legendColumns = 2;
    } else if (!hasNarrative) {
      chartSize = 250;
      legendColumns = 1;
    } else {
      chartSize = 240;
      legendColumns = 1;
    }
  } else if (config.family === 'portrait') {
    const isNarrow = config.ratio === '9:16' || config.ratio === '5:8';
    if (isNarrow) {
      chartSize = 190;
      legendColumns = 1;
    } else if (!hasNarrative && profile.axisReasonCount === 0) {
      chartSize = 260;
      legendColumns = 2;
    } else {
      chartSize = 220;
      legendColumns = 1;
    }
  } else if (config.family === 'landscape') {
    chartSize = config.ratio === '16:9' ? 200 : 230;
    legendColumns = profile.enabledAxisCount <= 4 ? 1 : 2;
  } else {
    // standard (4:3, 5:4)
    chartSize = 240;
    legendColumns = profile.enabledAxisCount <= 4 ? 1 : 2;
  }

  return {
    density,
    hasNarrative,
    hasReasons,
    fallbackLevel,
    chartScale:
      density === 'sparse'
        ? config.family === 'square'
          ? 1.32
          : 1.08
        : density === 'dense'
          ? 0.9
          : 1,
    chartSize,
    legendColumns,
    breakdownColumns: config.family === 'portrait' || config.family === 'square' ? 1 : 2,
    maxBreakdownItems: clampInteger(
      config.maxBreakdownItems - fallbackLevel * 2,
      3,
      config.maxBreakdownItems,
    ),
    maxReasonItems: clampInteger(
      config.maxBreakdownItems - fallbackLevel,
      3,
      Math.max(3, config.family === 'portrait' ? 6 : 4),
    ),
    maxReasonLines: clampInteger(3 - compactness, 1, 3),
    maxCommentLines: clampInteger(config.maxCommentLines - compactness, 1, config.maxCommentLines),
    maxStoryLines: clampInteger(config.maxStoryLines - compactness, 1, config.maxStoryLines),
    showAxisReasons: profile.axisReasonCount > 0,
  };
}
