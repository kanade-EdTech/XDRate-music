# Development Plan and Roadmap

## 1. Delivery strategy

Build a verifiable, fully offline Web MVP, then expand to Windows desktop, the Xiaohongshu MiniTool, Bili Toy, sharing, the multi-domain rater, and WeChat. The standalone App entity is deferred to v2.0.0. Milestones are demonstrable vertical slices, not isolated technical layers. See the [roadmap reset](./39_VERSION_ROADMAP_RESET_AND_FUTURE_PLAN.md).

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

## 5. v0.3.1 Bili Toy Current-Version Adaptation

Before starting the standalone mobile App, adapt the current v0.3.1 rating and offline capabilities into a Bilibili Toy. This work uses a dedicated build entry and output directory and does not change the Xiaohongshu MiniTool, desktop, or Web mainline. It does not copy the Xiaohongshu JSBridge or add Bilibili cloud storage, leaderboards, or accounts.

- M0: install and discover the official `toy` CLI, inventory current-version boundaries, and freeze the Bili Toy dependency list and version identity.
- M1: build the Bili Toy shell, relative resources, subpath compatibility, bilingual UI, and current music-rating loop.
- M2: regress eleven ratios, preview/PNG parity, templates, drafts, covers, keyboard/narrow layout, and screen reader behavior; run `toy_doctor.py` with zero ERRORs.
- M3: produce `0.3.1-toy-rc.1` and run the `toy` CLI JSON preview; do not use `--yes` before explicit user confirmation.
- M4: record Toy preview, review status, online subpath smoke results, and known limitations; rejected fixes increment the candidate and never overwrite old packages or hashes.

See the [V0.3.1 Bili Toy Current-Version Adaptation Plan](./37_V0.3.1_BILI_TOY_CURRENT_VERSION_ADAPTATION_PLAN.md) for work packages, acceptance matrix, and CLI gates.

## 6. v0.4.0 Sharing Completion

v0.4.0 no longer builds a standalone App entity. It completes the sharing loop: 11-ratio preview/PNG parity, album save, system share, platform handoff, confirmation, privacy copy, cancellation, and failure recovery. Desktop, MiniTool, and Bili Toy keep separate adapters while sharing rating/card/error contracts. Native App toolchains, packages, and stores move to v2.0.0. See the [roadmap reset](./39_VERSION_ROADMAP_RESET_AND_FUTURE_PLAN.md).

## 7. v0.5.0 Game-Rating Pilot

Use a minimal game-domain loop to validate domain packs, rules, fields, and card requirements without rewriting the entire frontend or adding an online game database. This evidence feeds the 1.0.0 frontend rewrite and multi-domain release.

## 8. v1.0.0 New Frontend and Multi-Domain Rater

- `XDRate` 1.0.0 rebuilds the frontend against the stable core and launches with music, anime, books, film/television, and games.
- Build the new frontend as a parallel entry rather than overwriting 0.x; maintain the old entry until import/export, sharing, accessibility, and rollback gates pass.
- Declarative domain packs provide axes, fields, scoring rules, copy, and card labels over shared scoring, archive, migration, and export contracts.
- Preserve v0.3.x music compatibility; politics, sensitive identity axes, and unresearched domains stay out of defaults.

## 9. v1.1.0 WeChat Mini Program

- Adapt the 1.0.0 domain core to the WeChat container.
- Validate music first, then expose anime, books, and film/TV; keep WeChat file, album, share, and lifecycle APIs behind narrow adapters.
- Add independent review, package-size, privacy, permissions, and real-device gates.

## 10. v2.0.0 Standalone App Entity

- Start only after the 1.1.0 WeChat and sharing evidence is stable.
- Freeze Android/iOS identity, upgrades, signing, permissions, lifecycle, and store strategy.
- Choose Tauri Mobile, Flutter, or another shell from evidence and reuse the 1.x domain, algorithm, Schema, and card contracts.

## 11. Versions and branches

- Use semantic versions such as `0.1.0` and `0.2.0`.
- Use short-lived feature branches and Pull Requests into `main`.
- Every release tag includes changes, known issues, schema version, and algorithm version.
- A breaking archive change increments the schema major version and provides migration or a clear incompatibility message.

## 12. Definition of done

A feature is complete only when:

- Requirements and boundaries work, including empty, error, and loading states;
- New logic has risk-appropriate automated tests;
- Keyboard and current target desktop behavior were manually checked; mobile behavior becomes a gate only for a mobile-scoped release;
- TypeScript, lint, tests, and build pass;
- Chinese and English message keys are complete;
- Relevant documentation and changelog are updated;
- It adds no undisclosed network request or data collection.
