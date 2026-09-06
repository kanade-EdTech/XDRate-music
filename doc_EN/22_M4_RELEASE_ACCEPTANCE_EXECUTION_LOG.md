# M4 Release Acceptance Execution Log

Status: M4 engineering complete; public RC blocked by external/manual gates  
Execution date: 2026-09-05  
Candidate: `0.2.0` (unsigned internal candidate)

## 1. Acceptance result

Security hardening, offline/navigation boundaries, CI layering, package metadata, and bilingual delivery documents are implemented. The code may produce an internal-only NSIS candidate, but it is not a public RC or Stable: final icons, a trusted Authenticode certificate, timestamp, signature verification, and clean Windows 10/11 x64 installer evidence are absent.

## 2. Work-package status

| Package    | Status                  | Evidence/remaining action                                                                                                                   |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| V02-SEC-01 | Complete                | `20_M4_SECURITY_THREAT_AUDIT.md`; every required threat has a test, mitigation, or acceptance; zero unresolved high findings                |
| V02-SEC-02 | Complete                | CSP, default-deny native navigation, least capability, no remote font/telemetry/updater, core-flow outbound E2E assertion                   |
| V02-QA-01  | Complete (local/config) | CI separates Web, security, Windows native, and visual reports; RC gate depends on all machine gates. Archive the first remote Actions link |
| V02-QA-02  | Manual pending          | clean Windows 10/11 x64 install, first launch, in-place upgrade, uninstall, and data retention                                              |
| V02-QA-03  | Partial                 | automated 100/125/150% desktop visual evidence exists; this M4 candidate still needs Narrator/NVDA core-flow and basic multi-display review |
| V02-PKG-01 | Partial                 | name, version, publisher, copyright, category, and descriptions set; final approved icon is missing                                         |
| V02-PKG-02 | External blocker        | current package unsigned; needs OV certificate, DigiCert RFC 3161 timestamp, SignTool verification, and release manifest                    |
| V02-UPD-01 | Deferred by decision    | no updater, permission, or update request in `0.2.0`; manual updates only                                                                   |
| V02-DOC-01 | Complete                | bilingual audit, delivery/troubleshooting, acceptance, navigation, changelog, and checklist synchronized                                    |

## 3. Engineering changes

- archive-cover and upload image declarations must match PNG/JPEG/WebP magic bytes;
- desktop string PNG sources allow `data:`/`blob:` only;
- native open/direct-save rejects symlinks, non-regular files, and Windows reparse points; reads are bounded;
- Windows process explicitly sets `XDRate.Music` AppUserModelID;
- native navigation allows packaged origins only; development permits local port `1420`;
- production CSP blocks remote/wildcard, object, frame, base, and form;
- added `check:security` and `test:rust`; strengthened desktop configuration checking;
- CI now has Web, security, Windows-native, visual, and aggregate candidate gates.

## 4. Automated evidence

| Command                                   | Result                                             |
| ----------------------------------------- | -------------------------------------------------- |
| `npm run format:check`                    | Pass                                               |
| `npm run lint`                            | Pass, 0 errors/warnings                            |
| `npm run typecheck`                       | Pass                                               |
| `npm test`                                | 16 files, 119/119 pass                             |
| `npm run test:rust`                       | 8/8 pass                                           |
| `npm run check:security`                  | Pass                                               |
| `npm run check:desktop-config`            | Pass                                               |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities                                  |
| `cargo audit --file src-tauri/Cargo.lock` | 0 vulnerabilities; 17 allowed warnings documented  |
| `npm run build`                           | Pass, 150 modules                                  |
| `npm run test:e2e`                        | Chromium/Firefox/WebKit 48/48 pass                 |
| `npm run test:visual`                     | 3/3 pass, 13 immutable baselines unchanged         |
| `npm run test:desktop-visual`             | 5/5 pass, including 100/125/150% and narrow view   |
| `npm run handover:ui02`                   | 2/2 pass                                           |
| `npm run desktop:build`                   | Pass; NSIS hash and signing state documented below |

## 5. Clean install matrix

| Environment                   | Install | First launch | Upgrade | Uninstall | Data retention | Verdict          |
| ----------------------------- | ------- | ------------ | ------- | --------- | -------------- | ---------------- |
| clean Windows 10 x64 snapshot | Pending | Pending      | Pending | Pending   | Pending        | blocks public RC |
| clean Windows 11 x64 snapshot | Pending | Pending      | Pending | Pending   | Pending        | blocks public RC |

Record OS build, snapshot, installer SHA-256, operator, date, outcome, and defect links. Reinstalling on the development machine is not clean-snapshot evidence.

## 6. Signing and manifest

A public package requires all of:

1. approved OV Authenticode signing for app executables and NSIS installer;
2. DigiCert RFC 3161 SHA-256 timestamp;
3. warning-free `signtool verify /pa /all /v` with expected identity;
4. manifest with version, source commit, environment, size, SHA-256, signer Subject/Issuer/fingerprint, and timestamp;
5. traceable source tree. Most files in this working tree are not yet tracked by Git, so no publishable manifest can be produced before a source commit/snapshot is frozen.

The internal NSIS candidate is 2,058,311 bytes with SHA-256 `4407FB28C37171C286D790588AEE5CFED68CCAC683FCEFB314B673E0C2E357C3`; Authenticode status is `NotSigned`. Its manifest is archived at `doc_CN/artifacts/m4_internal_candidate_manifest.json` with `releaseEligible=false`, so it cannot be represented as a public release manifest. The first sandboxed E2E attempt could not launch browsers (`spawn EPERM`); the authorized real-browser rerun passed 48/48 and is not a product defect.

## 7. Manual acceptance

- [ ] clean Windows 10 x64 flow;
- [ ] clean Windows 11 x64 flow;
- [ ] final icon matches installer, Start, taskbar, and Installed Apps;
- [ ] bilingual Narrator or NVDA: new, rate, open, save, close guard, recover;
- [ ] 100/125/150% scaling and basic multi-display movement;
- [ ] SignTool and SHA-256 manifest for the signed installer;
- [ ] commit/freeze a traceable source version and archive the first full CI link.

## 8. Next decision

M4 needs no additional product feature. Next is release engineering: commit/freeze source, integrate the final icon and certificate, execute the Windows 10/11 matrix, then produce and verify `0.2.0-rc.1`. Until then the artifact is an “unsigned internal candidate.”
