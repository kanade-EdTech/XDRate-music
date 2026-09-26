import type { ImportanceLevel, NegativeItem, RatingAxis } from '../rating/types';
import { gameTemplateInventoryIds } from './presets';
import type { GameRatingDraft, GameTemplateDefinition } from './types';

export interface GameTemplateCatalog {
  version: 1;
  templates: GameTemplateDefinition[];
}

export const defaultGameTemplateTimestamp = '2026-09-25T00:00:00.000Z';

function axis(
  id: string,
  name: string,
  score: number,
  importanceLevel: ImportanceLevel,
  reason: string,
): RatingAxis {
  return { id, name, score, importanceLevel, enabled: true, reason };
}

function negative(id: string, name: string, score: number, reason: string): NegativeItem {
  return { id, name, score, enabled: true, reason };
}

function baseRating(
  title: string,
  mode: GameRatingDraft['mode'],
  coverAssetPath: string,
): GameRatingDraft {
  return {
    mode,
    work: {
      title,
      platform: '',
      version: '',
      releaseNote: '',
      extraFields: [],
      coverDataUrl: null,
      coverAssetPath,
      coverAttribution: { label: '模板文件夹提供的本地封面', usage: 'unknown' },
    },
    axes: [],
    negativeItems: [],
    overallComment: '',
    personalStory: '',
    personalSignature: '',
  };
}

function createTemplate(
  id: string,
  name: string,
  rating: GameRatingDraft,
  timestamp: string,
): GameTemplateDefinition {
  return { id, source: 'seeded-example', name, createdAt: timestamp, updatedAt: timestamp, rating };
}

export function createSeededGameTemplates(
  timestamp = defaultGameTemplateTimestamp,
): GameTemplateDefinition[] {
  const redAlert = baseRating(
    '红色警戒 2',
    'simple',
    'assets/game-templates/covers/red-alert-2.webp',
  );
  redAlert.axes = [
    axis('red-alert-preference', '个人喜好', 9, 5, '从童年玩到现在，十多年了'),
    axis('red-alert-community', '圈子融入', 7, 3, '对战圈和制作圈都有一堆怪人'),
    axis('red-alert-world', '官方剧情世界观', 0, 2, ''),
    axis('red-alert-tactics', '官方战术设计', 8, 4, '颇有深度'),
    axis('red-alert-fan', '同人生态', 8, 4, ''),
  ];
  redAlert.negativeItems = [
    negative('red-alert-age', '技术年代', -3, '太古早了，寻路技术在当年是神'),
  ];

  const callOfDuty = baseRating(
    '使命召唤 4：现代战争',
    'professional',
    'assets/game-templates/covers/call-of-duty-4.webp',
  );
  callOfDuty.axes = [
    axis('cod4-tech', '技术', 7, 1, '画面至今仍不过时'),
    axis('cod4-story', '剧情', 8, 3, '角色刻画生动'),
    axis('cod4-levels', '关卡设计', 9, 4, '双狙往事，动视如今再也无法复刻'),
    axis('cod4-feel', '游玩感受', 8, 3, '酣畅淋漓'),
    axis('cod4-theme', '立意', 6, 0, '美军宣发却洗脑指数为0，宏大叙事反而激起了爱国'),
  ];

  const genshin = baseRating(
    '原神',
    'professional',
    'assets/game-templates/covers/genshin-impact.webp',
  );
  genshin.axes = [
    axis('genshin-preference', '个人喜好', 8, 3, '全程联网的游戏里玩得最久的了'),
    axis('genshin-monetization', '氪金系统', 6, 3, '比上不足比下有余'),
    axis('genshin-art', '画风美术', 8, 4, '整体风格统一，元素却极丰富。'),
    axis('genshin-world', '世界观', 7, 3, '世界范围流行的持续运营游戏确实适合这样一种多国原型'),
    axis('genshin-story', '剧情', 7, 4, '上下方差极大'),
    axis('genshin-character', '角色设计', 9, 4, '请输入文本'),
    axis('genshin-combat', '战斗系统', 8, 3, '元素反应也算是比较有差异性的了'),
    axis('genshin-levels', '关卡设计', 7, 3, '起初还不错，后面越来越垃'),
    axis('genshin-model', '建模', 8, 3, '场景建模一直都很美，但早期的角色建模真的不咋地'),
  ];

  const blackMyth = baseRating(
    '黑神话：悟空',
    'simple',
    'assets/game-templates/covers/black-myth-wukong.webp',
  );
  blackMyth.axes = [
    axis('wukong-preference', '个人喜好', 8, 4, ''),
    axis('wukong-visuals', '画质', 9, 4, '真正发挥出UE5的全部实力'),
    axis('wukong-playability', '可玩性', 7, 3, '魂类一直不太玩得来'),
    axis('wukong-monetization', '氪金系统', 9, 3, '谁说国产游戏都是流量变现工具的？'),
  ];
  blackMyth.axes.push(
    axis('wukong-art-direction', '画风美术', 9, 3, '实景扫描！作弊了诶。。'),
    axis('wukong-levels', '关卡设计', 8, 3, '我不懂魂，我只知道国产游戏都是要被骂抄袭的'),
    axis('wukong-story', '剧情演出', 9, 3, '播片质量普遍在线，小西天和最后的杨戬大圣做得很棒'),
    axis('wukong-feel', '游玩体感', 7, 3, '过程痛苦但最后有成就感，感觉像在搬砖'),
    axis('wukong-local-pride', '国产单机情怀', 10, 3, '盼望国产3A很多年了'),
  );

  return [
    createTemplate(gameTemplateInventoryIds[0], '红色警戒 2 · 个人评价', redAlert, timestamp),
    createTemplate(gameTemplateInventoryIds[1], '使命召唤 4 · 个人评价', callOfDuty, timestamp),
    createTemplate(gameTemplateInventoryIds[2], '原神 · 个人评价', genshin, timestamp),
    createTemplate(gameTemplateInventoryIds[3], '黑神话：悟空 · 个人评价', blackMyth, timestamp),
  ];
}

export function createSeededGameTemplateCatalog(
  timestamp = defaultGameTemplateTimestamp,
): GameTemplateCatalog {
  return { version: 1, templates: createSeededGameTemplates(timestamp) };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function applyGameTemplate(template: GameTemplateDefinition): GameRatingDraft {
  return clone(template.rating);
}

export function copyGameTemplate(
  template: GameTemplateDefinition,
  id: string,
  timestamp = new Date().toISOString(),
): GameTemplateDefinition {
  return {
    ...clone(template),
    id,
    source: 'user-created',
    name: `${template.name} · 副本`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function renameGameTemplate(
  catalog: GameTemplateCatalog,
  id: string,
  name: string,
  timestamp = new Date().toISOString(),
): GameTemplateCatalog {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('template-name-required');
  let found = false;
  const templates = catalog.templates.map((template) => {
    if (template.id !== id) return template;
    found = true;
    return { ...template, name: trimmed, updatedAt: timestamp };
  });
  if (!found) throw new Error('template-not-found');
  return { ...catalog, templates };
}

export function deleteGameTemplate(catalog: GameTemplateCatalog, id: string): GameTemplateCatalog {
  if (!catalog.templates.some((template) => template.id === id)) {
    throw new Error('template-not-found');
  }
  return { ...catalog, templates: catalog.templates.filter((template) => template.id !== id) };
}
