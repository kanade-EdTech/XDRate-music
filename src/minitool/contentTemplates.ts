import type { MusicRatingDraft } from '../domain/rating/types';
import {
  HAITANGXIAN_TEMPLATE_ID,
  HAITANGXIAN_TEMPLATE_NAME,
  createHaitangxianRating,
} from './fixtures/haitangxianTemplate';
import { isMiniToolRating, type MiniToolStorageLike } from './storage';

export const MINI_TOOL_CONTENT_TEMPLATES_KEY = 'xdrate.music.minitool.content-templates.v1';
export const MINI_TOOL_CONTENT_TEMPLATE_SEED_KEY = 'xdrate.music.minitool.content-template-seed.v1';
export const MINI_TOOL_CONTENT_TEMPLATE_FORMAT = 'xdrate-music-minitool-content-template';
export const MINI_TOOL_CONTENT_TEMPLATE_SCHEMA_VERSION = 1;
export const MINI_TOOL_CONTENT_TEMPLATE_LIMIT = 20;
export const MINI_TOOL_CONTENT_TEMPLATE_MAX_BYTES = 512 * 1024;

export interface MiniToolContentTemplate {
  format: typeof MINI_TOOL_CONTENT_TEMPLATE_FORMAT;
  schemaVersion: typeof MINI_TOOL_CONTENT_TEMPLATE_SCHEMA_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rating: MusicRatingDraft;
}

export interface MiniToolContentTemplateCatalog {
  version: 1;
  templates: MiniToolContentTemplate[];
}

export type ContentTemplateCatalogLoadResult =
  | { status: 'empty'; catalog: MiniToolContentTemplateCatalog }
  | { status: 'restored'; catalog: MiniToolContentTemplateCatalog }
  | { status: 'invalid'; catalog: MiniToolContentTemplateCatalog }
  | { status: 'unavailable'; catalog: MiniToolContentTemplateCatalog };

export type ContentTemplateSeedLoadResult =
  { status: 'unseeded' } | { status: 'seeded' } | { status: 'invalid' } | { status: 'unavailable' };

export type ContentTemplateCatalogSaveResult = 'saved' | 'invalid' | 'too-large' | 'unavailable';

interface StoredCatalog {
  version: 1;
  templates: MiniToolContentTemplate[];
}

interface StoredSeedMarker {
  version: 1;
  seeded: true;
}

let fallbackTemplateSequence = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 40 &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function normalizeContentTemplateName(value: string): string {
  return value.trim().normalize('NFKC');
}

function comparableName(value: string): string {
  return normalizeContentTemplateName(value).toLocaleLowerCase();
}

function isTemplate(value: unknown): value is MiniToolContentTemplate {
  if (!isRecord(value)) return false;
  const name = typeof value.name === 'string' ? value.name : '';
  return (
    value.format === MINI_TOOL_CONTENT_TEMPLATE_FORMAT &&
    value.schemaVersion === MINI_TOOL_CONTENT_TEMPLATE_SCHEMA_VERSION &&
    typeof value.id === 'string' &&
    value.id.length >= 1 &&
    value.id.length <= 128 &&
    name === normalizeContentTemplateName(name) &&
    name.length >= 1 &&
    name.length <= 40 &&
    isIsoTimestamp(value.createdAt) &&
    isIsoTimestamp(value.updatedAt) &&
    Date.parse(value.updatedAt) >= Date.parse(value.createdAt) &&
    isMiniToolRating(value.rating) &&
    value.rating.work.coverDataUrl === null
  );
}

