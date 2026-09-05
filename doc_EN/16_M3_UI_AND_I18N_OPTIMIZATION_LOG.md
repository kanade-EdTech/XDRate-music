# M3 UI and i18n Optimization Execution Log

Status: UI implementation and the visual handover package pass review; real Windows high-DPI acceptance remains open  
Version: Desktop v0.2.0  
Date: 2026-09-01  
Implementation: Antigravity (AG/GEMINI); review and corrections: Codex

## 1. Review conclusion

Antigravity completed the visual cleanup of the Archives and templates area, desktop-responsive presentation, and new copy. Codex accepted the current `V02-UI-01` and `V02-I18N-01` implementation after review, but the original handoff was not reproducible and overstated the automated coverage. The following corrections were made:

1. An unassociated disk file no longer falls into the green “Saved to disk” branch. The UI now distinguishes operation in progress, unsaved edits, an associated saved file, and an unassociated file that has not been saved.
2. A discoverable `npm run test:desktop-visual` gate was added. The 33 standard Web E2E cases remain separate and are no longer presented as evidence that the desktop visual suite ran.
3. The machine-specific path into Antigravity's personal `.gemini/antigravity/brain` directory was removed. Screenshots are written only inside the workspace.
4. The 125% and 150% automation now combines an effective CSS viewport with `deviceScaleFactor` and captures the full page. This is browser DPR simulation, not real Windows system scaling, Tauri WebView, multi-display, or screen-reader acceptance.
5. Codex subsequently closed `V02-UI-02` with existing project-owned pre-M3 baselines and a dedicated same-fixture suite that generates itemized comparisons for the key page, star/banana controls, all four card ratio families, both themes, and a SHA-256 manifest.
6. Real-Windows manual acceptance found that horizontal edge dragging could not trigger a layout change. The native `minWidth: 1120` was above the 1024 px single-column breakpoint. It is now `minWidth: 720` with `resizable: true`, backed by an automated 1280 px two-column to 960/720 px single-column assertion.

## 2. Changed files

