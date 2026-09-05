import { describe, expect, it } from 'vitest';

import { ALL_CARD_RATIOS, CARD_RATIO_CONFIGS, getRatioConfig } from './ratioConfig';
import type { CardRatio, LayoutFamily } from './types';

describe('ratioConfig', () => {
  const expectedRatios: CardRatio[] = [
    '16:9',
    '8:5',
    '3:2',
    '4:3',
    '5:4',
    '1:1',
    '4:5',
    '3:4',
    '2:3',
    '5:8',
    '9:16',
  ];

  it('contains exactly the 11 defined ratios', () => {
    expect(ALL_CARD_RATIOS).toEqual(expectedRatios);
    expect(Object.keys(CARD_RATIO_CONFIGS)).toHaveLength(11);
  });

  it('assigns each ratio to one of the 4 layout families', () => {
    const validFamilies: LayoutFamily[] = ['landscape', 'standard', 'square', 'portrait'];

    expectedRatios.forEach((ratio) => {
      const config = getRatioConfig(ratio);
      expect(validFamilies).toContain(config.family);
    });

    expect(CARD_RATIO_CONFIGS['16:9'].family).toBe('landscape');
    expect(CARD_RATIO_CONFIGS['8:5'].family).toBe('landscape');
    expect(CARD_RATIO_CONFIGS['3:2'].family).toBe('landscape');

    expect(CARD_RATIO_CONFIGS['4:3'].family).toBe('standard');
    expect(CARD_RATIO_CONFIGS['5:4'].family).toBe('standard');

    expect(CARD_RATIO_CONFIGS['1:1'].family).toBe('square');

    expect(CARD_RATIO_CONFIGS['4:5'].family).toBe('portrait');
    expect(CARD_RATIO_CONFIGS['3:4'].family).toBe('portrait');
    expect(CARD_RATIO_CONFIGS['2:3'].family).toBe('portrait');
    expect(CARD_RATIO_CONFIGS['5:8'].family).toBe('portrait');
    expect(CARD_RATIO_CONFIGS['9:16'].family).toBe('portrait');
  });

  it('has exact mathematical dimensions for all 11 ratios', () => {
    expectedRatios.forEach((ratio) => {
      const config = getRatioConfig(ratio);
      const [w, h] = ratio.split(':').map(Number);
      const expectedAspect = w / h;

      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
      expect(config.width / config.height).toBeCloseTo(expectedAspect, 4);
      expect(config.aspectRatio).toBeCloseTo(expectedAspect, 4);
    });
  });

  it('defines valid positive content capacity bounds for all ratios', () => {
    expectedRatios.forEach((ratio) => {
      const config = getRatioConfig(ratio);
      expect(config.maxCommentLines).toBeGreaterThan(0);
      expect(config.maxStoryLines).toBeGreaterThan(0);
      expect(config.maxBreakdownItems).toBeGreaterThan(0);
      expect(config.charsPerLine).toBeGreaterThan(0);
    });
  });

  it('wider ratios have equal or more charsPerLine than narrower ones', () => {
    // Portrait ratios: as canvas gets narrower, charsPerLine should decrease
    const portrait = (['4:5', '3:4', '2:3', '5:8', '9:16'] as const).map(
      (r) => CARD_RATIO_CONFIGS[r],
    );
    for (let i = 0; i < portrait.length - 1; i++) {
      // width decreases, so charsPerLine should be <= previous
      expect(portrait[i]!.charsPerLine).toBeGreaterThanOrEqual(portrait[i + 1]!.charsPerLine);
    }
  });
});
