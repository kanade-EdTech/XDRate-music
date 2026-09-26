import { describe, expect, it } from 'vitest';

import { createDefaultRating } from '../domain/rating/presets';
import type { CardRatio } from '../features/card-export/types';
import { createRenderRevision } from './renderRevision';

const ratio: CardRatio = '4:5';

describe('createRenderRevision', () => {
  it('is deterministic for the same render inputs', () => {
    const rating = createDefaultRating('simple');

    expect(createRenderRevision({ rating, ratio })).toBe(
      createRenderRevision({ rating: structuredClone(rating), ratio }),
    );
  });

  it('changes when a rendered input changes', () => {
    const rating = createDefaultRating('simple');
    const base = createRenderRevision({ rating, ratio });

    expect(
      createRenderRevision({
        rating: { ...rating, overallComment: 'new comment' },
        ratio,
      }),
    ).not.toBe(base);
    expect(createRenderRevision({ rating, ratio: '1:1' })).not.toBe(base);
    expect(createRenderRevision({ rating, ratio, coverUrl: 'blob:cover' })).not.toBe(base);
    expect(createRenderRevision({ rating, ratio, personalSignature: '署名' })).not.toBe(base);
  });

  it('normalizes omitted and whitespace-only signatures', () => {
    const rating = createDefaultRating('simple');

    expect(createRenderRevision({ rating, ratio })).toBe(
      createRenderRevision({ rating, ratio, personalSignature: '  ' }),
    );
  });
});
