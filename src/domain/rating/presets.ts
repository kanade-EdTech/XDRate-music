import type {
  ImportanceLevel,
  MusicRatingDraft,
  NegativeItem,
  RatingAxis,
  RatingMode,
  WorkMetadata,
  WorkMetadataEntry,
} from './types';

export const defaultImportanceLevel: ImportanceLevel = 3;

const axisPresets: Record<Exclude<RatingMode, 'custom'>, readonly string[]> = {
  simple: ['艺术品质', '听感', '个人喜好'],
  professional: ['填词 / 立意', '作曲 / 编曲', '演唱 / 调音 / 混音', '创新', '其他'],
};

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createWorkMetadata(): WorkMetadata {
  return {
    title: '',
    artistLabel: null,
    artist: '',
    albumLabel: null,
    album: '',
    extraFields: [],
    releaseYear: '',
    coverDataUrl: null,
  };
}

export function createWorkMetadataEntry(): WorkMetadataEntry {
  return { id: createId('metadata'), label: '', value: '' };
}

export function createRatingAxis(name: string): RatingAxis {
  return {
    id: createId('axis'),
    name,
    score: 0,
    importanceLevel: defaultImportanceLevel,
    enabled: true,
    reason: '',
  };
}

export function createNegativeItem(name = '其他讨厌'): NegativeItem {
  return { id: createId('negative'), name, score: 0, enabled: true, reason: '' };
}

export function createDefaultAxes(mode: Exclude<RatingMode, 'custom'>): RatingAxis[] {
  return axisPresets[mode].map(createRatingAxis);
}

export function createDefaultRating(
  mode: Exclude<RatingMode, 'custom'> = 'simple',
): MusicRatingDraft {
  return {
    mode,
    work: createWorkMetadata(),
    axes: createDefaultAxes(mode),
    negativeItems: [],
    overallComment: '',
    personalStory: '',
  };
}
