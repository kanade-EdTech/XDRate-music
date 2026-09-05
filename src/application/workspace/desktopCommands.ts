export type DesktopCommand = 'new' | 'open' | 'save' | 'save-as' | 'export-png' | 'exit';

export interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
}

export const desktopCommandShortcuts: Record<DesktopCommand, string> = {
  new: 'Ctrl+N',
  open: 'Ctrl+O',
  save: 'Ctrl+S',
  'save-as': 'Ctrl+Shift+S',
  'export-png': 'Ctrl+Shift+E',
  exit: 'Ctrl+Q',
};

export function resolveDesktopCommand(event: ShortcutEvent): DesktopCommand | null {
  if (event.repeat || event.altKey || (!event.ctrlKey && !event.metaKey)) return null;
  const key = event.key.toLowerCase();
  if (!event.shiftKey && key === 'n') return 'new';
  if (!event.shiftKey && key === 'o') return 'open';
  if (!event.shiftKey && key === 's') return 'save';
  if (event.shiftKey && key === 's') return 'save-as';
  if (event.shiftKey && key === 'e') return 'export-png';
  if (!event.shiftKey && key === 'q') return 'exit';
  return null;
}
