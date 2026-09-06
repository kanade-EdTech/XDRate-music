import { describe, expect, it } from 'vitest';

import { hasSupportedImageSignature, validateCoverFile } from './readLocalImage';

describe('validateCoverFile', () => {
  it('accepts supported image types up to 10 MB', () => {
    expect(validateCoverFile(new File(['image'], 'cover.webp', { type: 'image/webp' }))).toBeNull();
  });

  it('rejects unsupported formats and oversized files', () => {
    expect(validateCoverFile(new File(['text'], 'cover.svg', { type: 'image/svg+xml' }))).toBe(
      'unsupported-type',
    );
    expect(
      validateCoverFile(
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'cover.png', { type: 'image/png' }),
      ),
    ).toBe('file-too-large');
  });
});

describe('hasSupportedImageSignature', () => {
  it.each([
    ['image/png', [137, 80, 78, 71, 13, 10, 26, 10]],
    ['image/jpeg', [255, 216, 255, 224]],
    ['image/webp', [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
  ])('accepts a matching %s signature', async (type, bytes) => {
    await expect(
      hasSupportedImageSignature(new File([new Uint8Array(bytes)], 'cover', { type })),
    ).resolves.toBe(true);
  });

  it('rejects content whose bytes do not match its declared image MIME', async () => {
    await expect(
      hasSupportedImageSignature(
        new File(['<svg onload=alert(1)>'], 'cover.png', { type: 'image/png' }),
      ),
    ).resolves.toBe(false);
  });
});
