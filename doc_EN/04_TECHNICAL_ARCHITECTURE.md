# Technical Architecture

## 1. Architecture goals

v0.1 is a backend-free, offline-first single-page app. Business calculations are independent of React. Storage and export use adapter interfaces so v0.2 can reuse the domain layer inside Tauri.

## 2. Stack

| Layer           | Choice                                | Purpose                                                   |
| --------------- | ------------------------------------- | --------------------------------------------------------- |
| UI              | React + TypeScript                    | Components and strict typing                              |
| Build           | Vite                                  | Development, build, static assets                         |
| Style           | Tailwind CSS                          | Semantic tokens and responsive layout                     |
| Form/validation | React Hook Form + Zod (recommended)   | Shared form/import schema                                 |
| State           | Zustand or React reducer (choose one) | Avoid unnecessary global complexity                       |
| Charts          | Lightweight SVG library or custom SVG | Controllable export and accessibility                     |
| Image export    | html-to-image                         | DOM card to PNG                                           |
| Local data      | IndexedDB + localStorage preferences  | Large covers in IndexedDB; small settings in localStorage |
| Tests           | Vitest + Testing Library + Playwright | Unit, component, end-to-end                               |
| Quality         | ESLint + Prettier + TypeScript strict | Consistent CI checks                                      |

Lock actual dependency versions at initialization; do not hard-code them in this document.

## 3. Recommended layout

```text
src/
  app/                  # bootstrap, routing, providers, error boundary
  features/
    work-metadata/
    rating-editor/
    templates/
    archive/
    card-export/
  domain/
    rating/             # pure types, algorithms, presets
    archive/            # schemas, migrations, serialization
  components/           # shared UI
  infrastructure/
    storage/            # IndexedDB/localStorage adapters
    image/              # compression, decode, export
  i18n/
  styles/
  test/
```

Dependency direction is `app/features → domain`; infrastructure implements interfaces defined by domain/features. Domain code must not import React, browser storage, or UI libraries.

## 4. State and data flow

```text
UI event
  → form/store command
  → domain validation and score calculation
  → immutable rating state
  ├─→ debounced storage adapter
  └─→ card view model → preview/export
```

- The current rating is the single business source of truth.
- Aggregate and chart values are derived, not duplicated in edit state.
- Persistence state is separate from business state so a save error cannot destroy input.
- Async operations are cancelable or ignore stale results to avoid import/export races.

## 5. Domain services

Implement and unit-test these pure functions:

```ts
calculateRating(input): RatingResult
normalizeAxisName(name): string
validateRatingArchive(value): ValidationResult
migrateArchive(value): CurrentArchive
createDefaultRating(mode, preferences): Rating
buildCardViewModel(rating, options): CardViewModel
sanitizeDownloadName(value): string
```

The algorithm carries `algorithmVersion`. The first value was `music-weighted-v1`, the first 100-point version was `music-linear-100-v2`, the weight revision was `music-linear-100-v3`, and the current unrated-axis exclusion / one-star-minimum version is `music-linear-100-v4`. A scoring change that alters old results creates a new version instead of silently changing the old one.

### 5.1 Card content-composition service

The card-export feature adds two pure functions that are independent of React, DOM, and storage. They belong to presentation logic under `features/card-export` and must not change the scoring algorithm, Archive Schema, or `algorithmVersion`:

```ts
profileCardContent(draft, options): CardContentProfile
resolveCardLayout(config, profile): CardLayoutPlan
```

`CardContentProfile` records at least cover presence, enabled-axis count, non-empty axis-reason count and text units, negative-item count, overall-comment units, and story units. `CardLayoutPlan` records at least ratio family, `sparse | balanced | dense` density, chart size, column count, line budgets for reasons/comments/stories, visibility, and `fallbackLevel`. The plan is derived state and is never written to an archive.

Mixed-script text uses a deterministic width estimate: CJK and full-width characters count as 1 text unit; Latin letters, digits, and half-width characters count as 0.55 text units. `estimatedLines = ceil(textUnits / effectiveUnitsPerLine)`. The initial plan estimates demand as follows:

```text
contentDemand = fixedHeaderHeight
              + minimumChartHeight
              + breakdownHeight
              + reasonLines × reasonLineHeight
              + commentLines × commentLineHeight
              + storyLines × storyLineHeight

density = contentDemand / usableContentHeight
```

Default thresholds are `< 0.65 → sparse`, `0.65–0.95 → balanced`, and `> 0.95 → dense`. These thresholds are fixture-protected layout constants and may change only together with automated and visual baselines for all 11 ratios. DOM may be measured after the first render; on overflow, `fallbackLevel` increases in a fixed order at most twice. Remaining overflow identifies the exact region and blocks export rather than causing unbounded reflow.

When `showReasons=true`, the view model must contain every non-empty `axis.reason` belonging to an enabled axis; a breakdown containing only axis names and scores does not satisfy reason display. Preview and PNG export must consume the same `CardLayoutPlan`.

## 6. Storage

- Hide drafts, templates, and preferences behind repository interfaces; components do not call Web Storage directly.
- Keep lightweight metadata/preferences in localStorage; use IndexedDB for full drafts with covers.
- Write a new record before moving the active reference to reduce interruption corruption.
- Validate local data at startup. Quarantine corrupt data and offer a diagnostic export.
- Do not use cookies, background sync, or remote logging.

PWA offline caching may arrive late in v0.1. Even without PWA installation, editing and export on an already loaded page must not require the network.

## 7. Image and security boundaries

