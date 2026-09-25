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
  | { status: 'completed'; filePath: string }
  | { status: 'cancelled' }
  | { status: 'denied'; error?: MiniToolBridgeError }
  | {
      status: 'failed';
      reason: 'invalid-data' | 'write-failed' | 'save-failed';
      error?: MiniToolBridgeError;
    }
  | { status: 'unavailable' }
  | { status: 'unknown'; error?: MiniToolBridgeError };

export type MiniToolPostNoteResult =
  | { status: 'accepted' }
  | { status: 'cancelled' }
  | { status: 'denied'; error?: MiniToolBridgeError }
  | {
      status: 'failed';
      reason: 'post-note-failed';
      error?: MiniToolBridgeError;
    }
  | { status: 'unavailable' }
  | { status: 'unknown'; error?: MiniToolBridgeError };

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

function isPermissionDenied(error: unknown): boolean {
  const normalized = normalizeBridgeError(error);
  const text = `${normalized?.errMsg ?? ''} ${normalized?.errCode ?? ''}`.toLowerCase();
  return /denied|permission|authorize|auth|not.?allow|forbidden/.test(text);
}

function reportsFailure(error: unknown): boolean {
  const normalized = normalizeBridgeError(error);
  return /fail|error|denied|permission|forbidden/i.test(
    `${normalized?.errMsg ?? ''} ${normalized?.errCode ?? ''}`,
  );
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
    return { status: 'unavailable' };
  }

  try {
    await bridge.postNote(payload);
    return { status: 'accepted' };
  } catch (error) {
    if (isCancellation(error)) {
      return { status: 'cancelled' };
    }

    const normalizedError = normalizeBridgeError(error);
    if (isPermissionDenied(error)) {
      return {
        status: 'denied',
        ...(normalizedError === undefined ? {} : { error: normalizedError }),
      };
    }
    if (normalizedError === undefined) return { status: 'unknown' };
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
    return { status: 'unavailable' };
  }

  let written: MiniToolWriteTempFileResult;
  try {
    written = await bridge.writeTempFile({ data: dataUri });
  } catch (error) {
    if (isCancellation(error)) return { status: 'cancelled' };
    const normalizedError = normalizeBridgeError(error);
    if (isPermissionDenied(error)) {
      return {
        status: 'denied',
        ...(normalizedError === undefined ? {} : { error: normalizedError }),
      };
    }
    if (normalizedError === undefined) return { status: 'unknown' };
    return { status: 'failed', reason: 'write-failed', error: normalizedError };
  }

  const filePath = written?.filePath;
  if (reportsFailure(written)) {
    if (isPermissionDenied(written)) {
      return { status: 'denied', error: normalizeBridgeError(written) };
    }
    return { status: 'failed', reason: 'write-failed', error: normalizeBridgeError(written) };
  }
  if (typeof filePath !== 'string' || filePath.length === 0 || /^https?:\/\//i.test(filePath)) {
    return { status: 'failed', reason: 'write-failed' };
  }

  try {
    const saved = await bridge.saveImageToPhotosAlbum({ filePath });
    if (reportsFailure(saved)) {
      if (isPermissionDenied(saved)) {
        return { status: 'denied', error: normalizeBridgeError(saved) };
      }
      return { status: 'failed', reason: 'save-failed', error: normalizeBridgeError(saved) };
    }
    return { status: 'completed', filePath };
  } catch (error) {
    if (isCancellation(error)) return { status: 'cancelled' };
    const normalizedError = normalizeBridgeError(error);
    if (isPermissionDenied(error)) {
      return {
        status: 'denied',
        ...(normalizedError === undefined ? {} : { error: normalizedError }),
      };
    }
    if (normalizedError === undefined) return { status: 'unknown' };
    return { status: 'failed', reason: 'save-failed', error: normalizedError };
  }
}
