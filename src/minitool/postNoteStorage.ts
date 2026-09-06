import {
  buildPostNotePayload,
  type MiniToolPostNotePayload,
  type PostNoteDraft,
} from './postNotePayload';
import type { MiniToolStorageLike } from './storage';

export const MINI_TOOL_PENDING_POST_KEY = 'xdrate.music.minitool.pending-post.v1';
const PENDING_POST_VERSION = 1;

export type PendingPostLoadResult =
  | { status: 'empty' }
  | { status: 'restored'; draft: PostNoteDraft }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export type PendingPostSaveResult = 'saved' | 'invalid' | 'unavailable';

interface StoredPendingPost {
  version: typeof PENDING_POST_VERSION;
  draft: PostNoteDraft;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isStoredDraft(value: unknown): value is PostNoteDraft {
  return (
    isRecord(value) &&
    isOptionalString(value.title) &&
    isOptionalString(value.content) &&
    isOptionalString(value.tags) &&
    Array.isArray(value.imageDataUris) &&
    value.imageDataUris.every((item) => typeof item === 'string')
  );
}

function payloadToDraft(payload: MiniToolPostNotePayload): PostNoteDraft {
  return {
    ...(payload.title === undefined ? {} : { title: payload.title }),
    ...(payload.content === undefined ? {} : { content: payload.content }),
    ...(payload.tags === undefined ? {} : { tags: payload.tags }),
    imageDataUris: payload.mediaInfo.image_resources.map((resource) => resource.url),
  };
}

export function loadPendingPostDraft(storage: MiniToolStorageLike): PendingPostLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(MINI_TOOL_PENDING_POST_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty' };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== PENDING_POST_VERSION ||
      !isStoredDraft(parsed.draft)
    ) {
      return { status: 'invalid' };
    }
    const built = buildPostNotePayload(parsed.draft);
    return built.ok
      ? { status: 'restored', draft: payloadToDraft(built.payload) }
      : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}

export function savePendingPostDraft(
  storage: MiniToolStorageLike,
  draft: PostNoteDraft,
): PendingPostSaveResult {
  const built = buildPostNotePayload(draft);
  if (!built.ok) return 'invalid';

  const stored: StoredPendingPost = {
    version: PENDING_POST_VERSION,
    draft: payloadToDraft(built.payload),
  };
  try {
    storage.setItem(MINI_TOOL_PENDING_POST_KEY, JSON.stringify(stored));
    return 'saved';
  } catch {
    return 'unavailable';
  }
}
