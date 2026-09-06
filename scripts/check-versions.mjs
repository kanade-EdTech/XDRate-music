/* global console, process */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const tauriConfig = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargoToml = read('src-tauri/Cargo.toml');
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

const mismatches = [];
if (packageLock.version !== packageJson.version) mismatches.push('package-lock root version');
if (packageLock.packages?.['']?.version !== packageJson.version) {
  mismatches.push('package-lock package version');
}
if (cargoVersion !== packageJson.version) mismatches.push('Cargo package version');
if (tauriConfig.version !== '../package.json') mismatches.push('Tauri version source');

if (mismatches.length > 0) {
  console.error(`Version mismatch: ${mismatches.join(', ')}`);
  process.exit(1);
}

console.log(`Version sources agree on ${packageJson.version}.`);
