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

let fallbackIdSequence = 0;

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    return `${prefix}-${values[0].toString(36)}${values[1].toString(36)}`;
  }

  fallbackIdSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackIdSequence.toString(36)}`;
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
    personalSignature: '',
  };
}

/** Clear user-facing content while keeping the selected mode and axis structure. */
export function clearRatingContent(rating: MusicRatingDraft): MusicRatingDraft {
  const axes =
    rating.mode === 'custom'
      ? rating.axes
      : rating.axes.length > 0
        ? rating.axes
        : createDefaultAxes(rating.mode);

  return {
    ...rating,
    work: createWorkMetadata(),
    axes: axes.map((axis) => ({ ...axis, score: 0, reason: '' })),
    negativeItems: [],
    overallComment: '',
    personalStory: '',
    personalSignature: '',
  };
}
