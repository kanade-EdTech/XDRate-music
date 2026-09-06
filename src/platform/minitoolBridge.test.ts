import { describe, expect, it, vi } from 'vitest';

import {
  resolveMiniToolBridge,
  resolveMiniToolPostNoteBridge,
  savePngToMiniToolAlbum,
  submitPostNoteToMiniTool,
  type MiniToolHost,
  type MiniToolNativeApi,
} from './minitoolBridge';
import type { MiniToolPostNotePayload } from '../minitool/postNotePayload';

const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgo=';

const POST_NOTE_PAYLOAD: MiniToolPostNotePayload = {
  title: '海棠仙',
  content: '多维音乐评价',
  pageType: 'photo_publish',
  mediaInfo: { image_resources: [{ url: PNG_DATA_URI }] },
};

function createHost(bridge: MiniToolNativeApi): MiniToolHost {
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

describe('resolveMiniToolPostNoteBridge', () => {
  it('detects postNote independently from the two album-save functions', () => {
    expect(resolveMiniToolPostNoteBridge({})).toBeNull();
    expect(
      resolveMiniToolPostNoteBridge(
        createHost({ writeTempFile: vi.fn(), saveImageToPhotosAlbum: vi.fn() }),
      ),
    ).toBeNull();

    const postOnlyBridge = { postNote: vi.fn() };
    const host = createHost(postOnlyBridge);
    expect(resolveMiniToolPostNoteBridge(host)).toBe(postOnlyBridge);
    expect(resolveMiniToolBridge(host)).toBeNull();
  });
});

describe('submitPostNoteToMiniTool', () => {
  it('hands the validated payload to the native bridge exactly once and reports acceptance', async () => {
    const postNote = vi.fn().mockResolvedValue({ errMsg: 'postNote:ok' });

    await expect(
      submitPostNoteToMiniTool(POST_NOTE_PAYLOAD, createHost({ postNote })),
    ).resolves.toEqual({ status: 'accepted' });
    expect(postNote).toHaveBeenCalledTimes(1);
    expect(postNote).toHaveBeenCalledWith(POST_NOTE_PAYLOAD);
  });

  it('reports an unavailable publishing capability without touching album APIs', async () => {
    const writeTempFile = vi.fn();
    const saveImageToPhotosAlbum = vi.fn();

    await expect(
      submitPostNoteToMiniTool(
        POST_NOTE_PAYLOAD,
        createHost({ writeTempFile, saveImageToPhotosAlbum }),
      ),
    ).resolves.toEqual({ status: 'failed', reason: 'bridge-unavailable' });
    expect(writeTempFile).not.toHaveBeenCalled();
    expect(saveImageToPhotosAlbum).not.toHaveBeenCalled();
  });

  it('classifies native cancellation separately from a publishing failure', async () => {
    const cancelled = vi.fn().mockRejectedValue({
      errMsg: 'postNote:fail cancel',
      errCode: 10001,
    });
    await expect(
      submitPostNoteToMiniTool(POST_NOTE_PAYLOAD, createHost({ postNote: cancelled })),
    ).resolves.toEqual({ status: 'cancelled' });

    const failed = vi.fn().mockRejectedValue({
      errMsg: 'postNote:fail media rejected',
      errCode: 'MEDIA_INVALID',
      ignored: 'not exposed',
    });
    await expect(
      submitPostNoteToMiniTool(POST_NOTE_PAYLOAD, createHost({ postNote: failed })),
    ).resolves.toEqual({
      status: 'failed',
      reason: 'post-note-failed',
      error: {
        errMsg: 'postNote:fail media rejected',
        errCode: 'MEDIA_INVALID',
      },
    });
  });

  it('does not leak an unknown rejection object into the result', async () => {
    const postNote = vi.fn().mockRejectedValue(new Error('opaque host failure'));

    await expect(
      submitPostNoteToMiniTool(POST_NOTE_PAYLOAD, createHost({ postNote })),
    ).resolves.toEqual({ status: 'failed', reason: 'post-note-failed' });
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
