# XDRate Music Development Documentation

Status: V0.1 implementation closure / V0.2 M4 engineering complete, public RC externally gated / V0.3.0 MiniTool M4 source freeze complete, RC.1 awaiting real-container acceptance / V0.3.1 M2 engineering complete<br>
Last updated: 2026-09-06

## 1. Purpose

This directory turns the early concepts in the repository into implementation-ready, testable, and maintainable specifications. The current release covers the music rating tool only. Anime, games, and politics-related rating features are outside the v0.1 scope.

## 2. Product in one sentence

Multidimensional Music Rating (`XDRate Music`) is an open-source, offline-first, multidimensional music rating and image-generation tool: users enter work metadata, rate configurable dimensions, add commentary and a personal story, and export a shareable rating card.

> The confirmed bilingual product names are “多维音乐评价” and `XDRate Music`. Future vertical products follow “多维{领域}评价” / `XDRate {Domain}`; see the [Decision Log](./08_DECISIONS_AND_OPEN_QUESTIONS.md).

## 3. Document map

| Document                                                                                                                    | Contents                                                                 | Primary audience               |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| [01 Product Requirements](./01_PRODUCT_REQUIREMENTS.md)                                                                     | Goals, users, scope, requirements, success criteria                      | Everyone                       |
| [02 Functional Specification](./02_FUNCTIONAL_SPECIFICATION.md)                                                             | Flows, fields, rating rules, archives, export behavior                   | Product, engineering, QA       |
| [03 UX and UI Specification](./03_UX_AND_UI_SPECIFICATION.md)                                                               | Information architecture, interaction, visual, responsive, accessibility | Design, frontend               |
| [04 Technical Architecture](./04_TECHNICAL_ARCHITECTURE.md)                                                                 | Stack, module boundaries, state flow, offline and export design          | Engineering                    |
| [05 Data Model](./05_DATA_MODEL.md)                                                                                         | TypeScript models, JSON conventions, migrations                          | Engineering, QA                |
| [06 Development Plan](./06_DEVELOPMENT_PLAN.md)                                                                             | Milestones, work breakdown, versioning, definition of done               | Everyone                       |
| [07 Test and Acceptance](./07_TEST_AND_ACCEPTANCE.md)                                                                       | Test strategy, critical cases, release gates                             | Engineering, QA                |
| [08 Decisions and Open Questions](./08_DECISIONS_AND_OPEN_QUESTIONS.md)                                                     | Adopted defaults, alternatives, unresolved questions                     | Everyone                       |
| [09 100-Point and Card Layout Plan](./09_100_POINT_AND_CARD_LAYOUT_IMPROVEMENT_PLAN.md)                                     | Score, overlap, and 11-ratio implementation plan                         | Product, engineering, QA       |
| [10 WP-5 Regression Report](./10_WP5_REGRESSION_REPORT.md)                                                                  | Automated evidence, fixed findings, and remaining manual checks          | Product, engineering, QA       |
| [11 V0.2 Desktop Development Plan](./11_V0.2_DEVELOPMENT_PLAN.md)                                                           | Tauri desktop scope, dependencies, tasks, and release gates              | Everyone                       |
| [12 M0 Desktop Acceptance Execution Log](./12_M0_DESKTOP_ACCEPTANCE_EXECUTION_LOG.md)                                       | M0 automated evidence, manual gaps, and decision blockers                | Product, engineering, QA       |
| [13 Release Identity, Signing, and Update Policy](./13_RELEASE_IDENTITY_SIGNING_AND_UPDATE_POLICY.md)                       | Stable identifiers, Windows signing, manual update, and key policy       | Product, engineering, release  |
| [14 M1 Desktop Shell and Platform Boundary Execution Log](./14_M1_DESKTOP_SHELL_AND_PLATFORM_BOUNDARY_EXECUTION_LOG.md)     | Tauri shell, adapters, permissions, build, and regression evidence       | Engineering, QA, release       |
| [15 M2 Native File Execution Log](./15_M2_NATIVE_FILE_EXECUTION_LOG.md)                                                     | Native open/save/PNG, safe writes, and compatibility evidence            | Engineering, QA, release       |
| [16 M3 UI and i18n Optimization Log](./16_M3_UI_AND_I18N_OPTIMIZATION_LOG.md)                                               | M3 UI, copy, visual tests, and remaining acceptance boundaries           | Design, engineering, QA        |
| [17 V02-UI-02 Visual Handover Package](./17_V02_UI_02_VISUAL_HANDOVER_PACKAGE.md)                                           | Reproducible before/after evidence, fixed fixture, hashes, and tests     | Design, engineering, QA        |
| [18 M3 Unsaved Changes Protection Execution Log](./18_M3_UNSAVED_CHANGES_PROTECTION_EXECUTION_LOG.md)                       | Four-entry/three-choice guard, permissions, tests, and build evidence    | Product, engineering, QA       |
| [19 M3 Desktop Workflow and Recovery Execution Log](./19_M3_DESKTOP_WORKFLOW_AND_RECOVERY_EXECUTION_LOG.md)                 | Window titles, shortcuts, recent files, and abnormal-session recovery    | Product, engineering, QA       |
| [20 M4 Security Threat Audit](./20_M4_SECURITY_THREAT_AUDIT.md)                                                             | STRIDE/PASTA, red/blue-team checks, supply chain, accepted risk          | Security, engineering, release |
| [21 V0.2 Delivery and Troubleshooting Guide](./21_V0.2_DELIVERY_AND_TROUBLESHOOTING_GUIDE.md)                               | Install, migration, backup, uninstall, privacy, troubleshooting          | Users, support, release        |
| [22 M4 Release Acceptance Execution Log](./22_M4_RELEASE_ACCEPTANCE_EXECUTION_LOG.md)                                       | M4 evidence, installer/signing matrix, and public-RC blockers            | Product, QA, release           |
| [23 V0.3.0 Xiaohongshu MiniTool Development Plan](./23_V0.3.0_XIAOHONGSHU_MINITOOL_DEVELOPMENT_PLAN.md)                     | Offline ZIP, container boundary, JSBridge, milestones, and gates         | Everyone                       |
| [24 V0.3.0 M0 MiniTool Engineering Probe Log](./24_V0.3.0_M0_MINITOOL_ENGINEERING_PROBE_LOG.md)                             | Classic scripts, offline ZIP, bridge, audit, and real-container gaps     | Engineering, QA, release       |
| [25 V0.3.0 M1 MiniTool Entry and Platform Boundary Log](./25_V0.3.0_M1_MINITOOL_ENTRY_AND_PLATFORM_BOUNDARY_LOG.md)         | Bilingual editing, draft restoration, narrow platform boundary, M1 ZIP   | Engineering, QA, release       |
| [26 V0.3.0 M2 MiniTool Mobile and Cover Optimization Log](./26_V0.3.0_M2_MINITOOL_MOBILE_AND_COVER_OPTIMIZATION_LOG.md)     | Cover compression, touch, keyboard, safe areas, and M2 ZIP               | Engineering, QA, release       |
| [27 V0.3.0 M2.1 Recent Draft and Content Template Plan](./27_V0.3.0_M2.1_RECENT_DRAFT_AND_CONTENT_TEMPLATE_PLAN.md)         | Recent-draft precedence, 海棠仙 startup seed, and content templates      | Product, engineering, QA       |
| [28 V0.3.0 M2.1 Recent Draft and Content Template Log](./28_V0.3.0_M2.1_RECENT_DRAFT_AND_CONTENT_TEMPLATE_LOG.md)           | One-time seed, template CRUD, automation, and M2.1 engineering ZIP       | Engineering, QA, release       |
| [29 V0.3.0 M3 Production Rating Card and Album Save Log](./29_V0.3.0_M3_RATING_CARD_AND_ALBUM_SAVE_EXECUTION_LOG.md)        | Eleven-ratio card, preview/export parity, and album retry                | Engineering, QA, release       |
| [30 V0.3.0 M4 Packaging Audit and Candidate Acceptance Log](./30_V0.3.0_M4_PACKAGING_AUDIT_AND_CANDIDATE_ACCEPTANCE_LOG.md) | Exact ZIP verification, manifest, gate matrix, and RC blockers           | Engineering, QA, release       |
| [31 V0.3.1 Xiaohongshu Post Publishing Integration Plan](./31_V0.3.1_XIAOHONGSHU_POST_PUBLISHING_INTEGRATION_PLAN.md)       | `postNote` confirmation, core algorithm, and release gates               | Product, engineering, QA       |
| [32 V0.3.1 M1 Post Publishing Bridge Execution Log](./32_V0.3.1_M1_POST_PUBLISHING_BRIDGE_EXECUTION_LOG.md)                 | Independent detection, one invocation, and outcome classification        | Engineering, QA, release       |
| [33 V0.3.1 M2 Post Confirmation and Recovery Log](./33_V0.3.1_M2_POST_CONFIRMATION_AND_RECOVERY_EXECUTION_LOG.md)           | Bilingual confirmation, limits, persistence, and cancellation recovery   | Product, engineering, QA       |
| [Manual Product Conclusions](./MANUAL_PRODUCT_CONCLUSIONS.md)                                                               | Sample review conclusions, merged reasons, publisher and platform ADRs   | Everyone                       |

