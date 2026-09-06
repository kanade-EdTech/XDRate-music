export type FileOperationKind = 'new' | 'open' | 'save' | 'save-as';

export interface PendingFileOperation {
  id: string;
  kind: FileOperationKind;
  startedRevision: number;
}

export interface DesktopWorkspaceState {
  currentFilePath: string | null;
  currentFileHandle: string | null;
  currentRevision: number;
  lastSavedRevision: number;
  dirty: boolean;
  operation: PendingFileOperation | null;
  lastError: string | null;
}

export type DesktopWorkspaceEvent =
  | { type: 'edit' }
  | { type: 'operation-started'; operation: PendingFileOperation }
  | { type: 'new-succeeded' }
  | { type: 'open-succeeded'; path: string | null; handle: string | null }
  | { type: 'save-succeeded'; path?: string | null; handle?: string | null }
  | { type: 'operation-cancelled'; operationId: string }
  | { type: 'operation-failed'; operationId: string; error: string };

export function createDesktopWorkspaceState(): DesktopWorkspaceState {
  return {
    currentFilePath: null,
    currentFileHandle: null,
    currentRevision: 0,
    lastSavedRevision: 0,
    dirty: false,
    operation: null,
    lastError: null,
  };
}

function hasMatchingOperation(state: DesktopWorkspaceState, operationId: string): boolean {
  return state.operation?.id === operationId;
}

export function reduceDesktopWorkspaceState(
  state: DesktopWorkspaceState,
  event: DesktopWorkspaceEvent,
): DesktopWorkspaceState {
  switch (event.type) {
    case 'edit': {
      const currentRevision = state.currentRevision + 1;
      return { ...state, currentRevision, dirty: currentRevision !== state.lastSavedRevision };
    }
    case 'operation-started':
      if (state.operation !== null) return state;
      return { ...state, operation: event.operation, lastError: null };
    case 'new-succeeded':
      if (state.operation?.kind !== 'new') return state;
      return createDesktopWorkspaceState();
    case 'open-succeeded':
      if (state.operation?.kind !== 'open') return state;
      return {
        ...createDesktopWorkspaceState(),
        currentFilePath: event.path,
        currentFileHandle: event.handle,
      };
    case 'save-succeeded': {
      if (state.operation?.kind !== 'save' && state.operation?.kind !== 'save-as') return state;
      const savedRevision = state.operation.startedRevision;
      return {
        ...state,
        currentFilePath: event.path === undefined ? state.currentFilePath : event.path,
        currentFileHandle: event.handle === undefined ? state.currentFileHandle : event.handle,
        lastSavedRevision: savedRevision,
        dirty: state.currentRevision !== savedRevision,
        operation: null,
        lastError: null,
      };
    }
    case 'operation-cancelled':
      if (!hasMatchingOperation(state, event.operationId)) return state;
      return { ...state, operation: null, lastError: null };
    case 'operation-failed':
      if (!hasMatchingOperation(state, event.operationId)) return state;
      return { ...state, operation: null, lastError: event.error };
  }
}
