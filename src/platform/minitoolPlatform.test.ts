import { describe, expect, it, vi } from 'vitest';

import { createMiniToolPlatformServices } from './minitoolPlatform';

describe('MiniTool platform services', () => {
  it('exposes only the narrow local album capability', async () => {
    const writeTempFile = vi.fn().mockResolvedValue({ filePath: 'xhs://temp/card.png' });
    const saveImageToPhotosAlbum = vi.fn().mockResolvedValue({ errMsg: 'ok' });
    const services = createMiniToolPlatformServices({
      xhs: { miniTool: { writeTempFile, saveImageToPhotosAlbum } },
    });

    expect(services.runtime).toBe('minitool');
    expect(services.isAlbumBridgeAvailable()).toBe(true);
    await expect(services.savePngToAlbum('data:image/png;base64,iVBORw0KGgo=')).resolves.toEqual({
      status: 'success',
      filePath: 'xhs://temp/card.png',
    });
  });
});
