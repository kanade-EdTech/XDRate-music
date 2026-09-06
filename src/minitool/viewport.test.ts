import { describe, expect, it } from 'vitest';

import { calculateViewportMetrics } from './viewport';

describe('MiniTool visual viewport metrics', () => {
  it('detects a soft keyboard from the visual viewport delta', () => {
    expect(calculateViewportMetrics(800, 480)).toEqual({
      visibleHeight: 480,
      keyboardOffset: 320,
      keyboardOpen: true,
    });
  });

  it('keeps a stable fallback without visualViewport', () => {
    expect(calculateViewportMetrics(760, null)).toEqual({
      visibleHeight: 760,
      keyboardOffset: 0,
      keyboardOpen: false,
    });
  });

  it('does not classify small browser chrome changes as a keyboard', () => {
    expect(calculateViewportMetrics(800, 710).keyboardOpen).toBe(false);
  });
});
