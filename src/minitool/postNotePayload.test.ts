import { describe, expect, it } from 'vitest';

import {
  buildPostNotePayload,
  countPostNoteCharacters,
  limitPostNoteText,
  POST_NOTE_LIMITS,
} from './postNotePayload';

const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgo=';

describe('buildPostNotePayload', () => {
  it('builds the exact photo-publishing payload without calling a bridge', () => {
    expect(
      buildPostNotePayload({
        title: '  海棠仙  ',
        content: '  一张多维音乐评价卡  ',
        tags: '  音乐评价  ',
        imageDataUris: [PNG_DATA_URI],
      }),
    ).toEqual({
      ok: true,
      payload: {
        title: '  海棠仙  ',
        content: '  一张多维音乐评价卡  ',
        tags: '  音乐评价  ',
        pageType: 'photo_publish',
        mediaInfo: {
          image_resources: [{ url: PNG_DATA_URI }],
        },
      },
      truncation: { title: false, content: false },
    });
  });

  it('truncates title and content by Unicode code point without splitting emoji', () => {
    const title = `${'曲'.repeat(POST_NOTE_LIMITS.titleCharacters)}🎵尾`;
    const content = `${'评'.repeat(POST_NOTE_LIMITS.contentCharacters)}🎵尾`;
    const result = buildPostNotePayload({ title, content, imageDataUris: [PNG_DATA_URI] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Array.from(result.payload.title ?? '')).toHaveLength(POST_NOTE_LIMITS.titleCharacters);
    expect(Array.from(result.payload.content ?? '')).toHaveLength(
      POST_NOTE_LIMITS.contentCharacters,
    );
    expect(result.payload.title).not.toContain('\ud83c');
    expect(result.truncation).toEqual({ title: true, content: true });
  });

  it('omits optional fields whose cleaned values are empty', () => {
    const result = buildPostNotePayload({
      title: '  ',
      content: '\n',
      tags: '',
      imageDataUris: [PNG_DATA_URI],
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        pageType: 'photo_publish',
        mediaInfo: { image_resources: [{ url: PNG_DATA_URI }] },
      },
      truncation: { title: false, content: false },
    });
  });

  it('rejects empty, over-capacity, and malformed image collections', () => {
    expect(buildPostNotePayload({ imageDataUris: [] })).toEqual({
      ok: false,
      reason: 'no-images',
    });
    expect(
      buildPostNotePayload({
        imageDataUris: Array.from(
          { length: POST_NOTE_LIMITS.imageResources + 1 },
          () => PNG_DATA_URI,
        ),
      }),
    ).toEqual({ ok: false, reason: 'too-many-images' });
    expect(
      buildPostNotePayload({ imageDataUris: [PNG_DATA_URI, 'https://example.com/card.png'] }),
    ).toEqual({ ok: false, reason: 'invalid-image', invalidImageIndex: 1 });
  });

  it('accepts the maximum supported number of PNG resources', () => {
    const result = buildPostNotePayload({
      imageDataUris: Array.from({ length: POST_NOTE_LIMITS.imageResources }, () => PNG_DATA_URI),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.mediaInfo.image_resources).toHaveLength(
        POST_NOTE_LIMITS.imageResources,
      );
    }
  });
});

describe('postNote character helpers', () => {
  it('counts and limits Unicode code points consistently', () => {
    expect(countPostNoteCharacters('海棠仙🎵')).toBe(4);
    expect(limitPostNoteText('海棠仙🎵尾', 4)).toBe('海棠仙🎵');
  });
});
