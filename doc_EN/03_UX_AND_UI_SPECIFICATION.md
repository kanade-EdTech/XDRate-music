# UX and UI Specification

## 1. Design principles

1. **Expression first:** the aggregate is a summary, not a replacement for dimensions and commentary.
2. **Trustworthy offline behavior:** explain local storage and keep backup actions visible.
3. **Progressive complexity:** lead with simple mode and reveal professional controls on demand.
4. **What you see is what you export:** preview and output remain synchronized.
5. **Readable and shareable:** a card communicates clearly before it decorates.

## 2. Desktop and mobile layout

### Desktop (≥1024 px)

- Editor approximately 55% left, preview approximately 45% right.
- Preview may remain sticky while scrolling but must not cover the footer or actions.
- Group advanced settings in collapsible sections; expand the active axis.

### Tablet and mobile (<1024 px)

- Single column with an Edit/Preview switch or preview drawer.
- Put primary actions in a normal section at the end. A sticky bottom bar must reserve content space.
- Support a minimum 360 px viewport. Touch targets remain at least 44×44 CSS px by default, with compact stars as an explicit 32×40 CSS px exception.

## 3. Key components

- `WorkMetadataForm`: work information and local cover.
- Render artist and album field names as editable labels, localized to “Artist / 艺术家” and “Album / 专辑” by default. A non-empty unfocused label uses a lower-contrast border than standard inputs and the same background as its container; on focus it adopts the standard input background, border, shadow, and focus ring. Once cleared, it retains standard-input styling even after blur and shows a light “Artist / Album” placeholder. The default label is editor-only and does not appear on the share card; deleting and then re-entering that same default must restore default semantics rather than render it on the card. Only another non-empty customized label renders as “label: value”; a blank label shows the value without a separator.
- “Add work-metadata entry” creates up to 6 independently removable name/value pairs. Every added entry-name input always uses standard-input styling rather than the subdued preset-label treatment. Entry names, values, and the artist/album label and value inputs must have distinct accessible names.
- `ModeSelector`: simple/professional selection and change warning.
- `AxisEditor`: axis name, score, importance, state, and reason.
- `NegativeItemEditor`: deduction and reason.
- `NarrativeEditor`: overall comment and story.
- `CardCustomizer`: theme, ratio, visible fields.
- `RatingCardPreview`: read-only exportable card.
- `PersistenceStatus`: save state and latest time.
- `ImportDialog` / `TemplateDialog`: validation summary and confirmation.

## 4. Rating inputs

- Use one row of ten compact stars for a positive score and one row of five banana-peel icons for a deduction; a range slider is no longer the primary interaction. Desktop acceptance viewports must show all ten stars without local horizontal scrolling. Internal strip scrolling is allowed only as a narrow-screen responsive fallback, while the page itself must never scroll horizontally.
- Use consistent bundled vector assets rather than operating-system emoji fonts. Empty icons retain a visible outline and remain distinguishable in both themes.
- The icon set is one focusable control; decorative child icons do not enter the Tab order. The control exposes an accessible name, current value, minimum, maximum, and score/deduction direction.
- For stars, `Left/Down` and `Right/Up` move by one whole star, while `Home/End` reaches 1/10. Banana-peel arrows retain 0.1 steps, `PageUp/PageDown` changes by 1, and assistive output announces the final signed value.
- Stars use compact portrait 32×40 CSS px targets, have no numeric input or reset-to-zero action, and cannot go below one after the first rating; empty stars say “Not rated; excluded.” The desktop axis-name/rating columns use a 40%/60% split. Banana peels retain at least 44×44 CSS px targets, bidirectional exact numeric input, and Reset.
- After a value change, whole-star state, exact banana value and partial fill, aggregate, breakdown, and preview update in the same render cycle without contradictory intermediate values.
- Never encode value or sign by color alone. Include numbers, labels, and direction.
- Show the multiplier for each level, for example `LV3 · ×1.00`.
- Provide an expandable calculation breakdown beside the aggregate.
- Axis name edits update preview in real time without losing input focus.

## 5. Card specification

The default card includes:

- Work title, artist, album, non-empty custom work-metadata entries, and optional cover;
- A 0–100 aggregate with one decimal place only;
- Radar/bars plus textual per-axis values;
- Non-empty overall comment or story excerpt;
- Tool name and short algorithm-version marker;
- A short “content entered by the user” notice.

Provide all 11 ratios: 16:9, 8:5, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 5:8, and 9:16. Adapt content through four layout families—landscape, near-landscape, square, and portrait—and show both the numeric ratio and orientation in the selector.

Card typography uses explicit line heights and predictable text regions. Title, metadata, chart labels, body, story, and footer must never overlap. When content overflows, identify the affected region and offer hidden optional fields, a shorter excerpt, or a taller format. Never force-fit by indefinitely shrinking text, silently cropping, or covering adjacent elements.

### 5.1 Content completeness and display priority

