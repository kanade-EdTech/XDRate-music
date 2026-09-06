# M3 Unsaved Changes Protection Execution Log

Status: `V02-UX-01` automated acceptance passed  
Version: Desktop v0.2.0  
Date: 2026-09-03  
Implementation and review: Codex

## 1. Acceptance result

New, Open another archive, Close window, and Quit now share one unsaved-changes guard. A clean workspace proceeds immediately. A dirty workspace shows a Save and continue / Discard changes / Cancel dialog. The automatic draft remains a recovery copy and does not count as a user-file save.

## 2. Unified decision matrix

This table applies to all four entry points: `new`, `open`, `close`, and `exit`.

| User choice       | Save result | Perform original action | Current data and window                                   |
| ----------------- | ----------- | ----------------------- | --------------------------------------------------------- |
| Save and continue | Success     | Yes                     | Written to the user file, then new/open/close proceeds    |
| Save and continue | Cancelled   | No                      | Fully retained and remains marked unsaved                 |
| Save and continue | Failed      | No                      | Fully retained; inline error allows retry or cancellation |
| Discard changes   | No save     | Yes                     | Nothing is written; the original action then proceeds     |
| Cancel            | No save     | No                      | Fully retained; focus returns to the triggering control   |

“Close window” comes from the system title-bar request; “Quit” comes from the visible application action. They share the decision logic while keeping action-specific explanations for future menu and shortcut reuse.

## 3. Implementation boundary

- `src/application/workspace/unsavedChangesGuard.ts`: pure decision layer covering four entry points and three choices; save cancellation or failure never proceeds.
- `src/features/rating-editor/components/UnsavedChangesDialog.tsx`: semantic modal dialog; Cancel receives initial focus, `Escape` cancels, Tab focus is trapped, and focus returns on close.
- `src/features/rating-editor/RatingEditor.tsx`: save returns an explicit outcome and pending protected actions are centralized; New, Open, Quit, and Tauri close requests all use the same guard.
- `src/platform/contracts.ts` and the desktop adapter: add a minimal `PlatformWindowLifecycle` with current-window close-request listening and explicit close only.
- Browser runtime: dirty refresh, close, and navigation use the native `beforeunload` warning. Browser security policy controls its exact copy and buttons.
- Tauri capability: add only `core:window:allow-close` alongside M2's `allow-native-files`; no shell, process, arbitrary filesystem, network, or updater permission is added.

## 4. Automated coverage

| Layer                 | Coverage                                                                                       | Result                              |
| --------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| Decision matrix       | `new/open/close/exit × save/discard/cancel`, plus cancelled and failed save                    | 20 guard cases passed               |
| Workspace and adapter | Desktop transitions, save failure/cancel, Tauri close listener and explicit close              | Included in 86/86 Vitest            |
| Browser E2E           | Dirty leave guard; New/Open cancel retention; New discard; save then continue; real UI actions | 12/12 each in three browser engines |
| Accessibility/visual  | Dialog semantics, existing axe flow, card baselines, desktop responsiveness                    | Visual 3/3; desktop visual 5/5      |
| Native and build      | Rust safe-write tests, least-privilege review, Web production build, Windows x64 Tauri NSIS    | All passed                          |

Browser E2E totals 36/36; Vitest totals 13 files and 86/86; Rust totals 4/4. `npm run handover:ui02` passes 2/2 and keeps the pre-M3 visual evidence frozen rather than overwriting it with the current feature change.

## 5. Build artifact

- Installer: `src-tauri/target/release/bundle/nsis/XDRate Music_0.2.0_x64-setup.exe`
- Size: 2,052,519 bytes
- SHA-256: `CC80209B7A7550B8E51AAF842595BBC19C73A56E98D1CC86A50A409334352A44`
- Status: unsigned internal development candidate with a development icon; it must not be published as RC or Stable.

## 6. Remaining boundary

- Automation satisfies the `V02-UX-01` four-entry/three-choice decision and wiring gate. A single manual title-bar Close and visible Quit check in the new Windows installer remains recommended to confirm real WebView2 window behavior and dialog focus.
- This log retains the capability snapshot from completion of `V02-UX-01`. Later work completed `V02-UX-02`, `V02-UX-04`, and `V02-REC-01`; `V02-UX-03` is implemented pending bilingual Windows manual review. Current capability also adds `core:window:allow-set-title`; see the [M3 Desktop Workflow and Recovery Execution Log](./19_M3_DESKTOP_WORKFLOW_AND_RECOVERY_EXECUTION_LOG.md).
