import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';

import { readStoredEntries, validateEntryName } from './verify-minitool-zip.mjs';

test('accepts only safe packaged entry paths and supported extensions', () => {
  assert.doesNotThrow(() => validateEntryName('index.html'));
  assert.doesNotThrow(() => validateEntryName('assets/app.js'));

  for (const name of [
    '',
    '../index.html',
    'assets/../index.html',
    '/index.html',
    'C:/index.html',
    'assets\\app.js',
    'assets/app.js.map',
  ]) {
    assert.throws(() => validateEntryName(name));
  }
});

test('rejects buffers without a valid ZIP central directory', () => {
  assert.throws(() => readStoredEntries(Buffer.from('not a zip')));
});
