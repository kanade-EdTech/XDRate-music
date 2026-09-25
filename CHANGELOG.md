# Changelog

All notable changes are documented here.

## 0.4.1 — Sharing optimization continuation

### Added

- Retains the v0.4.0 sharing flow: preview/export parity, eleven ratios, album save, native handoff, stale-image choice, cancellation recovery, persistence-before-submit, and explicit failure classification.
- Restores the historical metadata markup for editable artist and album labels: compact editable title text followed by a single value input.
- Publishes a new MiniTool package namespace for v0.4.1 without replacing the historical v0.4.0 artifacts.

### Validation

- Typecheck passed; MiniTool unit tests: 44/44; MiniTool E2E: 22/22; offline artifact audit: 0 warnings and 0 errors.

## Unreleased — Roadmap reset and sharing-first v0.4.0

### Planned

- Re-scope v0.4.0 to sharing completion: card/export parity, album save, system share, platform handoff, and cancellation/failure recovery.
- Plan v0.5.0 as a minimal game-rating pilot to validate the domain-pack contract before the 1.0.0 frontend rewrite.
- Move the multi-domain `XDRate` rater to v1.0.0 with music, anime, books, and film/TV as the first domains.
- Plan v1.1.0 as the WeChat Mini Program adaptation.
- Defer the standalone Android/iOS App entity, native packages, and store release to v2.0.0.

## Unreleased — Bili Toy adaptation

### Planned

- Adapt the current v0.3.1 offline rating-card flow into an isolated Bili Toy build before v0.4.0 sharing-completion work.
- Add relative-resource/subpath audits, `toy_doctor.py` content preflight, package manifests, and a JSON preview-before-review gate.
- Keep Xiaohongshu Bridge capabilities, Bilibili cloud services, and native mobile APIs out of the first Toy candidate.

## 0.3.3 — Toy interaction repair

### Added

- A prominent one-click clear action for seeded work text, scores, reasons, cover, and narrative fields while preserving templates and page structure.
- A gray empty-state explanation that clarifies placeholder text is not scored, exported, or saved as work content.

### Fixed

- Professional mode now restores its five preset rating axes when an older Toy draft contains an empty professional axis list; only custom mode starts intentionally blank.
- This version is the current Toy development baseline for the 0.3.3 candidate.

## 0.3.1 — M4 device candidate

### Added

- Independent `postNote` capability detection and a narrow native handoff adapter with explicit accepted, cancelled, unavailable, and failed outcomes.
- Bilingual publication confirmation with exact image preview, 20-character title and 1,000-character body limits, character counters, and privacy disclosure.
- Save-before-handoff persistence plus complete editing-state and focus restoration after cancellation or failure.
- Eleven-ratio end-to-end coverage proving that the confirmed PNG data URI and the image passed to `postNote` are byte-identical.
- A device-acceptance plan for the official PC simulator, Android 8.1/WebView 61, current Android, and iOS 18.4+.

### Changed

- Skipped a standalone M3 milestone by product decision while retaining all card-parity, accessibility, focus, and fallback requirements as merged M4 gates.
- Moved v0.3.1 packaging, filenames, manifests, and hash sidecars into a separate namespace so the frozen v0.3.0 RC remains immutable.
- User-facing copy states that native Bridge acceptance enters Xiaohongshu's posting flow and is not proof of public publication.

### Validation

- Vitest: 158/158; MiniTool unit tests: 39/39; MiniTool E2E: 22/22; final-ZIP verifier: 2/2.
- Exact RC.1: `xdrate-music-v0.3.1-rc.1.zip`, 254,566 bytes, SHA-256 `192efc241d8ad8f6a29d686d3f3d43d2c67b5eb1a79772859ed39fb0f2ec9f02`, source commit `9c2fc498f6e4956943bc9b94a3b3257fcca5f64b` with `dirty=false`.

### Release status

- This is an engineering/device candidate, not a public release. Exact-package simulator, Android, iOS, permission-matrix, TalkBack, VoiceOver, and publication-boundary evidence remains required.

## 0.2.0 — In development

### Added

- Tauri 2 Windows x64 desktop shell with native XDRate archive Open, Save, Save As, and PNG save dialogs.
- Least-capability native file boundary using user-mediated paths and opaque session handles instead of arbitrary frontend filesystem access.
- Interruption-safe sibling temporary writes with flushed, atomic Windows replacement and preservation of the previous target on failure.
- Desktop file association and dirty-state tracking, including deterministic edits-during-save and same-file concurrency behavior.
- Web v0.1 → Desktop v0.2 → Web archive compatibility coverage without serializing desktop paths or handles.
- Desktop title/save state, keyboard commands, recent files, abnormal-session recovery, and unsaved-change protection.
- Split CI gates for Web, security/offline boundaries, Windows native tests, visual regression, and release-candidate aggregation.
- Bilingual M4 security audit, delivery/troubleshooting guide, and release acceptance record.

