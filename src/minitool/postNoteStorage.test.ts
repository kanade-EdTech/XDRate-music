import { describe, expect, it } from 'vitest';

import {
  clearPendingPostDraft,
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

  removeItem(key: string): void {
    this.values.delete(key);
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
        requestId: expect.any(String),
        renderRevision: 'unknown',
        postState: 'persisted',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
  });

  it('keeps an accepted record non-retryable after reload and can clear it explicitly', () => {
    const storage = new MemoryStorage();
    expect(
      savePendingPostDraft(
        storage,
        { imageDataUris: [PNG_DATA_URI] },
        {
          requestId: 'req-1',
          renderRevision: 'render-1',
          state: 'accepted',
          now: '2026-09-23T00:00:00.000Z',
        },
      ),
    ).toBe('saved');
    expect(loadPendingPostDraft(storage)).toEqual({
      status: 'accepted',
      draft: {
        imageDataUris: [PNG_DATA_URI],
        requestId: 'req-1',
        renderRevision: 'render-1',
        postState: 'accepted',
        createdAt: '2026-09-23T00:00:00.000Z',
        updatedAt: '2026-09-23T00:00:00.000Z',
      },
    });
    expect(clearPendingPostDraft(storage)).toBe('cleared');
    expect(loadPendingPostDraft(storage)).toEqual({ status: 'empty' });
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
