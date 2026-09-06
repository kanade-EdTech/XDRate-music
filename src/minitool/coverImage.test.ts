import { describe, expect, it } from 'vitest';

import { calculateCoverDimensions } from './coverImage';

describe('MiniTool cover dimensions', () => {
  it('downscales landscape and portrait sources within the edge budget', () => {
    expect(calculateCoverDimensions(4000, 2000)).toEqual({ width: 1280, height: 640 });
    expect(calculateCoverDimensions(1200, 2400)).toEqual({ width: 640, height: 1280 });
  });

  it('does not upscale a small cover', () => {
    expect(calculateCoverDimensions(600, 600)).toEqual({ width: 600, height: 600 });
  });

  it('rejects invalid source dimensions', () => {
    expect(calculateCoverDimensions(0, 100)).toBeNull();
    expect(calculateCoverDimensions(Number.NaN, 100)).toBeNull();
  });
});
