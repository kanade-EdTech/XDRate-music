import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const allowedExtensions = new Set([
  '.html',
  '.css',
  '.js',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.woff',
  '.woff2',
]);
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.svg']);
const errors = [];
const warnings = [];

async function collectFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(root, absolute)));
    else if (entry.isFile()) files.push(absolute);
    else errors.push(`Unsupported filesystem entry: ${relative(root, absolute)}`);
  }
  return files;
}

function packagePath(root, file) {
  return relative(root, file).split(sep).join('/');
}

function checkHtml(text, root, name, packageFiles) {
  if (!/^<!doctype html>/i.test(text.trimStart())) errors.push(`${name}: missing doctype`);
  if (!/<meta\b[^>]*charset=["']?UTF-8/i.test(text)) errors.push(`${name}: missing UTF-8 charset`);
  if (/type=["']module["']/i.test(text)) errors.push(`${name}: module script found`);
  const references = [...text.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|data:|blob:|javascript:|\/)/i.test(reference)) {
      errors.push(`${name}: non-packaged resource reference ${reference}`);
      continue;
    }
    if (!reference.startsWith('./')) {
      errors.push(`${name}: resource must start with ./: ${reference}`);
      continue;
    }
    const target = resolve(root, reference.slice(2));
    const normalized = relative(root, target).split(sep).join('/');
    if (!packageFiles.has(normalized))
      errors.push(`${name}: referenced resource is missing: ${reference}`);
  }
}

function checkText(text, name, extension) {
  if (extension === '.js' && /https?:\/\//i.test(text) && !/https?:\/\/www\.w3\.org/i.test(text)) {
    errors.push(`${name}: external URL string found`);
  }
  if (extension === '.js' && /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/.test(text)) {
    warnings.push(
      `${name}: bundled export helper contains a fetch-compatible resource loader; external URL strings are still rejected`,
    );
  }
  if (extension === '.css' && /url\(\s*["']?(?:https?:|\/)/i.test(text)) {
    errors.push(`${name}: external or root-absolute CSS URL found`);
  }
}

const root = resolve(process.argv[2] ?? 'dist-toy');
const rootStat = await stat(root).catch(() => null);
if (!rootStat?.isDirectory()) {
  console.error(`ERROR: artifact directory not found: ${root}`);
  process.exitCode = 1;
} else {
  const files = await collectFiles(root);
  const paths = files.map((file) => packagePath(root, file)).sort();
  const packageFiles = new Set(paths);
  if (paths.filter((file) => file === 'index.html').length !== 1)
    errors.push('Package must contain exactly one root index.html');
  if (paths.filter((file) => extname(file).toLowerCase() === '.html').length !== 1)
    errors.push('Package must contain exactly one HTML file');
  let totalBytes = 0;
  for (const file of files) {
    const name = packagePath(root, file);
    const extension = extname(name).toLowerCase();
    if (!allowedExtensions.has(extension)) errors.push(`${name}: unsupported file extension`);
    totalBytes += (await stat(file)).size;
    if (!textExtensions.has(extension)) continue;
    const text = await readFile(file, 'utf8');
    if (extension === '.html') checkHtml(text, root, name, packageFiles);
    checkText(text, name, extension);
  }
  if (totalBytes > 10 * 1024 * 1024) errors.push(`Artifact exceeds 10 MiB: ${totalBytes} bytes`);
  if (totalBytes > 2 * 1024 * 1024)
    warnings.push(`Artifact is above the 2 MiB target: ${totalBytes} bytes`);
  for (const warning of warnings) console.warn(`WARN: ${warning}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.log(
    `Toy audit: ${files.length} files, ${totalBytes} bytes unpacked, ${warnings.length} warnings, ${errors.length} errors.`,
  );
  if (errors.length > 0) process.exitCode = 1;
}
