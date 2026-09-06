import type { MusicRatingDraft, RatingAxis, RatingResult } from '../../domain/rating/types';

export type CardTheme = 'light' | 'dark';

export type CardRatio =
  '16:9' | '8:5' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '5:8' | '9:16';

export type LayoutFamily = 'landscape' | 'standard' | 'square' | 'portrait';

export interface CardOptions {
  theme: CardTheme;
  ratio: CardRatio;
  showReasons: boolean;
  showStory: boolean;
}

export interface RatioConfig {
  ratio: CardRatio;
  family: LayoutFamily;
  width: number;
  height: number;
  aspectRatio: number;
  maxCommentLines: number;
  maxStoryLines: number;
  maxBreakdownItems: number;
  /** Estimated characters per line for narrative text at this canvas width */
  charsPerLine: number;
}

export type CardDensity = 'sparse' | 'balanced' | 'dense';

export interface CardContentProfile {
  hasCover: boolean;
  enabledAxisCount: number;
  axisReasonCount: number;
  axisReasonUnits: number;
  negativeItemCount: number;
  commentUnits: number;
  storyUnits: number;
}

export interface CardLayoutPlan {
  density: CardDensity;
  hasNarrative: boolean;
  hasReasons: boolean;
  fallbackLevel: 0 | 1 | 2;
  chartScale: number;
  chartSize: number;
  legendColumns: 1 | 2;
  breakdownColumns: 1 | 2;
  maxBreakdownItems: number;
  maxReasonItems: number;
  maxReasonLines: number;
  maxCommentLines: number;
  maxStoryLines: number;
  showAxisReasons: boolean;
}

export type OverflowRegionId =
  'header' | 'chart' | 'axes' | 'reasons' | 'comment' | 'story' | 'footer' | 'card';

export interface OverflowIssue {
  region: OverflowRegionId;
  labelKey: string;
}

export interface CardOverflowResult {
  hasOverflow: boolean;
  issues: OverflowIssue[];
}

export interface BaseCardLayoutProps {
  draft: MusicRatingDraft;
  rating: RatingResult;
  options: CardOptions;
  config: RatioConfig;
  dark: boolean;
  visibleAxes: RatingAxis[];
  layoutPlan: CardLayoutPlan;
}
