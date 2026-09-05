/* global console, process */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const failures = [];
const config = JSON.parse(read('src-tauri/tauri.conf.json'));
const capability = JSON.parse(read('src-tauri/capabilities/main.json'));
const packageJson = JSON.parse(read('package.json'));
const productionCsp = config.app?.security?.csp ?? '';

const requiredCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "connect-src 'self' ipc: http://ipc.localhost",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
  "form-action 'none'",
];
for (const directive of requiredCsp) {
  if (!productionCsp.includes(directive)) failures.push(`missing CSP directive: ${directive}`);
}
if (/https:|wss:|\*/.test(productionCsp))
  failures.push('production CSP permits remote or wildcard sources');

const expectedPermissions = [
  'allow-native-files',
  'core:window:allow-close',
  'core:window:allow-set-title',
];
if (JSON.stringify(capability.permissions ?? []) !== JSON.stringify(expectedPermissions)) {
  failures.push('unexpected Tauri capability');
}
if (capability.windows?.join(',') !== 'main')
  failures.push('capability is not limited to main window');

const source = [
  read('src/domain/archive/archive.ts'),
  read('src/platform/desktopPlatform.ts'),
  read('src-tauri/src/lib.rs'),
  read('src-tauri/src/native_files.rs'),
].join('\n');
for (const [name, pattern] of [
  ['unsafe DOM HTML injection', /dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write/],
  ['dynamic code execution', /\beval\s*\(|new\s+Function\s*\(/],
  ['process or shell execution', /Command::new|std::process|child_process|tauri-plugin-shell/],
  ['uncontrolled external opener', /window\.open\s*\(|target=["']_blank/],
]) {
  if (pattern.test(source)) failures.push(name);
}
if (
  !source.includes("source.protocol !== 'data:'") ||
  !source.includes("source.protocol !== 'blob:'")
) {
  failures.push('binary string sources are not restricted to data/blob URLs');
}
if (!source.includes('image\\/(?:png|jpeg|webp)') || !source.includes('unsupported-cover-data')) {
  failures.push('archive cover Data URLs are not allowlisted');
}
if (!source.includes('navigation-policy') || !source.includes('is_allowed_navigation')) {
  failures.push('native navigation deny policy is missing');
}
if (!source.includes('XDRate.Music')) failures.push('frozen Windows AppUserModelID is missing');

const forbiddenPackages = /(?:shell|http|updater|process)/i;
for (const name of [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
]) {
  if (name.startsWith('@tauri-apps/plugin-') && forbiddenPackages.test(name)) {
    failures.push(`forbidden frontend package: ${name}`);
  }
}

const ignoredDirectories = new Set([
  '.git',
  '.tauri-tmp',
  'node_modules',
  'target',
  'dist',
  'test-results',
  'playwright-report',
]);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
];

function scan(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const path = join(directory, entry);
    const metadata = statSync(path);
    if (metadata.isDirectory()) {
      scan(path);
      continue;
    }
    if (path === resolve(import.meta.filename)) continue;
    if (metadata.size > 2_000_000 || ['.png', '.ico', '.icns'].includes(extname(entry))) continue;
    const contents = readFileSync(path, 'utf8');
    if (secretPatterns.some((pattern) => pattern.test(contents))) {
      failures.push(`possible committed secret: ${relative(root, path)}`);
    }
  }
}

if (existsSync(root)) scan(root);

if (failures.length > 0) {
  console.error(`Security boundary check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(
  'Security boundary check passed: local-only CSP, least Tauri capability, safe media URLs, navigation deny policy, no execution sinks, and no high-confidence secret patterns.',
);
