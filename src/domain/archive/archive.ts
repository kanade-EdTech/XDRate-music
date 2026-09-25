import { z } from 'zod';

import type { CardOptions } from '../../features/card-export/CardPreview';
import { ratingAlgorithmVersion } from '../rating/calculateRating';
import type { MusicRatingDraft } from '../rating/types';

export const archiveFormat = 'xdrate-music-archive';
export const templateFormat = 'xdrate-music-template';
export const schemaVersion = 2;
export const algorithmVersion = ratingAlgorithmVersion;
const previousAlgorithmVersion = 'music-linear-100-v3';

const legacyRatioMap = {
  wide: '16:9',
  square: '1:1',
  portrait: '4:5',
} as const;

const cardOptionsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  ratio: z.enum(['16:9', '8:5', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '5:8', '9:16']),
  showReasons: z.boolean(),
  showStory: z.boolean(),
});

const axisScoreSchema = z.union([z.literal(0), z.number().int().min(1).max(10)]);

const axisSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().max(24),
  score: axisScoreSchema,
  importanceLevel: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  enabled: z.boolean(),
  reason: z.string().max(500),
});
const negativeItemSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().max(24),
  score: z.number().min(-5).max(0),
  enabled: z.boolean(),
  reason: z.string().max(500),
});
const workMetadataEntrySchema = z.object({
  id: z.string().min(1).max(128),
  label: z.string().max(24),
  value: z.string().max(120),
});
const coverDataUrlSchema = z
  .string()
  .max(14_000_000)
  .refine(isSafeCoverDataUrl, 'unsupported-cover-data')
  .nullable();
const ratingSchema = z.object({
  mode: z.enum(['simple', 'professional', 'custom']),
  work: z.object({
    title: z.string().max(120),
    artistLabel: z.string().max(24).nullable(),
    artist: z.string().max(120),
    albumLabel: z.string().max(24).nullable(),
    album: z.string().max(120),
    extraFields: z.array(workMetadataEntrySchema).max(6),
    releaseYear: z.string().max(16),
    coverDataUrl: coverDataUrlSchema,
  }),
  axes: z.array(axisSchema).min(1).max(12),
  negativeItems: z.array(negativeItemSchema).max(5),
  overallComment: z.string().max(2000),
  personalStory: z.string().max(3000),
  personalSignature: z.string().max(120).optional(),
});

export const workspaceSchema = z.object({ rating: ratingSchema, cardOptions: cardOptionsSchema });
export type Workspace = { rating: MusicRatingDraft; cardOptions: CardOptions };

const archiveSchema = z.object({
  format: z.literal(archiveFormat),
  schemaVersion: z.literal(schemaVersion),
  algorithmVersion: z.literal(algorithmVersion),
  exportedAt: z.string().datetime(),
  appVersion: z.string().min(1),
  workspace: workspaceSchema,
});
export type RatingArchiveV2 = z.infer<typeof archiveSchema>;

const templateSchema = z.object({
  format: z.literal(templateFormat),
  schemaVersion: z.literal(schemaVersion),
  algorithmVersion: z.literal(algorithmVersion),
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  mode: z.enum(['simple', 'professional', 'custom']),
  axes: z
    .array(axisSchema.pick({ id: true, name: true, importanceLevel: true, enabled: true }))
    .min(1)
    .max(12),
  negativeItems: z.array(negativeItemSchema.pick({ id: true, name: true, enabled: true })).max(5),
  cardOptions: cardOptionsSchema,
});
export type RatingTemplate = z.infer<typeof templateSchema>;

export function createArchive(workspace: Workspace, appVersion: string): RatingArchiveV2 {
  return {
    format: archiveFormat,
    schemaVersion,
    algorithmVersion,
    exportedAt: new Date().toISOString(),
    appVersion,
    workspace,
  };
}

export function parseArchive(value: unknown): Workspace {
  const result = archiveSchema.safeParse(migrateArchive(value));
  if (!result.success) throw new Error('invalid-archive');
  return result.data.workspace;
}

export function migrateArchive(value: unknown): unknown {
  if (!isRecord(value) || !('schemaVersion' in value)) {
    throw new Error('invalid-archive');
  }
  const version = value.schemaVersion;
  if (version === schemaVersion) return migrateCurrentArchive(value);
  if (version === 1) {
    return {
      ...value,
      schemaVersion,
      algorithmVersion,
      workspace: migrateLegacyWorkspace(value.workspace),
    };
  }
  throw new Error('unsupported-archive-version');
}

export function parseTemplate(value: unknown): RatingTemplate {
  const result = templateSchema.safeParse(migrateTemplate(value));
  if (!result.success) throw new Error('invalid-template');
  return result.data;
}

