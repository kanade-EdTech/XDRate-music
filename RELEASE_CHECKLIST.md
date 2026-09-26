# Release Checklist

## Automated gates

- [ ] `npm ci`
- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run test:rust`
- [x] `npm run check:security`
- [x] `npm run check:desktop-config`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] `npm run test:visual` (3/3 scenarios, 13/13 immutable baselines; 2026-08-28)
- [x] Review `npm audit` output and document any accepted risk. (2026-09-05: 0 production vulnerabilities)
- [x] Review `cargo audit` output and document accepted risk. (2026-09-05: 0 vulnerabilities, 17 allowed warnings; see M4 threat audit)

## Manual gates

- [ ] Test keyboard-only creation, template application, JSON import/export, and PNG download.
- [ ] Perform a screen-reader smoke test on the main editing flow.
- [ ] Inspect square, portrait, and wide cards with long Chinese and English text.
- [ ] For v0.4.0 standalone mobile App only: test iOS and Android on exact real-device candidates, including browser/PWA comparison where applicable. This does not block the current desktop release.
- [ ] Confirm that a storage-quota failure offers JSON backup without claiming the draft was saved.
- [ ] Verify version number, license, changelog, privacy notice, schema version, and algorithm version are consistent.

## Publish

- [ ] Create the `v0.1.0` tag and release notes.
- [ ] Upload the static `dist/` build to the selected static host.
- [ ] Keep the release assets and source archive available under the MIT License.

## Desktop v0.2 identity and supply-chain gates

- [x] Freeze `com.xdrate.music`, `XDRate.Music`, `@xdrate/music`, `XDRate Music`, and `Kehun_EdTech` in the bilingual release ADR.
- [ ] Apply the approved final Windows icon to the executable, installer, Start menu, taskbar, and Installed Apps entry.
- [ ] Sign every public application executable and NSIS/MSI installer with the approved OV Authenticode identity.
- [ ] Add the DigiCert RFC 3161 timestamp with SHA-256 (`/fd SHA256 /tr http://timestamp.digicert.com /td SHA256`).
- [ ] Run `signtool verify /pa /all /v` on every public installer and fail on warnings, missing timestamps, or unexpected signer identity.
- [ ] Generate and publish SHA-256 checksums plus a manifest containing version, commit, file size, signer Subject/Issuer/fingerprint, and build environment.
- [ ] Verify in-place upgrade and uninstall on clean Windows 10 x64 and Windows 11 x64 snapshots while retaining user data.
- [ ] Confirm production Tauri capabilities contain no `updater:*` permission and that startup, normal use, and shutdown perform no update request.
- [ ] Publish `0.2.0` through the official XDRate GitHub Releases page as a signed manual update; do not present unsigned artifacts as Stable or recommended.
- [ ] Record withdrawal and fixed-higher-version rollback instructions in the release notes.

## Desktop v0.2 M4 acceptance gates

- [x] Reject MIME-spoofed archive/upload images and remote desktop PNG sources.
- [x] Reject symlinks/reparse points for native open and existing direct-save targets.
- [x] Enforce production CSP, default-deny native navigation, and main-window-only least capabilities.
- [x] Split Web, security, Windows-native, and visual CI results behind an aggregate candidate gate.
- [ ] Archive a successful remote CI run for the frozen source commit.
- [ ] Run bilingual Narrator or NVDA smoke testing on the final M4 candidate.
- [ ] Run install, first launch, in-place upgrade, uninstall, and data-retention checks on clean Windows 10 x64 and Windows 11 x64 snapshots.
- [x] Freeze all source files in Git before producing the RC.1 device-acceptance manifest.

## Xiaohongshu MiniTool v0.3.0 gates

