import { createSeededGameTemplateCatalog, type GameTemplateCatalog } from './templateCatalog';
import type { GameTemplateDefinition } from './types';

export const GAME_TEMPLATE_CATALOG_KEY = 'xdrate.game.templates.v1';
export const GAME_TEMPLATE_CATALOG_VERSION = 1 as const;
export const GAME_TEMPLATE_CATALOG_LIMIT = 20;
export const GAME_TEMPLATE_CATALOG_MAX_BYTES = 2 * 1024 * 1024;

export interface GameTemplateStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export type GameTemplateCatalogLoadResult =
  | { status: 'empty'; catalog: GameTemplateCatalog }
  | { status: 'restored'; catalog: GameTemplateCatalog }
  | { status: 'invalid'; catalog: GameTemplateCatalog }
  | { status: 'unavailable'; catalog: GameTemplateCatalog };

export type GameTemplateCatalogSaveResult = 'saved' | 'invalid' | 'too-large' | 'unavailable';

export type GameTemplateCatalogInitializeResult =
  | { status: 'seeded'; catalog: GameTemplateCatalog }
  | { status: 'restored'; catalog: GameTemplateCatalog }
  | { status: 'invalid'; catalog: GameTemplateCatalog }
  | { status: 'unavailable'; catalog: GameTemplateCatalog };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function isRelativeAssetPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 240 &&
    !value.startsWith('/') &&
    !value.includes('://') &&
    !value.includes('..')
  );
}

function isTemplate(value: unknown): value is GameTemplateDefinition {
  if (!isRecord(value) || !isRecord(value.rating) || !isRecord(value.rating.work)) return false;
  const work = value.rating.work;
  const rating = value.rating;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    (value.source === 'seeded-example' || value.source === 'user-created') &&
    typeof value.name === 'string' &&
    value.name.trim() === value.name &&
    value.name.length > 0 &&
    value.name.length <= 80 &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    Date.parse(value.updatedAt) >= Date.parse(value.createdAt) &&
    (rating.mode === 'simple' || rating.mode === 'professional' || rating.mode === 'custom') &&
    typeof work.title === 'string' &&
    work.title.length <= 120 &&
    typeof work.platform === 'string' &&
    work.platform.length <= 80 &&
    typeof work.version === 'string' &&
    work.version.length <= 80 &&
    typeof work.releaseNote === 'string' &&
    work.releaseNote.length <= 500 &&
    Array.isArray(work.extraFields) &&
    work.extraFields.length <= 6 &&
    (work.coverDataUrl === null || typeof work.coverDataUrl === 'string') &&
    (work.coverAssetPath === undefined || isRelativeAssetPath(work.coverAssetPath)) &&
    Array.isArray(rating.axes) &&
    rating.axes.length >= 1 &&
    rating.axes.length <= 12 &&
    Array.isArray(rating.negativeItems) &&
    rating.negativeItems.length <= 5 &&
    typeof rating.overallComment === 'string' &&
    rating.overallComment.length <= 2000 &&
    typeof rating.personalStory === 'string' &&
    rating.personalStory.length <= 3000 &&
    (rating.personalSignature === undefined || typeof rating.personalSignature === 'string')
  );
}

function isCatalog(value: unknown): value is GameTemplateCatalog {
  if (
    !isRecord(value) ||
    value.version !== GAME_TEMPLATE_CATALOG_VERSION ||
    !Array.isArray(value.templates)
  ) {
    return false;
  }
  if (value.templates.length > GAME_TEMPLATE_CATALOG_LIMIT || !value.templates.every(isTemplate)) {
    return false;
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  return value.templates.every((template) => {
    const normalizedName = template.name.normalize('NFKC').toLocaleLowerCase();
    if (ids.has(template.id) || names.has(normalizedName)) return false;
    ids.add(template.id);
    names.add(normalizedName);
    return true;
  });
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function createEmptyGameTemplateCatalog(): GameTemplateCatalog {
  return { version: GAME_TEMPLATE_CATALOG_VERSION, templates: [] };
}

export function loadGameTemplateCatalog(
  storage: GameTemplateStorageLike,
): GameTemplateCatalogLoadResult {
  const empty = createEmptyGameTemplateCatalog();
  let raw: string | null;
  try {
    raw = storage.getItem(GAME_TEMPLATE_CATALOG_KEY);
  } catch {
    return { status: 'unavailable', catalog: empty };
  }
  if (raw === null) return { status: 'empty', catalog: empty };
  if (utf8ByteLength(raw) > GAME_TEMPLATE_CATALOG_MAX_BYTES) {
    return { status: 'invalid', catalog: empty };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isCatalog(parsed)
      ? { status: 'restored', catalog: parsed }
      : { status: 'invalid', catalog: empty };
  } catch {
    return { status: 'invalid', catalog: empty };
  }
}

export function initializeGameTemplateCatalog(
  storage: GameTemplateStorageLike,
  timestamp?: string,
): GameTemplateCatalogInitializeResult {
  const loaded = loadGameTemplateCatalog(storage);
  if (loaded.status !== 'empty') return loaded;
  const seeded = createSeededGameTemplateCatalog(timestamp);
  return saveGameTemplateCatalog(storage, seeded) === 'saved'
    ? { status: 'seeded', catalog: seeded }
    : { status: 'unavailable', catalog: seeded };
}

export function saveGameTemplateCatalog(
  storage: GameTemplateStorageLike,
  catalog: GameTemplateCatalog,
): GameTemplateCatalogSaveResult {
  if (!isCatalog(catalog)) return 'invalid';
  const serialized = JSON.stringify(catalog);
  if (utf8ByteLength(serialized) > GAME_TEMPLATE_CATALOG_MAX_BYTES) return 'too-large';
  try {
    storage.setItem(GAME_TEMPLATE_CATALOG_KEY, serialized);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}
