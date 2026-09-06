# M4 Security Threat Audit

Status: accepted for an internal candidate; public RC remains gated by signing and the installer matrix  
Audit date: 2026-09-05  
Target: XDRate Music `0.2.0`, Windows 10/11 x64, Tauri 2

## 1. Executive summary

This review covered archives, images, native files, WebView navigation, Tauri capabilities, the offline promise, and dependency supply chain. It fixed MIME-spoofed archive covers, upload validation that trusted browser MIME alone, remote string PNG sources, symlink/reparse-point existing targets, and the lack of an explicit production navigation deny policy.

There are zero unresolved high-severity code findings. The build is suitable for controlled internal candidate testing. A public `0.2.0-rc.1` remains prohibited until Authenticode signing, RFC 3161 timestamping, final icon assets, and clean Windows 10/11 installer tests pass.

## 2. Scope and attack surface

- Inputs: `.xdrate.json`, JPEG/PNG/WebP, form text, and PNG export data;
- Boundary: React WebView ↔ Tauri IPC ↔ Rust native-file layer ↔ user-selected paths;
- Local state: autosave draft, recovery snapshot, recent files, and current file handle;
- Release surface: npm/Rust dependencies, NSIS installer, signing certificate, and GitHub Releases;
- Excluded by design: accounts, servers, cloud sync, telemetry, remote assets, and built-in updates.

## 3. STRIDE and attack-path result

| Threat                 | Main path                       | Control/evidence                                                                              | Residual risk                                                                    |
| ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Spoofing               | forged image MIME/extension     | upload and archive covers require PNG/JPEG/WebP MIME, Base64 form, and matching magic bytes   | a truncated image with a valid header can fail to render but cannot execute; low |
| Tampering              | interrupted overwrite           | sibling temp file, flush, atomic Windows replacement; failure tests preserve the old target   | extreme filesystem/AV behavior remains for real-machine testing                  |
| Repudiation            | no account/audit backend        | local save state, path, and failure result are explicit                                       | non-repudiation is intentionally out of scope                                    |
| Information disclosure | remote request, telemetry, font | CSP, local assets, E2E outbound assertion, no HTTP/updater capability                         | OS/WebView service traffic is outside app business traffic                       |
| Denial of service      | oversized JSON/PNG/text         | 16 MiB JSON, 10 MiB upload, 64 MiB native PNG, Zod, bounded reads                             | valid near-limit data can briefly use memory; low                                |
| Elevation of privilege | shell/process/file/network/nav  | main-window-only minimal capabilities, no shell/process/HTTP/updater, default-deny navigation | user-selected paths still follow their OS account rights                         |

PASTA attack-chain review found no complete path from untrusted input to code execution or unauthorized writes: content crosses user selection and size checks, then format/schema validation, and can reach only rendering or bounded native-file commands.

## 4. Technical checklist

| Check                           | Result                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Untrusted JSON/future schema    | Pass: bounded read, Zod validation, failure preserves workspace                     |
| Untrusted image                 | Pass: PNG/JPEG/WebP only, declared MIME must match magic bytes                      |
| Traversal                       | Pass: suggested names become basename; system dialog selects actual path            |
| Symlink/reparse point           | Pass: open/direct-save rejects links, non-regular files, and Windows reparse points |
| Overwrite/interruption          | Pass: atomic replacement preserves the previous target on failure                   |
| Command/HTML injection          | Pass: no shell/process/eval/dynamic-HTML sink                                       |
| WebView navigation              | Pass: packaged origin only; development permits local port `1420` only              |
| CSP                             | Pass: scripts self-only; no remote/wildcard, object, frame, base, or form           |
| Tauri capability                | Pass: native files, close, and set-title only, limited to `main`                    |
| Offline/privacy                 | Pass: core E2E asserts no third-party request; no telemetry/font/updater            |
| High-confidence secret patterns | Pass: deterministic project scan found none                                         |

## 5. Red-team checks

- SVG, HTML, remote URL, and fake-PNG archive covers were rejected;
- SVG bytes declared as `image/png` were rejected;
- a remote HTTPS desktop PNG source was rejected before `fetch` and IPC;
- `../outside` and Windows absolute suggested names were reduced to safe basenames;
- HTTPS, `file:`, and `javascript:` top-level navigation were denied;
- shell/HTTP/updater permissions or wildcard CSP make the project security check fail.

## 6. Blue-team hardening

- `npm run check:security` freezes CSP, capability, URL, navigation, execution-sink, and high-confidence secret rules;
- `npm run check:desktop-config` freezes identity, metadata, permissions, and navigation policy;
- GitHub Actions reports Web, security, Windows native, and visual results separately; failures block the candidate gate;
- no telemetry is collected; recovery remains local and does not upload user content;
- public artifacts rely on signature verification, SHA-256 manifests, and clean-snapshot tests.

## 7. Dependency and accepted risk

- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities;
- `cargo audit --file src-tauri/Cargo.lock`: 0 vulnerabilities and 17 allowed warnings;
- warnings are mostly non-Windows GTK3 transitive packages, unmaintained proc-macro/Unicode crates, plus a RustSec warning for `glib 0.18.5`. They do not enter the current Windows x64 target path, but remain supply-chain risk accepted only for the `0.2.0` Windows x64 internal candidate and must be reviewed with Tauri dependency upgrades.
- Save As uses a user-selected system-dialog directory. Existing reparse-point targets are rejected; the app does not replace OS resolution of the entire user-selected parent path. This is accepted as low risk.

## 8. Score and verdict

| Area                   | Score / 100 |
| ---------------------- | ----------: |
| Secrets/configuration  |         100 |
| Input validation       |          95 |
| Identity/authorization |         100 |
| Data protection        |          92 |
| Resilience             |          90 |
| Detection              |          75 |
| Supply chain           |          55 |
| Release compliance     |          90 |

Weighted score: `89.6 / 100`. Verdict: conditionally accepted for an internal candidate. Public RC/Stable blockers are tracked in `22_M4_RELEASE_ACCEPTANCE_EXECUTION_LOG.md`.
