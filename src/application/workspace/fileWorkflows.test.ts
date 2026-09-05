import { describe, expect, it, vi } from 'vitest';

import { createArchive, schemaVersion, type Workspace } from '../../domain/archive/archive';
import type { PlatformFileSystem } from '../../platform/contracts';
import { maxArchiveBytes, openArchiveFile, saveArchiveFile } from './fileWorkflows';

const workspace: Workspace = {
  rating: {
    mode: 'simple',
    work: {
      title: 'Native file test',
      artistLabel: null,
      artist: '',
      albumLabel: null,
      album: '',
      extraFields: [],
      releaseYear: '2026',
      coverDataUrl: null,
    },
    axes: [{ id: 'axis', name: 'Art', score: 8, importanceLevel: 3, enabled: true, reason: '' }],
    negativeItems: [],
    overallComment: '',
    personalStory: '',
  },
  cardOptions: { theme: 'light', ratio: '4:5', showReasons: true, showStory: true },
};

function fakeFiles(overrides: Partial<PlatformFileSystem> = {}): PlatformFileSystem {
  return {
    openTextFile: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    saveTextFile: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    saveBinaryFile: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    ...overrides,
  };
}

describe('native file workflows', () => {
  it('opens a valid archive and returns an opaque native association', async () => {
    const contents = JSON.stringify(createArchive(workspace, '0.2.0'));
    const result = await openArchiveFile(
      fakeFiles({
        openTextFile: vi.fn().mockResolvedValue({
          status: 'success',
          value: {
            contents,
            displayName: 'rating.xdrate.json',
            path: 'C:/rating.xdrate.json',
            handle: 'opaque-handle',
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      status: 'success',
      workspace,
      file: { reference: { path: 'C:/rating.xdrate.json', handle: 'opaque-handle' } },
    });
  });

  it.each([
    ['cancelled', { status: 'cancelled' }],
    ['read failure', { status: 'failed', reason: 'read-failed' }],
  ] as const)('passes through %s without producing replacement data', async (_name, outcome) => {
    const result = await openArchiveFile(
      fakeFiles({ openTextFile: vi.fn().mockResolvedValue(outcome) }),
    );
    expect(result).toEqual(outcome);
    expect('workspace' in result).toBe(false);
  });

  it.each([
    ['malformed JSON', '{'],
    ['future archive', JSON.stringify({ schemaVersion: schemaVersion + 1 })],
  ])('rejects %s while returning no workspace mutation', async (_name, contents) => {
    const result = await openArchiveFile(
      fakeFiles({
        openTextFile: vi.fn().mockResolvedValue({
          status: 'success',
          value: { contents, displayName: 'bad.json', path: null, handle: null },
        }),
      }),
    );
    expect(result).toEqual({ status: 'failed', reason: 'invalid-archive' });
  });

  it('rejects an oversized archive even if an adapter fails to enforce its limit', async () => {
    const result = await openArchiveFile(
      fakeFiles({
        openTextFile: vi.fn().mockResolvedValue({
          status: 'success',
          value: {
            contents: 'a'.repeat(maxArchiveBytes + 1),
            displayName: 'huge.json',
            path: null,
            handle: null,
          },
        }),
      }),
    );
    expect(result).toEqual({ status: 'failed', reason: 'file-too-large' });
  });

  it('writes a complete v2 archive without leaking the native path or handle', async () => {
    const saveTextFile = vi.fn().mockResolvedValue({
      status: 'success',
      value: {
        displayName: 'rating.xdrate.json',
        path: 'D:/rating.xdrate.json',
        handle: 'new-handle',
      },
    });
    const target = { path: 'C:/old.xdrate.json', handle: 'old-handle' };
    await saveArchiveFile(fakeFiles({ saveTextFile }), workspace, '0.2.0', target, false);

    const request = saveTextFile.mock.calls[0][0];
    expect(request).toMatchObject({ target, forceDialog: false });
    const archive = JSON.parse(request.contents);
    expect(archive).toMatchObject({ schemaVersion, appVersion: '0.2.0', workspace });
    expect(request.contents).not.toContain('C:/old.xdrate.json');
    expect(request.contents).not.toContain('old-handle');
  });

  it('forces a dialog for save-as and preserves cancellation/failure outcomes', async () => {
    const saveTextFile = vi.fn().mockResolvedValue({ status: 'cancelled' });
    expect(
      await saveArchiveFile(fakeFiles({ saveTextFile }), workspace, '0.2.0', null, true),
    ).toEqual({ status: 'cancelled' });
    expect(saveTextFile.mock.calls[0][0]).toMatchObject({ forceDialog: true });
  });
});
