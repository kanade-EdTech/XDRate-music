import { describe, expect, it } from 'vitest';
import {
  applyGameTemplate,
  copyGameTemplate,
  createSeededGameTemplateCatalog,
  deleteGameTemplate,
  renameGameTemplate,
} from './templateCatalog';

describe('game template catalog M1', () => {
  it('seeds four independent personal-rating templates', () => {
    const catalog = createSeededGameTemplateCatalog();
    expect(catalog.templates).toHaveLength(4);
    expect(catalog.templates.map((template) => template.source)).toEqual([
      'seeded-example',
      'seeded-example',
      'seeded-example',
      'seeded-example',
    ]);
    expect(catalog.templates.map((template) => template.rating.work.coverAssetPath)).toEqual([
      'assets/game-templates/covers/red-alert-2.webp',
      'assets/game-templates/covers/call-of-duty-4.webp',
      'assets/game-templates/covers/genshin-impact.webp',
      'assets/game-templates/covers/black-myth-wukong.webp',
    ]);
  });

  it('applies a deep copy so editing a rating cannot mutate the seed', () => {
    const template = createSeededGameTemplateCatalog().templates[0];
    const applied = applyGameTemplate(template);
    applied.work.title = '用户自己的游戏';
    applied.axes[0].score = 1;
    expect(template.rating.work.title).toBe('红色警戒 2');
    expect(template.rating.axes[0].score).toBe(9);
  });

  it('copies, renames, and deletes without mutating the original catalog', () => {
    const catalog = createSeededGameTemplateCatalog();
    const source = catalog.templates[0];
    const copy = copyGameTemplate(source, 'user-copy-1', '2026-09-25T01:00:00.000Z');
    const withCopy = { ...catalog, templates: [...catalog.templates, copy] };
    const renamed = renameGameTemplate(withCopy, 'user-copy-1', '我的红警模板', '2026-09-25T02:00:00.000Z');
    const deleted = deleteGameTemplate(renamed, source.id);
    expect(copy.source).toBe('user-created');
    expect(renamed.templates.find((template) => template.id === 'user-copy-1')?.name).toBe('我的红警模板');
    expect(deleted.templates.some((template) => template.id === source.id)).toBe(false);
    expect(catalog.templates).toHaveLength(4);
  });

  it('rejects empty names and unknown ids', () => {
    const catalog = createSeededGameTemplateCatalog();
    expect(() => renameGameTemplate(catalog, catalog.templates[0].id, '  ')).toThrow(
      'template-name-required',
    );
    expect(() => deleteGameTemplate(catalog, 'missing')).toThrow('template-not-found');
  });
});
