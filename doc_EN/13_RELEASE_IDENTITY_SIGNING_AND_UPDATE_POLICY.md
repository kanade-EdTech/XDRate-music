# Release Identity, Signing, and Update Policy

Status: Approved  
Decision date: 2026-08-28  
Applies to: Desktop `0.2.0` and later patch releases  
Initial scope: Windows 10/11 x64

## 1. Decision summary

1. The music product uses `com.xdrate.music`, `XDRate.Music`, and `@xdrate/music` as its stable technical identifiers. `io.github.kanade_edtech.xdrate.music` is rejected.
2. Every public Windows installer must carry an Authenticode signature from a certificate trusted by Windows plus an RFC 3161 / SHA-256 timestamp. An unsigned package must never be presented as stable or recommended.
3. The default procurement policy is an OV code-signing certificate in the Microsoft Trusted Root ecosystem, with its private key held by a CA-provided hardware token or cloud HSM. Azure Artifact Signing may replace it only when the publisher satisfies its identity and regional eligibility requirements; the release identity and verification gates remain unchanged.
4. Desktop `0.2.0` does not integrate Tauri updater, perform background update checks, or grant updater network permissions. Users obtain new releases manually from the official XDRate GitHub Releases page.
5. A built-in updater requires a separate `V02-UPD-01` work package and may be enabled only after update signing, HTTPS hosting, key backup, withdrawal, and rollback exercises pass.

## 2. Stable release identity

These values become immutable once publicly released and must not change in a patch release. Game and flagship namespaces are reserved only; they do not place those products in scope.

| Platform / use                   | Music (current)    | Games (reserved)   | Flagship (reserved) |
| -------------------------------- | ------------------ | ------------------ | ------------------- |
| Chinese product name             | 多维音乐评价       | 多维游戏评价       | 多维评价            |
| English product / installer name | `XDRate Music`     | `XDRate Games`     | `XDRate`            |
| Android `applicationId`          | `com.xdrate.music` | `com.xdrate.games` | `com.xdrate.app`    |
| Tauri `bundle.identifier`        | `com.xdrate.music` | `com.xdrate.games` | `com.xdrate.app`    |
| Windows AppUserModelID           | `XDRate.Music`     | `XDRate.Games`     | `XDRate.App`        |
| npm / internal package           | `@xdrate/music`    | `@xdrate/games`    | `@xdrate/core`      |
| Chinese publisher                | 科魂老师           | 科魂老师           | 科魂老师            |
| English / technical publisher    | `Kehun_EdTech`     | `Kehun_EdTech`     | `Kehun_EdTech`      |

The certificate Subject must be the legal person or organization identity actually validated by the CA; it must not imitate an unvalidated brand. The app, installer, and release page continue to display `Kehun_EdTech`. Every release manifest records the exact certificate Subject, Issuer, serial number, and SHA-256 fingerprint so users can distinguish the product publisher label from the legally validated signer.

The final icon master is a `V02-PKG-01` delivery asset rather than a release-identity decision blocker. An RC still cannot ship until the approved icon is applied.

## 3. Windows code-signing policy

### 3.1 Certificate and private key

- Public direct-download builds use an OV code-signing certificate whose private key resides in a CA-provided hardware token, HSM, or non-exportable cloud signing service.
- `.pfx` files, private keys, token PINs, service credentials, and Tauri updater private keys must never enter the repository, build cache, ordinary logs, or release assets.
- EV is not the default procurement choice because its SmartScreen behavior is no longer superior to OV. It requires a separate enterprise-procurement rationale.
- Self-signed certificates are limited to developer machines or controlled internal testing and are prohibited for public downloads.
- Azure Artifact Signing is an equivalent execution option only where regional and identity eligibility is met. Migration must record the account, certificate profile, validated identity, and CI federation design; long-lived client secrets are not the default authentication method.

### 3.2 Signed files and algorithms

Every public candidate signs at least:

- the main application `.exe` and other shipped PE executables;
- the primary NSIS `XDRate Music_*_x64-setup.exe` installer;
- the MSI, if an MSI is offered.

The Authenticode file digest is SHA-256. The fixed timestamp service is DigiCert RFC 3161 at `http://timestamp.digicert.com`, also using SHA-256; the equivalent SignTool flags are `/fd SHA256 /tr http://timestamp.digicert.com /td SHA256`. If this service is unavailable during a release window, the release pauses instead of producing an untimestamped stable package. Changing the timestamp service requires an ADR update.

### 3.3 Pipeline and verification