- [x] Build an offline ZIP with exactly one root `index.html`, relative packaged resources, allowed extensions only, and no wrapper directory. (M4 preflight exact-ZIP verification)
- [x] Verify final JavaScript is external classic ES2017/Chrome 61-compatible output with no ESM, inline script, Worker, WASM, or dynamic execution. (static/build evidence; old-WebView runtime gate remains below)
- [x] Scan the final artifact for remote URLs, network APIs, external navigation, unsupported device APIs, source maps, and build/test files.
- [x] Keep the ZIP at or below the 2 MiB project target and always below the 10 MiB hard platform limit. (242,650-byte initial M4 preflight; final hash recorded in M4 log)
- [x] Verify the PNG Data URI → `writeTempFile` → `saveImageToPhotosAlbum` path under explicit user gesture, including deny/cancel/retry behavior. (automated contract evidence)
- [x] Verify one-to-twelve positive-item add/remove, Custom-mode persistence, unrated exclusion, and neutral user-facing scoring copy in both locales.
- [x] Replace the clearly labeled M2.1 chain-test PNG with the formal eleven-ratio card in M3 before any public candidate is approved.
- [ ] Test the exact ZIP in the Xiaohongshu PC simulator, Android 8.1/Chrome-WebView 61 baseline, current Android, and iOS 18.4+ real-device containers.
- [ ] Record the ZIP SHA-256, source commit, file manifest, device/app versions, privacy boundary, and known limitations.
- [x] Keep direct `postNote` publishing disabled unless `V03-DEC-01` is explicitly approved and its separate privacy/acceptance gates pass.

## Xiaohongshu MiniTool v0.3.1 M4 gates

- [x] Keep v0.3.0 RC immutable and isolate v0.3.1 filenames, manifests, hashes, and user-facing version identity.
- [x] Detect `postNote` independently and classify native acceptance, cancellation, unavailability, and failure without treating acceptance as publication.
- [x] Require a final bilingual confirmation that shows the exact image and text, enforces 20/1,000/1–18 limits, and explains the privacy boundary.
- [x] Persist the draft before native handoff and restore content plus focus after cancellation or failure.
- [x] Verify all eleven ratios use byte-identical images in preview, confirmation, and the `postNote` payload.
- [x] Pass MiniTool automation: Vitest 158/158, focused unit tests 39/39, E2E 22/22, and final-ZIP verifier 2/2.
- [x] Audit the exact RC.1 as three allowed files with no warnings, no external resources, 254,566-byte ZIP size, and byte parity with the audited directory.
- [x] Freeze RC.1 SHA-256 as `192efc241d8ad8f6a29d686d3f3d43d2c67b5eb1a79772859ed39fb0f2ec9f02` from clean source commit `9c2fc498f6e4956943bc9b94a3b3257fcca5f64b`.
- [ ] Load that exact RC.1 in the official Xiaohongshu PC simulator and record versions plus the core-flow result.
- [ ] Test that exact RC.1 on Android 8.1/WebView 61, a current Android device, and iOS 18.4+.
- [ ] Complete album allow/deny/cancel/recover and post accept/cancel/fail/return matrices on real devices.
- [ ] Record TalkBack and VoiceOver evidence for editing, confirmation, cancellation, and focus restoration.
- [ ] Confirm manually that native acceptance still requires the user to complete public publication in Xiaohongshu.
- [ ] Review sanitized evidence, known limitations, privacy copy, and final release notes before upload or tagging.

## Bili Toy v0.3.1 adaptation gates

- [ ] Install the official `toy` CLI and capture `toy --help-json`; do not use a legacy script or guessed flags.
- [ ] Add an isolated Bili Toy build entry and output directory without overwriting Web, desktop, or Xiaohongshu artifacts.
- [ ] Verify one unambiguous `index.html`, relative resources, Toy subpath loading, hash-safe navigation, and no source/test files in the upload package.
- [ ] Run `toy_doctor.py` on the exact candidate with zero ERRORs; record WARN dispositions.
- [ ] Re-run music algorithm, Archive Schema v2, templates, drafts, eleven ratios, PNG parity, keyboard, narrow-screen, and screen-reader regressions.
- [ ] Keep Xiaohongshu JSBridge, `postNote`, Bilibili cloud storage, leaderboards, telemetry, and native mobile APIs out of the first candidate.
- [ ] Generate `0.3.1-toy-rc.1` and run `toy create` or `toy update` in JSON preview mode without `--yes`.
- [ ] Provide the exact `preview_url` and change summary to the user; obtain explicit confirmation before review submission.
- [ ] Submit only with the same arguments plus `--yes` after explicit confirmation; record Toy id, status, preview URL, source commit, hash, and known limits.
- [ ] Use `rc.2` or later for any package change; never overwrite an old candidate or reuse its hash/slug.
