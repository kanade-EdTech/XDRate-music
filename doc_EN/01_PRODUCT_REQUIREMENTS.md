# Product Requirements Document (PRD)

## 1. Background and problem

Most music rating systems reduce an opinion to one number. They do not adequately express artistic quality, listening experience, personal preference, specific strengths and weaknesses, or the listener's relationship with a work. Multidimensional Music Rating (`XDRate Music`) addresses this with configurable multidimensional ratings and shareable visual cards while keeping all data on the user's device by default.

## 2. Product goals

v0.1 must enable users to:

1. Complete a music rating without an account or network connection.
2. Choose simple or professional mode and rename or disable rating axes.
3. Obtain an explainable aggregate score from axis scores and importance levels.
4. Add per-axis reasons, negative feedback, an overall comment, and a personal story.
5. Generate, preview, and download a polished rating image.
6. Recover an automatically saved draft and import/export templates and full JSON archives.

## 3. Non-goals

v0.1 does not include:

- Accounts, cloud sync, communities, likes, comments, or leaderboards;
- Online music catalogs, automated cover retrieval, or bundled copyrighted media;
- A server-side database, analytics, or advertising;
- AI-generated scores or review text;
- Anime, game, or politics-related ratings;
- Desktop installers or native mobile apps.

## 4. Users and scenarios

### 4.1 Target users

- General listeners who want a structured listening journal;
- Review enthusiasts who need finer-grained criteria;
- Creators who want shareable rating cards;
- Privacy-conscious users who prefer offline storage.

### 4.2 Core scenarios

1. A first-time user enters a song and artist, rates the three simple axes, and downloads a card.
2. An advanced user switches to professional mode, changes axis names and importance levels, adds reasons, and exports a complete review.
3. A returning user saves and reuses a custom rating template.
4. A user exports a full JSON archive for long-term backup or restoration in another browser.

## 5. User stories and priorities

| ID    | User story                                                                                                                                 | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| US-01 | I can enter the work title, artist, and an optional local cover.                                                                           | P0       |
| US-02 | I can select simple/professional mode and receive the corresponding default axes.                                                          | P0       |
| US-03 | I can use ten stars to rate every enabled axis from 1–10; an unrated axis does not affect the aggregate, and I can set LV0–LV6 importance. | P0       |
| US-04 | I can rename, add, remove, or disable axes.                                                                                                | P0       |
| US-05 | I can use five banana-peel icons to set an optional -5–0 deduction for a substantial drawback.                                             | P0       |
| US-06 | I can see the aggregate score and understand how it was calculated.                                                                        | P0       |
| US-07 | I can enter axis reasons, negative reasons, an overall comment, and a personal story.                                                      | P0       |
| US-08 | I can preview and download a PNG rating card.                                                                                              | P0       |
| US-09 | My current work is restored after a refresh or accidental close.                                                                           | P0       |
| US-10 | I can import and export a complete JSON archive.                                                                                           | P0       |
| US-11 | I can save, apply, rename, and delete rating templates.                                                                                    | P1       |
| US-12 | I can choose the card theme and dimensions and hide empty fields.                                                                          | P1       |
| US-13 | I can complete the core flow with a keyboard and common screen readers.                                                                    | P1       |

## 6. Functional requirements

### FR-1 Work metadata

- Required: work title.
- Optional: artist, album, up to 6 custom work-metadata entries, release year, cover, and tags. “Artist” and “Album” are editable localized default labels; users provide both a name and value for each custom entry.
- Covers must be uploaded locally by the user. The app must not provide unlicensed media templates or online scraping.
- Images are processed locally, compressed before persistence, and validated by type and size.

### FR-2 Modes and axes

- Simple defaults: Artistic Quality, Listening Experience, Personal Preference.
- Professional defaults: Lyrics/Concept, Composition/Arrangement, Performance/Tuning/Mixing, Innovation, Other.
- Each axis has a name, an unrated or 1–10 score, LV0–LV6 importance, enabled state, and optional reason.
- The only positive-score input is ten stars. Selecting the Nth star produces integer N; no separate numeric input, half-star, or other fractional star value is provided.
- LV3 (×1.00) is the default. A user can explicitly save a different future default.
- At least one enabled positive axis with nonzero weight is required for an aggregate score.

### FR-3 Negative items

- Users may enable one or more negative items; the default label is “Other Dislikes.”
- Scores range from -5–0; zero means no deduction.
- The primary deduction interaction must show five banana-peel icons. Fill represents the absolute deduction, an exact signed value remains visible, and the last peel is partially filled for decimal values.
- Negative items are shown separately from the radar chart to avoid mixing scales.

### FR-4 Aggregate score

- The deterministic formula in the [Functional Specification](./02_FUNCTIONAL_SPECIFICATION.md) is authoritative.
- The aggregate must use a 0–100 scale exclusively, with one decimal place. Neither the UI nor exported cards may show a parallel 10-point aggregate.
- Individual axes use whole-star integers from 1–10. Unrated axes enter neither numerator nor weight denominator. The aggregate still uses unrounded weighted intermediates and produces a one-decimal 100-point result through the linear formula.
- Recalculate immediately whenever an input changes.
- Provide a “How this is calculated” view and never present the result as objective truth.

### FR-5 Text content

- All review text is optional, including axis reasons, negative reasons, overall comments, and stories.
- User text must never be transmitted over the network.
- Empty fields are hidden from exported cards by default.

### FR-6 Local persistence and templates

- Auto-save changes with a 500–1000 ms debounce.
- Full archives include work metadata, scores, text, style, and version identifiers.
- Templates include axes, weights, and style only—not metadata, cover, or review text.
- Validate JSON structure and versions before import. A failed import must not overwrite current data.

### FR-7 Image export

- The preview must match the final image.
- Support all 11 ratios: 16:9, 8:5, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 5:8, and 9:16.
- Complete font loading and overflow detection before preview/export. Block silent export when text overlaps or exceeds its container, and provide remediation guidance.
- PNG is the default, with a 1200 px target width and 1×/2× pixel density.
- Sanitize the name as `WorkTitle-XDRate-YYYYMMDD.png`.
- Export errors must provide actionable guidance while preserving user data.

## 7. Non-functional requirements

| Category        | Requirement                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Privacy         | No backend, telemetry, or third-party tracking; user data remains local by default.               |
| Performance     | Target under 3 s to interactive, under 100 ms input feedback, and under 5 s for a typical export. |
| Compatibility   | Current and previous major versions of Chrome, Edge, Firefox, and Safari.                         |
| Responsive      | Core tasks work from 360 px; desktop optimizes a two-column editor/preview.                       |
| Accessibility   | Target WCAG 2.2 AA: keyboard use, visible focus, named forms, and chart alternatives.             |
| Maintainability | TypeScript strict mode; unit-tested calculation/storage; versioned data and migrations.           |
| Reliability     | Report save failures; import and upgrades must never silently lose data.                          |

## 8. Success criteria

Because the product has no telemetry, v0.1 uses release and usability criteria:

- 100% pass rate for critical end-to-end flows;
- Create, recover, import, and export behavior meets release gates in supported browsers;
- A new user can create a first card within five minutes without external instructions in a moderated usability test;
- Zero P0/P1 defects at release;
- Lighthouse Accessibility target of at least 95 as a supporting—not exclusive—signal.
