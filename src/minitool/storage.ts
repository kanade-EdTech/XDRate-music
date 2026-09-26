import type {
  ImportanceLevel,
  MusicRatingDraft,
  NegativeItem,
  RatingAxis,
  RatingMode,
  WorkMetadataEntry,
} from '../domain/rating/types';

export type MiniToolLocale = 'zh-CN' | 'en';

export interface MiniToolWorkspace {
  locale: MiniToolLocale;
  rating: MusicRatingDraft;
}

export interface MiniToolStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export type MiniToolWorkspaceLoadResult =
  | { status: 'empty' }
  | { status: 'restored'; workspace: MiniToolWorkspace }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export const MINI_TOOL_WORKSPACE_KEY = 'xdrate.music.minitool.workspace.v1';
const STORAGE_VERSION = 1;

interface StoredWorkspace {
  version: typeof STORAGE_VERSION;
  workspace: MiniToolWorkspace;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function isMode(value: unknown): value is RatingMode {
  return value === 'simple' || value === 'professional' || value === 'custom';
}

function isImportance(value: unknown): value is ImportanceLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

function isMetadataEntry(value: unknown): value is WorkMetadataEntry {
  return (
    isRecord(value) &&
    isString(value.id, 128) &&
    value.id.length > 0 &&
    isString(value.label, 24) &&
    isString(value.value, 120)
  );
}

function isAxis(value: unknown): value is RatingAxis {
  return (
    isRecord(value) &&
    isString(value.id, 128) &&
    value.id.length > 0 &&
    isString(value.name, 24) &&
    typeof value.score === 'number' &&
    Number.isInteger(value.score) &&
    value.score >= 0 &&
    value.score <= 10 &&
    isImportance(value.importanceLevel) &&
    typeof value.enabled === 'boolean' &&
    isString(value.reason, 500)
  );
}

function isNegativeItem(value: unknown): value is NegativeItem {
  return (
    isRecord(value) &&
    isString(value.id, 128) &&
    value.id.length > 0 &&
    isString(value.name, 24) &&
    typeof value.score === 'number' &&
    Number.isInteger(value.score) &&
    value.score >= -5 &&
    value.score <= 0 &&
    typeof value.enabled === 'boolean' &&
    isString(value.reason, 500)
  );
}

export function isMiniToolRating(value: unknown): value is MusicRatingDraft {
  if (!isRecord(value) || !isMode(value.mode) || !isRecord(value.work)) return false;
  const work = value.work;
  return (
    isString(work.title, 120) &&
    (work.artistLabel === null || isString(work.artistLabel, 24)) &&
    isString(work.artist, 120) &&
    (work.albumLabel === null || isString(work.albumLabel, 24)) &&
    isString(work.album, 120) &&
    Array.isArray(work.extraFields) &&
    work.extraFields.length <= 6 &&
    work.extraFields.every(isMetadataEntry) &&
    isString(work.releaseYear, 16) &&
    work.coverDataUrl === null &&
    Array.isArray(value.axes) &&
    value.axes.length >= 1 &&
    value.axes.length <= 12 &&
    value.axes.every(isAxis) &&
    Array.isArray(value.negativeItems) &&
    value.negativeItems.length <= 5 &&
    value.negativeItems.every(isNegativeItem) &&
    isString(value.overallComment, 2000) &&
    isString(value.personalStory, 3000) &&
    (value.personalSignature === undefined || isString(value.personalSignature, 120))
  );
}

function isWorkspace(value: unknown): value is MiniToolWorkspace {
  return (
    isRecord(value) &&
    (value.locale === 'zh-CN' || value.locale === 'en') &&
    isMiniToolRating(value.rating)
  );
}

export function loadMiniToolWorkspace(storage: MiniToolStorageLike): MiniToolWorkspaceLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(MINI_TOOL_WORKSPACE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty' };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !isWorkspace(parsed.workspace)) {
      return { status: 'invalid' };
    }
    return { status: 'restored', workspace: parsed.workspace };
  } catch {
    return { status: 'invalid' };
  }
}

export function saveMiniToolWorkspace(
  storage: MiniToolStorageLike,
  workspace: MiniToolWorkspace,
): boolean {
  const stored: StoredWorkspace = { version: STORAGE_VERSION, workspace };
  try {
    storage.setItem(MINI_TOOL_WORKSPACE_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}
