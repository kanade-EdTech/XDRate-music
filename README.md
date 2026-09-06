# XDRate Music

XDRate Music 是一款开源、离线优先的多维音乐评价与图片生成工具。它不会注册账号、上传评价或加载远程字体；作品信息、评分、文字和封面只保存在当前本地运行环境，直到用户主动导出 JSON 或 PNG。

## 版本路线

- `0.1.x`：Web MVP。
- `0.2.x`：Windows 10/11 x64 桌面版。
- `0.3.0`：小红书小工具离线 ZIP；M3 已接入正式评分卡、11 种比例、预览/导出同源渲染与相册保存重试，官方容器与真机余项待验收。详见[专项开发计划](./doc_CN/23_V0.3.0_小红书小工具开发计划.md)和[M3 执行记录](./doc_CN/29_V0.3.0_M3_评分卡与相册保存执行记录.md)。
- `0.3.1`：在不改动 v0.3.0 候选包的前提下增加用户主动触发的小红书原生发帖联动；产品决定跳过独立 M3，相关门禁并入 M4。当前已生成可追溯的 RC.1 真机送测包，公开发布仍受多端真机和读屏门禁阻塞。详见[联动开发计划](./doc_CN/31_V0.3.1_小红书帖子发布联动开发计划.md)和[M4 执行记录](./doc_CN/34_V0.3.1_M4_候选包与合并验收执行记录.md)。
- `0.4.x`：原 v0.3 独立移动版计划（PWA / Tauri Mobile 评估）顺延至此版本。

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的本地地址，填写作品信息和评分后即可预览、下载 PNG，或导出完整 JSON 存档。

## Windows 桌面开发

M2 已完成 Tauri 2 原生文件纵向切片，要求 Windows 10/11 x64、Microsoft C++ Build Tools、WebView2 和 Rust MSVC 工具链。

```bash
npm run desktop:dev
npm run desktop:build
```

`desktop:dev` 启动桌面开发窗口；`desktop:build` 生成 `src-tauri/target/release/bundle/nsis/XDRate Music_0.2.0_x64-setup.exe`。桌面版现已支持系统对话框打开、保存、另存 XDRate 存档及保存 PNG；浏览器版仍使用下载式工作流。当前候选包未签名且使用开发图标，不可作为公开正式包发布。

## 小红书小工具 v0.3.0 M4 预检版

```bash
npm run minitool:dev
npm run minitool:build
npm run minitool:audit
npm run minitool:test
npm run minitool:test:e2e
npm run minitool:pack
npm run minitool:pack:m4
```

`minitool:pack:m4` 生成 M4 预检包；源码冻结后使用 `npm run minitool:pack:rc` 生成 RC.1 送测 ZIP、SHA-256 和机器可读清单，并验证最终 ZIP 与已审计目录逐字节一致。RC.1 在完成官方 PC 模拟器、Android 8.1/WebView 61、当前 Android 和 iOS 18.4+ 小红书容器同包验收前不得公开发布。

## 质量检查

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:rust
npm run build
npm run test:e2e
npm run test:visual
npm run check:versions
npm run check:desktop-config
npm run check:security
```

`test:e2e` 在 Chromium、Firefox 和 WebKit 中运行可访问性与隐私冒烟测试。首次执行前需要运行 `npx playwright install chromium firefox webkit`。

`test:visual` 在单个 Chromium 工作进程中，将真实 2× PNG 导出和完整编辑器截图与 13 个已归档基线进行只读比较。视觉变更经过人工确认后，才能使用 `npm run baseline:update` 显式更新基线。

`check:security` 检查本地 CSP、Tauri 最小权限、安全媒体 URL、原生导航策略、危险执行接收点和高置信秘密模式；`test:rust` 验证原生文件与导航边界。M4 的完整安全结论和发布阻塞项见[安全威胁审计](./doc_CN/20_M4_安全威胁审计.md)与[发布验收记录](./doc_CN/22_M4_发布验收执行记录.md)。

## 数据与隐私

- 草稿和模板存放在当前浏览器的本地存储中；清除浏览器站点数据会删除它们。
- 请定期导出 `.xdrate.json` 备份，尤其是在更换浏览器或清理数据之前。
- 封面仅接受用户本地选择的 JPEG、PNG 或 WebP，大小不得超过 10 MB。
- 软件不会主动发送用户数据；用户仍应只上传有权使用的素材。

完整规则见 [免责声明](./DISCLAIMER.md)，开发规范见 [中文文档](./doc_CN/README.md) 和 [English documentation](./doc_EN/README.md)。
