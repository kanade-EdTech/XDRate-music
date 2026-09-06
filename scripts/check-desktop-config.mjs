/* global console, process */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const config = JSON.parse(read('src-tauri/tauri.conf.json'));
const capability = JSON.parse(read('src-tauri/capabilities/main.json'));
const cargo = read('src-tauri/Cargo.toml');
const rust = `${read('src-tauri/src/lib.rs')}\n${read('src-tauri/src/main.rs')}`;
const packageJson = JSON.parse(read('package.json'));

const failures = [];
if (config.productName !== 'XDRate Music') failures.push('productName');
if (config.identifier !== 'com.xdrate.music') failures.push('bundle identifier');
if (config.bundle?.publisher !== 'Kehun_EdTech') failures.push('publisher');
if (config.bundle?.copyright !== 'Copyright © 2026 科魂老师 / Kehun_EdTech') {
  failures.push('copyright');
}
if (config.bundle?.category !== 'Music') failures.push('category');
if (JSON.stringify(config.bundle?.targets) !== JSON.stringify(['nsis'])) failures.push('targets');
if (config.bundle?.createUpdaterArtifacts !== false) failures.push('updater artifacts');
if (config.build?.frontendDist !== '../dist') failures.push('frontendDist');
if (config.build?.beforeDevCommand !== 'npm run dev:web') failures.push('dev command');
if (config.build?.beforeBuildCommand !== 'npm run build:web') failures.push('build command');
const mainWindow = config.app?.windows?.find((window) => window.label === 'main');
if (mainWindow?.resizable !== true) failures.push('main window resizable');
if (mainWindow?.minWidth !== 720) failures.push('main window minimum width');
if (Object.keys(config.plugins ?? {}).length !== 0) failures.push('config plugins');
if (
  JSON.stringify(capability.permissions ?? []) !==
  JSON.stringify(['allow-native-files', 'core:window:allow-close', 'core:window:allow-set-title'])
) {
  failures.push('capability permissions');
}
if (capability.windows?.join(',') !== 'main') failures.push('capability window scope');
if (config.app?.security?.csp?.includes('*')) failures.push('wildcard production CSP');
if (/https:|wss:/.test(config.app?.security?.csp ?? '')) failures.push('production network CSP');
for (const directive of [
  "object-src 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
  "form-action 'none'",
]) {
  if (!(config.app?.security?.csp ?? '').includes(directive)) failures.push(`CSP ${directive}`);
}
if (/tauri-plugin-(shell|fs|http|updater)|Command::new|std::process/.test(`${cargo}\n${rust}`)) {
  failures.push('forbidden native capability');
}
if (!/tauri-plugin-dialog/.test(cargo) || !/tauri_plugin_dialog::init/.test(rust)) {
  failures.push('native dialog boundary');
}
if (!/WINDOWS_APP_USER_MODEL_ID:\s*&str\s*=\s*"XDRate\.Music"/.test(rust)) {
  failures.push('Windows AppUserModelID');
}
if (!/navigation-policy/.test(rust) || !/is_allowed_navigation/.test(rust)) {
  failures.push('navigation deny policy');
}
if (
  Object.keys(packageJson.dependencies ?? {}).some((name) => name.startsWith('@tauri-apps/plugin-'))
) {
  failures.push('frontend native plugin');
}

if (failures.length > 0) {
  console.error(`Desktop configuration review failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log(
  'Desktop configuration grants only mediated XDRate file dialogs plus current-window close/title, with no arbitrary filesystem, shell, process, updater, or network capability.',
);
