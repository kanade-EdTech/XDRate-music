import {
  createArchive,
  parseArchive,
  parseTemplate,
  type RatingTemplate,
  type Workspace,
} from '../../domain/archive/archive';
import { appMetadata } from '../../config/appMetadata';

const workspaceKey = 'xdrate.music.workspace.v2';
const legacyWorkspaceKey = 'xdrate.music.workspace.v1';
const templatesKey = 'xdrate.music.templates.v2';
const legacyTemplatesKey = 'xdrate.music.templates.v1';
const recoveryStateKey = 'xdrate.music.recovery-state.v1';

function readJson(key: string): unknown | null {
  const text = window.localStorage.getItem(key);
  return text === null ? null : JSON.parse(text);
}

export function loadWorkspace(): Workspace | null {
  const currentValue = readJson(workspaceKey);
  if (currentValue !== null) return parseArchive(currentValue);

  const legacyValue = readJson(legacyWorkspaceKey);
  if (legacyValue === null) return null;
  return parseArchive({
    format: 'xdrate-music-archive',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: '0.1.0',
    workspace: legacyValue,
  });
}

export function saveWorkspace(workspace: Workspace, recoveryPending = true): void {
  window.localStorage.setItem(
    workspaceKey,
    JSON.stringify(createArchive(workspace, appMetadata.version)),
  );
  window.localStorage.setItem(
    recoveryStateKey,
    JSON.stringify({ pending: recoveryPending, updatedAt: new Date().toISOString() }),
  );
}

export function loadRecoveryWorkspace(): Workspace | null {
  const recoveryState = readJson(recoveryStateKey);
  if (
    !recoveryState ||
    typeof recoveryState !== 'object' ||
    (recoveryState as { pending?: unknown }).pending !== true
  ) {
    return null;
  }
  return loadWorkspace();
}

export function resolveWorkspaceRecovery(): void {
  window.localStorage.setItem(
    recoveryStateKey,
    JSON.stringify({ pending: false, updatedAt: new Date().toISOString() }),
  );
}
export function loadTemplates(): RatingTemplate[] {
  const value = readJson(templatesKey) ?? readJson(legacyTemplatesKey);
  if (!Array.isArray(value)) return [];
  return value.map(parseTemplate);
}
export function saveTemplates(templates: RatingTemplate[]): void {
  window.localStorage.setItem(templatesKey, JSON.stringify(templates));
}
