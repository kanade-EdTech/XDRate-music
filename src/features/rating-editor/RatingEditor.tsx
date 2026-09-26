import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { toPng } from 'html-to-image';

import { appMetadata } from '../../config/appMetadata';
import {
  calculateRating,
  importanceWeights,
  normalizeAxisName,
} from '../../domain/rating/calculateRating';
import {
  createDefaultAxes,
  createDefaultRating,
  createNegativeItem,
  createRatingAxis,
  createWorkMetadataEntry,
  clearRatingContent,
} from '../../domain/rating/presets';
import type {
  ImportanceLevel,
  MusicRatingDraft,
  NegativeItem,
  RatingAxis,
  RatingMode,
  WorkMetadata,
  WorkMetadataEntry,
} from '../../domain/rating/types';
import { applyTemplate, createTemplate, type RatingTemplate } from '../../domain/archive/archive';
import {
  createDesktopWorkspaceState,
  reduceDesktopWorkspaceState,
  type FileOperationKind,
} from '../../application/workspace/desktopWorkspaceState';
import {
  openArchiveFile,
  saveArchiveFile,
  type OpenArchiveFailure,
} from '../../application/workspace/fileWorkflows';
import {
  resolveUnsavedChanges,
  type ProtectedActionKind,
  type SaveAttemptStatus,
  type UnsavedChangesChoice,
} from '../../application/workspace/unsavedChangesGuard';
import { resolveDesktopCommand } from '../../application/workspace/desktopCommands';
import { createWindowTitle } from '../../application/workspace/windowTitle';
import { readFileAsDataUrl, validateCoverFile } from '../../infrastructure/image/readLocalImage';
import {
  loadRecoveryWorkspace,
  loadTemplates,
  loadWorkspace,
  resolveWorkspaceRecovery,
  saveTemplates,
  saveWorkspace,
} from '../../infrastructure/storage/workspaceStorage';
import {
  clearRecentFiles,
  rememberRecentFile,
  removeRecentFile,
} from '../../infrastructure/storage/recentFilesStorage';
import { useI18n } from '../../i18n/useI18n';
import { platformServices, type RecentFile } from '../../platform';
import {
  CardPreview,
  type CardOptions,
  type CardOverflowResult,
  type CardRatio,
  type CardTheme,
} from '../card-export/CardPreview';
import { StarRating } from './components/StarRating';
import { BananaRating } from './components/BananaRating';
import { UnsavedChangesDialog } from './components/UnsavedChangesDialog';
import { RecoveryDialog } from './components/RecoveryDialog';

const levels = [0, 1, 2, 3, 4, 5, 6] as const;

function createDefaultCardOptions(): CardOptions {
  return {
    theme: 'light',
    ratio: '4:5',
    showReasons: true,
    showStory: true,
  };
}

type ProtectedActionCallback = () => void | Promise<void>;

function formatScore(score: number): string {
  return score.toFixed(1);
}

function hasDuplicateAxisNames(axes: RatingAxis[]): boolean {
  const names = axes.map((axis) => normalizeAxisName(axis.name)).filter(Boolean);
  return new Set(names).size !== names.length;
}