- Only a protected `v*` tag, the `release-windows` environment, and a human approval may invoke production signing. Pull requests, branch builds, and forks have no production signing access.
- CI uses least privilege. Cloud signing prefers OIDC/federated identity and does not retain a long-lived client secret.
- After signing, the pipeline runs `signtool verify /pa /all /v` and checks for a timestamp, a valid chain, and a Subject/Issuer on the release allowlist.
- Release assets include a SHA-256 checksum file and a manifest recording version, commit, build time, size, hash, signing state, and certificate fingerprint.
- A failed signature, missing timestamp, signer-identity drift, or hash mismatch blocks release.

## 4. Update policy

### 4.1 `0.2.0`: manual updates only

- Do not install or initialize Tauri updater; production capabilities contain no `updater:*` permission.
- Do not check versions on startup, shutdown, or in the background. Core workflows retain the no-unexpected-network-request guarantee.
- Publish the signed installer, SHA-256 checksums, changelog, and known issues on the official XDRate GitHub Releases page.
- A user intentionally visits the release page, downloads the signed installer, and installs it over the current version. The installer matrix verifies preservation of user documents and local data.
- Only a stable channel is maintained. Alpha, beta, and RC assets are prereleases and cannot be described as the latest stable release for ordinary users.

### 4.2 Gate for a future built-in updater

The updater remains disabled until `V02-UPD-01` passes all of the following:

1. Generate a dedicated Tauri updater key pair with the Tauri CLI. It is separate from Authenticode; the public key is embedded in the app.
2. Store the updater private key only in the protected release environment and an encrypted offline backup, never in `.env`, the repository, or ordinary artifacts. Complete at least one recovery exercise.
3. Use Tauri v2 `createUpdaterArtifacts` output and publish metadata only over HTTPS on official GitHub Releases. `dangerousInsecureTransportProtocol` is forbidden.
4. Update checks are user-triggered or explicitly opted in. Show version, notes, source, and size before download, then confirm installation/restart again. Windows `installMode` is `basicUi`; silent `quiet` installation is prohibited.
5. Require both the Tauri detached signature and Windows Authenticode validation. Failure preserves the installed version and offers the manual-download path.
6. Keep default monotonic SemVer comparison, do not override it, and do not permit automatic downgrade. Resolve unsaved changes before update installation.
7. The privacy notice discloses that update checks contact GitHub and provides an off switch.

## 5. Rotation, withdrawal, and rollback

- Authenticode renewal retains the same validated publisher identity, and each manifest records its certificate fingerprint. On compromise, stop signing, request CA revocation, remove affected assets, and publish a security notice.
- Normal Tauri updater-key rotation uses a bridge release signed by the old private key that embeds the new public key. If the old key is lost or compromised before a bridge can ship, installed clients must move through a manual Authenticode-signed installer.
- Do not roll back by automatic downgrade. Withdraw the bad update metadata or asset and publish a higher patch version. A manual rollback may use only a historically signed installer compatible with the current data Schema and requires a user backup first.
- A withdrawn release page states the affected version, reason, recommended action, and replacement. Never silently replace an asset under the same name.

## 6. Unsigned-build distribution limits

| Build                      | Allowed signing state                       | Distribution                     | Required marking                                   |
| -------------------------- | ------------------------------------------- | -------------------------------- | -------------------------------------------------- |
| Local development          | Unsigned or self-signed                     | Developer-owned devices          | Clearly identify Development                       |
| Alpha / internal candidate | Unsigned, self-signed, or production-signed | Named testers; never recommended | Filename and notes say `UNSIGNED` or `TEST ONLY`   |
| RC                         | Production-signed and timestamped           | Controlled acceptance            | Full manifest and checksums                        |
| Stable                     | Production-signed and timestamped           | Official public channels         | Signature, checksum, and installer matrix all pass |

## 7. Minimum threat model

| Threat                                | Primary controls                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| Installer replacement or tampering    | Authenticode, RFC 3161 timestamp, SHA-256 manifest, official HTTPS channel            |
| CI or PR steals signing access        | Protected environment, approval, no PR signing, OIDC / HSM, least privilege           |
| Update service compromise             | No updater in v0.2.0; future HTTPS + mandatory Tauri signature + Authenticode         |
| Key loss or compromise                | Non-exportable keys, encrypted offline backup, rotation and revocation procedure      |
| Malicious or accidental downgrade     | Default SemVer comparison, no automatic downgrade, fixed higher patch release         |
| User mistakes a test build for stable | Official channel carries signed builds only; conspicuous test filename, notes, and UI |

## 8. Authoritative references

- [Microsoft: Code signing options for Windows app developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- [Microsoft: SignTool syntax and verification](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- [Tauri: Windows code signing](https://v2.tauri.app/distribute/sign/windows/)
- [Tauri: Updater signing, configuration, and permissions](https://v2.tauri.app/plugin/updater/)
