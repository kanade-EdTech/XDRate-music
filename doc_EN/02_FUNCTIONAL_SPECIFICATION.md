# Functional Specification

## 1. Primary flow

`Create/recover draft → enter work metadata → select mode/template → rate and write → preview → download PNG / export JSON`

At startup, check for a local draft. If one exists, offer “Continue last edit” and “Create new rating.” Creating a new rating requires confirmation or an immediate backup export option.

## 2. Page structure and state

v0.1 should use one page with these sections:

1. Header: product name, language, import, export, help.
2. Work metadata: title, custom-label artist and album fields, up to 6 custom entries, year, cover, and tags.
3. Rating setup: mode, template, axes, importance.
4. Detailed review: reasons, negative items, overall comment, story.
5. Card setup: theme, dimensions, visible fields.
6. Live preview: chart, aggregate score, text, short disclaimer.
7. Actions: download image, save template, reset.

The app must distinguish `clean`, `dirty`, `saving`, `saved`, `save-error`, `exporting`, and `export-error` states.

## 3. Field constraints

| Field                | Type         | Constraint                                         | Default     |
| -------------------- | ------------ | -------------------------------------------------- | ----------- |
| Work title           | string       | Required, 1–120 characters                         | Empty       |
| Artist/album content | string       | 0–120 characters                                   | Empty       |
| Artist/album label   | string/null  | 0–24 characters; `null` uses the localized default | `null`      |
| Custom entries       | object[]     | Up to 6; name 0–24 and value 0–120 characters      | `[]`        |
| Release year         | integer/null | 1000–current year + 1                              | Empty       |
| Tags                 | string[]     | Up to 10, each 1–24 characters                     | `[]`        |
| Axis name            | string       | 1–24 characters; unique after normalization        | Mode preset |
| Positive score       | integer      | `0` means unrated; valid ratings are integers 1–10 | Unrated     |
| Importance           | integer      | LV0–LV6                                            | LV3         |
| Negative score       | number       | -5–0, step 0.1                                     | 0           |
| Axis reason          | string       | 0–500 characters                                   | Empty       |
| Overall comment      | string       | 0–2000 characters                                  | Empty       |
| Personal story       | string       | 0–3000 characters                                  | Empty       |
| Local cover          | image        | JPEG/PNG/WebP; max input 10 MB                     | Empty       |

Count limits by Unicode grapheme cluster. Trim leading and trailing whitespace at submission/export without changing interior whitespace.

For artist and album labels, `null` means untouched and displays the current locale's default in the editor while the share card shows only the value; a non-empty custom label renders as “label: value”; an empty string also renders only the value and shows the default as a light placeholder. Re-entering a default label from any supported locale must normalize to default semantics and must not write that label onto the card. A custom entry with an empty value is omitted from the share card but remains in the draft and full archive.

### 3.1 Icon rating controls

| Control        | Icon count             | Numeric mapping                              | Default |
| -------------- | ---------------------- | -------------------------------------------- | ------- |
| Positive score | Ten stars              | `s = 0` means unrated; rated range `[1, 10]` | Unrated |
| Deduction      | Five banana-peel icons | `n ∈ [-5, 0]`; filled amount equals `abs(n)` | 0       |

- Stars and banana peels are the primary visual score controls and replace range sliders. A bound exact numeric value must remain visible and editable.
- Clicking or tapping the Nth star selects integer N, and arrow keys move by one whole star. Positive stars have no separate numeric input and no partial-fill state. Banana-peel numeric input and arrow keys retain 0.1 steps and partial fill.
- The positive control starts empty. Its first selection yields an integer from 1–10 and cannot go below 1 afterward. Banana-peel fill runs from deduction magnitude 0 → 5 and maps to stored values 0 → -5.
- Positive stars have no reset-to-zero button. Stored `0` before interaction is the unrated state, not a zero-star rating. Banana peels retain Reset because zero means no deduction.
- An unrated positive control shows “Not rated; excluded”; after rating it shows `x.x / 10`. A negative control shows `deduct x.x (stored value -x.x)`. Icon count or color alone must not convey state, value, or direction.
- Stars use compact portrait 32×40 CSS px targets (height is 25% greater than width), still above the WCAG 2.2 AA 24×24 CSS px minimum; banana-peel targets remain 44×44 CSS px.
- On desktop, the axis-name and rating columns use a 40%/60% split, reducing the former equal-width name field by 20%. Acceptance viewports at 1280 px and above must show all ten stars without horizontal scrolling.
- Schema v2 remains, but the algorithm advances to `music-linear-100-v4`: unrated positive axes are excluded from both numerator and weight denominator and from card breakdowns/charts.