export function createTemplate(name: string, workspace: Workspace): RatingTemplate {
  const now = new Date().toISOString();
  return {
    format: templateFormat,
    schemaVersion,
    algorithmVersion,
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    mode: workspace.rating.mode,
    axes: workspace.rating.axes.map(({ id, name: axisName, importanceLevel, enabled }) => ({
      id,
      name: axisName,
      importanceLevel,
      enabled,
    })),
    negativeItems: workspace.rating.negativeItems.map(({ id, name: itemName, enabled }) => ({
      id,
      name: itemName,
      enabled,
    })),
    cardOptions: workspace.cardOptions,
  };
}

function migrateTemplate(value: unknown): unknown {
  if (!isRecord(value) || !('schemaVersion' in value)) {
    throw new Error('invalid-template');
  }
  const version = value.schemaVersion;
  if (version === schemaVersion) return migrateCurrentTemplate(value);
  if (version === 1) {
    return {
      ...value,
      schemaVersion,
      algorithmVersion,
      cardOptions: migrateLegacyCardOptions(value.cardOptions),
    };
  }
  throw new Error('unsupported-template-version');
}

function migrateLegacyWorkspace(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return migrateWorkspace({
    ...value,
    cardOptions: migrateLegacyCardOptions(value.cardOptions),
  });
}

function migrateCurrentArchive(value: Record<string, unknown>): unknown {
  return {
    ...value,
    algorithmVersion:
      value.algorithmVersion === previousAlgorithmVersion
        ? algorithmVersion
        : value.algorithmVersion,
    workspace: migrateWorkspace(value.workspace),
  };
}

function migrateCurrentTemplate(value: Record<string, unknown>): unknown {
  if (value.algorithmVersion !== previousAlgorithmVersion) return value;
  return { ...value, algorithmVersion };
}

function migrateLegacyAxisScores(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.rating) || !Array.isArray(value.rating.axes)) {
    return value;
  }

  return {
    ...value,
    rating: {
      ...value.rating,
      axes: value.rating.axes.map((axis) => {
        if (!isRecord(axis) || typeof axis.score !== 'number') return axis;
        if (axis.score === 0) return axis;
        if (axis.score > 0 && Number.isFinite(axis.score)) {
          return { ...axis, score: Math.min(10, Math.max(1, Math.round(axis.score))) };
        }
        return axis;
      }),
    },
  };
}

function migrateWorkspace(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.rating) || !isRecord(value.rating.work)) {
    return migrateLegacyAxisScores(value);
  }

  const work = value.rating.work;
  const hasExtendedMetadata = 'artistLabel' in work && 'extraFields' in work;
  const withMetadataFields = {
    ...value,
    rating: {
      ...value.rating,
      work: {
        ...value.rating.work,
        artistLabel:
          'artistLabel' in work &&
          (typeof work.artistLabel === 'string' || work.artistLabel === null)
            ? work.artistLabel
            : null,
        albumLabel:
          hasExtendedMetadata && (typeof work.albumLabel === 'string' || work.albumLabel === null)
            ? work.albumLabel
            : typeof work.albumLabel === 'string' && work.albumLabel.length > 0
              ? work.albumLabel
              : null,
        extraFields: Array.isArray(work.extraFields) ? work.extraFields : [],
      },
    },
  };

  return migrateLegacyAxisScores(withMetadataFields);
}

function migrateLegacyCardOptions(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const ratio = value.ratio;
  const migratedRatio =
    typeof ratio === 'string' && ratio in legacyRatioMap
      ? legacyRatioMap[ratio as keyof typeof legacyRatioMap]
      : ratio;
  return { ...value, ratio: migratedRatio };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isSafeCoverDataUrl(value: string): boolean {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const prefix = Uint8Array.from(atob(match[2].slice(0, 24)), (character) =>
      character.charCodeAt(0),
    );
    if (match[1] === 'image/png') {
      return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => prefix[index] === byte);
    }
    if (match[1] === 'image/jpeg') {
      return prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff;
    }
    return (
      prefix[0] === 0x52 &&
      prefix[1] === 0x49 &&
      prefix[2] === 0x46 &&
      prefix[3] === 0x46 &&
      prefix[8] === 0x57 &&
      prefix[9] === 0x45 &&
      prefix[10] === 0x42 &&
      prefix[11] === 0x50
    );
  } catch {
    return false;
  }
}

export function applyTemplate(template: RatingTemplate, workspace: Workspace): Workspace {
  return {
    ...workspace,
    rating: {
      ...workspace.rating,
      mode: template.mode,
      axes: template.axes.map((axis) => ({ ...axis, score: 0, reason: '' })),
      negativeItems: template.negativeItems.map((item) => ({ ...item, score: 0, reason: '' })),
    },
    cardOptions: template.cardOptions,
  };
}
