export const protectedActionKinds = ['new', 'open', 'close', 'exit'] as const;

export type ProtectedActionKind = (typeof protectedActionKinds)[number];
export type UnsavedChangesChoice = 'save' | 'discard' | 'cancel';
export type SaveAttemptStatus = 'success' | 'cancelled' | 'failed';

export interface UnsavedChangesResolution {
  action: ProtectedActionKind;
  proceed: boolean;
}

export async function resolveUnsavedChanges(
  action: ProtectedActionKind,
  choice: UnsavedChangesChoice,
  save: () => Promise<SaveAttemptStatus>,
): Promise<UnsavedChangesResolution> {
  if (choice === 'cancel') return { action, proceed: false };
  if (choice === 'discard') return { action, proceed: true };
  return { action, proceed: (await save()) === 'success' };
}
