import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import console from 'node:console';
import process from 'node:process';

const ALLOWED_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.woff',
  '.woff2',
  '.json',
]);
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.svg']);
const MAX_ZIP_BYTES = 10 * 1024 * 1024;
const WARN_TEXT_FILE_BYTES = 2 * 1024 * 1024;
const WARN_TEXT_TOTAL_BYTES = 5 * 1024 * 1024;
const WARN_BASE64_BYTES = 100 * 1024;
const MAX_BASE64_BYTES = 1024 * 1024;

const errors = [];
const warnings = [];

function reportError(message) {
  errors.push(message);
}

function reportWarning(message) {
  warnings.push(message);
}

async function collectFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(root, absolute)));
    else if (entry.isFile()) files.push(absolute);
    else reportError(`Unsupported filesystem entry: ${relative(root, absolute)}`);
  }
  return files;
}

function packagePath(root, file) {
  return relative(root, file).split(sep).join('/');
}

function checkBase64(text, fileName) {
  const pattern = /data:[^;,\s]+;base64,([a-z0-9+/=]+)/gi;
  for (const match of text.matchAll(pattern)) {
    const payload = match[1].replace(/=+$/, '');
    const bytes = Math.floor((payload.length * 3) / 4);
    if (bytes > MAX_BASE64_BYTES) reportError(`${fileName}: Base64 item is over 1 MiB.`);
    else if (bytes > WARN_BASE64_BYTES)
      reportWarning(`${fileName}: Base64 item is over 100 KiB (${bytes} bytes).`);
  }
}

