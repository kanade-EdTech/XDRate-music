import type { MiniToolPostNotePayload } from '../minitool/postNotePayload';

export interface MiniToolBridgeError {
  errMsg?: string;
  errCode?: number | string;
}

export interface MiniToolWriteTempFileResult {
  errMsg?: string;
  filePath?: string;
}

export interface MiniToolBridge {
  writeTempFile(options: { data: string }): Promise<MiniToolWriteTempFileResult>;
  saveImageToPhotosAlbum(options: { filePath: string }): Promise<{ errMsg?: string }>;
}

export interface MiniToolPostNoteBridge {
  postNote(options: MiniToolPostNotePayload): Promise<{ errMsg?: string }>;
}

export type MiniToolNativeApi = Partial<MiniToolBridge & MiniToolPostNoteBridge>;

export interface MiniToolHost {
  xhs?: {
    miniTool?: MiniToolNativeApi;
  };
}

declare global {
  interface Window {
    xhs?: MiniToolHost['xhs'];
  }
}

export type MiniToolImageSaveResult =
  | { status: 'success'; filePath: string }
  | { status: 'cancelled' }
  | {
      status: 'failed';
      reason: 'invalid-data' | 'bridge-unavailable' | 'write-failed' | 'save-failed';
    };

export type MiniToolPostNoteResult =
  | { status: 'accepted' }
  | { status: 'cancelled' }
  | {
      status: 'failed';
      reason: 'bridge-unavailable' | 'post-note-failed';
      error?: MiniToolBridgeError;
    };

function isCallable(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === 'function';
}

export function resolveMiniToolBridge(host: MiniToolHost): MiniToolBridge | null {
  const bridge = host.xhs?.miniTool;
  if (!bridge || !isCallable(bridge.writeTempFile) || !isCallable(bridge.saveImageToPhotosAlbum)) {
    return null;
  }
  return bridge as MiniToolBridge;
}

export function resolveMiniToolPostNoteBridge(host: MiniToolHost): MiniToolPostNoteBridge | null {
  const bridge = host.xhs?.miniTool;
  if (!bridge || !isCallable(bridge.postNote)) {
    return null;
  }
  return bridge as MiniToolPostNoteBridge;
}

function isPngDataUri(value: string): boolean {
  return /^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(value);
}

function isCancellation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const message = (error as MiniToolBridgeError).errMsg;
  return typeof message === 'string' && /cancel/i.test(message);
}

function normalizeBridgeError(error: unknown): MiniToolBridgeError | undefined {
  if (typeof error !== 'object' || error === null) return undefined;

  const candidate = error as MiniToolBridgeError;
  const errMsg = typeof candidate.errMsg === 'string' ? candidate.errMsg : undefined;
  const errCode =
    typeof candidate.errCode === 'string' || typeof candidate.errCode === 'number'
      ? candidate.errCode
      : undefined;

  if (errMsg === undefined && errCode === undefined) return undefined;
  return {
    ...(errMsg === undefined ? {} : { errMsg }),
    ...(errCode === undefined ? {} : { errCode }),
  };
}

/**
 * Hands a previously validated payload to Xiaohongshu exactly once.
 * `accepted` means only that the native posting flow accepted the handoff; it is not proof of
 * public publication.
 */
export async function submitPostNoteToMiniTool(
  payload: MiniToolPostNotePayload,
  host: MiniToolHost,
): Promise<MiniToolPostNoteResult> {
  const bridge = resolveMiniToolPostNoteBridge(host);
  if (!bridge) {
    return { status: 'failed', reason: 'bridge-unavailable' };
  }

  try {
    await bridge.postNote(payload);
    return { status: 'accepted' };
  } catch (error) {
    if (isCancellation(error)) {
      return { status: 'cancelled' };
    }

    const normalizedError = normalizeBridgeError(error);
    return {
      status: 'failed',
      reason: 'post-note-failed',
      ...(normalizedError === undefined ? {} : { error: normalizedError }),
    };
  }
}

export async function savePngToMiniToolAlbum(
  dataUri: string,
  host: MiniToolHost,
): Promise<MiniToolImageSaveResult> {
  if (!isPngDataUri(dataUri)) {
    return { status: 'failed', reason: 'invalid-data' };
  }

  const bridge = resolveMiniToolBridge(host);
  if (!bridge) {
    return { status: 'failed', reason: 'bridge-unavailable' };
  }

  let written: MiniToolWriteTempFileResult;
  try {
    written = await bridge.writeTempFile({ data: dataUri });
  } catch (error) {
    return isCancellation(error)
      ? { status: 'cancelled' }
      : { status: 'failed', reason: 'write-failed' };
  }

  const filePath = written?.filePath;
  if (typeof filePath !== 'string' || filePath.length === 0 || /^https?:\/\//i.test(filePath)) {
    return { status: 'failed', reason: 'write-failed' };
  }

  try {
    await bridge.saveImageToPhotosAlbum({ filePath });
    return { status: 'success', filePath };
  } catch (error) {
    return isCancellation(error)
      ? { status: 'cancelled' }
      : { status: 'failed', reason: 'save-failed' };
  }
}