- Accept JPEG/PNG/WebP only after MIME, signature, and browser decode checks.
- Compress to a recommended maximum edge of 1600 px and strip unnecessary EXIF metadata.
- Render user content as text nodes; do not use `dangerouslySetInnerHTML`.
- Treat JSON as untrusted input; limit total size, arrays, strings, and Data URLs.
- Remove separators, control characters, and Windows reserved names from downloads.

## 8. Errors and logging

- The top-level error boundary offers draft recovery and backup export.
- User-facing messages omit stacks; development builds may use structured console logs.
- Production does not upload logs. User-initiated diagnostics require a preview and exclude private text and images.

## 9. Build and CI

Every merge runs:

```text
format check → lint → typecheck → unit/component tests → production build
```

The main branch or release tag also runs critical Playwright flows across browser engines. Output uses relative assets suitable for static hosting and includes a dependency license inventory.

## 10. Later platforms

- v0.2: wrap the existing Web UI in Tauri; M1 desktop shell/platform boundaries are complete, and M2 adds native filesystem adapters.
- v0.3.0: add a dedicated Xiaohongshu MiniTool entry and offline-ZIP pipeline; reuse pure domain/card models while isolating the container behind Chrome 61 classic scripts, compatibility CSS, relative resources, and a narrow `window.xhs.miniTool` adapter.
- v0.4.0: complete sharing contracts for preview/export, album save, system share, platform handoff, and recovery without building a standalone App entity. v1.0.0 enters the music/anime/books/film multi-domain rater, v1.1.0 adapts it to WeChat, and the standalone App entity moves to v2.0.0.
- Anime and games reuse the generic rating engine with separate presets, rules, and entry points.

### 10.1 V0.3.0 Xiaohongshu MiniTool boundary

The MiniTool build shares `domain`, Archive v2 types, and `CardViewModel` with Web/Tauri, but has a separate entry, platform-service implementation, and output directory. It imports neither Tauri nor browser-download/external-navigation behavior. Native capability is limited to explicit user actions that call `writeTempFile` and `saveImageToPhotosAlbum`; the first release excludes `postNote` by default.

```text
React feature → MiniToolPlatformServices
              ├─ local cache → localStorage / IndexedDB (non-permanent)
              ├─ media input → image/video-capable system picker (images only here)
              └─ image save → writeTempFile → saveImageToPhotosAlbum
```

The release ZIP has one root `index.html` entry and allowed relative resources only. Final JavaScript is external classic script executable by ES2017 / Chrome 61. Network, Workers, WASM, remote resources, external navigation, and arbitrary downloads are excluded from the dependency graph. See the [V0.3.0 Xiaohongshu MiniTool Development Plan](./23_V0.3.0_XIAOHONGSHU_MINITOOL_DEVELOPMENT_PLAN.md) for build, test, performance, and release contracts.

## 11. V0.2 M1 desktop boundary

### 11.1 Build and versioning

- `package.json` is the only manually maintained release-version source. `npm run check:versions` verifies the Vite compile constants, frontend About information, `package-lock.json`, Cargo package, and Tauri manifest agree.
- Web and desktop reuse the same `src/`. `npm run build:web` emits the static frontend, `npm run desktop:dev` launches the development shell, and `npm run desktop:build` emits the Windows x64 NSIS candidate.
- The Tauri identifier is `com.xdrate.music`, product name is `XDRate Music`, technical publisher is `Kehun_EdTech`, and NSIS uses `currentUser` install scope.

### 11.2 Platform adapters

`src/platform/contracts.ts` defines runtime detection, text open, text save, binary save, and recent-file capabilities. Browser and desktop entries implement the contract; business-domain and scoring modules must not import Tauri APIs. The M1 desktop adapter intentionally retains browser-download behavior. M2 replaces only its implementation, without changing domain callers.

```text
React feature → PlatformServices contract
              ├─ Browser adapter → input / download
              └─ Desktop adapter → M1 browser fallback; M2 native implementation
```

### 11.3 Desktop workspace state

A separate pure reducer owns desktop file state and never enters an Archive: `currentPath`, `currentRevision`, `lastSavedRevision`, `dirty`, `pendingOperation`, and `lastError`. Transition tests cover new, open, edit, save, save-as, failure, and cancellation. Save failure must neither roll back nor corrupt rating data.

### 11.4 M1 least privilege

- `src-tauri/capabilities/main.json` binds only the `main` window and has an empty permission array.
- No filesystem, dialog, shell, process, HTTP, updater, or arbitrary-network plugin is installed.
- Production CSP allows no external network source; development CSP allows only the local Vite server and WebSocket.
- `npm run check:desktop-config` prevents silent boundary expansion. Any M2 permission must name the exact command and file scope and add security tests.

### 11.5 M3 unsaved-changes protection

`unsavedChangesGuard.ts` is a pure decision layer decoupled from UI and Tauri. It handles every combination of `new / open / close / exit` and `save / discard / cancel`. The UI invokes it only while the workspace is dirty; a pending action runs only after save succeeds, while save cancellation or failure always returns “do not proceed.”

`PlatformWindowLifecycle` exposes only current-window close-request listening, explicit close, and title setting; it does not give business code arbitrary window control. The desktop adapter uses Tauri `onCloseRequested`, sets a one-shot bypass after approval, and then calls `close()` to prevent a programmatic-close guard loop; titles contain only a work name or file base name plus dirty state. In addition to M2's `allow-native-files`, capabilities add only `core:window:allow-close` and `core:window:allow-set-title`; shell, process, arbitrary filesystem, network, and updater permissions remain absent.
