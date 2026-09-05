import { useEffect, useRef, type KeyboardEvent } from 'react';

import type { Workspace } from '../../../domain/archive/archive';
import { useI18n } from '../../../i18n/useI18n';

interface RecoveryDialogProps {
  workspace: Workspace;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({ workspace, onRestore, onDiscard }: RecoveryDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const title = workspace.rating.work.title.trim() || t('card.untitled');
  const ratedAxes = workspace.rating.axes.filter(
    (axis) => axis.enabled && axis.importanceLevel > 0 && axis.score > 0,
  ).length;
  const excerpt =
    workspace.rating.overallComment.trim() ||
    workspace.rating.personalStory.trim() ||
    t('recovery.noText');

  useEffect(() => restoreButtonRef.current?.focus(), []);

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [],
    );
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        aria-describedby="recovery-description"
        aria-labelledby="recovery-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        role="dialog"
        onKeyDown={trapFocus}
      >
        <h2 id="recovery-title" className="text-xl font-bold text-slate-950 dark:text-white">
          {t('recovery.title')}
        </h2>
        <p id="recovery-description" className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
          {t('recovery.description')}
        </p>
        <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/70">
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="font-semibold text-slate-700 dark:text-slate-200">
              {t('recovery.work')}
            </dt>
            <dd className="truncate text-slate-950 dark:text-white">{title}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="font-semibold text-slate-700 dark:text-slate-200">
              {t('recovery.axes')}
            </dt>
            <dd className="text-slate-950 dark:text-white">{ratedAxes}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="font-semibold text-slate-700 dark:text-slate-200">
              {t('recovery.preview')}
            </dt>
            <dd className="line-clamp-3 break-words text-slate-600 dark:text-slate-300">
              {excerpt}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {t('recovery.diskSafety')}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="button-secondary min-h-11" onClick={onDiscard}>
            {t('recovery.discard')}
          </button>
          <button
            ref={restoreButtonRef}
            type="button"
            className="button-primary min-h-11"
            onClick={onRestore}
          >
            {t('recovery.restore')}
          </button>
        </div>
      </section>
    </div>
  );
}
