import { describe, expect, it } from 'vitest';

import { resolveDesktopCommand, type DesktopCommand, type ShortcutEvent } from './desktopCommands';

function shortcut(key: string, overrides: Partial<ShortcutEvent> = {}): ShortcutEvent {
  return {
    key,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    ...overrides,
  };
}

describe('desktop command shortcuts', () => {
  it.each<[DesktopCommand, ShortcutEvent]>([
    ['new', shortcut('n')],
    ['open', shortcut('O')],
    ['save', shortcut('s')],
    ['save-as', shortcut('s', { shiftKey: true })],
    ['export-png', shortcut('e', { shiftKey: true })],
    ['exit', shortcut('q')],
  ])('maps %s without depending on the focused element', (command, event) => {
    expect(resolveDesktopCommand(event)).toBe(command);
  });

  it.each([
    shortcut('a'),
    shortcut('c'),
    shortcut('v'),
    shortcut('x'),
    shortcut('z'),
    shortcut('y'),
    shortcut('n', { ctrlKey: false }),
    shortcut('n', { altKey: true }),
    shortcut('n', { repeat: true }),
  ])('does not intercept ordinary text-editing or unsupported input', (event) => {
    expect(resolveDesktopCommand(event)).toBeNull();
  });
});
