import { createArchive, parseArchive, type Workspace } from '../../domain/archive/archive';
import type {
  FileOperationFailure,
  NativeFileReference,
  PlatformFileSystem,
  SavedFile,
} from '../../platform/contracts';

export const maxArchiveBytes = 16 * 1024 * 1024;

export type OpenArchiveFailure = FileOperationFailure | 'invalid-archive';

export type OpenArchiveResult =
  | {
      status: 'success';
      workspace: Workspace;
      file: { displayName: string; reference: NativeFileReference | null };
    }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: OpenArchiveFailure };

export type SaveArchiveResult =
  | { status: 'success'; file: SavedFile }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: FileOperationFailure };

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export async function openArchiveFile(files: PlatformFileSystem): Promise<OpenArchiveResult> {
  const result = await files.openTextFile({
    accept: 'application/json,.json,.xdrate.json',
    maxBytes: maxArchiveBytes,
  });
  if (result.status !== 'success') return result;
  if (utf8ByteLength(result.value.contents) > maxArchiveBytes) {
    return { status: 'failed', reason: 'file-too-large' };
  }

  try {
    const workspace = parseArchive(JSON.parse(result.value.contents));
    const reference =
      result.value.path && result.value.handle
        ? { path: result.value.path, handle: result.value.handle }
        : null;
    return {
      status: 'success',
      workspace,
      file: { displayName: result.value.displayName, reference },
    };
  } catch {
    return { status: 'failed', reason: 'invalid-archive' };
  }
}

export async function saveArchiveFile(
  files: PlatformFileSystem,
  workspace: Workspace,
  appVersion: string,
  target: NativeFileReference | null,
  saveAs: boolean,
): Promise<SaveArchiveResult> {
  const contents = JSON.stringify(createArchive(workspace, appVersion), null, 2);
  const result = await files.saveTextFile({
    contents,
    mediaType: 'application/json',
    suggestedName: 'xdrate-music.xdrate.json',
    target: target ?? undefined,
    forceDialog: saveAs,
  });
  return result.status === 'success' ? { status: 'success', file: result.value } : result;
}
