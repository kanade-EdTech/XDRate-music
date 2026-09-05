import type {
  FileOperationResult,
  OpenedTextFile,
  OpenTextFileRequest,
  PlatformFileSystem,
  PlatformServices,
  SaveBinaryFileRequest,
  SavedFile,
  SaveTextFileRequest,
} from './contracts';

function triggerDownload(href: string, suggestedName: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = suggestedName;
  link.click();
}

async function saveBlob(
  blob: Blob,
  suggestedName: string,
): Promise<FileOperationResult<SavedFile>> {
  try {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, suggestedName);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return {
      status: 'success',
      value: { displayName: suggestedName, path: null, handle: null },
    };
  } catch {
    return { status: 'failed', reason: 'write-failed' };
  }
}

export const browserFileSystem: PlatformFileSystem = {
  async openTextFile(request: OpenTextFileRequest): Promise<FileOperationResult<OpenedTextFile>> {
    return await new Promise((resolve) => {
      const input = document.createElement('input');
      let settled = false;
      const finish = (result: FileOperationResult<OpenedTextFile>) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('focus', onWindowFocus);
        resolve(result);
      };
      const onWindowFocus = () => {
        window.setTimeout(() => {
          if (!input.files?.length) finish({ status: 'cancelled' });
        }, 0);
      };
      input.type = 'file';
      input.accept = request.accept;
      input.addEventListener(
        'change',
        () => {
          const file = input.files?.[0];
          if (!file) {
            finish({ status: 'cancelled' });
            return;
          }
          if (request.maxBytes !== undefined && file.size > request.maxBytes) {
            finish({ status: 'failed', reason: 'file-too-large' });
            return;
          }
          void file
            .text()
            .then((contents) =>
              finish({
                status: 'success',
                value: { contents, displayName: file.name, path: null, handle: null },
              }),
            )
            .catch(() => finish({ status: 'failed', reason: 'read-failed' }));
        },
        { once: true },
      );
      window.addEventListener('focus', onWindowFocus, { once: true });
      input.click();
    });
  },

  async saveTextFile(request: SaveTextFileRequest): Promise<FileOperationResult<SavedFile>> {
    return await saveBlob(
      new Blob([request.contents], { type: request.mediaType }),
      request.suggestedName,
    );
  },

  async saveBinaryFile(request: SaveBinaryFileRequest): Promise<FileOperationResult<SavedFile>> {
    if (typeof request.contents === 'string') {
      try {
        triggerDownload(request.contents, request.suggestedName);
        return {
          status: 'success',
          value: { displayName: request.suggestedName, path: null, handle: null },
        };
      } catch {
        return { status: 'failed', reason: 'write-failed' };
      }
    }
    return await saveBlob(request.contents, request.suggestedName);
  },
};

export function createBrowserPlatformServices(): PlatformServices {
  return {
    runtime: {
      kind: 'browser',
      nativeFileDialogs: false,
      appUserModelId: 'XDRate.Music',
    },
    files: browserFileSystem,
    windowLifecycle: null,
    async listRecentFiles() {
      return [];
    },
  };
}
