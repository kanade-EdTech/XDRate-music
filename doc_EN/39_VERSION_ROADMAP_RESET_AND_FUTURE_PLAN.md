# Version Roadmap Reset and Future Development Plan

Status: current roadmap; supersedes the former v0.4.0 mobile-app plan from 2026-09-22.

## 1. Decision

The standalone App entity is no longer an early v0.4.0 deliverable. Native Android/iOS packages, lifecycle integration, and store release are deferred to v2.0.0. This keeps sharing, the domain model, and container-specific products stable before taking on native maintenance cost.

```text
0.3.x  Music rater: desktop / Xiaohongshu MiniTool / Bili Toy
  ↓
0.4.0  Sharing completion: cards, export, system share, handoff, recovery
  ↓
0.5.0  Game-rating pilot: validate the game domain pack and rules
  ↓
1.0.0  XDRate: music mainline + independent anime experiment; books/film contracts
  ↓
1.1.0  WeChat Mini Program: container adapter on the multi-domain core
  ↓
2.0.0  Standalone App entity: native packages, lifecycle, system APIs, stores
```

## 2. v0.4.0: Sharing completion

### Goals

- Make the existing rating card reliably shareable without building a standalone App.
- Unify preview, PNG export, album save, system share, and platform handoff contracts.
- Classify success, cancellation, denial, failure, return, and retry without losing drafts.
- Remain offline-first; add no accounts, cloud sync, or social backend.

### Scope

1. Finish all 11 ratios, truncation, long-copy handling, and image-quality gates.
2. Unify filenames, resolution, transparency, album save, and system-share adapters.
3. Complete confirmation, character counts, privacy copy, pre-call persistence, and cancellation recovery.
4. Keep desktop, MiniTool, and Bili Toy adapters separate while sharing rating/card/error contracts.
5. Add automated, device, and reproducible export evidence for the sharing loop.
6. Add `Personal signature (optional)` on the sharing confirmation page; empty means no layout space, no score effect, and the same value across preview, PNG, album, and handoff.

### Out of scope

- Android/iOS standalone packages, Tauri Mobile, or Flutter.
- Public anime/book/film rating products.
- Scheduled publication or social-account automation.

### Exit gates

- Preview and export match across all 11 ratios with no overflow.
- Every share outcome is distinguishable and recoverable.
- Music algorithm, Archive Schema, and template data remain compatible.
- Desktop, MiniTool ZIP, and Toy builds pass their own audits.

## 3. v0.5.0: Game-rating pilot

v0.5.0 is a domain-model pilot, not the full 1.0.0 frontend rewrite. Add a minimal game-rating flow to the existing frontend to validate “domain pack + shared rating engine + domain card.”

- Define game fields, default axes, reasons, and optional deduction rules.
- Reuse the music algorithm, archive, and export pipeline rather than duplicating game logic.
- Keep it as an internal or opt-in pilot; do not promise a game database, network metadata, or leaderboards.
- Record requirements for long copy, covers, platform/version fields, and card layout for the 1.0.0 frontend.
- Success means the domain contract is proven, not that the game catalog is large.

### Personal-rating template policy

The 0.5.0 pilot may ship a small set of game templates with covers, but these are author examples and engineering fixtures—not official ratings, a public leaderboard, or platform recommendations. Each template may contain:

- a cover supplied by the user or clearly cleared for project use;
- title, platform, and version metadata;
- the author's personal scores, reasons, deductions, and overall review;
- a copyable domain-template structure for starting a new review.

The templates must follow these boundaries:

1. Label them as `Example template / personal rating` so they cannot be mistaken for objective conclusions.
2. Allow apply, copy as new, rename, and delete; deleting an example must not affect the rater or other archives.
3. Keep seeded template data separate from the user's edited work; edits must never write back into the built-in example.
4. Track cover provenance, attribution, and usage rights. Commercial covers without clear permission may be used only in local probes and must not ship in the public Toy package.
5. Preserve the empty/unrated semantics after clearing. Example copy must not silently become the user's default content.

Start with only three to five contrasting templates to cover long titles, platform fields, long reasons, different score distributions, and cover ratios. The count exists to validate the domain contract, not to create a game catalog.

## 4. v1.0.0: XDRate music mainline and independent anime experiment

