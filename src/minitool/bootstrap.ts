import { createDefaultRating } from '../domain/rating/presets';
import type { MusicRatingDraft } from '../domain/rating/types';
import {
  HAITANGXIAN_TEMPLATE_ID,
  cloneRatingWithoutCover,
  createHaitangxianContentTemplate,
  loadContentTemplateCatalog,
  loadContentTemplateSeed,
  putContentTemplate,
  saveContentTemplateCatalog,
  saveContentTemplateSeed,
  type MiniToolContentTemplateCatalog,
} from './contentTemplates';
import { createHaitangxianRating } from './fixtures/haitangxianTemplate';
import { loadMiniToolWorkspace, type MiniToolLocale, type MiniToolStorageLike } from './storage';

export type InitialSaveState = 'restored' | 'saved' | 'invalid' | 'unavailable';

export type InitialTemplateNotice =
  'idle' | 'seeded' | 'invalid-catalog' | 'unavailable' | 'failed';

export interface MiniToolInitialState {
  locale: MiniToolLocale;
  rating: MusicRatingDraft;
  saveState: InitialSaveState;
  templateCatalog: MiniToolContentTemplateCatalog;
  templateNotice: InitialTemplateNotice;
}

export function initializeMiniTool(
  storage: MiniToolStorageLike,
  now = new Date().toISOString(),
): MiniToolInitialState {
  const workspace = loadMiniToolWorkspace(storage);
  const loadedCatalog = loadContentTemplateCatalog(storage);
  const seed = loadContentTemplateSeed(storage);
  let templateCatalog = loadedCatalog.catalog;
  let startupSeed: MusicRatingDraft | null = null;
  let templateNotice: InitialTemplateNotice = 'idle';

  if (loadedCatalog.status === 'invalid' || seed.status === 'invalid') {
    templateNotice = 'invalid-catalog';
  } else if (loadedCatalog.status === 'unavailable' || seed.status === 'unavailable') {
    templateNotice = 'unavailable';
    startupSeed = createHaitangxianRating();
  } else if (seed.status === 'unseeded') {
    const existingSeed = templateCatalog.templates.find(
      (template) => template.id === HAITANGXIAN_TEMPLATE_ID,
    );
    const initialTemplate = existingSeed || createHaitangxianContentTemplate(now);
    const nextCatalog = existingSeed
      ? templateCatalog
      : putContentTemplate(templateCatalog, initialTemplate);
    const catalogResult = existingSeed ? 'saved' : saveContentTemplateCatalog(storage, nextCatalog);
    if (catalogResult === 'saved') {
      templateCatalog = nextCatalog;
      startupSeed = cloneRatingWithoutCover(initialTemplate.rating);
      templateNotice = saveContentTemplateSeed(storage) ? 'seeded' : 'failed';
    } else {
      startupSeed = createHaitangxianRating();
      templateNotice = catalogResult === 'unavailable' ? 'unavailable' : 'failed';
    }
  }

  if (workspace.status === 'restored') {
    return {
      locale: workspace.workspace.locale,
      rating: workspace.workspace.rating,
      saveState: 'restored',
      templateCatalog,
      templateNotice,
    };
  }

  if (!startupSeed) {
    const defaultTemplate = templateCatalog.templates.find(
      (template) => template.id === HAITANGXIAN_TEMPLATE_ID,
    );
    if (defaultTemplate) startupSeed = cloneRatingWithoutCover(defaultTemplate.rating);
  }

  const storageUnavailable = workspace.status === 'unavailable';
  return {
    locale: 'zh-CN',
    rating:
      startupSeed ||
      (storageUnavailable ? createHaitangxianRating() : createDefaultRating('simple')),
    saveState:
      workspace.status === 'invalid' ? 'invalid' : storageUnavailable ? 'unavailable' : 'saved',
    templateCatalog,
    templateNotice,
  };
}
