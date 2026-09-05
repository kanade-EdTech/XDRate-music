import type {
  ProtectedActionKind,
  UnsavedChangesChoice,
} from '../../../application/workspace/unsavedChangesGuard';
import type { MessageKey } from '../../../i18n/messages';
import { useI18n } from '../../../i18n/useI18n';
import { useEffect, useRef } from 'react';

const actionMessageKeys: Record<ProtectedActionKind, MessageKey> = {
  new: 'unsaved.message.new',
  open: 'unsaved.message.open',
  close: 'unsaved.message.close',
  exit: 'unsaved.message.exit',
};

interface UnsavedChangesDialogProps {
  action: ProtectedActionKind;
  busy: boolean;
  error: string | null;
  returnFocusTo: HTMLElement | null;
  onChoose: (choice: UnsavedChangesChoice) => void;
}

export function UnsavedChangesDialog({
  action,
  busy,
  error,
  returnFocusTo,
  onChoose,
}: UnsavedChangesDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(
    returnFocusTo ??
      (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null),
  );

  useEffect(() => {
    const returnFocus = returnFocusRef.current;
    cancelButtonRef.current?.focus();
    return () => {
      window.setTimeout(() => {
        if (!document.getElementById('unsaved-changes-title') && returnFocus?.isConnected) {
          returnFocus.focus();
        }
      }, 0);
    };
  }, []);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      onChoose('cancel');
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [],
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        aria-describedby="unsaved-changes-description"
        aria-labelledby="unsaved-changes-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onKeyDown={handleDialogKeyDown}
        role="dialog"
      >
        <h2 id="unsaved-changes-title" className="text-xl font-bold text-slate-950 dark:text-white">
          {t('unsaved.title')}
        </h2>
        <p
          id="unsaved-changes-description"
          className="mt-3 leading-7 text-slate-600 dark:text-slate-300"
        >
          {t(actionMessageKeys[action])}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t('unsaved.autoDraftHint')}
        </p>
        {error && (
          <p
            className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            className="button-secondary min-h-11"
            disabled={busy}
            onClick={() => onChoose('cancel')}
          >
            {t('unsaved.cancel')}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-60 dark:border-rose-800 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:focus:ring-offset-slate-900"
            disabled={busy}
            onClick={() => onChoose('discard')}
          >
            {t('unsaved.discard')}
          </button>
          <button
            type="button"
            className="button-primary min-h-11"
            disabled={busy}
            onClick={() => onChoose('save')}
          >
            {busy ? t('unsaved.saving') : t('unsaved.saveAndContinue')}
          </button>
        </div>
      </section>
    </div>
  );
}