Version 1.0.0 does not rebuild every product. Music remains the existing mainline; anime is the first independent domain experiment for validating axes, visual language, empty states, cards, and sharing. Books and film/TV remain domain contracts and research fixtures until the anime evidence review. Declarative domain packs provide axes, fields, scoring rules, copy, and card labels; the rating engine, archive, and export flow remain shared.

### Compatibility-first evolution

- Do not define 1.0.0 as a whole-product rewrite; preserve the music mainline and validated 0.x interactions.
- Use an independent anime experiment entry to validate the domain pack, visual system, and interactions; run it in parallel where needed instead of overwriting the old entry.
- Freeze rating, Archive, card, and sharing contracts before moving reusable screens and interactions.
- The new frontend must read old archives and prove export compatibility with snapshots.
- Remove or replace an old entry only after domain, import/export, sharing, accessibility, and rollback gates pass.

- Freeze `DomainDefinition`, registration, migration, and scoring-rule contracts.
- Approve defaults, deductions, empty states, and golden fixtures for the independent anime experiment.
- Keep books and film/TV as contract/research fixtures; the game pilot remains bounded by the v0.5.0 fixtures.
- Use `#66CCFF` as the anime experiment's first primary color and evaluate the permutations of `66`, `CC`, and `FF`: `#66CCFF`, `#66FFCC`, `#CC66FF`, `#CCFF66`, `#FF66CC`, and `#FFCC66`. Each permutation must pass contrast, readability, light/dark background, and PNG export-parity checks.
- Support domain switching, custom axes, domain templates, and domain cards.
- Preserve v0.3.x music results, archives, and cards.
- Keep native App, cloud accounts, leaderboards, and automated publication out of 1.0.0.

## 5. v1.1.0: WeChat Mini Program

- Adapt the 1.0.0 multi-domain rater to the WeChat container.
- Reuse the domain core, scoring, cards, and local-draft boundary; implement separate WeChat file, album, share, and lifecycle adapters.
- Validate music first, then expose anime, books, and film/TV.
- Add independent review, package-size, permissions, privacy, sharing, and real-device gates.
- Keep WeChat APIs behind narrow platform services; never couple them to domain logic.

## 6. v2.0.0: Standalone App entity

Start only after the 1.1.0 WeChat loop, domain model, sharing flow, and migration evidence are stable.

- Freeze Android/iOS identity, package, upgrade, and signing strategy.
- Evaluate Tauri Mobile, Flutter, or another shell from evidence rather than assumption.
- Implement offline install, files, album, share, lifecycle recovery, permissions, and crash recovery.
- Establish store privacy, permission, crash, rollback, and release procedures.
- Reuse the 1.x domain, algorithm, Schema, and card contracts rather than duplicating business logic.

## 6. Boundaries

| Version | Core question | Main deliverable | Explicitly deferred |
| --- | --- | --- | --- |
| 0.4.0 | Is sharing reliable? | Cards, export, save, system share, recovery | Standalone App, public multi-domain UI |
| 0.5.0 | Does the game domain contract hold? | Game-rating pilot and fixtures | Full new frontend, network database |
| 1.0.0 | Does the independent anime experiment and shared domain model hold? | Music mainline + anime experiment; books/film domain contracts | Native App, WeChat container, one-shot public release of every domain |
| 1.1.0 | Does WeChat host it well? | WeChat Mini Program and review gates | Native store release |
| 2.0.0 | Is an App entity justified? | Android/iOS packages and native loop | Unproven business rewrites |

Former documents that call v0.4.0 a standalone mobile-App validation release are historical; this document is the current development entry point.

## 7. Next steps

1. Track the `XDRateMusic` Toy review and, after approval, run smoke checks for the production URL, refresh, deep links, and mobile behavior.
2. Follow the [V0.4.0 Sharing Mechanism Implementation Plan](./41_V0.4.0_SHARING_MECHANISM_IMPLEMENTATION_PLAN.md) on `codex/v0.4.0-sharing`; implement snapshot invalidation, recovery idempotency, and failure classification without a native toolchain.
3. Follow the [V0.5.0 Game-Rating Pilot Development Plan](./42_V0.5.0_GAME_RATING_PILOT_DEVELOPMENT_PLAN.md) on `codex/v0.5.0-game-rating`, starting with the domain contract and personal-template inventory.
4. After the 0.5.0 evidence review, build the independent anime experiment entry while preserving the music mainline; do not overwrite 0.x.
5. Start the WeChat adapter only after the 1.0.0 domain review.
6. Charter v2.0.0 only after 1.1.0 evidence and maintenance-budget review.
