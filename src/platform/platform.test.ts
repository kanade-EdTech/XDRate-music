import { describe, expect, it, vi } from 'vitest';

import { createDesktopPlatformServices } from './desktopPlatform';
import { createPlatformServices, detectRuntime, type PlatformFileSystem } from './index';

describe('platform boundary', () => {
  it('detects browser and Tauri desktop runtimes without importing a native API', () => {
    expect(detectRuntime({})).toBe('browser');
    expect(detectRuntime({ __TAURI_INTERNALS__: {} })).toBe('desktop');
    expect(createPlatformServices('browser').runtime.nativeFileDialogs).toBe(false);
    expect(createPlatformServices('desktop').runtime.kind).toBe('desktop');
  });

  it('allows the desktop file boundary to be replaced with a test double', async () => {
    const files: PlatformFileSystem = {
      openTextFile: vi.fn().mockResolvedValue({ status: 'cancelled' }),
      saveTextFile: vi.fn().mockResolvedValue({
        status: 'success',
        value: {
          displayName: 'workspace.json',
          path: 'C:/workspace.json',
          handle: 'workspace-handle',
        },
      }),
      saveBinaryFile: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    };
    const platform = createDesktopPlatformServices(files);

    const result = await platform.files.saveTextFile({
      contents: '{}',
      mediaType: 'application/json',
      suggestedName: 'workspace.json',
    });

    expect(result.status).toBe('success');
    expect(files.saveTextFile).toHaveBeenCalledOnce();
    expect(platform.runtime).toMatchObject({
      kind: 'desktop',
      nativeFileDialogs: true,
      appUserModelId: 'XDRate.Music',
    });
  });
});
