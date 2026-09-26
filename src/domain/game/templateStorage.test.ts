import { describe, expect, it } from 'vitest';
import {
  GAME_TEMPLATE_CATALOG_KEY,
  initializeGameTemplateCatalog,
  loadGameTemplateCatalog,
  saveGameTemplateCatalog,
  type GameTemplateStorageLike,
} from './templateStorage';

function memoryStorage(): GameTemplateStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

describe('game template storage M1', () => {
  it('seeds once and restores the user-editable catalog', () => {
    const storage = memoryStorage();
    const first = initializeGameTemplateCatalog(storage, '2026-09-25T03:00:00.000Z');
    expect(first.status).toBe('seeded');
    expect(first.catalog.templates).toHaveLength(4);

    const second = initializeGameTemplateCatalog(storage, '2026-09-26T03:00:00.000Z');
    expect(second.status).toBe('restored');
    expect(second.catalog.templates[0].createdAt).toBe('2026-09-25T03:00:00.000Z');
  });

  it('preserves template storage independently of workspace clearing', () => {
    const storage = memoryStorage();
    const seeded = initializeGameTemplateCatalog(storage);
    storage.setItem('xdrate.game.workspace.v1', JSON.stringify({ title: '用户作品' }));
    storage.removeItem?.('xdrate.game.workspace.v1');
    const restored = loadGameTemplateCatalog(storage);
    expect(restored.status).toBe('restored');
    expect(restored.catalog.templates).toEqual(seeded.catalog.templates);
    expect(storage.data.has(GAME_TEMPLATE_CATALOG_KEY)).toBe(true);
  });

  it('rejects duplicate template ids or names', () => {
    const storage = memoryStorage();
    const seeded = initializeGameTemplateCatalog(storage).catalog;
    const duplicate = {
      ...seeded,
      templates: [...seeded.templates, { ...seeded.templates[0], id: 'another-id' }],
    };
    expect(saveGameTemplateCatalog(storage, duplicate)).toBe('invalid');
  });

  it('does not trust malformed persisted data', () => {
    const storage = memoryStorage();
    storage.setItem(GAME_TEMPLATE_CATALOG_KEY, '{"version":1,"templates":[null]}');
    expect(loadGameTemplateCatalog(storage).status).toBe('invalid');
  });
});
