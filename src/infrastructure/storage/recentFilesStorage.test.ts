import { describe, expect, it } from 'vitest';

import {
  clearRecentFiles,
  loadRecentFiles,
  maxRecentFiles,
  recentFilesKey,
  rememberRecentFile,
  removeRecentFile,
} from './recentFilesStorage';

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('recent files storage', () => {
  it('deduplicates Windows paths case-insensitively and moves the latest entry first', () => {
    const storage = createStorage();
    rememberRecentFile(
      { displayName: 'Old', path: 'C:\\Ratings\\A.json', lastOpenedAt: '2026-01-01T00:00:00.000Z' },
      storage,
    );
    const result = rememberRecentFile(
      { displayName: 'New', path: 'c:/ratings/a.json', lastOpenedAt: '2026-02-01T00:00:00.000Z' },
      storage,
    );
    expect(result).toEqual([
      { displayName: 'New', path: 'c:/ratings/a.json', lastOpenedAt: '2026-02-01T00:00:00.000Z' },
    ]);
  });

  it('keeps only the newest ten entries', () => {
    const storage = createStorage();
    for (let index = 0; index < maxRecentFiles + 3; index += 1) {
      rememberRecentFile({ displayName: `${index}`, path: `C:/${index}.json` }, storage);
    }
    expect(loadRecentFiles(storage)).toHaveLength(maxRecentFiles);
    expect(loadRecentFiles(storage)[0].displayName).toBe('12');
  });

  it('removes a stale entry only when explicitly requested and supports clearing', () => {
    const storage = createStorage();
    rememberRecentFile({ displayName: 'Missing', path: 'C:/missing.json' }, storage);
    expect(loadRecentFiles(storage)).toHaveLength(1);
    expect(removeRecentFile('c:\\missing.json', storage)).toEqual([]);
    rememberRecentFile({ displayName: 'Again', path: 'C:/again.json' }, storage);
    clearRecentFiles(storage);
    expect(storage.getItem(recentFilesKey)).toBeNull();
  });

  it('ignores malformed or privacy-expanding records', () => {
    const storage = createStorage();
    storage.setItem(
      recentFilesKey,
      JSON.stringify([{ displayName: 'No path', contents: 'private' }]),
    );
    expect(loadRecentFiles(storage)).toEqual([]);
  });
});
