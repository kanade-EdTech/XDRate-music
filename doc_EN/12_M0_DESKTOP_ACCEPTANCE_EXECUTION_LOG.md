# M0 Desktop Acceptance Execution Log

Date: 2026-08-31  
Status: Complete  
Scope: V0.1 desktop acceptance closure, providing a baseline for V0.2 desktop start

## 1. Automated evidence

| Check              | Result | Evidence                                                                                                                                                |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting         | Passed | `npm run format:check`                                                                                                                                  |
| Linter             | Passed | `npm run lint`                                                                                                                                          |
| Type check         | Passed | `npm run typecheck`                                                                                                                                     |
| Unit tests         | Passed | `npm run test`: 8 test files, 42/42 tests                                                                                                               |
| Production build   | Passed | `npm run build`: 132 modules, generates `dist/`                                                                                                         |
| End-to-end         | Passed | `npm run test:e2e`: Chromium, Firefox, WebKit full matrix 33/33 tests passed                                                                            |
| Visual regression  | Passed | `npm run test:visual`: one Chromium worker compares 3/3 scenarios and 13/13 immutable visual baselines; 12 card artifacts come from real 2× PNG exports |
| Dependencies audit | Passed | `npm audit --audit-level=high`: 0 vulnerabilities                                                                                                       |

Playwright cannot spawn browsers in restricted sandboxes (`spawn EPERM`); once local browsers accessing only `127.0.0.1` are permitted, the full three-browser matrix passes. This is an execution environment limit, not a product defect.

## 2. Current acceptance state

| M0 completion condition                                              | Status                 | Notes                                                                                                                                                 |
| -------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automated quality gates                                              | Passed                 | See the table above                                                                                                                                   |
| 1:1 square sample visual revision (V02-VIS-00)                       | Fixed and verified     | Score line wrapping, axis label clipping, and multi-state spatial balance (with narrative / without narrative / reasons) completed and auto-verified  |
| Card reasons and content adaptation (V02-LAYOUT-00..02)              | Fixed and verified     | Full-ratio content-adaptive layout, chart scaling, and 11-ratio × 2-theme DOM overflow gates all passed                                               |
| Star and banana peel interactive controls                            | Fixed and verified     | Portrait 32×40px stars fit without desktop scrolling, are unrated-by-default, one-star minimum, no Reset; 44×44px banana peels retain Reset           |
| Unified merged breakdown contract & sparse reasons                   | Fixed and verified     | Strictly adheres to "all enabled axes retained, reasons appear on demand"; reasons rendered under corresponding axes without dropping non-reason axes |
| Complete i18n localization                                           | Fixed and verified     | Unrated/one-star accessibility text, banana Reset, and numeric labels localized in zh-CN and en with dynamic switching verification                   |
| Landscape, near-landscape, square, and portrait screenshot baselines | Completed and archived | High-definition visual baselines for 4 layout families, light/dark themes, and multi-density content generated in `doc_CN/artifacts/baselines/`       |
| Mouse, keyboard, screen-reader, and high-DPI smoke                   | Passed                 | The user completed testing in the Windows 10/11 x64 target desktop scope and reported no issues                                                       |
| Real-cover and 11-ratio PNG inspection                               | Passed                 | Initial 11-ratio review plus fixed 1:1, 4:5, and 9:16 re-exports passed; footer labels are separated with no overlap, clipping, or silent omission    |
| Maximum-legal-text PNG inspection                                    | Passed                 | User manual inspection found no overlap, clipping, or export failure                                                                                  |
| Release-identity ADR                                                 | Confirmed              | `com.xdrate.music`, `XDRate.Music`, `@xdrate/music`, and installer name `XDRate Music` are frozen; icon delivery belongs to PKG-01                    |
| Initial platform matrix                                              | Confirmed              | Initial release supports Windows 10/11 x64 only; other architectures and platforms are outside the initial supported set                              |
| Signing and update policy                                            | Confirmed              | Public packages require OV/Authenticode plus RFC 3161 timestamp; `0.2.0` updates manually through GitHub Releases and contains no updater permission  |

