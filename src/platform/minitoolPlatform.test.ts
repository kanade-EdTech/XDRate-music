import { describe, expect, it, vi } from 'vitest';

import { createMiniToolPlatformServices } from './minitoolPlatform';

const POST_PAYLOAD = {
  title: '海棠仙',
  pageType: 'photo_publish' as const,
  mediaInfo: {
    image_resources: [{ url: 'data:image/png;base64,iVBORw0KGgo=' }],
  },
};

describe('MiniTool platform services', () => {
  it('exposes only the narrow local album capability', async () => {
    const writeTempFile = vi.fn().mockResolvedValue({ filePath: 'xhs://temp/card.png' });
    const saveImageToPhotosAlbum = vi.fn().mockResolvedValue({ errMsg: 'ok' });
    const services = createMiniToolPlatformServices({
      xhs: { miniTool: { writeTempFile, saveImageToPhotosAlbum } },
    });

    expect(services.runtime).toBe('minitool');
    expect(services.isAlbumBridgeAvailable()).toBe(true);
    expect(services.isPostNoteBridgeAvailable()).toBe(false);
    await expect(services.savePngToAlbum('data:image/png;base64,iVBORw0KGgo=')).resolves.toEqual({
      status: 'completed',
      filePath: 'xhs://temp/card.png',
    });
  });

  it('exposes postNote independently and keeps the accepted result precise', async () => {
    const postNote = vi.fn().mockResolvedValue({ errMsg: 'postNote:ok' });
    const services = createMiniToolPlatformServices({ xhs: { miniTool: { postNote } } });

    expect(services.isAlbumBridgeAvailable()).toBe(false);
    expect(services.isPostNoteBridgeAvailable()).toBe(true);
    await expect(services.submitPostNote(POST_PAYLOAD)).resolves.toEqual({ status: 'accepted' });
    expect(postNote).toHaveBeenCalledWith(POST_PAYLOAD);
  });
});
