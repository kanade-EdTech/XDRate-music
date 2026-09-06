# Data Model and Archive Format

## 1. Rules

- JSON uses English `camelCase` fields and stable English enum values.
- Every independently migratable file has a `schemaVersion`.
- IDs are UUID v4; user-editable names are never unique keys.
- Timestamps are ISO 8601 UTC and localized only for display.
- `null` means explicitly absent; a missing optional field means old-version or not supplied.
- Stars and banana peels add no icon-count field. Positive scores are `integer`: `0` is the unrated sentinel and valid ratings are whole stars from 1–10; deductions remain decimal-capable from -5–0. Schema stays at v2 and the algorithm remains `music-linear-100-v4`.

## 2. Core TypeScript models

```ts
type RatingMode = 'simple' | 'professional' | 'custom';
type ThemeId = 'light' | 'dark';
type CardRatio =
  '16:9' | '8:5' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '5:8' | '9:16';

interface RatingAxis {
  id: string;
  name: string;
  score: number; // 0 = unrated; otherwise 1..10
  importanceLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  enabled: boolean;
  reason: string;
}

interface NegativeItem {
  id: string;
  name: string;
  score: number; // -5..0
  enabled: boolean;
  reason: string;
}

interface WorkMetadata {
  title: string;
  artistLabel: string | null;
  artist: string;
  albumLabel: string | null;
  album: string;
  extraFields: WorkMetadataEntry[];
  releaseYear: string;
  coverDataUrl: string | null;
}

interface WorkMetadataEntry {
  id: string;
  label: string;
  value: string;
}

interface CardOptions {
  themeId: ThemeId;
  ratio: CardRatio;
  pixelRatio: 1 | 2;
  showCover: boolean;
  showReasons: boolean;
  showStory: boolean;
  hideEmptyFields: boolean;
}

interface MusicRating {
  id: string;
  schemaVersion: 1;
  algorithmVersion: 'music-linear-100-v4';
  mode: RatingMode;
  work: WorkMetadata;
  axes: RatingAxis[];
  negativeItems: NegativeItem[];
  overallComment: string;
  personalStory: string;
  card: CardOptions;
  createdAt: string;
  updatedAt: string;
}
```

`artistLabel` and `albumLabel` use three-state semantics: `null` selects the current locale's “Artist / 艺术家” or “Album / 专辑” default for the editor, while the card shows only the value; a non-empty string that does not equal a default in any supported locale is a custom label that renders as “label: value”; an empty string explicitly omits the label and also shows only its value. The editor normalizes a re-entered localized default to `null`, while card rendering also filters default-label strings persisted by older drafts. `extraFields` contains up to 6 entries, with a 24-character label and a 120-character value; non-empty values render as “label: value.” These properties persist with drafts and full archives. Rating-structure templates exclude work metadata, while MiniTool content templates store the full cover-free snapshot specified in section 4.1.

## 3. Full archive

```ts
interface RatingArchiveV2 {
  format: 'xdrate-music-archive';
  schemaVersion: 2;
  algorithmVersion: 'music-linear-100-v4';
  exportedAt: string;
  appVersion: string;
  workspace: {
    rating: MusicRating;
    cardOptions: CardOptions;
  };
}
```

Constraints:

- `axes`: 1–12 items; 1–12 enabled.
- `negativeItems`: 0–5 items.
- Recommended total import limit: 8 MB.
- The cover is stored in `rating.work.coverDataUrl` and may be `null`.

## 4. Template

```ts
interface RatingTemplateV2 {
  format: 'xdrate-music-template';
  schemaVersion: 2;
  algorithmVersion: 'music-linear-100-v4';
  id: string;
  name: string;
  mode: RatingMode;
  axes: Array<Pick<RatingAxis, 'id' | 'name' | 'importanceLevel' | 'enabled'>>;
  negativeItems: Array<Pick<NegativeItem, 'id' | 'name' | 'enabled'>>;
  card: Omit<CardOptions, 'pixelRatio'>;
  createdAt: string;
  updatedAt: string;
}
```

On load, positive scores start at `0` (unrated), negative scores at 0, and all reasons/body text are empty.

### 4.1 MiniTool content-template format

```ts
interface MiniToolContentTemplateV1 {
  format: 'xdrate-music-minitool-content-template';
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rating: MusicRatingDraft; // work.coverDataUrl must be null
}

interface MiniToolContentTemplateCatalogV1 {
  version: 1;
  templates: MiniToolContentTemplateV1[];
}

interface MiniToolContentTemplateSeedStateV1 {
  version: 1;
  seeded: true;
}
```

