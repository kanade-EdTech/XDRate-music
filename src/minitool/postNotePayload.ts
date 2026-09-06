export const POST_NOTE_LIMITS = {
  titleCharacters: 20,
  contentCharacters: 1000,
  imageResources: 18,
} as const;

export interface PostNoteDraft {
  title?: string;
  content?: string;
  tags?: string;
  imageDataUris: readonly string[];
}

export interface MiniToolPostNotePayload {
  title?: string;
  content?: string;
  tags?: string;
  pageType: 'photo_publish';
  mediaInfo: {
    image_resources: Array<{ url: string }>;
  };
}

export interface PostNoteTruncation {
  title: boolean;
  content: boolean;
}

export type BuildPostNotePayloadResult =
  | {
      ok: true;
      payload: MiniToolPostNotePayload;
      truncation: PostNoteTruncation;
    }
  | {
      ok: false;
      reason: 'no-images' | 'too-many-images' | 'invalid-image';
      invalidImageIndex?: number;
    };

function cleanOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().length > 0 ? value : undefined;
}

export function countPostNoteCharacters(value: string): number {
  return Array.from(value).length;
}

export function limitPostNoteText(value: string, limit: number): string {
  const characters = Array.from(value);
  return characters.length <= limit ? value : characters.slice(0, limit).join('');
}

function truncateUnicode(value: string | undefined, limit: number) {
  if (value === undefined) {
    return { value: undefined, truncated: false };
  }

  if (countPostNoteCharacters(value) <= limit) {
    return { value, truncated: false };
  }

  return { value: limitPostNoteText(value, limit), truncated: true };
}

export function isPostNotePngDataUri(value: string): boolean {
  return /^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(value);
}

/**
 * Builds the deterministic, serializable argument passed to `window.xhs.miniTool.postNote`.
 * This function performs no native call and is safe to run before the final user confirmation.
 */
export function buildPostNotePayload(draft: PostNoteDraft): BuildPostNotePayloadResult {
  if (draft.imageDataUris.length === 0) {
    return { ok: false, reason: 'no-images' };
  }

  if (draft.imageDataUris.length > POST_NOTE_LIMITS.imageResources) {
    return { ok: false, reason: 'too-many-images' };
  }

  const invalidImageIndex = draft.imageDataUris.findIndex(
    (imageDataUri) => !isPostNotePngDataUri(imageDataUri),
  );
  if (invalidImageIndex >= 0) {
    return { ok: false, reason: 'invalid-image', invalidImageIndex };
  }

  const title = truncateUnicode(cleanOptionalText(draft.title), POST_NOTE_LIMITS.titleCharacters);
  const content = truncateUnicode(
    cleanOptionalText(draft.content),
    POST_NOTE_LIMITS.contentCharacters,
  );
  const tags = cleanOptionalText(draft.tags);

  return {
    ok: true,
    payload: {
      ...(title.value === undefined ? {} : { title: title.value }),
      ...(content.value === undefined ? {} : { content: content.value }),
      ...(tags === undefined ? {} : { tags }),
      pageType: 'photo_publish',
      mediaInfo: {
        image_resources: draft.imageDataUris.map((url) => ({ url })),
      },
    },
    truncation: {
      title: title.truncated,
      content: content.truncated,
    },
  };
}
