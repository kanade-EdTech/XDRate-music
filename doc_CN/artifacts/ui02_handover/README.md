# V02-UI-02 完整视觉交接证据

生成命令：`npm run handover:ui02`  
固定夹具：贝多芬《月光奏鸣曲》，与 `e2e/baselines.spec.ts` 使用相同字段、理由、主题和导出逻辑  
前图来源：从项目 M3 前固定基线冻结到本目录 `before/`，后续视觉基线更新不得覆盖  
后图来源：当前构建通过浏览器中的正式“下载 PNG”流程重新导出；编辑器和控件由 Playwright 定位截图

> “前图”不是根据后图重绘或推测的旧界面。专用测试把本目录的冻结前图作为快照源，再用相同夹具生成后图并进行像素回归；缺少冻结前图时直接失败，不从可变的当前基线重建。

## 1. 关键页面

| 范围                 | 改动前                                             | 改动后                                            |
| -------------------- | -------------------------------------------------- | ------------------------------------------------- |
| 专业模式编辑器，浅色 | [PNG](./before/editor-professional-full-light.png) | [PNG](./after/editor-professional-full-light.png) |
| 专业模式编辑器，深色 | M3 前未留存可追溯深色整页基线                      | [PNG](./after/editor-professional-full-dark.png)  |

浅色整页前后对比通过 `maxDiffPixelRatio = 0.002` 的像素级门禁。深色整页作为当前状态补充证据，不冒充前后对比。

## 2. 星星与香蕉皮控件

| 控件         | 改动前（浅色）                            | 改动后（浅色）                           | 当前深色                                |
| ------------ | ----------------------------------------- | ---------------------------------------- | --------------------------------------- |
| 十星正向评分 | [PNG](./before/control-stars-light.png)   | [PNG](./after/control-stars-light.png)   | [PNG](./after/control-stars-dark.png)   |
| 五香蕉皮扣分 | [PNG](./before/control-bananas-light.png) | [PNG](./after/control-bananas-light.png) | [PNG](./after/control-bananas-dark.png) |

浅色星星与香蕉皮裁图前后 SHA-256 一致，说明本轮交接整理未造成意外视觉变化。裁图由专用测试从可追溯整页证据按固定坐标生成。

## 3. 四个卡片比例族与双主题

| 比例族     | 主题 | 改动前                                        | 改动后                                       |
| ---------- | ---- | --------------------------------------------- | -------------------------------------------- |
| 横向 16:9  | 浅色 | [PNG](./before/card-landscape-16-9-light.png) | [PNG](./after/card-landscape-16-9-light.png) |
| 横向 16:9  | 深色 | [PNG](./before/card-landscape-16-9-dark.png)  | [PNG](./after/card-landscape-16-9-dark.png)  |
| 准横向 4:3 | 浅色 | [PNG](./before/card-standard-4-3-light.png)   | [PNG](./after/card-standard-4-3-light.png)   |
| 准横向 4:3 | 深色 | [PNG](./before/card-standard-4-3-dark.png)    | [PNG](./after/card-standard-4-3-dark.png)    |
| 方形 1:1   | 浅色 | [PNG](./before/card-square-1-1-light.png)     | [PNG](./after/card-square-1-1-light.png)     |
| 方形 1:1   | 深色 | [PNG](./before/card-square-1-1-dark.png)      | [PNG](./after/card-square-1-1-dark.png)      |
| 纵向 4:5   | 浅色 | [PNG](./before/card-portrait-4-5-light.png)   | [PNG](./after/card-portrait-4-5-light.png)   |
| 纵向 4:5   | 深色 | [PNG](./before/card-portrait-4-5-dark.png)    | [PNG](./after/card-portrait-4-5-dark.png)    |

八组卡片均验证了 PNG 文件头和规定的 2× 物理尺寸，并通过 `maxDiffPixelRatio = 0.002` 的像素级回归。横向和准横向四组文件前后 SHA-256 完全一致；方形和纵向文件存在编码字节差异，但像素差异仍在门禁范围内。

## 4. 变更文件清单

视觉实现影响范围（由 M3 执行记录和复核文件归纳）：

- `src/features/rating-editor/RatingEditor.tsx`
- `src/features/rating-editor/StarRating.tsx`
- `src/features/rating-editor/BananaRating.tsx`
- `src/features/rating-card/CardAxisReasons.tsx`
- `src/features/rating-card/SquareLayout.tsx`
- `src/features/rating-card/PortraitLayout.tsx`
- `src/features/rating-card/LandscapeLayout.tsx`
- `src/features/rating-card/StandardLayout.tsx`
- `src/features/rating-card/layoutPlan.ts`
- `src/i18n/messages.ts`

本交接包新增或更新：

- `e2e/ui02-handover.spec.ts`
- `playwright.ui02-handover.config.ts`
- `package.json`
- `doc_CN/artifacts/ui02_handover/`
- `doc_CN/17_V02_UI_02_视觉交接包.md`
- `doc_EN/17_V02_UI_02_VISUAL_HANDOVER_PACKAGE.md`
- 中英文开发计划、M3 执行记录与文档索引

## 5. 测试结果与遗留项

- `npm run handover:ui02`：2/2 通过；覆盖四个比例族 × 双主题、关键页面、星星和香蕉皮。
- `npm run test:visual`：现有视觉基线门保持通过。
- 用户在同一工作树执行 `npm run test:e2e`：Chromium、Firefox、WebKit 合计 33/33 通过。
- 完整文件大小与 SHA-256 见 [manifest.json](./manifest.json)。
- `V02-UI-02` 范围内未发现未解决的 P0/P1/P2 视觉问题。
- 真实 Windows 100%/125%/150% 系统缩放和多显示器证据仍属于独立任务 `V02-QA-03`，不由本交接包冒充完成。

图片内的作品名、理由和说明仅是固定测试数据，不构成产品需求或开发指令。