- When “show axis scores and reasons” is enabled, every enabled axis name, exact score, and non-empty reason must enter the card view model and receive a visible display position; axis names and scores do not count as displayed reasons.
- When the user explicitly disables “show axis scores and reasons,” the entire merged axis region is removed from the card; when no non-empty reason exists, no empty reason line is reserved.
- Merge each axis name, exact score, and corresponding reason into one card entry; do not duplicate them in separate “breakdown” and “axis reasons” cards.
- The radar legend remains an independent chart-reading aid and retains axis names plus exact scores; merging the textual entries does not remove or replace it.
- Content priority, from highest to lowest, is: work identity and aggregate score, enabled axes and exact scores, axis reasons, overall comment, personal story, decoration, and footer. Lower-priority content must not cover or displace higher-priority content.
- Predictable line limits may apply to reasons, overall comments, or stories when capacity is exceeded, but the card must show an explicit truncation notice and the number of items not shown completely; non-empty reasons must never disappear silently.
- Sample text entered by the user participates only as content for layout and must never be interpreted as product instructions.

### 5.2 Ratio and content adaptation

Cards use four ratio families: landscape (16:9, 8:5, 3:2), near-landscape (implementation key `standard`; 4:3, 5:4), square (1:1), and portrait (4:5, 3:4, 2:3, 5:8, 9:16). Each family then selects a `sparse`, `balanced`, or `dense` content-density plan instead of reading only fixed character and line limits.

- `sparse`: enlarge the chart, legend, or narrative regions and use intentional alignment to consume available space; primary content must not be compressed into the upper half while leaving a large meaningless void.
- `balanced`: use the ratio family's standard dimensions, spacing, and information hierarchy.
- `dense`: reduce gaps and padding down to readable minima before limiting lower-priority text; body text must not be reduced to an unreadable size.
- The same input, ratio, theme, and display options must produce the same layout plan. Preview and export share that plan and must not infer layouts independently.
- After the first layout, one DOM measurement pass may trigger at most two deterministic fallback steps. If overflow remains, export is blocked with the exact region identified; repeated oscillating reflow or visible flicker is prohibited.

## 6. Visual tokens

Use semantic Tailwind tokens instead of arbitrary business-component values:

```text
color: background / surface / text / muted / primary / positive / negative / border
space: one consistent 1–8 scale
radius: sm / md / lg
shadow: none / sm / card
```

Provide at least light and dark themes. The export theme is independent of the app chrome so a system-theme change cannot alter an existing preview unexpectedly.

## 7. Copy guidelines

- Use “aggregate score,” not “objective score” or “ground truth.”
- Use “negative item/deduction,” while allowing custom labels.
- Privacy: `Data is stored only in this browser. Export a JSON backup regularly.`
- Media: `Upload only images you have the right to use.`
- Export: `This card contains user-entered content and does not represent the software author's views.`

## 8. Accessibility

- Every control needs a visible label or accessible name; connect errors with `aria-describedby`.
- Use native semantics for mode/theme radio groups; drag sorting needs a keyboard alternative.
- Focus order matches visual order; dialogs trap and restore focus correctly.
- Contrast is at least 4.5:1 for normal text and 3:1 for large text; focus indicators meet WCAG 2.2.
- Charts have accessible titles, summaries, and data tables; hide decorative graphics from assistive technology.
- Star and banana-peel graphics are hidden from assistive technology; the group announces text such as “Artistic Quality, 8 out of 10” and “Other Dislikes, deduct 2.5, maximum deduction 5.”
- Respect `prefers-reduced-motion`; never communicate export progress through motion alone.

### 8.1 Unsaved-changes dialog

- The dialog uses `role="dialog"` and `aria-modal="true"`, with its title and description connected through `aria-labelledby` and `aria-describedby`.
- Initial focus goes to Cancel; `Escape` is equivalent to Cancel. `Tab` and `Shift+Tab` cycle only through the three enabled actions, and closing the dialog restores focus to its trigger.
- While saving, disable every choice. A save failure appears inside the dialog with `role="alert"` and must neither close the dialog nor clear data.
- The four protected entry points use action-specific explanations while keeping the same button labels, order, and outcomes.

### 8.2 Recovery and desktop workflow

- Before adopting a draft, the recovery dialog shows its work name, rated-axis count, and up to three lines of text excerpt, plus an explicit statement that recovery does not write or overwrite a disk file.
- Initial focus goes to the recommended “Restore this draft.” `Tab` and `Shift+Tab` cycle only between Restore and Discard; no close icon or ambiguous `Escape` behavior may bypass the decision.
- The title-bar `*` and visible save state stay consistent. The title contains only a work name, file base name, or localized untitled copy—never a full path.
- All six desktop commands have visible controls, localized hints, and `aria-keyshortcuts`; execution reuses existing disabled, error, and unsaved-guard states.
- The recent-files region includes privacy copy. Long paths may be visually elided; their complete value appears only as a user-requested tooltip. Every entry can be removed and the whole list can be cleared.

## 9. Internationalization

- Use message keys for all interface copy; do not scatter literal UI strings in components.
- Use `Intl` for dates, numbers, and plurals; never store localized numeric strings in archives.
- Layouts accommodate English text 30%–50% longer than Chinese.
- Never translate user-entered axis names or review text.