## 4. Mode switching

- Simple mode is the first-run default.
- If current axes still match defaults, switching may replace them immediately.
- If an axis, score, or reason has changed, ask whether to:
  - Keep current content and change only the mode label; or
  - Reset axis data to the target mode defaults.
- Never modify metadata, overall text, story, cover, or card style during a mode switch.

## 5. Rating algorithm

### 5.1 Importance weights

| Level  | LV0 |  LV1 |  LV2 | LV3 | LV4 | LV5 | LV6 |
| ------ | --: | ---: | ---: | --: | --: | --: | --: |
| Weight |   0 | 0.25 | 0.75 | 1.0 | 1.5 | 2.5 | 5.0 |

LV0 displays an axis but excludes it from the aggregate. A disabled axis is neither displayed nor calculated.

### 5.2 Formula

Let `R` contain enabled positive axes rated 1–10 with weight above zero. Their scores are `sᵢ`, weights are `wᵢ`, and enabled negative scores are `nⱼ` (-5–0):

```text
positive100 = 10 × Σ(i∈R)(sᵢ × wᵢ) / Σ(i∈R)(wᵢ)
penalty100  = 10 × Σ(nⱼ)
rawScore100 = clamp(positive100 + penalty100, 0, 100)
score100    = round(rawScore100 × 10) / 10
```

- This is a linear algorithm: increasing an axis by one point increases the aggregate by up to 10 percentage points according to its normalized weight; each -1 negative item deducts exactly 10 points.
- Unrated axes do not count: they neither contribute a score nor dilute the normalized weight of rated axes. Stored `0` is not a zero-point rating.
- Calculate with unrounded intermediate values and round `score100` to one decimal only for final display.
- The UI, card, and assistive text show `score100 / 100` only; they never show a 10-point aggregate.
- If `R` is empty, show “Cannot calculate” and request a 1–10 rating on at least one LV1–LV6 axis.
- Because deductions can compound, warn when adding a second or later negative item.
- Archives store inputs and the algorithm version; calculated output is not the sole source of truth.

Example: scores 8 (LV4), 7 (LV5), and 9 (LV3), plus -1:

```text
positive100 = 10 × (8×1.5 + 7×2.5 + 9×1) / (1.5 + 2.5 + 1) = 77
penalty100  = 10 × (-1) = -10
rawScore100 = 67
score100    = 67.0
```

### 5.3 Visualization

- The radar chart includes rated, enabled positive axes only, on a fixed 0–10 scale. It never plots an unrated axis as a zero-point data point.
- With fewer than three rated positive axes, use horizontal bars instead.
- Render negative items as a separate list or left-extending bars on a -5–0 scale.
- Always provide an equivalent text list beside the chart. Each positive axis uses one merged card entry containing its name, exact score, and non-empty reason; do not render separate duplicate “breakdown” and “axis reasons” regions.
- Retain the radar chart's independent legend with at least every enabled axis name and exact score. The merged text entry does not replace or remove that legend.
- Text items may reuse star/banana-peel icons but must retain exact numbers; icon controls do not replace the radar or bar chart.

## 6. Auto-save and recovery

- Current workspace key: `xdrate.music.workspace.v2`; recovery-state key: `xdrate.music.recovery-state.v1`. Legacy workspace keys are migration inputs only.
- Save 800 ms after changes and try one synchronous save when backgrounding or closing.
- Display the latest successful save time.
- On quota, serialization, or storage failure, enter `save-error` and recommend immediate JSON export.
- “Create new” builds a new in-memory object and replaces the old draft only after a successful write.
- An unresolved editing session must show a summary at next startup. Do not silently adopt the recovery copy; restoring changes editor memory only and never writes a disk file.
- Pause autosave while the recovery decision is pending so the blank startup state cannot overwrite the candidate. Explicit discard or successful open/new/save resolves the marker while preserving the normal local workspace data.

