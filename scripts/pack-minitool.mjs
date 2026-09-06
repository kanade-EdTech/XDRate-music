import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

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

async function collectFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(root, absolute)));
    else if (entry.isFile()) files.push(absolute);
    else throw new Error(`Unsupported package entry: ${absolute}`);
  }
  return files;
}

function zipPath(root, file) {
  return relative(root, file).split(sep).join('/');
}

function makeLocalHeader(name, data, crc) {
  const nameBytes = Buffer.from(name, 'utf8');
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, nameBytes, data]);
}

function makeCentralHeader(name, data, crc, offset) {
  const nameBytes = Buffer.from(name, 'utf8');
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(33, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBytes.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, nameBytes]);
}

function makeEndRecord(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

async function main() {
  const source = resolve(process.argv[2] ?? 'dist-minitool');
  const output = resolve(
    process.argv[3] ?? 'artifacts/minitool/xdrate-music-v0.3.0-m2-engineering.zip',
  );
  const files = (await collectFiles(source)).sort((left, right) =>
    zipPath(source, left).localeCompare(zipPath(source, right), 'en'),
  );
  const names = files.map((file) => zipPath(source, file));
  if (names.filter((name) => name === 'index.html').length !== 1)
    throw new Error('Refusing to pack: root index.html is not unique.');

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = zipPath(source, file);
    const data = await readFile(file);
    const crc = crc32(data);
    const local = makeLocalHeader(name, data, crc);
    localParts.push(local);
    centralParts.push(makeCentralHeader(name, data, crc, offset));
    offset += local.length;
  }

  const central = Buffer.concat(centralParts);
  const zip = Buffer.concat([
    ...localParts,
    central,
    makeEndRecord(files.length, central.length, offset),
  ]);
  if (zip.length > 10 * 1024 * 1024) throw new Error('ZIP exceeds the 10 MiB hard limit.');

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, zip);
  const hash = createHash('sha256').update(zip).digest('hex');
  await writeFile(`${output}.sha256`, `${hash}  ${basename(output)}\n`, 'utf8');
  console.log(`Packed ${files.length} files into ${output} (${zip.length} bytes).`);
  console.log(`SHA-256 ${hash}`);
}

await main();