export function RatingEditor() {
  const { locale, t } = useI18n();
  const [initialState] = useState(() => {
    try {
      const recoveryWorkspace = loadRecoveryWorkspace();
      return {
        workspace: recoveryWorkspace ? null : loadWorkspace(),
        recoveryWorkspace,
        templates: loadTemplates(),
        storageError: false,
      };
    } catch {
      return { workspace: null, recoveryWorkspace: null, templates: [], storageError: true };
    }
  });
  const [draft, setDraft] = useState<MusicRatingDraft>(() => {
    const restored = initialState.workspace?.rating ?? createDefaultRating();
    if (restored.mode !== 'custom' && restored.axes.length === 0) {
      return { ...restored, axes: createDefaultAxes(restored.mode) };
    }
    return restored;
  });
  const [cardOptions, setCardOptions] = useState<CardOptions>(
    () => initialState.workspace?.cardOptions ?? createDefaultCardOptions(),
  );
  const [templates, setTemplates] = useState<RatingTemplate[]>(initialState.templates);
  const [recoveryCandidate, setRecoveryCandidate] = useState(initialState.recoveryWorkspace);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<'saving' | 'saved' | 'error'>(
    initialState.storageError ? 'error' : 'saved',
  );
  const [coverError, setCoverError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showClearedNotice, setShowClearedNotice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [overflowResult, setOverflowResult] = useState<CardOverflowResult>({
    hasOverflow: false,
    issues: [],
  });
  const [isCardReady, setIsCardReady] = useState(false);
  const [desktopFileState, dispatchDesktopFile] = useReducer(
    reduceDesktopWorkspaceState,
    undefined,
    createDesktopWorkspaceState,
  );
  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<ProtectedActionKind | null>(
    null,
  );
  const [unsavedReturnFocusTo, setUnsavedReturnFocusTo] = useState<HTMLElement | null>(null);
  const [isResolvingUnsavedChanges, setIsResolvingUnsavedChanges] = useState(false);
  const [unsavedChangesError, setUnsavedChangesError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileOperationLockRef = useRef(false);
  const trackedWorkspaceRef = useRef({ draft, cardOptions });
  const skipNextWorkspaceEditRef = useRef(false);
  const allowNextWindowCloseRef = useRef(false);
  const desktopFileStateRef = useRef(desktopFileState);
  const pendingProtectedActionRef = useRef<{
    kind: ProtectedActionKind;
    run: ProtectedActionCallback;
  } | null>(null);
  const clearedDraftRef = useRef(false);
  const requestProtectedActionRef = useRef<
    (kind: ProtectedActionKind, action: ProtectedActionCallback) => void
  >(() => undefined);
  const closeNativeWindowRef = useRef<ProtectedActionCallback>(() => undefined);
  const rating = useMemo(() => calculateRating(draft), [draft]);
  const duplicateAxisNames = hasDuplicateAxisNames(draft.axes);

  useEffect(() => {
    if (clearedDraftRef.current) {
      clearedDraftRef.current = false;
      return;
    }
    if (showClearedNotice) setShowClearedNotice(false);
  }, [draft, showClearedNotice]);
  const windowTitle = useMemo(
    () =>
      createWindowTitle({
        workTitle: draft.work.title,
        currentFilePath: desktopFileState.currentFilePath,
        dirty: desktopFileState.dirty,
        untitledLabel: t('app.windowUntitled'),
        productName: 'XDRate Music',
      }),
    [desktopFileState.currentFilePath, desktopFileState.dirty, draft.work.title, t],
  );

  useEffect(() => {
    if (recoveryCandidate) return;
    const savingTimer = window.setTimeout(() => setPersistenceStatus('saving'), 0);
    const timer = window.setTimeout(() => {
      try {
        saveWorkspace({ rating: draft, cardOptions }, desktopFileState.dirty);
        setPersistenceStatus('saved');
      } catch {
        setPersistenceStatus('error');
      }
    }, 800);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(timer);
    };
  }, [draft, cardOptions, desktopFileState.dirty, recoveryCandidate]);

  useEffect(() => {
    document.title = windowTitle;
    void platformServices.windowLifecycle?.setTitle(windowTitle).catch(() => undefined);
  }, [windowTitle]);

  useEffect(() => {
    if (platformServices.runtime.kind !== 'desktop') return;
    void platformServices
      .listRecentFiles()
      .then((files) => setRecentFiles([...files]))
      .catch(() => setRecentFiles([]));
  }, []);

  useEffect(() => {
    if (platformServices.runtime.kind !== 'browser' || !desktopFileState.dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [desktopFileState.dirty]);

  useEffect(() => {
    desktopFileStateRef.current = desktopFileState;
  }, [desktopFileState]);

  useEffect(() => {
    const previous = trackedWorkspaceRef.current;
    trackedWorkspaceRef.current = { draft, cardOptions };
    if (previous.draft === draft && previous.cardOptions === cardOptions) {
      return;
    }
    if (skipNextWorkspaceEditRef.current) {
      skipNextWorkspaceEditRef.current = false;
      return;
    }
    dispatchDesktopFile({ type: 'edit' });
  }, [draft, cardOptions]);

  function saveTemplate() {
    if (!templateName.trim()) {
      setArchiveError(t('archive.templateRequired'));
      return;
    }
    try {
      const template = createTemplate(templateName, { rating: draft, cardOptions });
      const next = [...templates, template];
      saveTemplates(next);
      setTemplates(next);
      setSelectedTemplateId(template.id);
      setArchiveError(null);
    } catch {
      setArchiveError(t('storage.error'));
    }
  }

  function applySelectedTemplate() {
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) return;
    const workspace = applyTemplate(template, { rating: draft, cardOptions });
    setDraft(workspace.rating);
    setCardOptions(workspace.cardOptions);
    setArchiveError(null);
  }

  function renameSelectedTemplate() {
    if (!templateName.trim() || !selectedTemplateId) {
      setArchiveError(t('archive.templateRequired'));
      return;
    }
    try {
      const next = templates.map((template) =>
        template.id === selectedTemplateId
          ? { ...template, name: templateName.trim(), updatedAt: new Date().toISOString() }
          : template,
      );
      saveTemplates(next);
      setTemplates(next);
      setArchiveError(null);
    } catch {
      setArchiveError(t('storage.error'));
    }
  }

  function deleteSelectedTemplate() {
    if (!selectedTemplateId || !window.confirm(t('archive.deleteConfirm'))) return;
    try {
      const next = templates.filter((template) => template.id !== selectedTemplateId);
      saveTemplates(next);
      setTemplates(next);
      setSelectedTemplateId('');
      setTemplateName('');
    } catch {
      setArchiveError(t('storage.error'));
    }
  }

  function beginFileOperation(kind: FileOperationKind): string | null {
    if (fileOperationLockRef.current) return null;
    fileOperationLockRef.current = true;
    const operationId = crypto.randomUUID();
    dispatchDesktopFile({
      type: 'operation-started',
      operation: {
        id: operationId,
        kind,
        startedRevision: desktopFileState.currentRevision,
      },
    });
    return operationId;
  }

  function archiveFailureMessage(reason: OpenArchiveFailure | 'write-failed'): string {
    if (reason === 'file-too-large') return t('archive.fileTooLarge');
    if (reason === 'invalid-archive' || reason === 'invalid-data') {
      return t('archive.importError');
    }
    if (reason === 'write-failed' || reason === 'invalid-handle' || reason === 'target-missing') {
      return t('archive.writeError');
    }
    return t('archive.readError');
  }

  function markRecoveryResolved() {
    try {
      resolveWorkspaceRecovery();
    } catch {
      setPersistenceStatus('error');
    }
  }

  function recordRecentFile(displayName: string, path: string | null) {
    if (!path || platformServices.runtime.kind !== 'desktop') return;
    try {
      setRecentFiles(rememberRecentFile({ displayName, path }));
    } catch {
      setArchiveError(t('storage.error'));
    }
  }

  function removeRecent(path: string) {
    try {
      setRecentFiles(removeRecentFile(path));
    } catch {
      setArchiveError(t('storage.error'));
    }
  }

  function clearRecent() {
    try {
      clearRecentFiles();
      setRecentFiles([]);
    } catch {
      setArchiveError(t('storage.error'));
    }
  }

  async function performOpenArchive() {
    const operationId = beginFileOperation('open');
    if (!operationId) return;
    try {
      const result = await openArchiveFile(platformServices.files);
      if (result.status === 'cancelled') {
        dispatchDesktopFile({ type: 'operation-cancelled', operationId });
        return;
      }
      if (result.status === 'failed') {
        const error = archiveFailureMessage(result.reason);
        setArchiveError(error);
        dispatchDesktopFile({ type: 'operation-failed', operationId, error });
        return;
      }
      skipNextWorkspaceEditRef.current = true;
      setDraft(result.workspace.rating);
      setCardOptions(result.workspace.cardOptions);
      dispatchDesktopFile({
        type: 'open-succeeded',
        path: result.file.reference?.path ?? null,
        handle: result.file.reference?.handle ?? null,
      });
      markRecoveryResolved();
      recordRecentFile(result.file.displayName, result.file.reference?.path ?? null);
      setArchiveError(null);
    } finally {
      fileOperationLockRef.current = false;
    }
  }

  async function saveArchive(saveAs: boolean): Promise<SaveAttemptStatus> {
    const target =
      desktopFileState.currentFilePath && desktopFileState.currentFileHandle
        ? {
            path: desktopFileState.currentFilePath,
            handle: desktopFileState.currentFileHandle,
          }
        : null;
    const effectiveSaveAs = saveAs || target === null;
    const operationId = beginFileOperation(effectiveSaveAs ? 'save-as' : 'save');
    if (!operationId) return 'failed';
    try {
      const result = await saveArchiveFile(
        platformServices.files,
        { rating: draft, cardOptions },
        appMetadata.version,
        target,
        effectiveSaveAs,
      );
      if (result.status === 'cancelled') {
        dispatchDesktopFile({ type: 'operation-cancelled', operationId });
        return 'cancelled';
      }
      if (result.status === 'failed') {
        const error = archiveFailureMessage(result.reason);
        setArchiveError(error);
        dispatchDesktopFile({ type: 'operation-failed', operationId, error });
        return 'failed';
      }
      dispatchDesktopFile({
        type: 'save-succeeded',
        path: result.file.path,
        handle: result.file.handle,
      });
      markRecoveryResolved();
      recordRecentFile(result.file.displayName, result.file.path);
      setArchiveError(null);
      return 'success';
    } finally {
      fileOperationLockRef.current = false;
    }
  }

  async function closeNativeWindow() {
    const lifecycle = platformServices.windowLifecycle;
    if (!lifecycle) return;
    allowNextWindowCloseRef.current = true;
    try {
      await lifecycle.closeWindow();
    } catch {
      allowNextWindowCloseRef.current = false;
      setArchiveError(t('unsaved.closeError'));
    }
  }

  async function performNewWorkspace() {
    const operationId = beginFileOperation('new');
    if (!operationId) return;
    try {
      skipNextWorkspaceEditRef.current = true;
      setDraft(createDefaultRating());
      setCardOptions(createDefaultCardOptions());
      setArchiveError(null);
      setCoverError(null);
      setExportError(null);
      dispatchDesktopFile({ type: 'new-succeeded' });
      markRecoveryResolved();
    } finally {
      fileOperationLockRef.current = false;
    }
  }

  function requestProtectedAction(
    kind: ProtectedActionKind,
    action: ProtectedActionCallback,
    returnFocusTo: HTMLElement | null = null,
  ) {
    const fileState = desktopFileStateRef.current;
    if (fileState.operation !== null || pendingProtectedActionRef.current !== null) return;
    if (!fileState.dirty) {
      void action();
      return;
    }

    pendingProtectedActionRef.current = { kind, run: action };
    setUnsavedReturnFocusTo(returnFocusTo);
    setPendingUnsavedAction(kind);
    setUnsavedChangesError(null);
  }

  function clearPendingProtectedAction() {
    pendingProtectedActionRef.current = null;
    setPendingUnsavedAction(null);
    setUnsavedReturnFocusTo(null);
    setUnsavedChangesError(null);
  }

  async function chooseUnsavedChangesAction(choice: UnsavedChangesChoice) {
    const pending = pendingProtectedActionRef.current;
    if (!pending || isResolvingUnsavedChanges) return;
    if (choice === 'cancel') {
      clearPendingProtectedAction();
      return;
    }

    if (choice === 'discard') markRecoveryResolved();

    setIsResolvingUnsavedChanges(true);
    setUnsavedChangesError(null);
    let saveStatus: SaveAttemptStatus | null = null;
    try {
      const resolution = await resolveUnsavedChanges(pending.kind, choice, async () => {
        saveStatus = await saveArchive(false);
        return saveStatus;
      });
      if (!resolution.proceed) {
        if (saveStatus === 'failed') setUnsavedChangesError(t('archive.writeError'));
        return;
      }

      const action = pending.run;
      clearPendingProtectedAction();
      await action();
    } finally {
      setIsResolvingUnsavedChanges(false);
    }
  }

  function newWorkspace(returnFocusTo: HTMLElement | null = null) {
    requestProtectedAction('new', performNewWorkspace, returnFocusTo);
  }

  function openArchive(returnFocusTo: HTMLElement | null = null) {
    requestProtectedAction('open', performOpenArchive, returnFocusTo);
  }

  function exitApplication(returnFocusTo: HTMLElement | null = null) {
    requestProtectedAction('exit', closeNativeWindow, returnFocusTo);
  }

  function restoreRecoveryCandidate() {
    if (!recoveryCandidate) return;
    setDraft(recoveryCandidate.rating);
    setCardOptions(recoveryCandidate.cardOptions);
    setRecoveryCandidate(null);
    setArchiveError(null);
  }

  function discardRecoveryCandidate() {
    markRecoveryResolved();
    setRecoveryCandidate(null);
  }

  useEffect(() => {
    closeNativeWindowRef.current = closeNativeWindow;
    requestProtectedActionRef.current = requestProtectedAction;
  });

  useEffect(() => {
    const lifecycle = platformServices.windowLifecycle;
    if (!lifecycle) return;

    let disposed = false;
    let unlisten: (() => void) | null = null;
    void lifecycle
      .onCloseRequested((event) => {
        if (allowNextWindowCloseRef.current) {
          allowNextWindowCloseRef.current = false;
          return;
        }
        const fileState = desktopFileStateRef.current;
        if (fileState.operation !== null) {
          event.preventDefault();
          return;
        }
        if (!fileState.dirty) return;

        event.preventDefault();
        requestProtectedActionRef.current('close', () => closeNativeWindowRef.current());
      })
      .then((stopListening) => {
        if (disposed) stopListening();
        else unlisten = stopListening;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  function updateWork(field: Exclude<keyof WorkMetadata, 'coverDataUrl'>, value: string) {
    setDraft((current) => ({ ...current, work: { ...current.work, [field]: value } }));
  }

  function updateWorkLabel(field: 'artistLabel' | 'albumLabel', value: string | null) {
    setDraft((current) => ({ ...current, work: { ...current.work, [field]: value } }));
  }

  function updateExtraField(fieldId: string, update: Partial<WorkMetadataEntry>) {
    setDraft((current) => ({
      ...current,
      work: {
        ...current.work,
        extraFields: current.work.extraFields.map((field) =>
          field.id === fieldId ? { ...field, ...update } : field,
        ),
      },
    }));
  }

  function removeExtraField(fieldId: string) {
    setDraft((current) => ({
      ...current,
      work: {
        ...current.work,
        extraFields: current.work.extraFields.filter((field) => field.id !== fieldId),
      },
    }));
  }

  async function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateCoverFile(file);
    if (validationError === 'unsupported-type') {
      setCoverError(t('metadata.coverTypeError'));
      return;
    }
    if (validationError === 'file-too-large') {
      setCoverError(t('metadata.coverSizeError'));
      return;
    }

    try {
      const coverDataUrl = await readFileAsDataUrl(file);
      setDraft((current) => ({ ...current, work: { ...current.work, coverDataUrl } }));
      setCoverError(null);
    } catch {
      setCoverError(t('metadata.coverReadError'));
    }
  }

  const titleMissing = draft.work.title.trim() === '';

  async function exportCard() {
    if (titleMissing) {
      setExportError(t('card.exportTitleRequired'));
      return;
    }
    if (rating.status !== 'ready') {
      setExportError(t('card.exportScoreRequired'));
      return;
    }
    if (!isCardReady) {
      setExportError(t('card.preparingPreview'));
      return;
    }
    if (overflowResult.hasOverflow) {
      setExportError(t('card.exportOverflowError'));
      return;
    }
    if (!cardRef.current) return;

    setIsExporting(true);
    setExportError(null);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const filename = `${
        draft.work.title
          .trim()
          .replace(/[\\/:*?"<>|]/g, '-')
          .slice(0, 80) || 'XDRate'
      }-XDRate-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.png`;
      const result = await platformServices.files.saveBinaryFile({
        contents: dataUrl,
        mediaType: 'image/png',
        suggestedName: filename,
      });
      if (result.status === 'failed') throw new Error(result.reason);
    } catch {
      setExportError(t('card.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }

  useEffect(() => {
    if (platformServices.runtime.kind !== 'desktop' || recoveryCandidate) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if (pendingProtectedActionRef.current) return;
      const command = resolveDesktopCommand(event);
      if (!command) return;
      event.preventDefault();
      const returnFocusTo =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      switch (command) {
        case 'new':
          newWorkspace(returnFocusTo);
          break;
        case 'open':
          openArchive(returnFocusTo);
          break;
        case 'save':
          void saveArchive(false);
          break;
        case 'save-as':
          void saveArchive(true);
          break;
        case 'export-png':
          void exportCard();
          break;
        case 'exit':
          exitApplication(returnFocusTo);
          break;
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  });

  function updateAxis(axisId: string, update: Partial<RatingAxis>) {
    setDraft((current) => ({
      ...current,
      axes: current.axes.map((axis) => (axis.id === axisId ? { ...axis, ...update } : axis)),
    }));
  }

  function updateNegative(itemId: string, update: Partial<NegativeItem>) {
    setDraft((current) => ({
      ...current,
      negativeItems: current.negativeItems.map((item) =>
        item.id === itemId ? { ...item, ...update } : item,
      ),
    }));
  }

  function changeMode(mode: Exclude<RatingMode, 'custom'>) {
    if (mode === draft.mode) return;
    const shouldReset = window.confirm(t('rating.modeConfirm'));
    setDraft((current) => ({
      ...current,
      mode: shouldReset ? mode : 'custom',
      axes: shouldReset ? createDefaultAxes(mode) : current.axes,
    }));
  }

  function clearDefaultContent() {
    if (!window.confirm(t('rating.clearConfirm'))) return;
    clearedDraftRef.current = true;
    setDraft((current) => {
      return clearRatingContent(current);
    });
    setShowClearedNotice(true);
    setCoverError(null);
    setExportError(null);
    setArchiveError(null);
  }

  function removeAxis(axisId: string) {
    setDraft((current) =>
      current.axes.length === 1
        ? current
        : { ...current, mode: 'custom', axes: current.axes.filter((axis) => axis.id !== axisId) },
    );
  }

  return (
    <>
      <div
        className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)]"
        data-testid="rating-editor-layout"
      >
        <section className="min-w-0 space-y-6" aria-label={t('rating.editor')}>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-slate-900">
            <button type="button" className="button-secondary" onClick={clearDefaultContent}>
              {t('rating.clearDefault')}
            </button>
            {showClearedNotice && (
              <p
                className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400"
                role="status"
              >
                {t('rating.clearNotice')}
              </p>
            )}
          </div>
          <Panel title={t('metadata.title')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('metadata.workTitle')}
                required
                error={titleMissing ? t('metadata.titleRequired') : undefined}
              >
                <input
                  value={draft.work.title}
                  onChange={(event) => updateWork('title', event.target.value)}
                  maxLength={120}
                  aria-invalid={titleMissing}
                  className="input"
                />
              </Field>
              <EditableMetadataField
                defaultLabel={t('metadata.artist')}
                labelAriaLabel={t('metadata.artistLabel')}
                labelValue={draft.work.artistLabel}
                value={draft.work.artist}
                onLabelChange={(value) => updateWorkLabel('artistLabel', value)}
                onValueChange={(value) => updateWork('artist', value)}
              />
              <EditableMetadataField
                defaultLabel={t('metadata.album')}
                labelAriaLabel={t('metadata.albumLabel')}
                labelValue={draft.work.albumLabel}
                value={draft.work.album}
                onLabelChange={(value) => updateWorkLabel('albumLabel', value)}
                onValueChange={(value) => updateWork('album', value)}
              />
              <Field label={t('metadata.releaseYear')}>
                <input
                  type="number"
                  min="1000"
                  max={new Date().getFullYear() + 1}
                  value={draft.work.releaseYear}
                  onChange={(event) => updateWork('releaseYear', event.target.value)}
                  className="input"
                />
              </Field>
              <Field label={t('metadata.cover')} extraClassName="sm:col-span-2">
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverChange}
                    className="block max-w-full text-sm text-slate-700 dark:text-slate-200"
                  />
                  {draft.work.coverDataUrl && (
                    <button
                      type="button"
                      className="text-sm font-medium text-rose-700 underline underline-offset-4 dark:text-rose-300"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          work: { ...current.work, coverDataUrl: null },
                        }))
                      }
                    >
                      {t('metadata.removeCover')}
                    </button>
                  )}
                </div>
                {coverError && (
                  <span className="mt-2 block text-sm text-rose-600" role="alert">
                    {coverError}
                  </span>
                )}
              </Field>
              {draft.work.extraFields.map((field, index) => (
                <fieldset
                  key={field.id}
                  className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:col-span-2"
                >
                  <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {t('metadata.customField')} {index + 1}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('metadata.customFieldName')}>
                      <input
                        value={field.label}
                        onChange={(event) =>
                          updateExtraField(field.id, { label: event.target.value })
                        }
                        maxLength={24}
                        className="input"
                      />
                    </Field>
                    <Field label={t('metadata.customFieldValue')}>
                      <input
                        value={field.value}
                        onChange={(event) =>
                          updateExtraField(field.id, { value: event.target.value })
                        }
                        maxLength={120}
                        className="input"
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-rose-700 underline underline-offset-4 dark:text-rose-300"
                    onClick={() => removeExtraField(field.id)}
                  >
                    {t('metadata.removeField')}
                  </button>
                </fieldset>
              ))}
              <div className="sm:col-span-2">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={draft.work.extraFields.length >= 6}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      work: {
                        ...current.work,
                        extraFields: [...current.work.extraFields, createWorkMetadataEntry()],
                      },
                    }))
                  }
                >
                  {t('metadata.addField')}
                </button>
                {draft.work.extraFields.length >= 6 && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t('metadata.fieldLimit')}
                  </p>
                )}
              </div>
            </div>
          </Panel>

          <Panel title={t('rating.setupTitle')}>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('rating.mode')}
              </legend>
              <div className="mt-3 flex flex-wrap gap-4">
                {(['simple', 'professional'] as const).map((mode) => (
                  <label
                    key={mode}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <input
                      type="radio"
                      name="rating-mode"
                      checked={draft.mode === mode}
                      onChange={() => changeMode(mode)}
                    />
                    {mode === 'simple' ? t('rating.simpleMode') : t('rating.professionalMode')}
                  </label>
                ))}
                {draft.mode === 'custom' && (
                  <span className="text-sm text-indigo-600 dark:text-indigo-400">
                    {t('rating.customMode')}
                  </span>
                )}
              </div>
            </fieldset>
            <div className="mt-5 space-y-4">
              {draft.axes.map((axis, index) => (
                <AxisEditor
                  key={axis.id}
                  axis={axis}
                  index={index}
                  cannotRemove={draft.axes.length === 1}
                  onChange={updateAxis}
                  onRemove={removeAxis}
                />
              ))}
            </div>
            {duplicateAxisNames && (
              <p className="mt-3 text-sm text-rose-600" role="alert">
                {t('rating.duplicateAxis')}
              </p>
            )}
            <button
              type="button"
              className="button-secondary mt-4"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  mode: 'custom',
                  axes: [...current.axes, createRatingAxis(t('rating.newAxis'))],
                }))
              }
            >
              {t('rating.addAxis')}
            </button>
          </Panel>

          <Panel title={t('rating.negativeTitle')}>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('rating.negativeHelp')}</p>
            <div className="mt-4 space-y-4">
              {draft.negativeItems.map((item, index) => (
                <NegativeEditor
                  key={item.id}
                  item={item}
                  index={index}
                  onChange={updateNegative}
                  onRemove={(itemId) =>
                    setDraft((current) => ({
                      ...current,
                      negativeItems: current.negativeItems.filter((item) => item.id !== itemId),
                    }))
                  }
                />
              ))}
            </div>
            <button
              type="button"
              className="button-secondary mt-4"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  negativeItems: [
                    ...current.negativeItems,
                    createNegativeItem(t('rating.negativeDefaultName')),
                  ],
                }))
              }
            >
              {t('rating.addNegative')}
            </button>
            {draft.negativeItems.length > 1 && (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                {t('rating.multipleNegativeWarning')}
              </p>
            )}
          </Panel>

          <Panel title={t('rating.reviewTitle')}>
            <Field label={t('rating.overallComment')}>
              <textarea
                value={draft.overallComment}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, overallComment: event.target.value }))
                }
                maxLength={2000}
                rows={5}
                className="input"
              />
            </Field>
            <Field label={t('rating.personalStory')} extraClassName="mt-4">
              <textarea
                value={draft.personalStory}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, personalStory: event.target.value }))
                }
                maxLength={3000}
                rows={5}
                className="input"
              />
            </Field>
            <Field label={t('rating.personalSignature')} extraClassName="mt-4">
              <input
                value={draft.personalSignature ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, personalSignature: event.target.value }))
                }
                maxLength={120}
                className="input"
              />
            </Field>
          </Panel>
          <Panel title={t('archive.title')}>
            {platformServices.runtime.kind === 'desktop' ? (
              <div className="space-y-4">
                {/* Native Disk File Status & Operations Card */}
                <div
                  className={`rounded-xl border p-4 transition-colors ${
                    desktopFileState.dirty
                      ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
                      : 'border-slate-200 bg-slate-50/50 dark:border-slate-700/60 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        {t('archive.diskFile')}
                      </span>
                      {/* Status Pill Badge */}
                      {desktopFileState.operation !== null ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                          {desktopFileState.operation.kind === 'open'
                            ? t('archive.opening')
                            : t('archive.saving')}
                        </span>
                      ) : desktopFileState.dirty ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          {t('archive.dirty')}
                        </span>
                      ) : desktopFileState.currentFilePath ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {t('archive.clean')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          {t('archive.notSavedToDisk')}
                        </span>
                      )}
                    </div>

                    {/* Secondary subtle auto-draft note */}
                    <span
                      className={`text-xs ${
                        persistenceStatus === 'error'
                          ? 'text-rose-600'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                      role="status"
                    >
                      {persistenceStatus === 'error'
                        ? t('storage.error')
                        : persistenceStatus === 'saving'
                          ? t('archive.autoDraftSaving')
                          : t('archive.autoDraftSaved')}
                    </span>
                  </div>

                  {/* File Path & Name display */}
                  <div className="mt-3 min-w-0">
                    {desktopFileState.currentFilePath ? (
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                          {desktopFileState.currentFilePath.split(/[\\/]/).pop() ||
                            desktopFileState.currentFilePath}
                        </p>
                        <p
                          className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400"
                          title={desktopFileState.currentFilePath}
                        >
                          {desktopFileState.currentFilePath}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {t('archive.noFile')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t('archive.noFileHint')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      className="button-secondary min-h-10 text-sm"
                      onClick={(event) => newWorkspace(event.currentTarget)}
                      disabled={desktopFileState.operation !== null}
                      aria-keyshortcuts="Control+N"
                      title={`${t('archive.new')} (${t('shortcut.new')})`}
                    >
                      {t('archive.new')}
                    </button>
                    <button
                      type="button"
                      className={`${
                        desktopFileState.dirty ? 'button-primary' : 'button-secondary'
                      } min-h-10 text-sm`}
                      onClick={() => void saveArchive(false)}
                      disabled={desktopFileState.operation !== null}
                      aria-keyshortcuts="Control+S"
                      title={`${t('archive.save')} (${t('shortcut.save')})`}
                    >
                      {desktopFileState.operation?.kind === 'save'
                        ? t('archive.saving')
                        : t('archive.save')}
                    </button>
                    <button
                      type="button"
                      className="button-secondary min-h-10 text-sm"
                      onClick={(event) => openArchive(event.currentTarget)}
                      disabled={desktopFileState.operation !== null}
                      aria-keyshortcuts="Control+O"
                      title={`${t('archive.open')} (${t('shortcut.open')})`}
                    >
                      {desktopFileState.operation?.kind === 'open'
                        ? t('archive.opening')
                        : t('archive.open')}
                    </button>
                    <button
                      type="button"
                      className="button-secondary min-h-10 text-sm"
                      onClick={() => void saveArchive(true)}
                      disabled={desktopFileState.operation !== null}
                      aria-keyshortcuts="Control+Shift+S"
                      title={`${t('archive.saveAs')} (${t('shortcut.saveAs')})`}
                    >
                      {desktopFileState.operation?.kind === 'save-as'
                        ? t('archive.saving')
                        : t('archive.saveAs')}
                    </button>
                    <button
                      type="button"
                      className="button-secondary min-h-10 text-sm"
                      onClick={(event) => exitApplication(event.currentTarget)}
                      disabled={desktopFileState.operation !== null}
                      aria-keyshortcuts="Control+Q"
                      title={`${t('app.exit')} (${t('shortcut.exit')})`}
                    >
                      {t('app.exit')}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('archive.recentTitle')}
                    </h3>
                    {recentFiles.length > 0 && (
                      <button
                        type="button"
                        className="text-sm font-medium text-rose-700 underline underline-offset-4 dark:text-rose-300"
                        onClick={clearRecent}
                      >
                        {t('archive.recentClear')}
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t('archive.recentPrivacy')}
                  </p>
                  {recentFiles.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {t('archive.recentEmpty')}
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {recentFiles.map((file) => (
                        <li
                          key={file.path.toLocaleLowerCase('en-US')}
                          className="flex min-w-0 items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {file.displayName}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {file.path}
                            </p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              {t('archive.recentTime')}:{' '}
                              {new Intl.DateTimeFormat(locale, {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              }).format(new Date(file.lastOpenedAt))}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 text-xs font-semibold text-rose-700 underline underline-offset-4 dark:text-rose-300"
                            aria-label={`${t('archive.recentRemove')}：${file.displayName}`}
                            onClick={() => removeRecent(file.path)}
                          >
                            {t('archive.recentRemove')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p
                  className={`text-sm ${persistenceStatus === 'error' ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}
                  role="status"
                >
                  {persistenceStatus === 'error'
                    ? t('storage.error')
                    : persistenceStatus === 'saving'
                      ? t('storage.saving')
                      : t('storage.saved')}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={(event) => newWorkspace(event.currentTarget)}
                  >
                    {t('archive.new')}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => void saveArchive(false)}
                  >
                    {t('archive.export')}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={(event) => openArchive(event.currentTarget)}
                  >
                    {t('archive.import')}
                  </button>
                </div>
              </div>
            )}

            {/* Template Management */}
            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t('archive.templateName')}
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  maxLength={80}
                  className="input mt-1"
                />
              </label>
              <button type="button" className="button-primary self-end" onClick={saveTemplate}>
                {t('archive.saveTemplate')}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <select
                value={selectedTemplateId}
                aria-label={t('archive.savedTemplates')}
                onChange={(event) => {
                  const template = templates.find((item) => item.id === event.target.value);
                  setSelectedTemplateId(event.target.value);
                  if (template) setTemplateName(template.name);
                }}
                className="input"
              >
                <option value="">{t('archive.noTemplates')}</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button-secondary"
                onClick={applySelectedTemplate}
                disabled={!selectedTemplateId}
              >
                {t('archive.applyTemplate')}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={renameSelectedTemplate}
                disabled={!selectedTemplateId}
              >
                {t('archive.renameTemplate')}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={deleteSelectedTemplate}
                disabled={!selectedTemplateId}
              >
                {t('archive.deleteTemplate')}
              </button>
            </div>

            {archiveError && (
              <p className="mt-3 text-sm text-rose-600" role="alert">
                {archiveError}
              </p>
            )}
          </Panel>
          <button
            type="button"
            className="text-sm font-medium text-rose-700 underline underline-offset-4 dark:text-rose-300"
            onClick={() => {
              if (window.confirm(t('rating.resetConfirm'))) setDraft(createDefaultRating());
            }}
          >
            {t('rating.reset')}
          </button>
        </section>

        <aside
          className="h-fit min-w-0 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm dark:border-indigo-900 dark:bg-slate-900 lg:sticky lg:top-6"
          aria-label={t('rating.breakdownTitle')}
        >
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            {t('rating.breakdownTitle')}
          </h2>
          {rating.status === 'ready' ? (
            <>
              <output className="mt-5 block" aria-live="polite">
                <span className="block text-5xl font-black tracking-tight text-indigo-700 dark:text-indigo-300">
                  {formatScore(rating.score100)}
                </span>
                <span className="mt-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  / 100
                </span>
              </output>
              <dl className="mt-6 space-y-3 text-sm">
                <ScoreRow
                  label={t('rating.positiveScore')}
                  value={formatScore(rating.positiveScore100)}
                />
                <ScoreRow label={t('rating.penalty')} value={formatScore(rating.penalty100)} />
              </dl>
              <h3 className="mt-6 text-sm font-semibold text-slate-900 dark:text-white">
                {t('rating.axisContributions')}
              </h3>
              <ul className="mt-3 space-y-3 text-sm">
                {rating.contributions.map((item) => (
                  <li
                    key={item.axisId}
                    className="border-t border-indigo-100 pt-3 dark:border-slate-700"
                  >
                    <div className="flex justify-between gap-3">
                      <span>{item.axisName || t('rating.unnamedAxis')}</span>
                      <span>
                        {formatScore(item.score)} × {item.weight}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {t('rating.contribution')}: {formatScore(item.weightedContribution100)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p
              className="mt-5 rounded-lg bg-amber-100 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
              role="status"
            >
              {t('rating.uncalculable')}
            </p>
          )}
          <p className="mt-6 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {t('rating.calculationHelp')}
          </p>
          <section className="mt-6 border-t border-indigo-100 pt-6 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">{t('card.title')}</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <label className="font-medium text-slate-700 dark:text-slate-200">
                {t('card.theme')}
                <select
                  value={cardOptions.theme}
                  onChange={(event) =>
                    setCardOptions((current) => ({
                      ...current,
                      theme: event.target.value as CardTheme,
                    }))
                  }
                  className="input mt-1"
                >
                  <option value="light">{t('card.lightTheme')}</option>
                  <option value="dark">{t('card.darkTheme')}</option>
                </select>
              </label>
              <label className="font-medium text-slate-700 dark:text-slate-200">
                {t('card.ratio')}
                <select
                  value={cardOptions.ratio}
                  onChange={(event) =>
                    setCardOptions((current) => ({
                      ...current,
                      ratio: event.target.value as CardRatio,
                    }))
                  }
                  className="input mt-1"
                >
                  <optgroup label={t('card.layout.landscape')}>
                    <option value="16:9">{t('card.ratio.16-9')}</option>
                    <option value="8:5">{t('card.ratio.8-5')}</option>
                    <option value="3:2">{t('card.ratio.3-2')}</option>
                  </optgroup>
                  <optgroup label={t('card.layout.standard')}>
                    <option value="4:3">{t('card.ratio.4-3')}</option>
                    <option value="5:4">{t('card.ratio.5-4')}</option>
                  </optgroup>
                  <optgroup label={t('card.layout.square')}>
                    <option value="1:1">{t('card.ratio.1-1')}</option>
                  </optgroup>
                  <optgroup label={t('card.layout.portrait')}>
                    <option value="4:5">{t('card.ratio.4-5')}</option>
                    <option value="3:4">{t('card.ratio.3-4')}</option>
                    <option value="2:3">{t('card.ratio.2-3')}</option>
                    <option value="5:8">{t('card.ratio.5-8')}</option>
                    <option value="9:16">{t('card.ratio.9-16')}</option>
                  </optgroup>
                </select>
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={cardOptions.showReasons}
                  onChange={(event) =>
                    setCardOptions((current) => ({ ...current, showReasons: event.target.checked }))
                  }
                />
                {t('card.showReasons')}
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={cardOptions.showStory}
                  onChange={(event) =>
                    setCardOptions((current) => ({ ...current, showStory: event.target.checked }))
                  }
                />
                {t('card.showStory')}
              </label>
            </div>
            <div className="mt-5 min-w-0 max-w-full overflow-hidden rounded-2xl">
              <CardPreview
                cardRef={cardRef}
                draft={draft}
                rating={rating}
                options={cardOptions}
                onOverflowChange={setOverflowResult}
                onReadyChange={setIsCardReady}
              />
            </div>
            {overflowResult.hasOverflow && (
              <div
                className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
                role="alert"
              >
                <p className="font-semibold">{t('card.overflowWarning')}</p>
                {overflowResult.issues.length > 0 && (
                  <p className="mt-1">
                    <span className="font-medium">{t('card.overflowRegions')}: </span>
                    {overflowResult.issues
                      .map((issue) => t(issue.labelKey as Parameters<typeof t>[0]))
                      .join('、')}
                  </p>
                )}
                {/* Quick-action shortcuts */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {cardOptions.showStory && (
                    <button
                      type="button"
                      className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900"
                      onClick={() =>
                        setCardOptions((current) => ({ ...current, showStory: false }))
                      }
                    >
                      {t('card.overflowHideStory')}
                    </button>
                  )}
                  <span className="self-center text-amber-700 dark:text-amber-300">
                    {t('card.overflowSwitchRatio')}
                  </span>
                </div>
              </div>
            )}
            <button
              type="button"
              className="button-primary mt-4 w-full"
              onClick={exportCard}
              disabled={isExporting || !isCardReady || overflowResult.hasOverflow}
              aria-keyshortcuts={
                platformServices.runtime.kind === 'desktop' ? 'Control+Shift+E' : undefined
              }
              title={
                !isCardReady
                  ? t('card.preparingPreview')
                  : overflowResult.hasOverflow
                    ? t('card.exportOverflowError')
                    : platformServices.runtime.kind === 'desktop'
                      ? `${t('card.download')} (${t('shortcut.exportPng')})`
                      : undefined
              }
            >
              {isExporting ? t('card.exporting') : t('card.download')}
            </button>
            {exportError && (
              <p className="mt-3 text-sm text-rose-600" role="alert">
                {exportError}
              </p>
            )}
          </section>
        </aside>
      </div>
      {pendingUnsavedAction && (
        <UnsavedChangesDialog
          action={pendingUnsavedAction}
          busy={isResolvingUnsavedChanges}
          error={unsavedChangesError}
          returnFocusTo={unsavedReturnFocusTo}
          onChoose={(choice) => void chooseUnsavedChangesAction(choice)}
        />
      )}
      {recoveryCandidate && (
        <RecoveryDialog
          workspace={recoveryCandidate}
          onRestore={restoreRecoveryCandidate}
          onDiscard={discardRecoveryCandidate}
        />
      )}
    </>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

function EditableMetadataField({
  defaultLabel,
  labelAriaLabel,
  labelValue,
  value,
  onLabelChange,
  onValueChange,
}: {
  defaultLabel: string;
  labelAriaLabel: string;
  labelValue: string | null;
  value: string;
  onLabelChange: (value: string | null) => void;
  onValueChange: (value: string) => void;
}) {
  const effectiveLabel = labelValue ?? defaultLabel;
  return (
    <div className="block min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200">
      <input
        aria-label={labelAriaLabel}
        value={effectiveLabel}
        placeholder={defaultLabel}
        onChange={(event) =>
          onLabelChange(event.target.value === defaultLabel ? null : event.target.value)
        }
        maxLength={24}
        className={`${effectiveLabel.trim() ? 'input-label-edit' : 'input'} placeholder:text-slate-400 dark:placeholder:text-slate-500`}
      />
      <span className="mt-2 block min-w-0">
        <input
          aria-label={effectiveLabel.trim() || defaultLabel}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          maxLength={120}
          className="input"
        />
      </span>
    </div>
  );
}
function Field({
  label,
  children,
  required = false,
  error,
  extraClassName = '',
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  extraClassName?: string;
}) {
  return (
    <label
      className={`block min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200 ${extraClassName}`}
    >
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <span className="mt-2 block min-w-0">{children}</span>
      {error && (
        <span className="mt-1 block text-sm text-rose-600" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AxisEditor({
  axis,
  index,
  cannotRemove,
  onChange,
  onRemove,
}: {
  axis: RatingAxis;
  index: number;
  cannotRemove: boolean;
  onChange: (id: string, update: Partial<RatingAxis>) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-white">
        {t('rating.axis')} {index + 1}
      </legend>
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Field label={t('rating.axis')}>
          <input
            value={axis.name}
            onChange={(event) => onChange(axis.id, { name: event.target.value })}
            maxLength={24}
            className="input"
          />
        </Field>
        <Field label={t('rating.score')}>
          <StarRating
            value={axis.score}
            onChange={(score) => onChange(axis.id, { score })}
            label={`${axis.name.trim() || t('rating.axis')} ${t('rating.score')}`}
          />
        </Field>
        <Field label={t('rating.importance')}>
          <select
            value={axis.importanceLevel}
            onChange={(event) =>
              onChange(axis.id, { importanceLevel: Number(event.target.value) as ImportanceLevel })
            }
            className="input"
          >
            {levels.map((level) => (
              <option key={level} value={level}>
                LV{level} · ×{importanceWeights[level]}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-end gap-2 pb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={axis.enabled}
            onChange={(event) => onChange(axis.id, { enabled: event.target.checked })}
          />
          {t('rating.enabled')}
        </label>
      </div>
      <Field label={t('rating.reason')} extraClassName="mt-4">
        <textarea
          value={axis.reason}
          onChange={(event) => onChange(axis.id, { reason: event.target.value })}
          maxLength={500}
          rows={3}
          className="input"
        />
      </Field>
      <button
        type="button"
        disabled={cannotRemove}
        className="mt-4 text-sm font-medium text-rose-700 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300"
        onClick={() => onRemove(axis.id)}
      >
        {t('rating.remove')}
      </button>
    </fieldset>
  );
}

function NegativeEditor({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: NegativeItem;
  index: number;
  onChange: (id: string, update: Partial<NegativeItem>) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="min-w-0 rounded-xl border border-rose-200 p-4 dark:border-rose-900">
      <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-white">
        {t('rating.negativeItem')} {index + 1}
      </legend>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label={t('rating.negativeItem')}>
          <input
            value={item.name}
            onChange={(event) => onChange(item.id, { name: event.target.value })}
            maxLength={24}
            className="input"
          />
        </Field>
        <Field label={t('rating.negativeScore')}>
          <BananaRating
            value={item.score}
            onChange={(score) => onChange(item.id, { score })}
            label={`${item.name.trim() || t('rating.negativeItem')} ${t('rating.negativeScore')}`}
          />
        </Field>
        <label className="flex items-end gap-2 pb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(event) => onChange(item.id, { enabled: event.target.checked })}
          />
          {t('rating.enabled')}
        </label>
      </div>
      <Field label={t('rating.reason')} extraClassName="mt-4">
        <textarea
          value={item.reason}
          onChange={(event) => onChange(item.id, { reason: event.target.value })}
          maxLength={500}
          rows={3}
          className="input"
        />
      </Field>
      <button
        type="button"
        className="mt-4 text-sm font-medium text-rose-700 underline underline-offset-4 dark:text-rose-300"
        onClick={() => onRemove(item.id)}
      >
        {t('rating.remove')}
      </button>
    </fieldset>
  );
}