function checkHtml(text, root, fileName, packageFiles) {
  if (!/^<!doctype html>/i.test(text.trimStart())) reportError(`${fileName}: missing doctype.`);
  if (!/<html\b[^>]*\blang=["']zh-CN["']/i.test(text))
    reportError(`${fileName}: html lang must be zh-CN.`);
  if (!/<meta\b[^>]*charset=["']?UTF-8/i.test(text))
    reportError(`${fileName}: missing UTF-8 charset.`);
  if (
    !/name=["']viewport["'][^>]*content=["'][^"']*width=device-width[^"']*initial-scale=1\.0[^"']*viewport-fit=cover/i.test(
      text.replace(/\s+/g, ' '),
    )
  )
    reportError(`${fileName}: viewport contract is incomplete.`);
  if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(text))
    reportError(`${fileName}: inline script found.`);
  const head = text.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  for (const script of head.matchAll(/<script\b[^>]*\bsrc=[^>]*>/gi)) {
    if (!/\bdefer\b/i.test(script[0])) {
      reportError(`${fileName}: classic script in head must use defer.`);
    }
  }
  if (/\son[a-z]+\s*=/i.test(text)) reportError(`${fileName}: inline event handler found.`);
  if (/type=["']module["']/i.test(text)) reportError(`${fileName}: module script found.`);
  if (/<base\b|<iframe\b|<object\b/i.test(text))
    reportError(`${fileName}: blocked HTML element found.`);
  if (/<meta\b[^>]*http-equiv=["']Content-Security-Policy["']/i.test(text))
    reportError(`${fileName}: custom CSP meta found.`);
  if (/\sdownload(?:\s|=|>)/i.test(text) || /target=["']_blank["']/i.test(text))
    reportError(`${fileName}: download or new-window behavior found.`);

  const references = [...text.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|data:|blob:|javascript:|\/)/i.test(reference)) {
      reportError(`${fileName}: non-packaged resource reference ${reference}`);
      continue;
    }
    if (!reference.startsWith('./')) {
      reportError(`${fileName}: resource must start with ./: ${reference}`);
      continue;
    }
    const target = resolve(root, reference.slice(2));
    if (!target.startsWith(`${root}${sep}`)) {
      reportError(`${fileName}: resource escapes package root: ${reference}`);
      continue;
    }
    const normalized = relative(root, target).split(sep).join('/');
    if (!packageFiles.has(normalized)) {
      reportError(`${fileName}: referenced resource is missing: ${reference}`);
    }
  }
}

function checkJavaScript(text, fileName) {
  const forbidden = [
    [/\bfetch\s*\(/, 'fetch'],
    [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
    [/\bWebSocket\s*\(/, 'WebSocket'],
    [/\bEventSource\s*\(/, 'EventSource'],
    [/\bRTCPeerConnection\s*\(/, 'RTCPeerConnection'],
    [
      /navigator\.(?:geolocation|clipboard|bluetooth|usb|hid|serial|serviceWorker|connection|credentials|locks)/,
      'blocked navigator API',
    ],
    [/navigator\.mediaDevices\.(?:enumerateDevices|getDisplayMedia)/, 'blocked media device API'],
    [/navigator\.storage\.persist\s*\(/, 'persistent storage'],
    [/navigator\.getBattery\s*\(/, 'battery API'],
    [/\b(?:Shared)?Worker\s*\(/, 'Worker'],
    [/\b(?:Accelerometer|Gyroscope|Magnetometer)\s*\(/, 'sensor API'],
    [/\b(?:DeviceMotionEvent|DeviceOrientationEvent)\b/, 'device sensor event'],
    [/\bWebAssembly\b/, 'WebAssembly'],
    [/\beval\s*\(/, 'eval'],
    [/\bnew\s+Function\s*\(/, 'new Function'],
    [/\bwindow\.(?:open|prompt)\s*\(/, 'window open/prompt'],
    [/(?:\.requestFullscreen|\.webkitRequestFullscreen)\s*\(/, 'fullscreen'],
    [/(?:window|parent|top)\.postMessage\s*\(/, 'custom postMessage bridge'],
    [/\bimport\s*\(/, 'dynamic import'],
    [/\bexport\s+(?:default|const|let|var|function|class|\{|\*)/, 'ES module export'],
  ];
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) reportError(`${fileName}: forbidden ${label} pattern found.`);
  }

  const allowedNamespaceUris = new Set([
    'http://www.w3.org/1998/Math/MathML',
    'http://www.w3.org/1999/xlink',
    'http://www.w3.org/2000/svg',
    'http://www.w3.org/XML/1998/namespace',
  ]);
  for (const match of text.matchAll(/https?:\/\/[^`"'\s)]+/g)) {
    if (!allowedNamespaceUris.has(match[0])) {
      reportError(`${fileName}: external URL string found (${match[0]}).`);
    }
  }

  const bridgeCalls = [...text.matchAll(/\.miniTool\.([a-zA-Z0-9_$]+)\s*\(/g)].map(
    (match) => match[1],
  );
  const allowedBridgeCalls = new Set([
    'postNote',
    'saveImageToPhotosAlbum',
    'openRedPage',
    'writeTempFile',
  ]);
  for (const call of bridgeCalls) {
    if (!allowedBridgeCalls.has(call))
      reportError(`${fileName}: unknown MiniTool bridge API ${call}.`);
  }
}

function checkCss(text, fileName) {
  const unsupported = [
    /@property\b/i,
    /@layer\b/i,
    /:has\s*\(/i,
    /\bsubgrid\b|\b(?:color-mix|oklab|oklch)\s*\(/i,
    /\b(?:dvh|svh|lvh)\b/i,
    /\bclamp\s*\(/i,
    /\bbackdrop-filter\s*:/i,
    /\btext-wrap\s*:/i,
    /\baspect-ratio\s*:/i,
    /\boverflow\s*:\s*clip/i,
  ];
  for (const pattern of unsupported) {
    if (pattern.test(text))
      reportError(`${fileName}: unsupported Chrome 61 CSS found (${pattern}).`);
  }
  if (/(?:^|[;{])\s*(?:gap|row-gap|column-gap)\s*:/im.test(text))
    reportError(`${fileName}: Flex gap requires behavioral detection; use the margin baseline.`);
  if (/url\(\s*["']?(?:https?:|\/)/i.test(text))
    reportError(`${fileName}: external or root-absolute CSS URL found.`);
}

async function main() {
  const root = resolve(process.argv[2] ?? 'dist-minitool');
  const rootStat = await stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) {
    console.error(`ERROR: artifact directory not found: ${root}`);
    process.exitCode = 1;
    return;
  }

  const files = await collectFiles(root);
  const paths = files.map((file) => packagePath(root, file)).sort();
  const packageFiles = new Set(paths);
  if (paths.filter((file) => file === 'index.html').length !== 1)
    reportError('Package must contain exactly one root index.html.');
  if (paths.filter((file) => extname(file).toLowerCase() === '.html').length !== 1)
    reportError('Package must contain exactly one HTML file.');

  let totalBytes = 0;
  let textBytes = 0;
  for (const file of files) {
    const name = packagePath(root, file);
    const extension = extname(name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) reportError(`${name}: unsupported file extension.`);
    const fileStat = await stat(file);
    totalBytes += fileStat.size;
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    textBytes += fileStat.size;
    if (fileStat.size > WARN_TEXT_FILE_BYTES)
      reportWarning(`${name}: text file exceeds 2 MiB (${fileStat.size} bytes).`);
    const text = await readFile(file, 'utf8');
    checkBase64(text, name);
    if (extension === '.html') checkHtml(text, root, name, packageFiles);
    if (extension === '.js') checkJavaScript(text, name);
    if (extension === '.css') checkCss(text, name);
  }
  if (textBytes > WARN_TEXT_TOTAL_BYTES)
    reportWarning(`Text total exceeds 5 MiB (${textBytes} bytes).`);
  if (totalBytes > MAX_ZIP_BYTES)
    reportWarning(`Uncompressed artifact exceeds the 10 MiB ZIP ceiling (${totalBytes} bytes).`);

  for (const warning of warnings) console.warn(`WARN: ${warning}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.log(
    `MiniTool audit: ${files.length} files, ${totalBytes} bytes unpacked, ${warnings.length} warnings, ${errors.length} errors.`,
  );
  if (errors.length > 0) process.exitCode = 1;
}

await main();
