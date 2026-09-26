import { gameTemplateInventoryIds } from './presets';
import type { GameCoverUsage } from './types';

export type GameTemplateCoverage =
  'long-title' | 'platform-version' | 'long-reason' | 'score-distribution' | 'cover-fallback';

export interface GameTemplateInventoryItem {
  id: (typeof gameTemplateInventoryIds)[number];
  coverage: GameTemplateCoverage;
  title: string;
  sourceCoverFile: string | null;
  processedCoverFile: string | null;
  coverUsage: GameCoverUsage;
  status: 'pending-rights-review' | 'approved-for-local' | 'approved-for-public';
  notes: string;
}

/** M0 inventory from the repository's 模板 folder; rights are still unapproved. */
export const gameTemplateInventory: readonly GameTemplateInventoryItem[] = [
  {
    id: 'game-example-long-title',
    coverage: 'long-title',
    title: '红色警戒 2',
    sourceCoverFile: '模板/红警.png',
    processedCoverFile: 'assets/game-templates/covers/red-alert-2.webp',
    coverUsage: 'unknown',
    status: 'pending-rights-review',
    notes: '个人评价已记录；验证标题换行和卡片截断。',
  },
  {
    id: 'game-example-platform-version',
    coverage: 'platform-version',
    title: '使命召唤 4：现代战争',
    sourceCoverFile: '模板/使命召唤4.png',
    processedCoverFile: 'assets/game-templates/covers/call-of-duty-4.webp',
    coverUsage: 'unknown',
    status: 'pending-rights-review',
    notes: '个人评价已记录；验证平台、版本和多平台字段。',
  },
  {
    id: 'game-example-long-reason',
    coverage: 'long-reason',
    title: '原神',
    sourceCoverFile: '模板/b235293aa68d4abfabe85b64fdcae21e_2808688597618152856.png',
    processedCoverFile: 'assets/game-templates/covers/genshin-impact.webp',
    coverUsage: 'unknown',
    status: 'pending-rights-review',
    notes: '个人评价已记录；验证长理由、多评价轴和空理由行为。',
  },
  {
    id: 'game-example-score-distribution',
    coverage: 'score-distribution',
    title: '黑神话：悟空',
    sourceCoverFile: '模板/黑神话：悟空.png',
    processedCoverFile: 'assets/game-templates/covers/black-myth-wukong.webp',
    coverUsage: 'unknown',
    status: 'pending-rights-review',
    notes: '个人评价已记录；验证高低分、未评分轴和扣分项分布。',
  },
  {
    id: 'game-example-cover-fallback',
    coverage: 'cover-fallback',
    title: '模板共用封面回退夹具',
    sourceCoverFile: null,
    processedCoverFile: null,
    coverUsage: 'unknown',
    status: 'pending-rights-review',
    notes: '使用上述四个模板之一做无封面副本，验证横竖封面和无封面回退。',
  },
];
