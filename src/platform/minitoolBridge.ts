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

export interface MiniToolHost {
  xhs?: {
    miniTool?: Partial<MiniToolBridge>;
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

function isPngDataUri(value: string): boolean {
  return /^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(value);
}

function isCancellation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const message = (error as MiniToolBridgeError).errMsg;
  return typeof message === 'string' && /cancel/i.test(message);
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
