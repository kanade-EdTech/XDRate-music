import type { CardRatio, RatioConfig } from './types';

/**
 * Specification table for all 11 supported card ratios.
 *
 * charsPerLine estimates the number of mixed-script (Chinese/Latin) characters
 * that fit on one body-text line at each canvas width.  At 13 px body font
 * with average char width ≈ 12 px on a double-padded content column the
 * effective column widths (canvas - 2×padding) are roughly:
 *
 *   landscape/standard (col ≈ 50% of canvas): ~450–540 px → ~37–45 chars
 *   portrait  (col ≈ full canvas): canvas - 2×32 px → ~27–45 chars
 *   square    (col ≈ 50%):  ~460 px → ~38 chars
 *
 * We use conservative values to avoid false "no truncation" signals.
 */
export const CARD_RATIO_CONFIGS: Record<CardRatio, RatioConfig> = {
  '16:9': {
    ratio: '16:9',
    family: 'landscape',
    width: 1200,
    height: 675,
    aspectRatio: 16 / 9,
    maxCommentLines: 3,
    maxStoryLines: 2,
    maxBreakdownItems: 6,
    charsPerLine: 38,
  },
  '8:5': {
    ratio: '8:5',
    family: 'landscape',
    width: 1200,
    height: 750,
    aspectRatio: 8 / 5,
    maxCommentLines: 4,
    maxStoryLines: 2,
    maxBreakdownItems: 6,
    charsPerLine: 38,
  },
  '3:2': {
    ratio: '3:2',
    family: 'landscape',
    width: 1200,
    height: 800,
    aspectRatio: 3 / 2,
    maxCommentLines: 4,
    maxStoryLines: 3,
    maxBreakdownItems: 8,
    charsPerLine: 38,
  },
  '4:3': {
    ratio: '4:3',
    family: 'standard',
    width: 1200,
    height: 900,
    aspectRatio: 4 / 3,
    maxCommentLines: 5,
    maxStoryLines: 3,
    maxBreakdownItems: 8,
    charsPerLine: 40,
  },
  '5:4': {
    ratio: '5:4',
    family: 'standard',
    width: 1200,
    height: 960,
    aspectRatio: 5 / 4,
    maxCommentLines: 5,
    maxStoryLines: 4,
    maxBreakdownItems: 8,
    charsPerLine: 40,
  },
  '1:1': {
    ratio: '1:1',
    family: 'square',
    width: 1000,
    height: 1000,
    aspectRatio: 1,
    maxCommentLines: 5,
    maxStoryLines: 4,
    maxBreakdownItems: 8,
    charsPerLine: 36,
  },
  '4:5': {
    ratio: '4:5',
    family: 'portrait',
    width: 960,
    height: 1200,
    aspectRatio: 4 / 5,
    maxCommentLines: 5,
    maxStoryLines: 4,
    maxBreakdownItems: 8,
    charsPerLine: 40,
  },
  '3:4': {
    ratio: '3:4',
    family: 'portrait',
    width: 900,
    height: 1200,
    aspectRatio: 3 / 4,
    maxCommentLines: 6,
    maxStoryLines: 4,
    maxBreakdownItems: 8,
    charsPerLine: 37,
  },
  '2:3': {
    ratio: '2:3',
    family: 'portrait',
    width: 800,
    height: 1200,
    aspectRatio: 2 / 3,
    maxCommentLines: 7,
    maxStoryLines: 5,
    maxBreakdownItems: 10,
    charsPerLine: 32,
  },
  '5:8': {
    ratio: '5:8',
    family: 'portrait',
    width: 750,
    height: 1200,
    aspectRatio: 5 / 8,
    maxCommentLines: 8,
    maxStoryLines: 6,
    maxBreakdownItems: 12,
    charsPerLine: 30,
  },
  '9:16': {
    ratio: '9:16',
    family: 'portrait',
    width: 675,
    height: 1200,
    aspectRatio: 9 / 16,
    maxCommentLines: 10,
    maxStoryLines: 8,
    maxBreakdownItems: 12,
    charsPerLine: 26,
  },
};

export const ALL_CARD_RATIOS: CardRatio[] = [
  '16:9',
  '8:5',
  '3:2',
  '4:3',
  '5:4',
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '5:8',
  '9:16',
];

export function getRatioConfig(ratio: CardRatio): RatioConfig {
  return CARD_RATIO_CONFIGS[ratio] ?? CARD_RATIO_CONFIGS['4:5'];
}
