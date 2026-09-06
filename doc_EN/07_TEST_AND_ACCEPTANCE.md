# Test and Acceptance Specification

## 1. Test layers

| Layer         | Tool                                | Focus                                                  |
| ------------- | ----------------------------------- | ------------------------------------------------------ |
| Unit          | Vitest                              | Scoring, validation, migration, filenames, view models |
| Component     | Testing Library                     | Form coupling, mode switch, errors, keyboard behavior  |
| End-to-end    | Playwright                          | Core flow, recovery, import, PNG export                |
| Visual        | Playwright screenshots + manual     | Ratios, themes, long text, Chinese/English             |
| Accessibility | axe + manual keyboard/screen reader | Core WCAG 2.2 AA issues                                |

Automation does not replace real-browser download inspection, keyboard checks, and at least one screen-reader smoke test.

## 2. Algorithm cases

- Equal axis values produce the same positive aggregate.
- LV0 contributes to neither numerator nor denominator but may display.
- Disabled axes are neither calculated nor displayed.
- Unrated axes enter neither numerator nor weight denominator and do not appear in card charts; a high-weight unrated axis must not dilute a rated axis.
- Importance values map to the specified weights.
- Negative items sum linearly at -10 aggregate points per -1 input and clamp the result to 0–100.
- All LV0 axes produce an uncalculable state, never `NaN`.
- Computation uses raw precision and rounds only for display.
- `score100` is rounded to one decimal from the unrounded 100-point intermediate value.

Recommended property tests: output is finite and within 0–100; adding a negative deduction never increases the score; increasing one axis by a fixed amount changes the aggregate linearly with its normalized weight.

## 2.1 Icon-control cases

- Unrated and integer values 1, 5, and 10 produce correct empty, whole-star, and full-star states. The positive region has neither numeric input nor partial fill and correctly announces “Not rated; excluded.”
- Values 0, -0.1, -2.5, -4.9, and -5.0 produce the correct banana-peel fill; more fill can only make the stored value more negative.
- Clicking the Nth star selects integer N, arrow keys move by one whole star, Home selects 1, and neither positive numeric input nor positive Reset exists. Banana numeric input retains 0.1 precision and Reset still yields zero.
- Icons, exact text, calculated result, and preview stay synchronized after input, reload, import, and template initialization.
- The group has one Tab stop and a screen reader announces name, value, range, and deduction direction without reading ten “star buttons” or five “banana-peel buttons.”
- Icons neither overlap nor clip in both themes, a 360 px viewport, 200% zoom, and touch interaction. Star targets are exactly 32×40 CSS px (1.25 height/width ratio), and banana peels remain at least 44×44 CSS px. At desktop acceptance viewports of 1280 px and above, assert the ten-star strip has `scrollWidth <= clientWidth`.

## 2.2 Card-composition algorithm cases

- The same draft, display options, ratio, and theme produce identical `CardContentProfile` and `CardLayoutPlan` values.
- CJK, full-width, Latin, numeric, and mixed text follow the specified text-unit calculation and produce deterministic estimated line counts at a fixed effective line width.
- All 11 ratios cover empty, sparse, normal, dense, and extreme fixtures; unit tests cover density boundaries `0.65` and `0.95`.
- With `showReasons=true`, every non-empty reason belonging to a rated, enabled axis enters the view model and appears in the same entry as its name and exact score; unrated axes do not enter the card. With `showReasons=false` or all reasons empty, the same entry retains name and score without an empty reason line. The radar legend remains in both states.
- Sparse content is not compressed into the upper half of the canvas; dense content follows a fixed sequence of at most two fallback steps without oscillation.
- DOM measurement only confirms physical overflow and triggers deterministic fallback; it cannot alter scoring, archives, or user text.
- Preview and export consume one layout plan; unresolved overflow identifies the exact region and blocks export.

## 3. Critical acceptance scenarios

### AC-01 First rating

**Given:** no local data.  
**When:** enter a title and score the three simple axes.  
**Then:** the correct 100-point aggregate with one decimal and the chart update immediately; no 10-point aggregate is displayed and no network request occurs.

### AC-02 Custom professional rating

**When:** switch mode, rename/disable axes, change importance, and enter reasons.  
**Then:** only rated, enabled, non-LV0 axes calculate; preview reflects all applicable names, scores, and text.

### AC-03 Negative deduction

**When:** add a -1.5 negative item.  
**Then:** the 100-point aggregate falls by 15.0, radar excludes it, and the breakdown shows the deduction.

### AC-03A Star and banana-peel input

**When:** select the eighth star, reduce by one whole star from the keyboard, and restore it; select the third banana peel and reduce the deduction by 0.5 from the keyboard.  
**Then:** the positive value is eight whole stars with no separate numeric input; the deduction is -2.5 with two full peels and one half-filled peel; the one-decimal aggregate, autosave, and preview update together.

### AC-04 Auto-recovery

**When:** edit, wait for save, and refresh.  
**Then:** metadata, scores, text, style, and cover recover with a latest-save indicator.

- Artist and album labels initially show localized defaults with transparent backgrounds and subdued borders; focus switches them to standard-input styling, and clearing shows a light default-label placeholder. Untouched defaults, cleared labels, and the same default re-entered after clearing all stay out of the card, which shows only the value; only another non-empty customized label renders as “label: value.”
- After adding a custom work-metadata entry, its name input always uses standard-input styling; its name, value, removal, card rendering, reload recovery, and JSON round trip remain consistent.
- Importing an older v2 archive without extended metadata fields adds `artistLabel: null`, `albumLabel: null`, and `extraFields: []` without rejection or loss.

