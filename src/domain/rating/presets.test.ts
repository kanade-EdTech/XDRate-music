import { describe, expect, it } from 'vitest';

import { clearRatingContent, createDefaultRating } from './presets';

describe('rating presets', () => {
  it('clears seeded content while keeping the selected axis structure', () => {
    const rating = createDefaultRating('simple');
    rating.work.title = '海棠仙';
    rating.axes[0].score = 8;
    rating.axes[0].reason = '已有理由';
    rating.personalStory = '已有故事';

    const cleared = clearRatingContent(rating);

    expect(cleared.work.title).toBe('');
    expect(cleared.axes.map((axis) => axis.name)).toEqual(['艺术品质', '听感', '个人喜好']);
    expect(cleared.axes.every((axis) => axis.score === 0 && axis.reason === '')).toBe(true);
    expect(cleared.personalStory).toBe('');
    expect(cleared.negativeItems).toEqual([]);
  });

  it('repairs an empty professional axis list instead of turning it into custom mode', () => {
    const rating = { ...createDefaultRating('professional'), axes: [] };
    const cleared = clearRatingContent(rating);

    expect(cleared.mode).toBe('professional');
    expect(cleared.axes.map((axis) => axis.name)).toEqual([
      '填词 / 立意',
      '作曲 / 编曲',
      '演唱 / 调音 / 混音',
      '创新',
      '其他',
    ]);
  });
});
