# M2 Native File Execution Log

Status: automated and build gates passed; ready for the M3 desktop-workflow milestone  
Version: Desktop v0.2.0  
Date: 2026-09-01

## 1. Delivery conclusion

The M2 native-file vertical slice is implemented. The Windows desktop build uses system dialogs to open and save XDRate archives and to export PNG files; an associated archive can be saved directly. The browser build keeps its download-based JSON/PNG and file-picker import behavior without depending on Tauri.

This milestone does not change Archive Schema v2, the rating domain, or `music-linear-100-v4`. Desktop paths and native handles exist only in runtime workspace state and never enter a portable archive.

## 2. Security boundary

- The frontend receives no arbitrary filesystem API and no shell, process, HTTP, or updater permission.
- `allow-native-files` enables exactly four application commands: archive open, archive save-as, associated archive save, and PNG save.
- A native open/save-as path must be selected by the user in a system dialog.
- After a successful open/save-as, Rust issues an unguessable session handle. Direct Save submits only that handle, not a frontend-editable path. Handles are neither persisted nor serialized.
- PNG save does not create an archive association handle, preventing cross-type capability reuse.
- Archives are limited to 16 MiB and PNGs to 64 MiB. Rust checks extension, UTF-8, the Archive v2 envelope, and PNG signature; complete business validation still reuses frontend Zod schemas and migration.

## 3. Write and failure semantics

Archives and PNGs are written to a unique sibling temporary file, flushed with `sync_all`, then replaced. Windows uses `MoveFileExW` with `REPLACE_EXISTING | WRITE_THROUGH`. Failed replacement removes the temporary file and preserves the previous target.

- Save As cancellation writes nothing and changes neither association nor dirty state.
- Successful save updates the association and records the revision that existed when the save started.
- Edits made while a save is running remain dirty after the older snapshot reaches disk.
- A synchronous frontend lock plus a Rust per-handle lock prevents concurrent writes to one file.
- A moved or deleted target returns `target-missing` instead of silently recreating the old path; Save As is the recovery route.
- Read-only, disk, and replacement failures return a recoverable write error while preserving both the edit and old target.
- The native save dialog owns existing-file replacement confirmation; declining it is a normal cancellation.

## 4. User interface

In desktop runtime, Archives and Templates provides Save Archive, Open Archive, and Save Archive As, plus the associated path and Saved/Unsaved Changes state. Save falls back to Save As when no file is associated.

PNG export retains the same preview DOM, font wait, 2× render, and overflow gate; only final binary persistence moves to the native adapter. Cancelling PNG save shows no error and creates no file.

## 5. Automated evidence

| Gate                           | Result                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Prettier / ESLint / TypeScript | Passed; zero errors                                                              |
| Vitest                         | 12 files, 65/65 passed                                                           |
| Rust unit tests                | 4/4 passed, including atomic replacement and injected-failure preservation       |
| Playwright                     | Chromium 11/11, Firefox 11/11, WebKit 11/11                                      |
| Web production build           | Passed; 140 modules                                                              |
| Desktop configuration review   | Passed; only `allow-native-files`, no arbitrary FS/shell/process/network/updater |
| Tauri NSIS build               | Passed; Windows x64 installer rebuilt                                            |
| Final desktop executable smoke | Passed; process stayed running for three seconds, then the test closed it        |

Coverage includes valid v1/v2, malformed JSON, future version, 16 MiB limit, cancellation, read failure, save-as cancellation, write failure, same-file concurrency protection, edits during save, missing-target semantics, PNG cancellation/byte transfer, and Web v0.1 → Desktop v0.2 → Web compatibility. Business fields, algorithm version, and aggregate score survive the round trip, and no path or handle is serialized.

## 6. Build artifact

- Installer: `src-tauri/target/release/bundle/nsis/XDRate Music_0.2.0_x64-setup.exe`
- Size: 2,044,988 bytes
- SHA-256: `888433F69C457F90E05063E0E91340046EA662418A2A9841BF3CB8D259DAFCC5`

This remains an unsigned internal development candidate with a development icon and must not be published as an RC or Stable build.

## 7. M3 handoff

M2 establishes reliable file capability only. Save/Discard/Cancel before close or quit, window titles, menus and shortcuts, recent files, and recovery UI belong to M3. The current status indicator is not a substitute for complete unsaved-change protection.

> Later status (2026-09-03): M3 has completed `V02-UX-01` and added exactly one new permission, `core:window:allow-close`, for the current window. This section and the M2 test table above remain a milestone snapshot; see the [M3 Unsaved Changes Protection Execution Log](./18_M3_UNSAVED_CHANGES_PROTECTION_EXECUTION_LOG.md) for current evidence.
