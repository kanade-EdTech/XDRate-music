import { describe, expect, it, vi } from 'vitest';

import {
  protectedActionKinds,
  resolveUnsavedChanges,
  type UnsavedChangesChoice,
} from './unsavedChangesGuard';

describe.each(protectedActionKinds)('unsaved changes guard for %s', (action) => {
  it.each<[UnsavedChangesChoice, boolean, number]>([
    ['save', true, 1],
    ['discard', true, 0],
    ['cancel', false, 0],
  ])('%s produces the required proceed decision', async (choice, proceed, saveCalls) => {
    const save = vi.fn().mockResolvedValue('success');

    await expect(resolveUnsavedChanges(action, choice, save)).resolves.toEqual({
      action,
      proceed,
    });
    expect(save).toHaveBeenCalledTimes(saveCalls);
  });

  it.each(['cancelled', 'failed'] as const)(
    'does not proceed when save is %s',
    async (saveStatus) => {
      await expect(resolveUnsavedChanges(action, 'save', async () => saveStatus)).resolves.toEqual({
        action,
        proceed: false,
      });
    },
  );
});
