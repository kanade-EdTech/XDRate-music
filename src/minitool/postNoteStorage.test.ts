import { describe, expect, it } from 'vitest';

import {
  loadPendingPostDraft,
  MINI_TOOL_PENDING_POST_KEY,
  savePendingPostDraft,
} from './postNoteStorage';
import type { MiniToolStorageLike } from './storage';

const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgo=';

class MemoryStorage implements MiniToolStorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('pending post storage', () => {
  it('round-trips the exact normalized post draft including its PNG', () => {
    const storage = new MemoryStorage();
    const draft = {
      title: '  海棠仙  ',
      content: '  待发布正文  ',
      tags: '  音乐评价  ',
      imageDataUris: [PNG_DATA_URI],
    };

    expect(savePendingPostDraft(storage, draft)).toBe('saved');
    expect(loadPendingPostDraft(storage)).toEqual({
      status: 'restored',
      draft: {
        title: '  海棠仙  ',
        content: '  待发布正文  ',
        tags: '  音乐评价  ',
        imageDataUris: [PNG_DATA_URI],
      },
    });
  });

  it('reports empty, malformed, and contract-invalid records', () => {
    const storage = new MemoryStorage();
    expect(loadPendingPostDraft(storage)).toEqual({ status: 'empty' });

    storage.values.set(MINI_TOOL_PENDING_POST_KEY, '{bad-json');
    expect(loadPendingPostDraft(storage)).toEqual({ status: 'invalid' });

    storage.values.set(
      MINI_TOOL_PENDING_POST_KEY,
      JSON.stringify({ version: 1, draft: { imageDataUris: [] } }),
    );
    expect(loadPendingPostDraft(storage)).toEqual({ status: 'invalid' });
    expect(savePendingPostDraft(storage, { imageDataUris: [] })).toBe('invalid');
  });

  it('contains storage failures and never throws', () => {
    const unavailable: MiniToolStorageLike = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('quota');
      },
    };

    expect(loadPendingPostDraft(unavailable)).toEqual({ status: 'unavailable' });
    expect(savePendingPostDraft(unavailable, { imageDataUris: [PNG_DATA_URI] })).toBe(
      'unavailable',
    );
  });
});
