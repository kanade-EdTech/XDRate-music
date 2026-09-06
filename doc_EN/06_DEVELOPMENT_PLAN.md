# Development Plan and Roadmap

## 1. Delivery strategy

Build a verifiable, fully offline Web MVP, then expand in order to Windows desktop, a Xiaohongshu MiniTool, and standalone mobile. Milestones are demonstrable vertical slices, not isolated technical layers.

## 2. v0.1 Web MVP

### M0: Project baseline (1–2 days)

- Initialize React, TypeScript, Vite, and Tailwind.
- Configure strict typing, formatting, linting, unit tests, and CI.
- Create domain/feature/infrastructure structure and bilingual message framework.
- Done: the empty app builds, tests, and deploys with identical local/CI commands.

### M1: Rating core (2–4 days)

- Implement models, presets, axis editing, and scoring.
- Implement metadata, reasons, and story forms.
- Implement score breakdown and accessible text output.
- Done: a complete rating works without persistence/export; algorithm boundaries pass.

### M2: Preview and image export (2–4 days)

- Implement the card view model, radar/bars, themes, and responsive preview.
- Implement cover processing, PNG output, safe filenames, and error recovery.
- Done: all 11 ratios work in both languages and with long text, without font overlap/overflow; 1×/2× output matches preview.

### M3: Archives and templates (2–4 days)

- Implement auto-save, startup recovery, and preferences.
- Implement full JSON import/export, schema validation, and v1 migration framework.
- Implement template create/read/update/delete/apply.
- Done: refresh recovery, cross-browser import, and invalid-file protection pass.

### M4: Release hardening (2–3 days)

- Complete responsive, keyboard, contrast, and screen-reader checks.
- Run cross-browser E2E, performance, dependency, and disclaimer checks.
- Write user guide, changelog, and release package.
- Done: all [Test and Acceptance](./07_TEST_AND_ACCEPTANCE.md) gates pass.

Estimate: 9–17 effective development days, depending on visual polish and cross-browser export behavior.

## 3. v0.2 Desktop

- Wrap the Web frontend with Tauri.
- Add native file open/save, recent files, and optional auto-update.
- Ship at least a Windows installer; decide portable packaging through release policy.
- Finalize the executable name only after the brand decision; do not pre-commit to `Polyrate Music.exe`.
- See the [V0.2 Desktop Development Plan](./11_V0.2_DEVELOPMENT_PLAN.md) for detailed scope, dependencies, atomic tasks, and release gates.

## 4. v0.3.0 Xiaohongshu MiniTool

- Ship an offline ZIP whose root directly contains the single `index.html` entry; bundle every runtime resource and use only relative paths.
- Reuse the rating domain, `music-linear-100-v4`, Archive Schema v2 data shape, and card view model while adding a dedicated MiniTool entry point, platform adapter, and compatibility style layer.
- Target ES2017 / Chrome 61 and emit classic scripts only; ESM, network requests, Workers, WASM, remote fonts, external navigation, and arbitrary file downloads are prohibited.
- The core loop is “edit locally → preview locally → render PNG → write a temporary file and save it to the album through the Xiaohongshu JSBridge.” Direct note publishing has a separate product gate and is excluded from the first MVP by default.
- The container cannot mirror desktop arbitrary JSON open/save. v0.3.0 guarantees only container-local draft recovery and explicitly states that container storage is not a permanent backup.
- See the [V0.3.0 Xiaohongshu MiniTool Development Plan](./23_V0.3.0_XIAOHONGSHU_MINITOOL_DEVELOPMENT_PLAN.md) for scope, milestones, compatibility, performance, and ZIP acceptance gates.

## 5. v0.4 Standalone Mobile

The former v0.3 Mobile plan moves in full to v0.4. Validate responsive PWA and Tauri Mobile first. Evaluate a Flutter rewrite only if essential plugins, performance, accessibility, or native UX fail requirements. Any rewrite decision must include maintenance cost and data compatibility. Xiaohongshu-specific JSBridge and ZIP constraints must not leak back into the standalone-mobile architecture.

## 6. Future cross-category capability

- Extract the generic multidimensional engine for separate `XDRank Anime` and `XDRank Games` presets.
- Implement ranges such as -4–9 or -3–10 as rule configuration, not hard-coded UI.
- Politics-related axes, maximum-score restrictions, and password unlocks are sensitive and underspecified. Do not implement them before threat modeling, legal review, and explicit requirements.

## 7. Versions and branches

- Use semantic versions such as `0.1.0` and `0.2.0`.
- Use short-lived feature branches and Pull Requests into `main`.
- Every release tag includes changes, known issues, schema version, and algorithm version.
- A breaking archive change increments the schema major version and provides migration or a clear incompatibility message.

## 8. Definition of done

A feature is complete only when:

- Requirements and boundaries work, including empty, error, and loading states;
- New logic has risk-appropriate automated tests;
- Keyboard and current target desktop behavior were manually checked; mobile behavior becomes a gate only for a mobile-scoped release;
- TypeScript, lint, tests, and build pass;
- Chinese and English message keys are complete;
- Relevant documentation and changelog are updated;
- It adds no undisclosed network request or data collection.