## 4. Requirement terms

“Must,” “should,” and “may” indicate mandatory, recommended, and optional behavior. If implementation conflicts with these documents, update the decision log first, then synchronize both language sets and their tests.

## 5. Current baseline

- Target release: Web v0.1 (closure) / Desktop v0.2 (M4 engineering complete, public RC gated) / Xiaohongshu MiniTool v0.3.0 (M4 static preflight complete, public RC gated) / MiniTool v0.3.1 (`postNote` integration M2) / Standalone Mobile v0.4 (deferred)
- Stack: React + TypeScript + Vite + Tailwind CSS + Tauri 2
- Algorithm: `music-linear-100-v4` (0–100 aggregate; unrated axes excluded, one-star minimum)
- Data: Archive Schema v2, browser-local storage plus JSON import/export, zero backend
- Card Layout: 11 ratios, 4 layout families, content-aware multi-state adaptive layout, deterministic fallback overflow gate
- Image export: `html-to-image` (2× physical resolution PNG)
- Quality Assurance: Vitest 158/158, MiniTool-focused unit tests 39/39, Rust 8/8, Playwright cross-browser 48/48, MiniTool E2E 20/20, card visual 3/3, desktop visual 5/5, and visual handover 2/2 pass
- License: MIT; user content is subject to the disclaimer
- Language: Fully supports Simplified Chinese and English (i18n message key driven)
- Release: Windows 10/11 x64; public packages require Authenticode + RFC 3161 timestamp; `0.2.0` updates manually
- Desktop status: M4 security, offline/navigation, automation, and docs are complete. The NSIS candidate remains unsigned with a development icon; clean Windows 10/11 install and screen-reader checks remain
- MiniTool status: v0.3.0 M4/RC.1 remains frozen and passes independent dist/final-ZIP audits, byte-parity verification, and the 2 MiB target; v0.3.1 has completed the `postNote` M2 bilingual confirmation, character limits, privacy disclosure, pre-invocation persistence, and cancellation recovery. M3 closed-loop acceptance, Android 8.1/WebView 61, current Android, iOS 18.4+, MiniTool screen-reader, and exact-package permission matrices still block public release