## 7. Templates

A template contains its name, mode, axes, negative item definitions, card display settings, timestamps, and schema version. It excludes metadata, cover, review text, and scores.

When applying a template, users may preserve scores by matching stable IDs or normalized names. The safe default clears scores and loads the new structure.

## 8. JSON import/export

- Full archive extension: `.xdrate.json`; MIME: `application/json`.
- Template extension: `.xdrate-template.json`.
- Export UTF-8 with two-space indentation; exclude object URLs and temporary cache.
- A compressed cover may be embedded as a Data URL; show estimated archive size first.
- Import pipeline: read → parse JSON → validate schema → migrate → preview summary → confirm → write.
- Reject an unknown higher major version without changing the current edit.

## 9. Image export

1. Validate title and calculable score.
2. Wait for fonts and cover decoding.
3. Clone the export node into a fixed-size offscreen container.
4. Generate PNG with `html-to-image`.
5. Trigger a local download and restore UI state.

The export node must exclude controls, focus rings, and hidden private data. For canvas tainting, memory, or font failures, recommend lowering density, removing the cover, or retrying.

### 9.1 Ratios and layout families

- Landscape: 16:9, 8:5, 3:2; use a compact two-column layout.
- Near-landscape: 4:3, 5:4; use a balanced two-column layout.
- Square: 1:1; use a vertical composition with tightly limited body excerpts.
- Portrait: 4:5, 3:4, 2:3, 5:8, 9:16; use a stacked layout and progressively allow more text as height increases.

### 9.2 Font and overflow gate

- Cards define explicit font family, size, line height, letter spacing, maximum lines, and content dimensions; never rely on browser-default line height.
- Before stable preview and export, await `document.fonts.ready`, cover decoding, and the next layout frame.
- Check every title, body, chart label, and footer for `scrollWidth ≤ clientWidth` and `scrollHeight ≤ clientHeight`.
- Prefer a separate legend for radar-axis names; do not stack SVG labels around a fixed radius.
- On overflow, identify the region and offer shorter text, hidden optional fields, or a taller ratio. Export remains disabled until the check passes.

## 10. Error and confirmation rules

- Show field errors next to the field and focus the first error on submission/export.
- Confirm template deletion, draft reset, and overwrite import.
- Do not confirm ordinary edits, saves, or downloads.
- Errors must say what happened, whether data is safe, and what the user can do next.

### 10.1 Unsaved changes protection

- When the workspace is dirty, New, Open another archive, Close window, and Quit must enter the same three-choice flow: Save and continue, Discard changes, or Cancel.
- Save and continue performs the original action only after a successful disk save. Cancelling the save dialog or a save failure retains the window, data, and dirty state.
- Discard writes nothing and performs the original action. Cancel does not perform the original action.
- The automatic draft is only a recovery copy; it is not a user file save and cannot bypass this guard.
- Desktop intercepts the Tauri current-window close request. Browsers use their native `beforeunload` warning while dirty; the browser controls its wording and buttons.

### 10.2 Desktop titles, commands, and recent files

- Window-title format is “work name or file base name + optional unsaved `*` + XDRate Music”; never expose the full path. Cancelled or failed save retains `*`; only success removes it.
- Fixed desktop shortcuts are `Ctrl+N` New, `Ctrl+O` Open, `Ctrl+S` Save, `Ctrl+Shift+S` Save As, `Ctrl+Shift+E` Export PNG, and `Ctrl+Q` Quit. Every command retains a visible accessible UI control.
- Match exact shortcut combinations only; do not intercept common text-editing combinations or ordinary keys. A cancelled guarded operation restores the prior focus.
- `xdrate.music.recent-files.v1` stores at most ten records containing display name, user-selected path, and time, deduplicated by normalized path and newest first. It stores no contents, scans no directory, and auto-opens nothing.