Standalone-mobile acceptance on real iOS Safari, Android Chrome, and touch moves to V0.4. It does not block the current desktop release or V0.2. V0.3.0 Xiaohongshu MiniTool has separate container and real-device gates.

## 3. Verified regression scope

- 100-point aggregate score and `music-linear-100-v4` label;
- Archive Schema v2 auto-save and reload recovery;
- Zero third-party network requests and automated axe accessibility scan (WCAG 2.2 AA compliant);
- 11 ratios × dark/light themes logical canvas DOM overflow checks;
- 10 compact stars (unrated or integer 1–10, 32×40px, no desktop scrolling, no numeric field/Reset) and 5 banana peels (-5–0, 44×44px, 0.1 input and Reset retained), including keyboard and screen-reader states;
- Unified breakdown card contract ("all enabled axes retained, reasons appear on demand"), retaining all active axes with scores and displaying reasons beneath filled axes;
- When `showReasons` is active, merged reason entries display cleanly while radar chart legends remain intact; region disappears when disabled; unified across all 4 layout families;
- Content profile, density plan, and up-to-two deterministic downscales across 55 ratio/content test fixtures and sparse reasons unit test;
- 1:1 square default legend scores render on a single line (`x.x`) without line-wrapping or label clipping;
- Content-adaptive composition: empty narratives switch to poster or compact symmetric layouts, eliminating blank dead zones;
- Over-capacity Chinese/English text truncation warnings;
- 4:5 2× PNG export signature and `1920 × 2400` dimensions;
- Zero window horizontal scroll on 360px viewport, star/banana controls scroll internally in a single row.

## 4. Next step

1. `V02-GATE-01` and M0 are complete; start M1.
2. Final Windows icon assets remain V02-PKG-01 work, and signing credentials remain M4 work under the approved ADR; neither changes the M0 verdict.

## 5. Verdict

M0 automated quality gates, the V02-LAYOUT-00..02 layout engine, V02-VIS-00 visual revisions, compact star/banana controls, unified breakdown contract, four-family baselines, and real PNGs all pass. The 2026-08-31 footer P2 defect was closed by the correction and representative re-exports; the user then reported no issues in the Windows target-scope manual tests. `V02-GATE-01` passes, M0 is formally closed, and M1 may start. Final icons and signing-service configuration remain later V02-PKG-01/M4 work and do not change this verdict.

## 6. 1:1 sample review and revision log (2026-08-23)

Evidence: User-provided `1080 × 1080` light theme square export sample. Sample text is test data only and does not constitute product directives.

Initial verdict: Rejected (blocking square visual acceptance).  
**Revision verdict: Fixed and verified through automated regression tests and visual refactoring.**

Lead engineer: Antigravity / Gemini 3.7 Flash. Acceptance & integration: Codex.

| Finding                       | Severity | Solution & Status                                                                                        | Status   |
| ----------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | -------- |
| Radar legend score line wraps | P1       | Added `shrink-0 tabular-nums whitespace-nowrap` to legend and numbers to strictly prevent line breaks    | ✅ Fixed |
| Radar axis label clipping     | P2       | `RadarChart` supports adaptive `legendColumns`; single-column legend (160–220px) avoids label truncation | ✅ Fixed |
| Square canvas spatial balance | P2       | Refactored `SquareLayout.tsx` with content-adaptive modes, eliminating lower-canvas dead zones           | ✅ Fixed |

Automated assertions added to `e2e/release.spec.ts` to ensure 1:1 legends never wrap, labels remain complete, and DOM overflow is 0.

## 7. Automated verification evidence (2026-08-23)

- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: All passed; unit tests: 8 files, 42/42;
- Playwright E2E: Chromium (11/11), Firefox (11/11), WebKit (11/11) = 33/33 passed;
- Validated `1920 × 2400` (4:5 2×) and `2000 × 2000` (1:1 2×) PNG export;
- 11 ratios in full narrative, reasons-only, and empty narrative (poster) passed DOM overflow assertions.

## 8. Missing description and adaptive review (2026-08-23)

