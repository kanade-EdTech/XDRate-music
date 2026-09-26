import type { GameAxisDefinition, GameDomainDefinition, GameWorkMetadata } from './types';
import { gameDomainId } from './types';

export const gameAxisDefinitions: readonly GameAxisDefinition[] = [
  {
    id: 'gameplay',
    label: '玩法体验',
    defaultImportanceLevel: 3,
    description: '操作、系统循环和游玩节奏。',
  },
  {
    id: 'narrative',
    label: '叙事与世界',
    defaultImportanceLevel: 3,
    description: '剧情、角色、世界观和表达方式。',
  },
  {
    id: 'visuals',
    label: '美术表现',
    defaultImportanceLevel: 3,
    description: '画面风格、演出、界面和可读性。',
  },
  {
    id: 'audio',
    label: '声音设计',
    defaultImportanceLevel: 3,
    description: '音乐、音效、配音和混音。',
  },
  {
    id: 'personal-preference',
    label: '个人喜好',
    defaultImportanceLevel: 3,
    description: '作品与作者个人偏好的匹配程度。',
  },
] as const;

export const gameTemplateInventoryIds = [
  'game-example-long-title',
  'game-example-platform-version',
  'game-example-long-reason',
  'game-example-score-distribution',
  'game-example-cover-fallback',
] as const;

export const gameDomainDefinition: GameDomainDefinition = {
  id: gameDomainId,
  label: '游戏评分试验',
  algorithmVersion: 'music-linear-100-v4',
  axisDefinitions: gameAxisDefinitions,
  templateIds: gameTemplateInventoryIds,
};

export function createGameWorkMetadata(): GameWorkMetadata {
  return {
    title: '',
    platform: '',
    version: '',
    releaseNote: '',
    extraFields: [],
    coverDataUrl: null,
  };
}
