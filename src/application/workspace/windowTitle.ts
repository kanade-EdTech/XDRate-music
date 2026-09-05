export interface WindowTitleInput {
  workTitle: string;
  currentFilePath: string | null;
  dirty: boolean;
  untitledLabel: string;
  productName: string;
}

export function fileNameFromPath(path: string | null): string | null {
  if (!path) return null;
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? null;
}

export function createWindowTitle(input: WindowTitleInput): string {
  const displayName =
    input.workTitle.trim() || fileNameFromPath(input.currentFilePath) || input.untitledLabel;
  return `${displayName}${input.dirty ? ' *' : ''} — ${input.productName}`;
}
