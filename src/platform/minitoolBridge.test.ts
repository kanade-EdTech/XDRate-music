import { describe, expect, it, vi } from 'vitest';

import {
  resolveMiniToolBridge,
  savePngToMiniToolAlbum,
  type MiniToolBridge,
  type MiniToolHost,
} from './minitoolBridge';

const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgo=';

function createHost(bridge: Partial<MiniToolBridge>): MiniToolHost {
  return { xhs: { miniTool: bridge } };
}

describe('resolveMiniToolBridge', () => {
  it('requires exactly the two album-save bridge functions', () => {
    expect(resolveMiniToolBridge({})).toBeNull();
    expect(resolveMiniToolBridge(createHost({ writeTempFile: vi.fn() }))).toBeNull();

    const bridge = {
      writeTempFile: vi.fn(),
      saveImageToPhotosAlbum: vi.fn(),
    };
    expect(resolveMiniToolBridge(createHost(bridge))).toBe(bridge);
  });
});

describe('savePngToMiniToolAlbum', () => {
  it('writes the complete data URI before saving the returned local path', async () => {
    const writeTempFile = vi.fn().mockResolvedValue({ filePath: 'xhs://temp/card.png' });
    const saveImageToPhotosAlbum = vi.fn().mockResolvedValue({ errMsg: 'ok' });

    await expect(
      savePngToMiniToolAlbum(PNG_DATA_URI, createHost({ writeTempFile, saveImageToPhotosAlbum })),
    ).resolves.toEqual({ status: 'success', filePath: 'xhs://temp/card.png' });

    expect(writeTempFile).toHaveBeenCalledWith({ data: PNG_DATA_URI });
    expect(saveImageToPhotosAlbum).toHaveBeenCalledWith({ filePath: 'xhs://temp/card.png' });
  });

  it('rejects invalid data and an unavailable bridge without calling native APIs', async () => {
    await expect(savePngToMiniToolAlbum('iVBORw0KGgo=', {})).resolves.toEqual({
      status: 'failed',
      reason: 'invalid-data',
    });
    await expect(savePngToMiniToolAlbum(PNG_DATA_URI, {})).resolves.toEqual({
      status: 'failed',
      reason: 'bridge-unavailable',
    });
  });

  it('maps native cancellation separately from write failures', async () => {
    const cancelled = createHost({
      writeTempFile: vi.fn().mockRejectedValue({ errMsg: 'writeTempFile:fail cancel' }),
      saveImageToPhotosAlbum: vi.fn(),
    });
    await expect(savePngToMiniToolAlbum(PNG_DATA_URI, cancelled)).resolves.toEqual({
      status: 'cancelled',
    });

    const invalidPath = createHost({
      writeTempFile: vi.fn().mockResolvedValue({ filePath: 'https://example.com/card.png' }),
      saveImageToPhotosAlbum: vi.fn(),
    });
    await expect(savePngToMiniToolAlbum(PNG_DATA_URI, invalidPath)).resolves.toEqual({
      status: 'failed',
      reason: 'write-failed',
    });
  });

  it('distinguishes album-save failure from temporary-file failure', async () => {
    const host = createHost({
      writeTempFile: vi.fn().mockResolvedValue({ filePath: 'xhs://temp/card.png' }),
      saveImageToPhotosAlbum: vi.fn().mockRejectedValue({ errMsg: 'saveImageToPhotosAlbum:fail' }),
    });

    await expect(savePngToMiniToolAlbum(PNG_DATA_URI, host)).resolves.toEqual({
      status: 'failed',
      reason: 'save-failed',
    });
  });
});
