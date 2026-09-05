import type { RecentFile } from '../../platform/contracts';

export const recentFilesKey = 'xdrate.music.recent-files.v1';
export const maxRecentFiles = 10;

function normalizedPath(path: string): string {
  return path.trim().replaceAll('\\', '/').toLocaleLowerCase('en-US');
}

function isRecentFile(value: unknown): value is RecentFile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RecentFile>;
  return (
    typeof candidate.displayName === 'string' &&
    candidate.displayName.trim().length > 0 &&
    typeof candidate.path === 'string' &&
    candidate.path.trim().length > 0 &&
    typeof candidate.lastOpenedAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.lastOpenedAt))
  );
}

export function loadRecentFiles(storage: Storage = window.localStorage): RecentFile[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(recentFilesKey) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const paths = new Set<string>();
    return parsed
      .filter(isRecentFile)
      .filter((entry) => {
        const key = normalizedPath(entry.path);
        if (paths.has(key)) return false;
        paths.add(key);
        return true;
      })
      .slice(0, maxRecentFiles);
  } catch {
    return [];
  }
}

export function rememberRecentFile(
  entry: Omit<RecentFile, 'lastOpenedAt'> & { lastOpenedAt?: string },
  storage: Storage = window.localStorage,
): RecentFile[] {
  const recent: RecentFile = {
    displayName: entry.displayName.trim(),
    path: entry.path.trim(),
    lastOpenedAt: entry.lastOpenedAt ?? new Date().toISOString(),
  };
  const key = normalizedPath(recent.path);
  const next = [
    recent,
    ...loadRecentFiles(storage).filter((item) => normalizedPath(item.path) !== key),
  ].slice(0, maxRecentFiles);
  storage.setItem(recentFilesKey, JSON.stringify(next));
  return next;
}

export function removeRecentFile(
  path: string,
  storage: Storage = window.localStorage,
): RecentFile[] {
  const key = normalizedPath(path);
  const next = loadRecentFiles(storage).filter((item) => normalizedPath(item.path) !== key);
  storage.setItem(recentFilesKey, JSON.stringify(next));
  return next;
}

export function clearRecentFiles(storage: Storage = window.localStorage): void {
  storage.removeItem(recentFilesKey);
}
