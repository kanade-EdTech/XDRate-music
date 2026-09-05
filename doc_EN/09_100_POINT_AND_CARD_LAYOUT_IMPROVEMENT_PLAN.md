# 100-Point Score and Card Layout Improvement Plan

> Historical implementation note: this plan records the completed `music-linear-100-v3` phase. D-021, D-023 / `music-linear-100-v4` now supersede positive-score semantics: unrated axes do not count, rated axes have a one-star minimum, and only whole-star integer input is allowed.

Status: Automated implementation, functional regression, and visual baselines complete; real-device manual acceptance pending  
Target version: v0.1.1  
Priority: P0

## 1. Objectives

This iteration addresses four confirmed issues:

1. Show the aggregate exclusively on a 0–100 scale with one decimal; remove the 10-point aggregate.
2. Implement and document an explicit, explainable, testable linear formula.
3. Fix font overlap, SVG-label collisions, and text overflow shared by preview and PNG export.
4. Expand cards from 3 to 11 ratios: 16:9, 8:5, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 5:8, and 9:16.

## 2. Impacted areas

| Area                     | Primary change                                                           |
| ------------------------ | ------------------------------------------------------------------------ |
| `domain/rating`          | Return a 100-point result, update algorithm version and tests            |
| `features/rating-editor` | Remove 10-point copy; convert contribution details to 100 points         |
| `features/card-export`   | Add ratios/layout families; redesign labels and overflow checks          |
| `domain/archive`         | Update CardRatio schema and algorithm version; migrate old archives      |
| `i18n`                   | Update score, ratio, overflow, and remediation messages                  |
| `e2e`                    | Add 11-ratio screenshots, overflow gates, and preview/export consistency |

## 3. Work packages

### WP-1: 100-point domain algorithm

Status: Completed (2026-08-22)

- Make `score100` the only public aggregate in `RatingResult`; remove UI use of `score10`.
- Implement `music-linear-100-v3` from the [functional specification](./02_FUNCTIONAL_SPECIFICATION.md#52-formula); LV0–LV6 weights are 0, 0.25, 0.75, 1, 1.5, 2.5, and 5, with LV3 as the default.
- Keep axis inputs at 0–10.
- Express each contribution in 100-point units: `10 × sᵢ × wᵢ / Σ(wᵢ)`.
- Round only the final value to one decimal.
- Update property, fixture, and boundary tests.

Done when no UI, assistive text, or exported card contains a 10-point aggregate and the revised-weight example returns 67.0/100.

### WP-2: Archive compatibility

Status: Completed (2026-08-22)

- Set the algorithm ID to `music-linear-100-v3`.
- Use explicit ratio strings for CardRatio.
- Migrate `wide → 16:9`, `square → 1:1`, and `portrait → 4:5`.
- Because old archives do not persist the aggregate, retain inputs and recalculate without losing content.
- Add deterministic v1 migration fixtures; continue rejecting unknown higher versions.

Done when all three old ratios migrate and metadata, axes, reasons, cover, and body content remain unchanged.

### WP-3: Card layout system

Status: Implemented and covered by automated regression (2026-08-22)

- Replace three-way conditions with ratio configuration: ID, dimensions, family, logical canvas, type tokens, content limits.
- Define four families: landscape, near-landscape, square, and portrait.
- Give every ratio a fixed logical canvas; scale the page preview proportionally so sidebar width cannot change internal typography.
- Separate the export node from the page container while sharing one Card ViewModel.
- Allow less body text in landscape and progressively more in taller portrait formats.

Done when every ratio switches, previews, and exports with output dimensions within one pixel of the selected ratio.

### WP-4: Font-overlap remediation

Status: Implemented and covered by automated regression (2026-08-22)

- Define the card font stack, font size, line height, letter spacing, and region bounds explicitly.
- Show “Preparing preview” and disable export until fonts, cover, and layout are stable.
- Move radar-axis names to an external legend; keep the SVG focused on geometry and short values.
- Allocate title, metadata, score, body, story, and footer to independent grid regions with no overlapping absolute positioning.
- Add `detectCardOverflow()` that returns the affected region and cause.
- Apply ratio-specific excerpts and report truncation; block export if overflow remains.

Done when long titles, eight radar axes, mixed Chinese/English, and maximum-body fixtures do not overlap in any ratio; content that cannot fit is explicitly blocked.

### WP-5: Test and regression

Status: Automated regression and deterministic visual baselines completed (2026-08-28); real-device manual acceptance pending

- Unit: linear score, rounding, boundaries, negatives, complete ratio configuration.
- Component: ratio selection, overflow message, export gate, optional-field toggles.
- Playwright: DOM overflow assertions for 11 ratios × 2 themes; deterministic visual snapshot comparisons using real 2× PNG exports for representative ratios.
- Export: inspect PNG dimensions for ratio and 2× density.
- Regression: auto-save, templates, JSON round trip, both languages, axe, and no third-party requests.

Done when CI passes without skipped new/existing tests and manual review covers at least one long Chinese and English fixture.

## 4. Sequence

```text
WP-1 100-point algorithm
  → WP-2 archive migration
  → WP-3 ratios and layout families
  → WP-4 overflow/font remediation
  → WP-5 cross-ratio regression and acceptance
```

WP-3 and WP-4 belong in the same branch because ratio layout and text capacity are coupled. Do not merely add enum values while retaining the current fixed layout.

## 5. Risks and controls

| Risk                                      | Control                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| ×10 negative deductions feel too strong   | Show every deduction in 100-point units and retain a product decision for later evaluation |
| Eleven ratios create branching complexity | Use a configuration table and four layout families instead of duplicated components        |
| System-font metrics vary by platform      | Conservative line height, stable stacks, runtime overflow checks, three-browser tests      |
| HTML preview fits but PNG differs         | Await fonts/images and run the same check against the actual export node                   |
| Old template ratios become invalid        | Deterministic mappings and migration tests; no random silent fallback                      |

## 6. Acceptance evidence

The implementation PR or release notes must include:

- Old/new worked-score comparison;
- Dimension and layout-family list for all 11 ratios;
- Representative landscape, square, and portrait screenshots;
- Overflow results and documented text limits;
- Archive migration fixture results;
- Full quality-command and cross-browser results.