Evidence: User-provided `2000 × 2000` light 1:1 export sample. Sample text is test data only.

| Finding                                       | Severity | Conclusion                                                                                               | Owner                        |
| --------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------- |
| “Show reasons” enabled but reasons missing    | P1       | Fixed: `CardAxisReasons` renders non-empty reasons for active axes; container removed when disabled      | ✅ Codex / V02-LAYOUT-01     |
| Ratio configs only read fixed line capacities | P2       | Implemented content profiling, density plans, and up to two downscales; 55 unit fixtures pass            | ✅ Codex / V02-LAYOUT-00, 02 |
| Large blank area in lower 1:1 square canvas   | P2       | Fixed via content-adaptive layout refactoring (full / reasons-only / centered poster), maximizing canvas | ✅ Antigravity / V02-VIS-00  |

## 9. 44×44px touch targets, unified breakdown contract & test verification (2026-08-23)

This section preserves the historical 44×44px and positive-Reset acceptance record. D-021 and Section 11 supersede the star rules; banana-peel rules remain unchanged.

| Finding / Requirement                       | Severity | Solution & Status                                                                                                                                                                                | Status       |
| ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Touch target below 44×44px                  | MED      | Refactored `StarRating.tsx`, `BananaRating.tsx`, and reset buttons to `min-w-[44px] min-h-[44px]` (44×44 CSS px), strictly verified in E2E via `boundingBox().width/height >= 44`                | ✅ Compliant |
| Merged breakdown contract vs spec collision | MED      | Unified code, test, and documentation on "all enabled axes retained, reasons appear on demand"; `CardAxisReasons` displays all enabled axes with scores and places reason text under filled axes | ✅ Unified   |
| Unified 4-layout single card contract       | MED      | Square, portrait, landscape, and standard layouts share unified `CardAxisReasons` rendering contract, eliminating duplicate breakdown cards                                                      | ✅ Unified   |
| Interactive & accessibility test coverage   | MED      | `e2e/release.spec.ts` verifies 44×44px bounding boxes, sparse reason axis preservation, click/keyboard rating, axe a11y scans, reset to 0, and language switching across 33/33 browser matrix    | ✅ Passed    |
| 360px window horizontal overflow            | MED      | Added responsive boundaries; star/banana controls scroll internally in a single row with 44×44px targets; E2E asserts `scrollWidth <= clientWidth`                                               | ✅ Fixed     |

## 10. M0-VIS: Final visual optimization & screenshot baselines (2026-08-28)

This visual optimization round refined typography metrics, vertical centering in square layout, and contrast across all four layout families, archiving 13 deterministic visual baselines. Twelve card baselines come from the application's real 2× PNG export path, and one covers the complete rating-editor UI:

| Baseline File Name                         | Family / Ratio    | Theme | Content State                     | Verification Highlights                                             |
| ------------------------------------------ | ----------------- | ----- | --------------------------------- | ------------------------------------------------------------------- |
| `baseline-square-1-1-light.png`            | Square (1:1)      | Light | Full content (reasons, narrative) | Left chart fills column height, right reasons & text cleanly tiered |
| `baseline-square-1-1-dark.png`             | Square (1:1)      | Dark  | Full content                      | Frosted glass texture, background gradient, high contrast text      |
| `baseline-square-sparse-reasons-light.png` | Square (1:1)      | Light | Sparse reasons (no narrative)     | Switches to compact symmetric dual-column, zero dead space          |
| `baseline-square-minimal-poster-light.png` | Square (1:1)      | Light | Minimal poster (no reasons/text)  | Centered hero radar chart with 2-column legend, balanced canvas     |
| `baseline-portrait-4-5-light.png`          | Portrait (4:5)    | Light | Full content                      | Header + side-by-side score/radar + 1fr reasons & narrative filling |
| `baseline-portrait-4-5-dark.png`           | Portrait (4:5)    | Dark  | Full content                      | Dark theme portrait balance and high legibility                     |
| `baseline-portrait-9-16-light.png`         | Portrait (9:16)   | Light | Full content                      | Narrow ratio adaptive padding and font scaling, 0 DOM overflow      |
| `baseline-portrait-9-16-dark.png`          | Portrait (9:16)   | Dark  | Full content                      | Dark theme narrow portrait stability                                |
| `baseline-landscape-16-9-light.png`        | Landscape (16:9)  | Light | Full content                      | Left metadata/score/text, right chart/reasons compact composition   |
| `baseline-landscape-16-9-dark.png`         | Landscape (16:9)  | Dark  | Full content                      | Dark theme landscape contrast                                       |
| `baseline-standard-4-3-light.png`          | Standard (4:3)    | Light | Full content                      | Left metadata group and right chart/narrative visual symmetry       |
| `baseline-standard-4-3-dark.png`           | Standard (4:3)    | Dark  | Full content                      | Dark theme standard ratio balance                                   |
| `baseline-rating-editor-full.png`          | Web Rating Editor | Full  | Pro mode + negatives + preview    | Compact stars, banana controls, calculation panel, sticky preview   |

