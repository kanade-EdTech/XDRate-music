import type { CardOverflowResult, OverflowIssue, OverflowRegionId } from './types';

const REGION_LABEL_MAP: Record<OverflowRegionId, string> = {
  header: 'card.region.header',
  chart: 'card.region.chart',
  axes: 'card.region.axes',
  reasons: 'card.region.reasons',
  comment: 'card.region.comment',
  story: 'card.region.story',
  footer: 'card.region.footer',
  card: 'card.region.card',
};

export function detectCardOverflow(cardElement: HTMLElement | null): CardOverflowResult {
  if (!cardElement) {
    return { hasOverflow: false, issues: [] };
  }

  const issues: OverflowIssue[] = [];
  const seenRegions = new Set<OverflowRegionId>();

  // Check designated sub-regions
  const regionElements = cardElement.querySelectorAll<HTMLElement>('[data-card-region]');
  regionElements.forEach((el) => {
    const regionName = el.getAttribute('data-card-region') as OverflowRegionId;
    if (!regionName || regionName === 'card') return;

    const isOverflowingY = el.scrollHeight > el.clientHeight + 1.5;
    const isOverflowingX = el.scrollWidth > el.clientWidth + 1.5;

    if ((isOverflowingY || isOverflowingX) && !seenRegions.has(regionName)) {
      seenRegions.add(regionName);
      issues.push({
        region: regionName,
        labelKey: REGION_LABEL_MAP[regionName] ?? 'card.region.card',
      });
    }
  });

  // Check root card element
  const isCardOverflowingY = cardElement.scrollHeight > cardElement.clientHeight + 1.5;
  const isCardOverflowingX = cardElement.scrollWidth > cardElement.clientWidth + 1.5;

  if ((isCardOverflowingY || isCardOverflowingX) && !seenRegions.has('card')) {
    seenRegions.add('card');
    issues.push({
      region: 'card',
      labelKey: REGION_LABEL_MAP.card,
    });
  }

  return {
    hasOverflow: issues.length > 0,
    issues,
  };
}
