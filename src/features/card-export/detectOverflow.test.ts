import { describe, expect, it } from 'vitest';

import { detectCardOverflow } from './detectOverflow';

interface MockElementOptions {
  region?: string;
  scrollHeight?: number;
  clientHeight?: number;
  scrollWidth?: number;
  clientWidth?: number;
  children?: MockElementOptions[];
}

function createMockElement(options: MockElementOptions = {}): HTMLElement {
  const children = (options.children ?? []).map(createMockElement);

  const mock: Partial<HTMLElement> = {
    getAttribute: (attr: string) => {
      if (attr === 'data-card-region') return options.region ?? null;
      return null;
    },
    querySelectorAll: (selector: string) => {
      if (selector === '[data-card-region]') {
        const matching: HTMLElement[] = [];
        for (const child of children) {
          if (child.getAttribute('data-card-region')) {
            matching.push(child);
          }
          matching.push(
            ...(Array.from(child.querySelectorAll('[data-card-region]')) as HTMLElement[]),
          );
        }
        return matching as unknown as NodeListOf<HTMLElement>;
      }
      return [] as unknown as NodeListOf<HTMLElement>;
    },
    scrollHeight: options.scrollHeight ?? 600,
    clientHeight: options.clientHeight ?? 600,
    scrollWidth: options.scrollWidth ?? 800,
    clientWidth: options.clientWidth ?? 800,
  };

  return mock as HTMLElement;
}

describe('detectCardOverflow', () => {
  it('returns no overflow when card element is null', () => {
    const result = detectCardOverflow(null);
    expect(result.hasOverflow).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it('returns no overflow when all dimensions fit within bounds', () => {
    const container = createMockElement({
      scrollHeight: 600,
      clientHeight: 600,
      scrollWidth: 800,
      clientWidth: 800,
    });

    const result = detectCardOverflow(container);
    expect(result.hasOverflow).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('identifies overflow in specific regions when content exceeds element bounds', () => {
    const container = createMockElement({
      scrollHeight: 600,
      clientHeight: 600,
      scrollWidth: 800,
      clientWidth: 800,
      children: [
        {
          region: 'comment',
          clientHeight: 50,
          scrollHeight: 120,
          clientWidth: 300,
          scrollWidth: 300,
        },
      ],
    });

    const result = detectCardOverflow(container);
    expect(result.hasOverflow).toBe(true);
    expect(result.issues).toEqual([
      {
        region: 'comment',
        labelKey: 'card.region.comment',
      },
    ]);
  });

  it('identifies root card container overflow', () => {
    const container = createMockElement({
      scrollHeight: 750,
      clientHeight: 600,
      scrollWidth: 800,
      clientWidth: 800,
    });

    const result = detectCardOverflow(container);
    expect(result.hasOverflow).toBe(true);
    expect(result.issues).toEqual([
      {
        region: 'card',
        labelKey: 'card.region.card',
      },
    ]);
  });
});