Visual comparison spec: `e2e/baselines.spec.ts`; dedicated config: `playwright.visual.config.ts`; image directory: `doc_CN/artifacts/baselines/`. `npm run test:visual` compares without modifying baselines. Only `npm run baseline:update` explicitly updates them after human approval. Default `npm run test:e2e` excludes the visual updater and remains the 33-test, three-browser functional matrix. CI runs the read-only visual comparison in a single-Chromium `windows-latest` job to match the Windows 10/11 x64 launch target.

## 11. Compact stars, unrated semantics, and algorithm v4 (2026-08-28)

- D-021 first reduced star targets from 44×44px to 36×36px. D-022 further changes them to portrait 32×40px targets and changes the axis-name/rating columns to 40%/60%; banana peels remain 44×44px.
- Chromium automation confirms that all ten stars are visible at the 1280px desktop acceptance viewport with `scrollWidth <= clientWidth`; the 360px narrow-screen case retains internal scrolling as a responsive fallback.
- New axes and template-applied axes use `0` as an unrated sentinel. The UI shows empty stars and “Not rated; excluded,” exposes no positive Reset, and enforces a 1.0 minimum after first input.
- `music-linear-100-v4` excludes unrated axes from the aggregate numerator, weight denominator, card breakdown, and radar/bar chart.
- Archive Schema remains v2. Section 12 supersedes pre-D-023 v3/v4 fractional positive-score migration; zero still maps to unrated.

## 12. Whole-star input and aggregate precision (2026-08-28)

- D-023 removes the positive numeric field. Star clicks, arrow keys, and PageUp/PageDown produce only integers from 1–10; zero remains the unrated sentinel.
- Archive validation now accepts positive scores as `0 | integer(1..10)`. Legacy fractions round to the nearest whole star on import: 7.4 → 7 and 7.5 → 8.
- The aggregate formula, weights, and final one-decimal precision remain unchanged; integer stars combined with LV weights can still produce non-integer aggregates such as 77.5.

## 13. Editable album-field label (2026-08-28)

- D-024 adds `WorkMetadata.albumLabel`; empty uses localized “Album / 专辑,” while custom values are limited to 24 characters.
- The editor exposes the label directly; overrides restore through autosave and full JSON archives and render as “label: content” on cards.
- Resting state uses a transparent background and low-contrast border; focused state matches standard text inputs. E2E verifies both through computed styles.
- Older Schema v2 archives missing this property receive `albumLabel: ''`; neither Schema nor algorithm version changes.
- All 13 visual baselines were regenerated with explicit rating fixtures so they no longer depend on the old default-five behavior.

## 14. Editable artist label and extensible work metadata (2026-08-29)

- D-025 gives artist and album a shared three-state label contract: `null` selects the localized default only in the editor while cards show the value alone, a non-empty string is a custom label that renders as “label: value,” and an empty string explicitly omits the label while showing a light default placeholder; re-entering the default normalizes to `null`.
- Both preset labels use a transparent subdued resting state when non-empty and standard-input styling on focus; explicitly cleared labels remain standard inputs. Added custom-entry name inputs always use standard styling.
- Work metadata supports up to 6 removable name/value entries. Non-empty values render on cards, and all entries survive autosave and full-JSON round trips.
- Older Schema v2 archives map an empty `albumLabel` to `null` and receive `artistLabel: null` plus `extraFields: []`; Schema v2 and algorithm v4 remain unchanged.