### AC-05 Safe import

**When:** import valid v1, malformed JSON, unknown newer version, and oversized files.  
**Then:** valid data imports after preview; others show clear errors and preserve the draft.

### AC-06 Template isolation

**When:** save a template from a populated rating and apply it to a new one.  
**Then:** only axes, importance, and style transfer; metadata, cover, scores, and body text do not.

### AC-07 PNG export

**When:** export all 11 ratios, light/dark themes, and 1×/2× density using Chinese, English, long-title, maximum-axis, and long-body fixtures.  
**Then:** filenames are safe, images open, and content matches preview; fonts, titles, chart labels, body, and footer have no overlap, overflow, controls, or silent cropping.

### AC-07A Overflow protection

**When:** enter a long title, axis names, body, and story in the shortest 16:9 card.  
**Then:** identify each overflowing region and block export until optional fields are hidden, content is shortened, or a taller ratio is selected. Do not mask the issue solely by shrinking text.

### AC-07B Descriptions and content adaptation

**When:** in a 1:1 fixture, enter reasons for three enabled axes and export with reasons enabled and disabled; then verify the same data in representative landscape, standard, and portrait ratios while replacing text with empty, sparse, normal, dense, and extreme fixtures.  
**Then:** with “show axis scores and reasons” enabled, each merged axis entry shows name, exact score, and its non-empty reason or an explicit count of content not shown completely. When disabled, the entire merged axis region is removed; the radar legend retains axis names and exact scores. Layout adapts deterministically to content density, sparse content leaves no large meaningless lower void, dense content has no overlap or silent clipping, and preview matches PNG output.

### AC-08 Storage failure

**When:** storage is unavailable or full.  
**Then:** input remains in memory, the UI reports failure and offers JSON export, and never claims success.

### AC-09 Keyboard and screen reader

**When:** complete input, rating, preview, and export with keyboard only.  
**Then:** focus is visible and ordered, dialogs restore focus, and assistive technology receives changes/errors.

### AC-10 Unsaved changes protection

**When:** make the workspace dirty and invoke the guard from New, Open another archive, Close window, and Quit. For each entry point, choose Save and continue, Discard changes, and Cancel; also exercise save-dialog cancellation and save failure.  
**Then:** proceed only after save succeeds; Discard proceeds without writing; Cancel, save cancellation, and save failure retain the current window, data, and dirty state. The desktop dialog traps focus and supports `Escape` cancellation, while browser refresh/close triggers the native leave-page warning.

### AC-11 Window title and save state

**When:** exercise New, Open, Edit, successful Save, cancelled Save, and failed Save.  
**Then:** the title prefers the work name, falling back to the base file name or localized “Untitled rating”; unsaved state has `*`, removed only after successful save; no full local path appears.

### AC-12 Desktop commands and shortcuts

**When:** in Chinese and English, with the page and then a text input focused, exercise `Ctrl+N/O/S/Shift+S/Shift+E/Q`.  
**Then:** the commands perform New, Open, Save, Save As, PNG, and Quit; visible controls and localized hints remain; copy, paste, cut, undo, redo, select-all, and ordinary typing are untouched; cancelling a guarded command retains text and focus.

### AC-13 Recent files

**When:** open or save multiple archives, repeat one path with different casing/slashes, exceed ten records, and move one disk file.  
**Then:** newest entries appear first, normalized paths deduplicate, the list caps at ten, a stale item is removed only on request, Clear works, and privacy copy states that only local metadata is retained without auto-open or directory scanning.

### AC-14 Abnormal-session recovery

**When:** edit, allow autosave, simulate an abnormal exit, relaunch, and separately test Restore and Discard.  
**Then:** startup first previews work name, rated-axis count, and a text excerpt; the blank startup state cannot overwrite the candidate before a decision; Restore loads editor memory without disk writes, Discard prevents another prompt, and focus starts and remains inside the decision controls.

## 4. Compatibility matrix

Before the current desktop release, validate at least:

- Windows: current Chrome, Edge, Firefox;
- macOS: current Safari and Chrome;
- Representative 1280×720, 1440×900, and 1920×1080 desktop viewports;
- Mouse and keyboard input; 100%, 125%, and 150% system scaling plus 1×/high-DPI screens.

Automated responsive regression may continue at 360–430 px widths, but standalone-mobile acceptance on real iOS Safari, Android Chrome, and touch moves to v0.4. It does not block the current desktop release or V0.2. The v0.3.0 Xiaohongshu MiniTool instead has container-, Chrome 61-, real-device-, and offline-ZIP-specific gates; ordinary mobile-browser results cannot substitute for them.

## 5. Performance and capacity

- Stress fixture: 12 positive axes, 5 negative items, maximum text, and a 3 MB cover.
- Ten minutes of continuous edits must not cause visible lag or unbounded memory growth.
- Prevent duplicate export submissions and show progress after one second.
- Near archive limits, import/recovery/export must remain predictable; failure must not lose data.

## 6. Release gates

- All required CI checks pass;
- No known P0/P1 defects; P2 defects have documented workarounds;
- Critical E2E scenarios pass in target browsers;
- No critical/high dependency vulnerability without written risk acceptance and remediation plan;
- No serious/critical axe findings in core views;
- Privacy review finds no accidental requests, telemetry, or remote fonts;
- Chinese/English UI and archive round-trip tests pass;
- LICENSE, disclaimer, app version, schema, and algorithm version are consistent.