- The recent draft remains at `xdrate.music.minitool.workspace.v1`; the content-template catalog uses `xdrate.music.minitool.content-templates.v1`; one-time seed state uses `xdrate.music.minitool.content-template-seed.v1`. Validate and fail all three independently so one damaged value cannot erase the others.
- The versioned “海棠仙” seed comes from a source constant. When no valid seed state exists, copy it under a stable ID into an ordinary catalog entry, then write seed state only after the catalog write succeeds. It may then be renamed, replaced, or deleted like any other template; deletion never clears seed state. If the stable seed ID already exists but the marker is missing, repair only the marker and do not duplicate the entry.
- The catalog contains at most 20 entries including the initial “海棠仙,” uses 1–40 character names, and serializes to no more than 512 KiB. IDs use the existing Chrome 61-compatible fallback and timestamps are ISO 8601 UTC.
- Saving deep-copies the current `MusicRatingDraft` and forces `work.coverDataUrl = null`. Loading reruns strict `MusicRatingDraft` validation and does not trust local `format`, version, seed name, or seed-marker payload.
- Applying a content template replaces the current content draft; explicit apply, same-name replacement, and deletion require confirmation. Automatic application during first initialization does not.
- Initialization reads a valid recent draft first. Without valid seed state, the catalog still receives “海棠仙,” but that entry becomes the startup draft only when no valid recent draft exists. With valid seed state but no valid recent draft, create a blank Simple draft and never recreate a renamed or deleted seed entry. A damaged catalog with valid seed state also must not trigger reseeding.
- The “海棠仙” seed fixture is 纯白；星尘 / 中华少女 / 2004, Simple mode, three LV3 axes scored 8/7/9 with the frozen reasons, no deductions, empty overall comment, and the frozen story. Its aggregate assertion is 80.0.

## 5. Preferences

```ts
interface UserPreferencesV1 {
  schemaVersion: 1;
  locale: 'zh-CN' | 'en';
  appTheme: 'system' | 'light' | 'dark';
  lastMode: RatingMode;
  defaultImportanceLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  defaultCardOptions: CardOptions;
}
```

LV3 (×1.00) is the default. Editing one axis must not change the global default unless the user explicitly chooses “Use as future default.”

## 6. Validation and migration

Import validation has four stages:

1. **Container:** format marker, major version, size.
2. **Structure:** required fields, types, enums, array lengths.
3. **Semantics:** ranges, unique IDs, references, at least one calculable axis.
4. **Sanitization:** remove unknown fields or preserve them in an extension area; strip invisible controls.

Migrations are pure, idempotent, and fixture-tested. Preserve the original imported object until migration succeeds; never partially persist a failed migration.

v1 → v2 migration rules:

| v1 value   | v2 value |
| ---------- | -------- |
| `wide`     | `16:9`   |
| `square`   | `1:1`    |
| `portrait` | `4:5`    |

Migration also writes `algorithmVersion: 'music-linear-100-v4'`. On import, legacy `score = 0` remains unrated, while any positive fractional score is rounded and clamped to the nearest whole star from 1–10 (for example, 7.4 → 7 and 7.5 → 8); existing integer ratings remain unchanged. Older v2 work metadata maps an empty legacy `albumLabel` to `null` and receives `artistLabel: null` plus `extraFields: []`, preserving localized defaults. The browser prefers self-describing `workspace.v2` / `templates.v2` values and falls back read-only to v1 keys when necessary; legacy keys are not deleted. Archives and templates newer than the current version are rejected.

## 7. Example archive without a cover

```json
{
  "format": "xdrate-music-archive",
  "schemaVersion": 2,
  "algorithmVersion": "music-linear-100-v4",
  "exportedAt": "2026-08-22T08:00:00.000Z",
  "appVersion": "0.1.0",
  "workspace": {
    "rating": {
      "mode": "simple",
      "work": {
        "title": "Example Song",
        "artistLabel": null,
        "artist": "Example Artist",
        "albumLabel": null,
        "album": "",
        "extraFields": [],
        "releaseYear": "",
        "coverDataUrl": null
      },
      "axes": [
        {
          "id": "art",
          "name": "Artistic Quality",
          "score": 8,
          "importanceLevel": 4,
          "enabled": true,
          "reason": ""
        },
        {
          "id": "sound",
          "name": "Listening Experience",
          "score": 8,
          "importanceLevel": 4,
          "enabled": true,
          "reason": ""
        },
        {
          "id": "taste",
          "name": "Personal Preference",
          "score": 9,
          "importanceLevel": 4,
          "enabled": true,
          "reason": ""
        }
      ],
      "negativeItems": [],
      "overallComment": "",
      "personalStory": ""
    },
    "cardOptions": {
      "theme": "light",
      "ratio": "4:5",
      "showReasons": true,
      "showStory": true
    }
  }
}
```
