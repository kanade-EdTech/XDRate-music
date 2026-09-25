import { describe, expect, it } from 'vitest';

import { calculateRating } from '../domain/rating/calculateRating';
import { createDefaultRating } from '../domain/rating/presets';
import { initializeMiniTool } from './bootstrap';
import {
  HAITANGXIAN_TEMPLATE_ID,
  MINI_TOOL_CONTENT_TEMPLATE_LIMIT,
  MINI_TOOL_CONTENT_TEMPLATE_SEED_KEY,
  MINI_TOOL_CONTENT_TEMPLATES_KEY,
  cloneRatingWithoutCover,
  createContentTemplate,
  createEmptyContentTemplateCatalog,
  createHaitangxianContentTemplate,
  findContentTemplateByName,
  loadContentTemplateCatalog,
  putContentTemplate,
  removeContentTemplate,
  saveContentTemplateCatalog,
} from './contentTemplates';
import { createHaitangxianRating } from './fixtures/haitangxianTemplate';
import { MINI_TOOL_WORKSPACE_KEY, type MiniToolStorageLike } from './storage';

const NOW = '2026-09-05T08:00:00.000Z';

class MemoryStorage implements MiniToolStorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('MiniTool content templates', () => {
  it('returns independent cover-free 海棠仙 fixtures that calculate to 80.0', () => {
    const first = createHaitangxianRating();
    const second = createHaitangxianRating();
    first.axes[0].score = 1;

    expect(second.axes.map((axis) => axis.score)).toEqual([8, 7, 9]);
    expect(second.axes.every((axis) => axis.importanceLevel === 3)).toBe(true);
    expect(second.work.coverDataUrl).toBeNull();
    expect(calculateRating(second)).toMatchObject({ status: 'ready', score100: 80 });
  });

  it('seeds once, prefers a valid recent draft, and never resurrects a deleted seed', () => {
    const storage = new MemoryStorage();
    const first = initializeMiniTool(storage, NOW);
    expect(first.rating.work.title).toBe('海棠仙');
    expect(first.templateCatalog.templates).toHaveLength(1);
    expect(first.templateCatalog.templates[0].id).toBe(HAITANGXIAN_TEMPLATE_ID);
    expect(storage.values.has(MINI_TOOL_CONTENT_TEMPLATE_SEED_KEY)).toBe(true);

    const withoutSeed = removeContentTemplate(first.templateCatalog, HAITANGXIAN_TEMPLATE_ID);
    expect(saveContentTemplateCatalog(storage, withoutSeed)).toBe('saved');
    storage.values.delete(MINI_TOOL_WORKSPACE_KEY);

    const reopened = initializeMiniTool(storage, '2026-09-06T08:00:00.000Z');
    expect(reopened.rating.work.title).toBe('');
    expect(reopened.templateCatalog.templates).toHaveLength(0);
  });

  it('keeps a valid recent draft above the first-launch seed', () => {
    const storage = new MemoryStorage();
    const rating = createDefaultRating('simple');
    rating.work.title = '最近作品';
    storage.setItem(
      MINI_TOOL_WORKSPACE_KEY,
      JSON.stringify({ version: 1, workspace: { locale: 'en', rating } }),
    );

    const state = initializeMiniTool(storage, NOW);
    expect(state.locale).toBe('en');
    expect(state.rating.work.title).toBe('最近作品');
    expect(state.templateCatalog.templates[0].name).toBe('海棠仙');
  });

  it('renames the initial template like an ordinary entry and preserves the seed marker', () => {
    const storage = new MemoryStorage();
    const first = initializeMiniTool(storage, NOW);
    const seeded = first.templateCatalog.templates[0];
    const renamed = createContentTemplate(
      seeded.id,
      '我的开局',
      seeded.rating,
      '2026-09-05T09:00:00.000Z',
      seeded.createdAt,
    );
    expect(renamed).not.toBeNull();
    expect(
      saveContentTemplateCatalog(storage, putContentTemplate(first.templateCatalog, renamed!)),
    ).toBe('saved');
    storage.values.delete(MINI_TOOL_WORKSPACE_KEY);

    const reopened = initializeMiniTool(storage, '2026-09-06T08:00:00.000Z');
    expect(reopened.templateCatalog.templates.map((template) => template.name)).toEqual([
      '我的开局',
    ]);
    expect(reopened.rating.work.title).toBe('海棠仙');
    expect(reopened.templateCatalog.templates.some((template) => template.name === '海棠仙')).toBe(
      false,
    );
  });

  it('normalizes names, rejects duplicates, excludes covers, and enforces the count limit', () => {
    const storage = new MemoryStorage();
    let catalog = createEmptyContentTemplateCatalog();
    for (let index = 0; index < MINI_TOOL_CONTENT_TEMPLATE_LIMIT; index += 1) {
      const rating = createDefaultRating('simple');
      rating.work.coverDataUrl = 'data:image/png;base64,unsafe';
      const template = createContentTemplate(`template-${index}`, ` 模板 ${index} `, rating, NOW);
      expect(template?.rating.work.coverDataUrl).toBeNull();
      catalog = putContentTemplate(catalog, template!);
    }
    expect(findContentTemplateByName(catalog, '模板 0')?.id).toBe('template-0');
    expect(saveContentTemplateCatalog(storage, catalog)).toBe('saved');

    const extra = createContentTemplate(
      'template-extra',
      '额外模板',
      createHaitangxianRating(),
      NOW,
    )!;
    expect(saveContentTemplateCatalog(storage, putContentTemplate(catalog, extra))).toBe('invalid');
  });

  it('rejects oversized catalogs and quota failures without a partial write', () => {
    const storage = new MemoryStorage();
    const largeRating = createDefaultRating('simple');
    largeRating.axes = Array.from({ length: 12 }, (_, index) => ({
      id: `axis-${index}`,
      name: `分项${index}`,
      score: 10,
      importanceLevel: 3 as const,
      enabled: true,
      reason: '评'.repeat(500),
    }));
    largeRating.negativeItems = Array.from({ length: 5 }, (_, index) => ({
      id: `negative-${index}`,
      name: `扣分${index}`,
      score: -5,
      enabled: true,
      reason: '扣'.repeat(500),
    }));
    largeRating.overallComment = '总'.repeat(2000);
    largeRating.personalStory = '事'.repeat(3000);

    let catalog = createEmptyContentTemplateCatalog();
    for (let index = 0; index < MINI_TOOL_CONTENT_TEMPLATE_LIMIT; index += 1) {
      catalog = putContentTemplate(
        catalog,
        createContentTemplate(`large-${index}`, `大模板${index}`, largeRating, NOW)!,
      );
    }
    expect(saveContentTemplateCatalog(storage, catalog)).toBe('too-large');
    expect(storage.getItem(MINI_TOOL_CONTENT_TEMPLATES_KEY)).toBeNull();

    const quotaStorage: MiniToolStorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    const smallCatalog = putContentTemplate(
      createEmptyContentTemplateCatalog(),
      createHaitangxianContentTemplate(NOW),
    );
    expect(saveContentTemplateCatalog(quotaStorage, smallCatalog)).toBe('unavailable');
  });

  it('isolates invalid catalogs without overwriting them or reseeding when marked', () => {
    const storage = new MemoryStorage();
    storage.setItem(MINI_TOOL_CONTENT_TEMPLATES_KEY, '{broken');
    storage.setItem(
      MINI_TOOL_CONTENT_TEMPLATE_SEED_KEY,
      JSON.stringify({ version: 1, seeded: true }),
    );
    const before = storage.getItem(MINI_TOOL_CONTENT_TEMPLATES_KEY);

    expect(loadContentTemplateCatalog(storage).status).toBe('invalid');
    const state = initializeMiniTool(storage, NOW);
    expect(state.templateNotice).toBe('invalid-catalog');
    expect(state.templateCatalog.templates).toHaveLength(0);
    expect(storage.getItem(MINI_TOOL_CONTENT_TEMPLATES_KEY)).toBe(before);
  });

  it('deep-clones nested content and removes cover data', () => {
    const source = createHaitangxianRating();
    source.work.coverDataUrl = 'data:image/png;base64,unsafe';
    const cloned = cloneRatingWithoutCover(source);
    cloned.axes[0].reason = 'changed';
    expect(source.axes[0].reason).not.toBe('changed');
    expect(cloned.work.coverDataUrl).toBeNull();
  });
});
