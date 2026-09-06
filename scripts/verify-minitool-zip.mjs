import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const MAX_ZIP_BYTES = 10 * 1024 * 1024;
const TARGET_ZIP_BYTES = 2 * 1024 * 1024;

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function findEndOfCentralDirectory(zip) {
  const earliest = Math.max(0, zip.length - 22 - 0xffff);
  for (let offset = zip.length - 22; offset >= earliest; offset -= 1) {
    if (zip.readUInt32LE(offset) !== 0x06054b50) continue;
    const commentLength = zip.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === zip.length) return offset;
  }
  throw new Error('End-of-central-directory record was not found.');
}

export function validateEntryName(name) {
  if (
    !name ||
    name.includes('\\') ||
    name.startsWith('/') ||
    /^[a-z]:/i.test(name) ||
    name.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error(`Unsafe ZIP entry path: ${name || '<empty>'}`);
  }
  if (!ALLOWED_EXTENSIONS.has(extname(name).toLowerCase())) {
    throw new Error(`Unsupported ZIP entry extension: ${name}`);
  }
}

export function readStoredEntries(zip) {
  const endOffset = findEndOfCentralDirectory(zip);
  if (zip.readUInt16LE(endOffset + 4) !== 0 || zip.readUInt16LE(endOffset + 6) !== 0) {
    throw new Error('Multi-disk ZIP files are not supported.');
  }
  const entryCount = zip.readUInt16LE(endOffset + 10);
  const centralSize = zip.readUInt32LE(endOffset + 12);
  const centralOffset = zip.readUInt32LE(endOffset + 16);
  if (centralOffset + centralSize !== endOffset) {
    throw new Error('ZIP central-directory bounds are inconsistent.');
  }

  const entries = new Map();
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (zip.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Invalid central-directory entry ${index}.`);
    }
    const flags = zip.readUInt16LE(cursor + 8);
    const method = zip.readUInt16LE(cursor + 10);
    const expectedCrc = zip.readUInt32LE(cursor + 16);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const uncompressedSize = zip.readUInt32LE(cursor + 24);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const localOffset = zip.readUInt32LE(cursor + 42);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    validateEntryName(name);
    if (entries.has(name)) throw new Error(`Duplicate ZIP entry: ${name}`);
    if ((flags & 1) !== 0) throw new Error(`Encrypted ZIP entry is not allowed: ${name}`);
    if (method !== 0 || compressedSize !== uncompressedSize) {
      throw new Error(`Only deterministic stored entries are accepted: ${name}`);
    }
    if (zip.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid local header for ${name}.`);
    }
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const localName = zip
      .subarray(localOffset + 30, localOffset + 30 + localNameLength)
      .toString('utf8');
    if (localName !== name) throw new Error(`Local/central entry name mismatch for ${name}.`);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = zip.subarray(dataStart, dataStart + uncompressedSize);
    if (data.length !== uncompressedSize || crc32(data) !== expectedCrc) {
      throw new Error(`Size or CRC mismatch for ${name}.`);
    }
    entries.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== centralOffset + centralSize) {
    throw new Error('ZIP central-directory entry count or size is inconsistent.');
  }
  return entries;
}

async function collectSourceFiles(root, current = root) {
  const result = new Map();
  const directoryEntries = await readdir(current, { withFileTypes: true });
  for (const entry of directoryEntries) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectSourceFiles(root, absolute);
      for (const [name, data] of nested) result.set(name, data);
    } else if (entry.isFile()) {
      const name = relative(root, absolute).split(sep).join('/');
      result.set(name, await readFile(absolute));
    } else {
      throw new Error(`Unsupported source entry: ${absolute}`);
    }
  }
  return result;
}

function gitOutput(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

async function main() {
  const zipPath = resolve(
    process.argv[2] ?? 'artifacts/minitool/xdrate-music-v0.3.0-m4-preflight.zip',
  );
  const sourceRoot = resolve(process.argv[3] ?? 'dist-minitool');
  const manifestPath = process.argv[4] ? resolve(process.argv[4]) : null;
  const zip = await readFile(zipPath);
  if (zip.length > MAX_ZIP_BYTES) throw new Error(`ZIP exceeds 10 MiB: ${zip.length} bytes.`);
  const entries = readStoredEntries(zip);
  if (entries.has('index.html') === false) throw new Error('Root index.html is missing.');
  if ([...entries.keys()].filter((name) => extname(name).toLowerCase() === '.html').length !== 1) {
    throw new Error('ZIP must contain exactly one HTML file.');
  }

  const sourceFiles = await collectSourceFiles(sourceRoot);
  if (entries.size !== sourceFiles.size) {
    throw new Error(`ZIP/source file-count mismatch: ${entries.size}/${sourceFiles.size}.`);
  }
  for (const [name, sourceData] of sourceFiles) {
    const zipData = entries.get(name);
    if (!zipData || !zipData.equals(sourceData)) {
      throw new Error(`ZIP content differs from audited source: ${name}`);
    }
  }

  const checksum = sha256(zip);
  const checksumFile = await readFile(`${zipPath}.sha256`, 'utf8');
  if (checksumFile.trim() !== `${checksum}  ${basename(zipPath)}`) {
    throw new Error('SHA-256 sidecar does not match the final ZIP.');
  }
  const unpackedBytes = [...entries.values()].reduce((total, data) => total + data.length, 0);
  const sourceCommit = gitOutput(['rev-parse', 'HEAD']) || null;
  const sourceDirty = Boolean(gitOutput(['status', '--porcelain', '--untracked-files=all']));
  const manifest = {
    schemaVersion: 1,
    product: 'XDRate Music MiniTool',
    version: '0.3.0',
    channel: 'm4-preflight',
    package: basename(zipPath),
    sha256: checksum,
    zipBytes: zip.length,
    unpackedBytes,
    sourceCommit,
    sourceDirty,
    files: [...entries.entries()].map(([name, data]) => ({
      path: name,
      bytes: data.length,
      sha256: sha256(data),
    })),
    privacyBoundary: {
      network: 'disabled',
      localDraftStorage: 'container localStorage; may be cleared by the host',
      nativeBridgeCalls: ['writeTempFile', 'saveImageToPhotosAlbum'],
      directPublishing: 'disabled',
    },
    knownLimitations: [
      'Chrome 61 / Android 8.1 real-device compatibility is not yet recorded.',
      'Current Android and iOS 18.4+ exact-package acceptance is not yet recorded.',
      'The source tree must be clean and committed before promotion to a public candidate.',
    ],
  };
  if (manifestPath) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const target = zip.length <= TARGET_ZIP_BYTES ? 'within 2 MiB target' : 'above 2 MiB target';
  console.log(
    `MiniTool ZIP verified: ${entries.size} files, ${zip.length} bytes (${target}), ${unpackedBytes} bytes unpacked, SHA-256 ${checksum}.`,
  );
  console.log(`Source commit ${sourceCommit ?? 'unavailable'}; dirty=${sourceDirty}.`);
  if (manifestPath) console.log(`Manifest written to ${manifestPath}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
