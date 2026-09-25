import {
  buildPostNotePayload,
  type MiniToolPostNotePayload,
  type PostNoteDraft,
} from './postNotePayload';
import type { MiniToolStorageLike } from './storage';

export const MINI_TOOL_PENDING_POST_KEY = 'xdrate.music.minitool.pending-post.v2';
const LEGACY_PENDING_POST_KEY = 'xdrate.music.minitool.pending-post.v1';
const PENDING_POST_VERSION = 2;

export type PendingPostState = NonNullable<PostNoteDraft['postState']>;

export type PendingPostLoadResult =
  | { status: 'empty' }
  | { status: 'restored'; draft: PostNoteDraft }
  | { status: 'accepted'; draft: PostNoteDraft }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export type PendingPostSaveResult = 'saved' | 'invalid' | 'unavailable';

interface StoredPendingPost {
  version: typeof PENDING_POST_VERSION;
  requestId: string;
  renderRevision: string;
  target: 'xhs-post-note';
  state: PendingPostState;
  createdAt: string;
  updatedAt: string;
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

function payloadToDraft(
  payload: MiniToolPostNotePayload,
  metadata: Partial<StoredPendingPost> = {},
): PostNoteDraft {
  return {
    ...(payload.title === undefined ? {} : { title: payload.title }),
    ...(payload.content === undefined ? {} : { content: payload.content }),
    ...(payload.tags === undefined ? {} : { tags: payload.tags }),
    imageDataUris: payload.mediaInfo.image_resources.map((resource) => resource.url),
    ...(metadata.requestId ? { requestId: metadata.requestId } : {}),
    ...(metadata.renderRevision ? { renderRevision: metadata.renderRevision } : {}),
    ...(metadata.state ? { postState: metadata.state } : {}),
    ...(metadata.createdAt ? { createdAt: metadata.createdAt } : {}),
    ...(metadata.updatedAt ? { updatedAt: metadata.updatedAt } : {}),
  };
}

function isPendingState(value: unknown): value is PendingPostState {
  return (
    value === 'confirming' ||
    value === 'persisted' ||
    value === 'invoking' ||
    value === 'accepted' ||
    value === 'cancelled' ||
    value === 'failed'
  );
}

function parseStoredRecord(value: unknown): StoredPendingPost | null {
  if (
    !isRecord(value) ||
    value.version !== PENDING_POST_VERSION ||
    typeof value.requestId !== 'string' ||
    typeof value.renderRevision !== 'string' ||
    value.target !== 'xhs-post-note' ||
    !isPendingState(value.state) ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !isStoredDraft(value.draft)
  ) {
    return null;
  }
  return value as unknown as StoredPendingPost;
}

function parseLegacyDraft(value: unknown): PostNoteDraft | null {
  if (!isRecord(value) || value.version !== 1 || !isStoredDraft(value.draft)) return null;
  return value.draft;
}

export function loadPendingPostDraft(storage: MiniToolStorageLike): PendingPostLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(MINI_TOOL_PENDING_POST_KEY);
    if (raw === null) raw = storage.getItem(LEGACY_PENDING_POST_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty' };

  try {
    const parsed: unknown = JSON.parse(raw);
    const stored = parseStoredRecord(parsed);
    if (stored) {
      const built = buildPostNotePayload(stored.draft);
      if (!built.ok) return { status: 'invalid' };
      const draft = payloadToDraft(built.payload, stored);
      return stored.state === 'accepted'
        ? { status: 'accepted', draft }
        : { status: 'restored', draft };
    }

    const legacy = parseLegacyDraft(parsed);
    if (!legacy) return { status: 'invalid' };
    const built = buildPostNotePayload(legacy);
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
  options: {
    requestId?: string;
    renderRevision?: string;
    state?: PendingPostState;
    now?: string;
  } = {},
): PendingPostSaveResult {
  const built = buildPostNotePayload(draft);
  if (!built.ok) return 'invalid';
  const now = options.now ?? new Date().toISOString();
  const stored: StoredPendingPost = {
    version: PENDING_POST_VERSION,
    requestId:
      options.requestId ??
      draft.requestId ??
      `post-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    renderRevision: options.renderRevision ?? draft.renderRevision ?? 'unknown',
    target: 'xhs-post-note',
    state: options.state ?? draft.postState ?? 'persisted',
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
    draft: payloadToDraft(built.payload),
  };
  try {
    storage.setItem(MINI_TOOL_PENDING_POST_KEY, JSON.stringify(stored));
    storage.removeItem?.(LEGACY_PENDING_POST_KEY);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}

export function clearPendingPostDraft(storage: MiniToolStorageLike): 'cleared' | 'unavailable' {
  try {
    if (!storage.removeItem) return 'unavailable';
    storage.removeItem(MINI_TOOL_PENDING_POST_KEY);
    storage.removeItem?.(LEGACY_PENDING_POST_KEY);
    return 'cleared';
  } catch {
    return 'unavailable';
  }
}