### Security

- The main window grants only `allow-native-files`, close-window, and set-title capabilities; no arbitrary filesystem, shell, process, HTTP, or updater command is enabled.
- Archives are limited to 16 MiB and PNGs to 64 MiB with native envelope/signature validation before persistence.
- Uploaded and archived covers allow only PNG/JPEG/WebP with MIME and magic-byte agreement; desktop string PNG sources allow only `data:` and `blob:`.
- Native open/direct-save rejects symlinks, non-regular files, and Windows reparse points, and uses bounded reads plus interruption-safe replacement.
- Production WebView navigation is default-deny and CSP blocks remote/wildcard sources; project checks freeze these boundaries.
- Node production audit reports 0 vulnerabilities. RustSec reports 0 vulnerabilities and 17 accepted warnings, documented in the M4 threat audit.

## 0.1.0 — Unreleased

### Added

- 多维音乐评分：简易/专业预设、自定义轴、重要等级、负面项及可解释综合分。
- 本地封面、11 种分享卡片比例（横向、准横向、方形、纵向 4 大布局族）、亮暗主题、SVG 图表与 2× PNG 导出。
- 浏览器本地草稿恢复、模板管理、完整 JSON 导入/导出、Schema v1 到 v2 自动迁移。
- 中英文界面文案、Vitest（8 个测试文件、42 个单元测试）、Playwright 跨浏览器测试（Chromium、Firefox、WebKit 共 33 个用例）及 axe 可访问性检查。
- 卡片内容画像与确定性布局计划（`layoutPlan.ts`）：四个比例族按 `sparse / balanced / dense` 密度分档，溢出时最多两次有界降级。
- 启用“显示分项与理由”后，卡片显示启用分项的非空理由，并在预览与 PNG 导出中共用布局计划。
- **内容感知与卡片多状态自适应布局**：针对“全内容”、“仅分项理由”与“无描述（极简评分海报）”状态自适应分配空间，消除下半区与侧边死区。
- **图表与排版数值防换行**：雷达图图例自适应单列/双列、图例轴名完整展示无截断、所有评分数值增加 `shrink-0 tabular-nums whitespace-nowrap`，彻底杜绝浮点数在小数点处折行。

### Changed

- 百分制线性算法迭代为 `music-linear-100-v3`：LV0–LV6 权重调整为 0、0.25、0.75、1、1.5、2.5、5，新轴默认等级改为 LV3。
- 百分制线性算法迭代为 `music-linear-100-v4`：新轴初始为未评分，未评分轴从分子、权重分母及评分卡中排除；首次打星后最低为 1.0，旧 v3 的 0 分迁移为未评分、0–1 分迁移为 1.0。
- 十星控件收紧为 36×36 CSS px 单星热区并移除正向归零按钮；香蕉皮维持 44×44 CSS px 并保留归零。
- 十星控件进一步采用 32×40 CSS px 纵向热区，轴名称/评分栏调整为 40%/60%，确保 1280px 及以上桌面验收视口无需横向滚动即可完整显示十星。
- 取消正向分数数值输入，基础评分收敛为 1–10 整星整数；旧小数星级导入时四舍五入，综合分仍使用未舍入权重中间值并保留 1 位小数。
- “专辑”改为可自定义名称的作品信息字段；自定义名称随草稿和完整存档保存并显示在卡片中，旧 v2 存档自动兼容。
- 可编辑“专辑”标签增加双态视觉：静止时透明背景与弱边框，聚焦后切换为标准文本框样式。
- “艺术家”采用与“专辑”一致的可编辑标签；清空后显示浅色默认占位符，重新输入默认名称会恢复默认语义。未改写、清空或重新输入的默认标签均不进入卡片，只有其他非空自定义标签显示“名称：内容”。作品信息可增加最多 6 个自定义条目，其名称框始终采用标准文本框样式，并随卡片、草稿和完整存档同步。
- 存档和模板升级为 Schema v2，加入算法版本，并自动迁移旧卡片比例和浏览器 v1 本地数据。
- 增加跨浏览器回归：11 种比例 × 明暗主题的 DOM 溢出检查、自动保存恢复、截断提示、1:1 图例文本完整性断言、空描述自适应和 2× PNG 尺寸验证；修复页脚内边距导致的溢出误报。

### Privacy

- 无账号、无遥测、无后端和无远程字体。
- 核心流程在 Chromium、Firefox 和 WebKit 中验证没有第三方网络请求。
