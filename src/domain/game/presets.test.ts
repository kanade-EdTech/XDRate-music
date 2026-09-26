import { describe, expect, it } from 'vitest';
import { gameAxisDefinitions, gameDomainDefinition, gameTemplateInventoryIds } from './presets';
import { gameTemplateInventory } from './templateInventory';

describe('game domain M0 contract', () => {
  it('defines stable axis ids and a shared algorithm contract', () => {
    expect(gameDomainDefinition.id).toBe('game');
    expect(gameDomainDefinition.algorithmVersion).toBe('music-linear-100-v4');
    expect(new Set(gameAxisDefinitions.map((axis) => axis.id)).size).toBe(gameAxisDefinitions.length);
    expect(gameAxisDefinitions).toHaveLength(5);
  });

  it('keeps the initial template inventory rights-gated', () => {
    expect(gameTemplateInventory.map((item) => item.id)).toEqual([...gameTemplateInventoryIds]);
    expect(gameTemplateInventory).toHaveLength(5);
    expect(gameTemplateInventory.slice(0, 4).map((item) => item.title)).toEqual([
      '红色警戒 2',
      '使命召唤 4：现代战争',
      '原神',
      '黑神话：悟空',
    ]);
    expect(gameTemplateInventory.slice(0, 4).every((item) => item.sourceCoverFile !== null)).toBe(true);
    expect(gameTemplateInventory.slice(0, 4).every((item) => item.processedCoverFile?.endsWith('.webp'))).toBe(true);
    expect(gameTemplateInventory.every((item) => item.status === 'pending-rights-review')).toBe(true);
    expect(gameTemplateInventory.every((item) => item.coverUsage === 'unknown')).toBe(true);
  });
});
