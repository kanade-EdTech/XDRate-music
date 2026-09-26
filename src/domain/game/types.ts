import type {
  ImportanceLevel,
  NegativeItem,
  RatingAxis,
  RatingMode,
  WorkMetadataEntry,
} from '../rating/types';

export const gameDomainId = 'game' as const;

export type GameTemplateSource = 'seeded-example' | 'user-created';
export type GameCoverUsage = 'cleared' | 'local-only' | 'unknown';

export interface GameCoverAttribution {
  label: string;
  usage: GameCoverUsage;
}

export interface GameWorkMetadata {
  title: string;
  platform: string;
  version: string;
  releaseNote: string;
  extraFields: WorkMetadataEntry[];
  coverDataUrl: string | null;
  coverAssetPath?: string;
  coverAttribution?: GameCoverAttribution;
}

export interface GameRatingDraft {
  mode: RatingMode;
  work: GameWorkMetadata;
  axes: RatingAxis[];
  negativeItems: NegativeItem[];
  overallComment: string;
  personalStory: string;
  personalSignature?: string;
}

export interface GameTemplateDefinition {
  id: string;
  source: GameTemplateSource;
  name: string;
  createdAt: string;
  updatedAt: string;
  rating: GameRatingDraft;
}

export interface GameAxisDefinition {
  id: string;
  label: string;
  defaultImportanceLevel: ImportanceLevel;
  description: string;
}

export interface GameDomainDefinition {
  id: typeof gameDomainId;
  label: string;
  algorithmVersion: 'music-linear-100-v4';
  axisDefinitions: readonly GameAxisDefinition[];
  templateIds: readonly string[];
}
