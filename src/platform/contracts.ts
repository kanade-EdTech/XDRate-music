export type RuntimeKind = 'browser' | 'desktop';

export interface RuntimeInfo {
  kind: RuntimeKind;
  nativeFileDialogs: boolean;
  appUserModelId: 'XDRate.Music';
}

export interface OpenTextFileRequest {
  accept: string;
  maxBytes?: number;
}

export interface NativeFileReference {
  /** Human-readable path for display only. Native writes are authorized by handle. */
  path: string;
  handle: string;
}

export interface SaveFileRequest {
  suggestedName: string;
  target?: NativeFileReference;
  forceDialog?: boolean;
}

export interface SaveTextFileRequest extends SaveFileRequest {
  contents: string;
  mediaType: string;
}

export interface SaveBinaryFileRequest extends SaveFileRequest {
  contents: Blob | string;
  mediaType: string;
}

export interface OpenedTextFile {
  contents: string;
  displayName: string;
  path: string | null;
  handle: string | null;
}

export interface SavedFile {
  displayName: string;
  path: string | null;
  handle: string | null;
}

export type FileOperationFailure =
  | 'read-failed'
  | 'write-failed'
  | 'unsupported'
  | 'file-too-large'
  | 'invalid-data'
  | 'invalid-handle'
  | 'target-missing';

export type FileOperationResult<T> =
  | { status: 'success'; value: T }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: FileOperationFailure };

export interface PlatformFileSystem {
  openTextFile(request: OpenTextFileRequest): Promise<FileOperationResult<OpenedTextFile>>;
  saveTextFile(request: SaveTextFileRequest): Promise<FileOperationResult<SavedFile>>;
  saveBinaryFile(request: SaveBinaryFileRequest): Promise<FileOperationResult<SavedFile>>;
}

export interface PlatformCloseRequest {
  preventDefault(): void;
}

export interface PlatformWindowLifecycle {
  onCloseRequested(handler: (event: PlatformCloseRequest) => void): Promise<() => void>;
  closeWindow(): Promise<void>;
  setTitle(title: string): Promise<void>;
}

export interface RecentFile {
  displayName: string;
  path: string;
  lastOpenedAt: string;
}

export interface PlatformServices {
  runtime: RuntimeInfo;
  files: PlatformFileSystem;
  windowLifecycle: PlatformWindowLifecycle | null;
  listRecentFiles(): Promise<readonly RecentFile[]>;
}