## 15. Full-ratio real-PNG review and footer correction (2026-08-31)

Evidence consists of eleven user-provided, light-theme PNG exports. Work titles, names, reasons, and narrative text inside the images are test data only and are not development instructions. The source images were not copied into the repository.

| File                              | Ratio | Pixel size | Initial result                     |
| --------------------------------- | ----- | ---------- | ---------------------------------- |
| `海棠仙-XDRate-20260831 (5).png`  | 16:9  | 2400×1350  | Body passed                        |
| `海棠仙-XDRate-20260831 (6).png`  | 8:5   | 2400×1500  | Body passed                        |
| `海棠仙-XDRate-20260831 (7).png`  | 3:2   | 2400×1600  | Body passed                        |
| `海棠仙-XDRate-20260831 (8).png`  | 4:3   | 2400×1800  | Body passed                        |
| `海棠仙-XDRate-20260831 (9).png`  | 5:4   | 2400×1920  | Body passed                        |
| `海棠仙-XDRate-20260831 (10).png` | 1:1   | 2000×2000  | Body passed; footer-spacing defect |
| `海棠仙-XDRate-20260831 (1).png`  | 4:5   | 1920×2400  | Body passed; footer-spacing defect |
| `海棠仙-XDRate-20260831.png`      | 3:4   | 1800×2400  | Body passed; footer-spacing defect |
| `海棠仙-XDRate-20260831 (2).png`  | 2:3   | 1600×2400  | Body passed; footer-spacing defect |
| `海棠仙-XDRate-20260831 (3).png`  | 5:8   | 1500×2400  | Body passed; footer-spacing defect |
| `海棠仙-XDRate-20260831 (4).png`  | 9:16  | 1350×2400  | Body passed; footer-spacing defect |

Manual inspection confirms that all 11 pixel dimensions match their target ratios. Titles, cover, aggregate, radar, legend, all three reasons, and narrative have no visible overlap, clipping, or silent omission. Uncustomized Artist/Album labels do not appear in the images. In square and portrait layouts, `CardFooter` was a centered flex child without full parent width, causing the disclaimer and version labels to appear joined; this is classified P2.

Correction: `CardFooter` now uses `w-full`, `whitespace-nowrap` on both labels, and `gap-4`. `e2e/release.spec.ts` now checks horizontal and vertical overflow, full parent-width footer coverage, and at least 8px label separation across 11 ratios × 2 themes. Targeted Chromium, Firefox, and WebKit verification passed 3/3; the lower-concurrency full matrix passed 33/33, and read-only visual comparison passed 3/3.

Recheck supplement: the user provided fixed 1:1 (2000×2000), 4:5 (1920×2400), and 9:16 (1350×2400) real PNGs. In all three, the disclaimer remains at the left and the version remains at the right with clear separation; title, cover, aggregate, radar, legend, reasons, and narrative remain free of overlap, clipping, or silent omission.

Conclusion: the real-cover and 11-ratio PNG item passes, and the footer P2 defect is closed.

## 16. Windows manual acceptance verdict (2026-08-31)

- Accepted by: user / product owner.
- Environment: Windows 10/11 x64 initial-release desktop scope; exact OS build, browser, and screen-reader versions were not separately supplied.
- Scope: mouse, keyboard, screen reader, high DPI, maximum-legal-text Chinese/English real PNGs, and representative post-fix footer ratios.
- Result: the user explicitly reported “no issues found in manual testing”; no new defects were opened.
- Linked defect: the Section 15 footer P2 is fixed and passed 1:1, 4:5, and 9:16 rechecks; no defect links remain open.
- Verdict: pass. `V02-GATE-01` is complete, M0 is formally closed, and M1 starts next.
