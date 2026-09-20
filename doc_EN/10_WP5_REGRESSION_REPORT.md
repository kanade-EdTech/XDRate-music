# WP-5 Test and Regression Report

Date: 2026-08-22  
Scope: 100-point scoring, Schema v2 migration, 11 card ratios, font stability, and PNG export.

## Automated results

| Layer            | Result        | Coverage                                                                                                                                        |
| ---------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)    | 29/29 passing | Linear scoring, weights, rounding, bounds, archive/template migration, local storage, ratio configuration, overflow detection, cover validation |
| E2E (Playwright) | 21/21 passing | Seven checks each in Chromium, Firefox, and WebKit                                                                                              |
| Static quality   | Passing       | Prettier, ESLint, TypeScript, production build                                                                                                  |

The E2E suite covers:

- axe accessibility scanning and no third-party requests;
- 100-point presentation and the v3 algorithm ID;
- v2 auto-save followed by reload recovery;
- logical-canvas ratio and DOM-overflow checks for 11 ratios × two themes;
- ratio-specific truncation notices for long mixed Chinese/English body and story text;
- a valid 4:5 PNG signature and its 2× `1920 × 2400` output dimensions.

## Finding fixed

The card footer used `pt-3` while some layouts reserved a fixed footer track. `detectCardOverflow()` therefore falsely reported a footer overflow and disabled export for normal content. The footer is now a vertically centered fixed `h-8` region; the three-browser matrix passes.

## Coverage measurement

`@vitest/coverage-v8` is not installed, so no comparable line or branch coverage percentage was produced. Passing counts do not replace a coverage gate; install a coverage provider and publish CI coverage if a percentage threshold is required.

## Manual acceptance verdict

- Landscape, near-landscape, square, and portrait screenshot baselines were established and reviewed.
- Mouse, keyboard, screen-reader, and high-DPI smoke tests were completed in the Windows 10/11 x64 target desktop scope.
- Real-cover, all-11-ratio, and maximum-legal-text PNGs were manually inspected.

On 2026-08-31, the user reported no issues in manual testing; WP-5 and M0 desktop acceptance pass. Standalone-mobile App acceptance on real iOS and Android, browser/PWA comparison where applicable, and touch moves to v0.4.0 and does not block current desktop acceptance; v0.3.0 Xiaohongshu MiniTool uses its own container and real-device matrix.
