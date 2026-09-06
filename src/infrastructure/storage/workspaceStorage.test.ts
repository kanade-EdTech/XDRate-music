import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Workspace } from '../../domain/archive/archive';
import {
  loadRecoveryWorkspace,
  loadWorkspace,
  resolveWorkspaceRecovery,
  saveWorkspace,
} from './workspaceStorage';

const workspace: Workspace = {
  rating: {
    mode: 'simple',
    work: {
      title: 'Legacy',
      artistLabel: null,
      artist: '',
      albumLabel: null,
      album: '',
      extraFields: [],
      releaseYear: '',
      coverDataUrl: null,
    },
    axes: [{ id: 'axis', name: 'Art', score: 8, importanceLevel: 3, enabled: true, reason: '' }],
    negativeItems: [],
    overallComment: 'Kept',
    personalStory: 'Also kept',
  },
  cardOptions: { theme: 'light', ratio: '4:5', showReasons: true, showStory: true },
};

function createLocalStorage(): Storage {
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

describe('workspace storage migration', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('loads a legacy unversioned workspace through the v1 archive migration', () => {
    window.localStorage.setItem(
      'xdrate.music.workspace.v1',
      JSON.stringify({
        ...workspace,
        cardOptions: { ...workspace.cardOptions, ratio: 'wide' },
      }),
    );

    expect(loadWorkspace()).toEqual({
      ...workspace,
      cardOptions: { ...workspace.cardOptions, ratio: '16:9' },
    });
  });

  it('writes a self-describing v2 archive without overwriting the legacy key', () => {
    window.localStorage.setItem('xdrate.music.workspace.v1', 'legacy-backup');

    saveWorkspace(workspace);

    expect(
      JSON.parse(window.localStorage.getItem('xdrate.music.workspace.v2') ?? '{}'),
    ).toMatchObject({
      format: 'xdrate-music-archive',
      schemaVersion: 2,
      algorithmVersion: 'music-linear-100-v4',
      workspace,
    });
    expect(window.localStorage.getItem('xdrate.music.workspace.v1')).toBe('legacy-backup');
    expect(loadRecoveryWorkspace()).toEqual(workspace);
  });

  it('offers a pending automatic draft until recovery is explicitly resolved', () => {
    saveWorkspace(workspace, true);
    expect(loadRecoveryWorkspace()).toEqual(workspace);

    resolveWorkspaceRecovery();
    expect(loadRecoveryWorkspace()).toBeNull();
    expect(loadWorkspace()).toEqual(workspace);
  });
});
