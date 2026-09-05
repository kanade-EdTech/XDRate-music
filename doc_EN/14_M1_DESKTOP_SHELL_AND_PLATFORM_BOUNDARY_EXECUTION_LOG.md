# M1 Desktop Shell and Platform Boundary Execution Log

Status: Passed  
Execution date: 2026-08-31  
Target version: `0.2.0`  
Target platform: Windows 10/11 x64

## 1. Verdict

M1 is complete. The same React/Vite source now builds independently for Web and for a Tauri 2 desktop shell. Both development and release candidates launch, and a Windows x64 NSIS installer was produced. The platform capability contract, desktop-workspace state, and least-privilege boundary are in place, so M2 can add native file workflows without changing the rating domain.

This log proves engineering integrity of a local candidate only. The candidate is not signed with the required public OV certificate and still uses the M1 development icon; it must not be distributed as a public release.

## 2. Completed work

| Work package | Implementation                                                                                                                   | Acceptance evidence                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| V02-SHELL-01 | Added `src-tauri/`, reused the Vite `src/`, and provided `desktop:dev`, `desktop:build`, and standalone `build:web`              | Development/release smoke and NSIS pass |
| V02-SHELL-02 | Made `package.json` the version source, injected it through Vite, showed version/publisher/runtime, and added drift checks       | `check:versions` and E2E pass           |
| V02-ARCH-01  | Defined `PlatformServices`; browser downloads remain; desktop is injectable and uses the M1 fallback; domain has no Tauri import | Platform-double unit tests pass         |
| V02-ARCH-02  | Separated path, revision, last-saved revision, dirty state, pending operation, and error                                         | Seven transition paths pass             |
| V02-SHELL-03 | Empty main-window capability; no file, dialog, shell, process, HTTP, or updater plugin; production CSP has no external network   | `check:desktop-config` passes           |

## 3. Locked M1 baseline

- Node.js `22.22.3`, npm `10.9.8`;
- Rust `1.98.0`, Cargo `1.98.0`;
- `@tauri-apps/cli` `2.11.4`, Rust `tauri` `2.11.5` locked by `Cargo.lock`;
- Tauri identifier `com.xdrate.music`;
- Product `XDRate Music`, publisher `Kehun_EdTech`;
- NSIS x64 installer with `currentUser` scope;
- Updater disabled; D-020 manual GitHub Releases updates remain authoritative;
- Zero native plugins in M1.

## 4. Architecture boundary

```text
RatingEditor / card export
  → PlatformServices
    ├─ browserPlatform: input + Blob/data-URL download
    └─ desktopPlatform: M1 browser fallback, M2 native injection point

rating/archive domain ──X──> Tauri API
```

PNG and JSON persistence now call the platform interface. M1 does not claim native open/save support: system dialogs, scoped paths, interruption-safe writes, and replacement confirmation belong to M2. Desktop paths and runtime state never enter Archive Schema v2, preserving Web/desktop compatibility.

## 5. Automated and build evidence

| Check                          | Result                                                  |
| ------------------------------ | ------------------------------------------------------- |
| `npm run format:check`         | Passed                                                  |
| `npm run lint`                 | Passed, zero errors                                     |
| `npm run typecheck`            | Passed, zero errors                                     |
| `npm test`                     | 10 files, 51/51 passed                                  |
| `npm run build:web`            | Passed, 136 modules                                     |
| `cargo fmt --check`            | Passed                                                  |
| `cargo check --locked`         | Passed                                                  |
| `npm run check:versions`       | All sources agree on `0.2.0`                            |
| `npm run check:desktop-config` | Least-privilege configuration passed                    |
| `npm run test:e2e`             | Chromium / Firefox / WebKit, 33/33 passed               |
| `npm run test:visual`          | 3/3 passed; all 13 existing baselines unchanged         |
| `npm run desktop:dev`          | Vite started, then `target/debug/xdrate-music.exe` ran  |
| Release executable smoke       | Stayed running for 5 seconds before controlled shutdown |
| `npm run desktop:build`        | Produced one NSIS x64 installer                         |

## 6. Local candidate artifacts

| Artifact                                                                |            Size | SHA-256                                                            |
| ----------------------------------------------------------------------- | --------------: | ------------------------------------------------------------------ |
| `src-tauri/target/release/xdrate-music.exe`                             | 8,436,224 bytes | `1E40020A13FF8F1F5FEC036A4138EEFABE5A29A547A078FC0442E6B8297ED722` |
| `src-tauri/target/release/bundle/nsis/XDRate Music_0.2.0_x64-setup.exe` | 1,914,223 bytes | `C6E4BC6EA1075202625B292002D5E5E60ACC2DD8F24BAD056128FE3467678C03` |

`src-tauri/target/` is reproducible and Git-ignored. These hashes identify only this local candidate and are not public-release checksums.

## 7. Environment issue record

During the first NSIS extraction, Tauri Bundler attempted to rename a tool directory between the F-drive workspace and the C-drive user cache, causing Windows `os error 17`. The already downloaded and Bundler-validated `nsis-3.11` cache was renamed on the same volume to `%LOCALAPPDATA%\tauri\NSIS`, and the required `nsis_tauri_utils.dll` was fetched from the official Tauri release. Bundler then revalidated the hashes itself and produced the installer. This affects only the local build-tool cache; it changes neither application permissions nor package configuration.

## 8. M2 entry conditions

M2 may start under these constraints:

1. Add native dialogs and file I/O only behind the desktop adapter.
2. Declare least capabilities separately for open, save, save-as, and PNG.
3. Reuse existing Zod validation, migration, size limits, and DOM export.
4. Cancellation or failure must not change the current rating or last successful saved revision.
5. Complete the Web v0.1 → Desktop v0.2 → Web v0.1 round-trip regression.
