export type RatingMode = 'simple' | 'professional' | 'custom';

export type ImportanceLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WorkMetadataEntry {
  id: string;
  label: string;
  value: string;
}

export interface WorkMetadata {
  title: string;
  artistLabel: string | null;
  artist: string;
  albumLabel: string | null;
  album: string;
  extraFields: WorkMetadataEntry[];
  releaseYear: string;
  coverDataUrl: string | null;
}

export interface RatingAxis {
  id: string;
  name: string;
  score: number;
  importanceLevel: ImportanceLevel;
  enabled: boolean;
  reason: string;
}

export interface NegativeItem {
  id: string;
  name: string;
  score: number;
  enabled: boolean;
  reason: string;
}

export interface MusicRatingDraft {
  mode: RatingMode;
  work: WorkMetadata;
  axes: RatingAxis[];
  negativeItems: NegativeItem[];
  overallComment: string;
  personalStory: string;
}

export interface AxisContribution {
  axisId: string;
  axisName: string;
  score: number;
  weight: number;
  weightedContribution100: number;
}

export type RatingResult =
  | {
      status: 'ready';
      positiveScore100: number;
      penalty100: number;
      score100: number;
      contributions: AxisContribution[];
    }
  | {
      status: 'uncalculable';
      contributions: AxisContribution[];
    };
