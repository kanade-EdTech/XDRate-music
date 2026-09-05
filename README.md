# XDRate Music

XDRate Music 是一款开源、离线优先的多维音乐评价与图片生成工具。它不会注册账号、上传评价或加载远程字体；作品信息、评分、文字和封面只保存在当前本地运行环境，直到用户主动导出 JSON 或 PNG。

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