| File                                                                | Purpose                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/features/rating-editor/RatingEditor.tsx`                       | Correct the disk-file status branch so an unassociated file is never labeled saved                                       |
| `src/i18n/messages.ts`                                              | Add bilingual “Not saved to disk” copy                                                                                   |
| `src-tauri/tauri.conf.json`                                         | Reduce the main-window minimum width from 1120 px to 720 px so edge dragging can reach the single-column layout          |
| `scripts/check-desktop-config.mjs`                                  | Lock the main window's resizable state and 720 px minimum width                                                          |
| `e2e/desktop-visual.spec.ts`                                        | Remove the machine path; add full-page, simulated-DPR, horizontal control reachability, and unassociated-file assertions |
| `playwright.desktop-visual.config.ts`                               | Add a dedicated Chromium configuration for desktop visual evidence                                                       |
| `package.json`                                                      | Add the `test:desktop-visual` command                                                                                    |
| `e2e/ui02-handover.spec.ts` and dedicated config                    | Generate and verify the traceable `V02-UI-02` before/after package                                                       |
| `doc_EN/17_V02_UI_02_VISUAL_HANDOVER_PACKAGE.md` and Chinese mirror | Freeze the visual handover scope, reproduction command, evidence index, and open findings                                |
| `doc_CN/11_V0.2_开发计划.md` and English mirror                     | Close `V02-UI-02` against its definition of done                                                                         |
| This log and its Chinese mirror                                     | Correct test scope, scaling language, and open items                                                                     |

`playwright.config.ts` continues to run only `release.spec.ts` for the stable three-browser Web regression. The desktop visual suite runs through its dedicated configuration, and the two results must be reported separately.

## 3. Automated visual evidence

Screenshot directory: `doc_CN/artifacts/desktop_handover/`

### 3.1 Archive panel

- `panel-archive-browser-mode.png`: Archives and templates panel in browser mode.
- `panel-archive-desktop-unassociated.png`: Desktop mode with no associated disk file and unsaved edits.
- The desktop test asserts that “No associated file” and “Unsaved changes” are visible while “Saved to disk” is absent.

The panel screenshots now use the nearest `section` ancestor instead of accidentally capturing the complete editor.

### 3.2 Resolution and DPR simulation

| Target physical resolution / simulated scale | CSS viewport | `deviceScaleFactor` | Automated result                                                   |
| -------------------------------------------- | -----------: | ------------------: | ------------------------------------------------------------------ |
| 1920×1080 / 100%                             |    1920×1080 |                 1.0 | No horizontal clipping of the page or visible interactive controls |
| 1600×900 / 100%                              |     1600×900 |                 1.0 | No horizontal clipping of the page or visible interactive controls |
| 1366×768 / 100%                              |     1366×768 |                 1.0 | No horizontal clipping of the page or visible interactive controls |
| 1280×720 / 100%                              |     1280×720 |                 1.0 | No horizontal clipping of the page or visible interactive controls |
| 1280×720 / simulated 125%                    |     1024×576 |                1.25 | No horizontal clipping of the page or visible interactive controls |
| 1280×720 / simulated 150%                    |      853×480 |                 1.5 | No horizontal clipping of the page or visible interactive controls |

All corresponding screenshots are full-page captures. Chinese/English and light/dark evidence at 1920×1080 is also retained. The automation proves DOM horizontal bounds and screenshot generation; it does not by itself prove the absence of every visual overlap and cannot replace real-device manual acceptance.

### 3.3 Horizontal window resizing

- The main window remains `resizable: true`; its minimum width is reduced from 1120 px to 720 px.
- Automation confirms a two-column layout at 1280 px and a one-column layout at both 960 px and 720 px.
- All three widths have no page-level horizontal overflow; `desktop-720x720-single-column-light-zh.png` is the full-page 720 px evidence.
- The user manually confirmed correct font rendering after system-scaling changes; horizontal edge dragging still needs a manual recheck with the new installer.

## 4. Quality-gate results

| Command                       | Result                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `npm run format:check`        | Passed                                                                                 |
| `npm run lint`                | Passed with 0 errors and 0 warnings                                                    |
| `npm run typecheck`           | Passed                                                                                 |
| `npm test`                    | 12 files, 65/65 passed                                                                 |
| `npm run build`               | Passed                                                                                 |
| `npm run desktop:build`       | Passed; produced an NSIS x64 installer containing the minimum-width fix                |
| `npm run test:e2e`            | 33/33 passed across Chromium, Firefox, and WebKit                                      |
| `npm run test:visual`         | 3/3 passed                                                                             |
| `npm run test:desktop-visual` | 5/5 passed in Chromium, including the two-column-to-one-column width-resize regression |
| `npm run handover:ui02`       | 2/2 passed in Chromium; before/after evidence and the hash manifest are reproducible   |

Recheck installer: `src-tauri/target/release/bundle/nsis/XDRate Music_0.2.0_x64-setup.exe`  
SHA-256: `1A76121022F6A0B9489459316FC8A1B58AF6F53F5A748EF86CD674D02B7FE8C5`

## 5. Task status and open items

| Task          | Status   | Evidence                                                                                                                                |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `V02-UI-01`   | Complete | Current UI, bilingual themes, and responsive automation pass                                                                            |
| `V02-UI-02`   | Complete | Fixed fixture, key page, controls, four ratio families, both themes, file list, and test evidence are complete                          |
| `V02-I18N-01` | Complete | New UI copy is mirrored in Chinese and English; types and tests pass                                                                    |
| `V02-QA-03`   | Open     | Manual scaling found no font issue; the width-layout defect is fixed, while edge-drag recheck and basic multi-display acceptance remain |

No new P0/P1 product-code blocker was found. The remaining M3 visual acceptance gap is real-Windows `V02-QA-03`. The visual handover contains no unresolved P0/P1/P2 issue, but this does not mean that system-scaling coverage is complete.

## 6. Next steps

1. Recheck in a new build that dragging either horizontal window edge switches from the two-column layout to one column and back.
2. Complete basic real-Windows multi-display acceptance; the user has manually confirmed that fonts remain correct after system scaling changes.
3. Check off `V02-QA-03` after that evidence closes.
4. `V02-UX-01` has completed unsaved-change protection; continue M3 with window title, shortcuts, recent files, and recovery.
