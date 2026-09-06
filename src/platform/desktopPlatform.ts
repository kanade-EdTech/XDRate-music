import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { loadRecentFiles } from '../infrastructure/storage/recentFilesStorage';

import type {
  FileOperationFailure,
  FileOperationResult,
  OpenedTextFile,
  OpenTextFileRequest,
  PlatformFileSystem,
  PlatformServices,
  PlatformWindowLifecycle,
  SaveBinaryFileRequest,
  SavedFile,
  SaveTextFileRequest,
} from './contracts';

interface NativeOpenedFile {
  contents: string;
  displayName: string;
  path: string;
  handle: string;
}

interface NativeSavedFile {
  displayName: string;
  path: string;
  handle: string | null;
}

const failureReasons = new Set<FileOperationFailure>([
  'read-failed',
  'write-failed',
  'unsupported',
  'file-too-large',
  'invalid-data',
  'invalid-handle',
  'target-missing',
]);

function failed(error: unknown, fallback: FileOperationFailure): FileOperationResult<never> {
  const reason = typeof error === 'string' ? error : String(error);
  return {
    status: 'failed',
    reason: failureReasons.has(reason as FileOperationFailure)
      ? (reason as FileOperationFailure)
      : fallback,
  };
}

async function toBytes(contents: Blob | string): Promise<number[]> {
  let blob: Blob;
  if (typeof contents === 'string') {
    const source = new URL(contents);
    if (source.protocol !== 'data:' && source.protocol !== 'blob:') {
      throw new Error('unsupported-binary-source');
    }
    blob = await (await fetch(source)).blob();
  } else {
    blob = contents;
  }
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

export const nativeFileSystem: PlatformFileSystem = {
  async openTextFile(request: OpenTextFileRequest): Promise<FileOperationResult<OpenedTextFile>> {
    try {
      const value = await invoke<NativeOpenedFile | null>('native_open_archive', {
        maxBytes: request.maxBytes,
      });
      return value === null ? { status: 'cancelled' } : { status: 'success', value };
    } catch (error) {
      return failed(error, 'read-failed');
    }
  },

  async saveTextFile(request: SaveTextFileRequest): Promise<FileOperationResult<SavedFile>> {
    try {
      const value =
        request.target && !request.forceDialog
          ? await invoke<NativeSavedFile>('native_save_archive', {
              handle: request.target.handle,
              contents: request.contents,
            })
          : await invoke<NativeSavedFile | null>('native_save_archive_as', {
              contents: request.contents,
              suggestedName: request.suggestedName,
            });
      return value === null ? { status: 'cancelled' } : { status: 'success', value };
    } catch (error) {
      return failed(error, 'write-failed');
    }
  },

  async saveBinaryFile(request: SaveBinaryFileRequest): Promise<FileOperationResult<SavedFile>> {
    try {
      const value = await invoke<NativeSavedFile | null>('native_save_png', {
        bytes: await toBytes(request.contents),
        suggestedName: request.suggestedName,
      });
      return value === null ? { status: 'cancelled' } : { status: 'success', value };
    } catch (error) {
      return failed(error, 'write-failed');
    }
  },
};

export const desktopWindowLifecycle: PlatformWindowLifecycle = {
  async onCloseRequested(handler) {
    return await getCurrentWindow().onCloseRequested(handler);
  },
  async closeWindow() {
    await getCurrentWindow().close();
  },
  async setTitle(title) {
    await getCurrentWindow().setTitle(title);
  },
};

/**
 * The default desktop adapter only exposes user-selected paths. Tests may inject a fake.
 */
export function createDesktopPlatformServices(
  files: PlatformFileSystem = nativeFileSystem,
): PlatformServices {
  return {
    runtime: {
      kind: 'desktop',
      nativeFileDialogs: true,
      appUserModelId: 'XDRate.Music',
    },
    files,
    windowLifecycle: desktopWindowLifecycle,
    async listRecentFiles() {
      return loadRecentFiles();
    },
  };
}
