import { describe, expect, it } from 'vitest';

import { createDefaultRating } from '../domain/rating/presets';
import {
  loadMiniToolWorkspace,
  MINI_TOOL_WORKSPACE_KEY,
  saveMiniToolWorkspace,
  type MiniToolStorageLike,
} from './storage';

class MemoryStorage implements MiniToolStorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('MiniTool workspace storage', () => {
  it('reports an empty namespace without inventing a draft', () => {
    expect(loadMiniToolWorkspace(new MemoryStorage())).toEqual({ status: 'empty' });
  });

  it('round-trips a versioned MiniTool workspace', () => {
    const storage = new MemoryStorage();
    const workspace = { locale: 'zh-CN' as const, rating: createDefaultRating() };
    workspace.rating.work.title = '海棠仙';

    expect(saveMiniToolWorkspace(storage, workspace)).toBe(true);
    expect(loadMiniToolWorkspace(storage)).toEqual({ status: 'restored', workspace });
  });

  it('isolates malformed or incompatible data', () => {
    const storage = new MemoryStorage();
    storage.values.set(MINI_TOOL_WORKSPACE_KEY, '{not-json');
    expect(loadMiniToolWorkspace(storage)).toEqual({ status: 'invalid' });

    storage.values.set(
      MINI_TOOL_WORKSPACE_KEY,
      JSON.stringify({ version: 99, workspace: { locale: 'zh-CN' } }),
    );
    expect(loadMiniToolWorkspace(storage)).toEqual({ status: 'invalid' });
  });

  it('reports unavailable storage without throwing', () => {
    const unavailable: MiniToolStorageLike = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    expect(loadMiniToolWorkspace(unavailable)).toEqual({ status: 'unavailable' });
    expect(
      saveMiniToolWorkspace(unavailable, {
        locale: 'en',
        rating: createDefaultRating(),
      }),
    ).toBe(false);
  });
});