function isCatalog(value: unknown): value is StoredCatalog {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.templates)) return false;
  if (
    value.templates.length > MINI_TOOL_CONTENT_TEMPLATE_LIMIT ||
    !value.templates.every(isTemplate)
  ) {
    return false;
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  return value.templates.every((template) => {
    const name = comparableName(template.name);
    if (ids.has(template.id) || names.has(name)) return false;
    ids.add(template.id);
    names.add(name);
    return true;
  });
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

export function createEmptyContentTemplateCatalog(): MiniToolContentTemplateCatalog {
  return { version: 1, templates: [] };
}

export function cloneRatingWithoutCover(rating: MusicRatingDraft): MusicRatingDraft {
  return {
    ...rating,
    work: {
      ...rating.work,
      coverDataUrl: null,
      extraFields: rating.work.extraFields.map((entry) => ({ ...entry })),
    },
    axes: rating.axes.map((axis) => ({ ...axis })),
    negativeItems: rating.negativeItems.map((item) => ({ ...item })),
  };
}

export function createContentTemplateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `template-${crypto.randomUUID()}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    return `template-${values[0].toString(36)}${values[1].toString(36)}`;
  }
  fallbackTemplateSequence += 1;
  return `template-${Date.now().toString(36)}-${fallbackTemplateSequence.toString(36)}`;
}

export function createContentTemplate(
  id: string,
  name: string,
  rating: MusicRatingDraft,
  now: string,
  createdAt = now,
): MiniToolContentTemplate | null {
  const normalizedName = normalizeContentTemplateName(name);
  if (normalizedName.length < 1 || normalizedName.length > 40) return null;
  return {
    format: MINI_TOOL_CONTENT_TEMPLATE_FORMAT,
    schemaVersion: MINI_TOOL_CONTENT_TEMPLATE_SCHEMA_VERSION,
    id,
    name: normalizedName,
    createdAt,
    updatedAt: now,
    rating: cloneRatingWithoutCover(rating),
  };
}

export function createHaitangxianContentTemplate(now: string): MiniToolContentTemplate {
  return createContentTemplate(
    HAITANGXIAN_TEMPLATE_ID,
    HAITANGXIAN_TEMPLATE_NAME,
    createHaitangxianRating(),
    now,
  )!;
}

export function findContentTemplateByName(
  catalog: MiniToolContentTemplateCatalog,
  name: string,
  excludedId?: string,
): MiniToolContentTemplate | undefined {
  const expected = comparableName(name);
  return catalog.templates.find(
    (template) => template.id !== excludedId && comparableName(template.name) === expected,
  );
}

export function putContentTemplate(
  catalog: MiniToolContentTemplateCatalog,
  template: MiniToolContentTemplate,
): MiniToolContentTemplateCatalog {
  const withoutCurrent = catalog.templates.filter((candidate) => candidate.id !== template.id);
  return {
    version: 1,
    templates: [...withoutCurrent, template].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    ),
  };
}

export function removeContentTemplate(
  catalog: MiniToolContentTemplateCatalog,
  id: string,
): MiniToolContentTemplateCatalog {
  return { version: 1, templates: catalog.templates.filter((template) => template.id !== id) };
}

export function loadContentTemplateCatalog(
  storage: MiniToolStorageLike,
): ContentTemplateCatalogLoadResult {
  const empty = createEmptyContentTemplateCatalog();
  let raw: string | null;
  try {
    raw = storage.getItem(MINI_TOOL_CONTENT_TEMPLATES_KEY);
  } catch {
    return { status: 'unavailable', catalog: empty };
  }
  if (raw === null) return { status: 'empty', catalog: empty };
  if (utf8ByteLength(raw) > MINI_TOOL_CONTENT_TEMPLATE_MAX_BYTES) {
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

export function saveContentTemplateCatalog(
  storage: MiniToolStorageLike,
  catalog: MiniToolContentTemplateCatalog,
): ContentTemplateCatalogSaveResult {
  if (!isCatalog(catalog)) return 'invalid';
  const serialized = JSON.stringify(catalog);
  if (utf8ByteLength(serialized) > MINI_TOOL_CONTENT_TEMPLATE_MAX_BYTES) return 'too-large';
  try {
    storage.setItem(MINI_TOOL_CONTENT_TEMPLATES_KEY, serialized);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}

export function loadContentTemplateSeed(
  storage: MiniToolStorageLike,
): ContentTemplateSeedLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(MINI_TOOL_CONTENT_TEMPLATE_SEED_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'unseeded' };
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) && parsed.version === 1 && parsed.seeded === true
      ? { status: 'seeded' }
      : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}

export function saveContentTemplateSeed(storage: MiniToolStorageLike): boolean {
  const marker: StoredSeedMarker = { version: 1, seeded: true };
  try {
    storage.setItem(MINI_TOOL_CONTENT_TEMPLATE_SEED_KEY, JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

export { HAITANGXIAN_TEMPLATE_ID };
