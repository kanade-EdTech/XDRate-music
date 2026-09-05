import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { desktopWindowLifecycle, nativeFileSystem } from './desktopPlatform';

const windowMocks = vi.hoisted(() => ({
  close: vi.fn(),
  onCloseRequested: vi.fn(),
  setTitle: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => windowMocks,
}));

const invokeMock = vi.mocked(invoke);

describe('desktop native file adapter', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    windowMocks.close.mockReset();
    windowMocks.onCloseRequested.mockReset();
    windowMocks.setTitle.mockReset();
  });

  it('opens with the native command and preserves cancellation', async () => {
    invokeMock.mockResolvedValueOnce(null);
    await expect(
      nativeFileSystem.openTextFile({ accept: '.json', maxBytes: 1234 }),
    ).resolves.toEqual({ status: 'cancelled' });
    expect(invokeMock).toHaveBeenCalledWith('native_open_archive', { maxBytes: 1234 });
  });

  it('uses the opaque handle for direct save and never sends the display path', async () => {
    invokeMock.mockResolvedValueOnce({
      displayName: 'rating.xdrate.json',
      path: 'C:/rating.xdrate.json',
      handle: 'new-handle',
    });
    await nativeFileSystem.saveTextFile({
      contents: '{}',
      mediaType: 'application/json',
      suggestedName: 'ignored.json',
      target: { path: 'C:/rating.xdrate.json', handle: 'opaque-handle' },
    });
    expect(invokeMock).toHaveBeenCalledWith('native_save_archive', {
      handle: 'opaque-handle',
      contents: '{}',
    });
    expect(JSON.stringify(invokeMock.mock.calls[0])).not.toContain('C:/rating.xdrate.json');
  });

  it('uses a dialog for save-as and maps typed native failures', async () => {
    invokeMock.mockRejectedValueOnce('target-missing');
    await expect(
      nativeFileSystem.saveTextFile({
        contents: '{}',
        mediaType: 'application/json',
        suggestedName: 'rating.xdrate.json',
        forceDialog: true,
      }),
    ).resolves.toEqual({ status: 'failed', reason: 'target-missing' });
    expect(invokeMock).toHaveBeenCalledWith('native_save_archive_as', {
      contents: '{}',
      suggestedName: 'rating.xdrate.json',
    });
  });

  it('passes PNG bytes to the native save dialog', async () => {
    invokeMock.mockResolvedValueOnce(null);
    await expect(
      nativeFileSystem.saveBinaryFile({
        contents: new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
        mediaType: 'image/png',
        suggestedName: 'card.png',
      }),
    ).resolves.toEqual({ status: 'cancelled' });
    expect(invokeMock).toHaveBeenCalledWith('native_save_png', {
      bytes: [137, 80, 78, 71],
      suggestedName: 'card.png',
    });
  });

  it('rejects remote PNG sources before any request or native invocation', async () => {
    await expect(
      nativeFileSystem.saveBinaryFile({
        contents: 'https://example.invalid/card.png',
        mediaType: 'image/png',
        suggestedName: 'card.png',
      }),
    ).resolves.toEqual({ status: 'failed', reason: 'write-failed' });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('exposes only close-request listening, title updates, and an explicit current-window close', async () => {
    const unlisten = vi.fn();
    const handler = vi.fn();
    windowMocks.onCloseRequested.mockResolvedValueOnce(unlisten);
    windowMocks.close.mockResolvedValueOnce(undefined);
    windowMocks.setTitle.mockResolvedValueOnce(undefined);

    await expect(desktopWindowLifecycle.onCloseRequested(handler)).resolves.toBe(unlisten);
    expect(windowMocks.onCloseRequested).toHaveBeenCalledWith(handler);

    await desktopWindowLifecycle.closeWindow();
    expect(windowMocks.close).toHaveBeenCalledOnce();

    await desktopWindowLifecycle.setTitle('Rating * — XDRate Music');
    expect(windowMocks.setTitle).toHaveBeenCalledWith('Rating * — XDRate Music');
  });
});
