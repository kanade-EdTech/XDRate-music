# M3 Desktop Workflow and Recovery Execution Log

> Covers: `V02-UX-02`, `V02-UX-03`, `V02-UX-04`, and `V02-REC-01`  
> Status: implementation and automated acceptance complete; bilingual Windows manual review for `V02-UX-03` remains  
> Date: 2026-09-05

## 1. Implementation outcome

- The window title is “work name or file name + unsaved asterisk + XDRate Music.” Only a file base name may appear; a full local path never appears in the title. Save failure retains the asterisk and only successful save removes it.
- Desktop commands are `Ctrl+N`, `Ctrl+O`, `Ctrl+S`, `Ctrl+Shift+S`, `Ctrl+Shift+E`, and `Ctrl+Q` for New, Open, Save, Save As, Export PNG, and Quit. Visible controls remain available with `aria-keyshortcuts` and localized hints.
- While an input is focused, only those exact commands are intercepted. Copy, paste, cut, undo, redo, select-all, and ordinary typing remain untouched. New/Open/Quit reuse the unsaved-change guard; cancellation restores focus and content.
- Recent files retain at most ten local display-metadata records, deduplicate normalized paths, and move the newest item first. They never retain file contents, scan directories, or auto-open paths; users can remove one item or clear the list.
- Autosave recovery remains separate from user disk files. After an abnormal session, startup previews the work name, rated-axis count, and a text excerpt. Nothing is adopted until the user explicitly restores or discards it. Restore loads editor memory only and never writes or overwrites a disk file.

## 2. State and recovery contract

| Scenario                   | Title/state                                                            | Recovery marker           |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------- |
| New blank workspace        | `Untitled rating — XDRate Music`                                       | resolved                  |
| Edit                       | `Work name * — XDRate Music`                                           | autosave pending recovery |
| Open file                  | `Work name — XDRate Music`; base file name when the work name is empty | resolved                  |
| Save succeeds              | remove `*`                                                             | resolved                  |
| Save is cancelled or fails | retain `*` and current content                                         | remains recoverable       |
| Abnormal restart           | preview before adoption                                                | user decides              |

Initial recovery focus is on “Restore this draft,” and Tab focus cycles between the two decision controls. New autosaves pause while a recovery decision is pending so the blank startup editor cannot overwrite the candidate.

## 3. Permission and privacy boundary

- The only new Tauri permission is `core:window:allow-set-title`, alongside existing `allow-native-files` and `core:window:allow-close`.
- No shell, process, arbitrary filesystem, network, telemetry, or updater capability is added.
- `xdrate.music.recent-files.v1` stores only display name, the user-selected path, and last-opened timestamp.
- `xdrate.music.recovery-state.v1` stores recovery status. Rating content continues to use the existing local workspace archive; no hidden disk copy is created.

## 4. Automated evidence

- `windowTitle.test.ts`: work name, file base name, untitled state, and Windows/POSIX path privacy.
- `desktopCommands.test.ts`: all six commands and non-interception of common text-editing shortcuts.
- `recentFilesStorage.test.ts`: path deduplication, ten-item limit, explicit stale removal, clear, and malformed-record rejection.
- `workspaceStorage.test.ts`: pending recovery requires explicit resolution and resolution does not destroy the current local workspace.
- `release.spec.ts`: title states, recovery preview/focus loop, shortcut cancellation preserving text, and recent-file privacy/cleanup.

Final results: Prettier, ESLint, TypeScript, version-consistency, and least-capability checks pass; Vitest passes 110/110 across 16 files; three-browser Playwright passes 48/48; card visual 3/3, desktop visual 5/5, visual handover 2/2, and Rust 4/4 all pass. Web production and Tauri NSIS builds succeed.

Installer candidate: `src-tauri/target/release/bundle/nsis/XDRate Music_0.2.0_x64-setup.exe` (2,058,409 bytes); SHA-256: `D0767E4E01D14443B842D86FF5C11AD113EDBAFA96F300053C669B0EBD0168B8`. This candidate remains unsigned and uses the development icon; it is not a public release artifact.

## 5. Minimum manual acceptance

In the Windows 10/11 x64 installer, repeat in Simplified Chinese and English:

1. Check window titles for New, Edit, successful Save, and cancelled Save; confirm no full path appears.
2. Enter text in the work-name field, exercise all six shortcuts and visible controls, and confirm cancelling a guarded action preserves text and focus.
3. Open/save two archives, check recent-file ordering, move one file, explicitly remove its stale entry, and clear the list.
4. Edit, terminate the process, relaunch, inspect the preview, then test both Restore and Discard; confirm the disk file was not overwritten.

Until this manual review is reported, `V02-UX-03` remains implementation-complete but not fully accepted.
