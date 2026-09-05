import { describe, expect, it } from 'vitest';

import {
  createDesktopWorkspaceState,
  reduceDesktopWorkspaceState,
  type DesktopWorkspaceState,
} from './desktopWorkspaceState';

function edit(state: DesktopWorkspaceState): DesktopWorkspaceState {
  return reduceDesktopWorkspaceState(state, { type: 'edit' });
}

function start(
  state: DesktopWorkspaceState,
  id: string,
  kind: 'new' | 'open' | 'save' | 'save-as',
): DesktopWorkspaceState {
  return reduceDesktopWorkspaceState(state, {
    type: 'operation-started',
    operation: { id, kind, startedRevision: state.currentRevision },
  });
}

describe('desktop workspace state', () => {
  it('starts a new workspace without retaining the previous path or dirty state', () => {
    const previous = { ...edit(createDesktopWorkspaceState()), currentFilePath: 'C:/old.json' };
    const result = reduceDesktopWorkspaceState(start(previous, 'new-1', 'new'), {
      type: 'new-succeeded',
    });
    expect(result).toEqual(createDesktopWorkspaceState());
  });

  it('opens a workspace as a clean revision associated with its path', () => {
    const result = reduceDesktopWorkspaceState(
      start(edit(createDesktopWorkspaceState()), 'open-1', 'open'),
      {
        type: 'open-succeeded',
        path: 'C:/ratings/album.xdrate.json',
        handle: 'open-handle',
      },
    );
    expect(result).toMatchObject({
      currentFilePath: 'C:/ratings/album.xdrate.json',
      currentFileHandle: 'open-handle',
      currentRevision: 0,
      lastSavedRevision: 0,
      dirty: false,
      operation: null,
    });
  });

  it('marks an edit dirty without coupling file state to rating content', () => {
    const result = edit(createDesktopWorkspaceState());
    expect(result).toMatchObject({ currentRevision: 1, lastSavedRevision: 0, dirty: true });
  });

  it('saves to the associated path and records the latest successful revision', () => {
    const edited = {
      ...edit(createDesktopWorkspaceState()),
      currentFilePath: 'C:/album.json',
      currentFileHandle: 'album-handle',
    };
    const result = reduceDesktopWorkspaceState(start(edited, 'save-1', 'save'), {
      type: 'save-succeeded',
    });
    expect(result).toMatchObject({
      currentFilePath: 'C:/album.json',
      currentRevision: 1,
      lastSavedRevision: 1,
      dirty: false,
    });
  });

  it('save-as replaces the associated path only after success', () => {
    const edited = {
      ...edit(createDesktopWorkspaceState()),
      currentFilePath: 'C:/old.json',
      currentFileHandle: 'old-handle',
    };
    const result = reduceDesktopWorkspaceState(start(edited, 'save-as-1', 'save-as'), {
      type: 'save-succeeded',
      path: 'D:/new.json',
      handle: 'new-handle',
    });
    expect(result).toMatchObject({
      currentFilePath: 'D:/new.json',
      currentFileHandle: 'new-handle',
      dirty: false,
    });
  });

  it('keeps edits made while a save is running dirty', () => {
    const beforeSave = edit(createDesktopWorkspaceState());
    const saving = start(beforeSave, 'save-concurrent', 'save-as');
    const editedDuringSave = edit(saving);
    const result = reduceDesktopWorkspaceState(editedDuringSave, {
      type: 'save-succeeded',
      path: 'D:/snapshot.xdrate.json',
      handle: 'snapshot-handle',
    });
    expect(result).toMatchObject({
      currentRevision: 2,
      lastSavedRevision: 1,
      dirty: true,
      operation: null,
    });
  });

  it('preserves path, revision, and dirty state after a failed operation', () => {
    const edited = {
      ...edit(createDesktopWorkspaceState()),
      currentFilePath: 'C:/album.json',
      currentFileHandle: 'album-handle',
    };
    const result = reduceDesktopWorkspaceState(start(edited, 'save-2', 'save'), {
      type: 'operation-failed',
      operationId: 'save-2',
      error: 'disk-full',
    });
    expect(result).toMatchObject({
      currentFilePath: 'C:/album.json',
      currentRevision: 1,
      lastSavedRevision: 0,
      dirty: true,
      operation: null,
      lastError: 'disk-full',
    });
  });

  it('preserves all workspace data when the user cancels an operation', () => {
    const edited = {
      ...edit(createDesktopWorkspaceState()),
      currentFilePath: 'C:/album.json',
      currentFileHandle: 'album-handle',
    };
    const result = reduceDesktopWorkspaceState(start(edited, 'open-2', 'open'), {
      type: 'operation-cancelled',
      operationId: 'open-2',
    });
    expect(result).toEqual({ ...edited, operation: null, lastError: null });
  });
});
