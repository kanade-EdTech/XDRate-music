import { describe, expect, it } from 'vitest';

import { createWindowTitle, fileNameFromPath } from './windowTitle';

describe('workspace window title', () => {
  it('prefers the work title and marks unsaved edits', () => {
    expect(
      createWindowTitle({
        workTitle: '海棠仙',
        currentFilePath: 'C:/private/album.xdrate.json',
        dirty: true,
        untitledLabel: '未命名作品',
        productName: 'XDRate Music',
      }),
    ).toBe('海棠仙 * — XDRate Music');
  });

  it('uses only the file name when the work title is empty', () => {
    const title = createWindowTitle({
      workTitle: ' ',
      currentFilePath: 'C:\\Users\\secret\\rating.xdrate.json',
      dirty: false,
      untitledLabel: '未命名作品',
      productName: 'XDRate Music',
    });
    expect(title).toBe('rating.xdrate.json — XDRate Music');
    expect(title).not.toContain('Users');
    expect(title).not.toContain('secret');
  });

  it('uses the localized untitled label for a new workspace', () => {
    expect(
      createWindowTitle({
        workTitle: '',
        currentFilePath: null,
        dirty: false,
        untitledLabel: 'Untitled work',
        productName: 'XDRate Music',
      }),
    ).toBe('Untitled work — XDRate Music');
  });

  it('extracts Windows and POSIX base names', () => {
    expect(fileNameFromPath('C:\\Ratings\\one.json')).toBe('one.json');
    expect(fileNameFromPath('/ratings/two.json')).toBe('two.json');
  });
});
