import { useMemo, useState } from 'react';

import blackMythCover from '../../../assets/game-templates/covers/black-myth-wukong.webp';
import callOfDutyCover from '../../../assets/game-templates/covers/call-of-duty-4.webp';
import genshinCover from '../../../assets/game-templates/covers/genshin-impact.webp';
import redAlertCover from '../../../assets/game-templates/covers/red-alert-2.webp';
import {
  applyGameTemplate,
  copyGameTemplate,
  deleteGameTemplate,
  renameGameTemplate,
} from '../../domain/game/templateCatalog';
import {
  initializeGameTemplateCatalog,
  saveGameTemplateCatalog,
  type GameTemplateStorageLike,
} from '../../domain/game/templateStorage';
import type { GameRatingDraft, GameTemplateDefinition } from '../../domain/game/types';

const coverAssets: Record<string, string> = {
  'assets/game-templates/covers/red-alert-2.webp': redAlertCover,
  'assets/game-templates/covers/call-of-duty-4.webp': callOfDutyCover,
  'assets/game-templates/covers/genshin-impact.webp': genshinCover,
  'assets/game-templates/covers/black-myth-wukong.webp': blackMythCover,
};

function getStorage(): GameTemplateStorageLike {
  return window.localStorage;
}

function createUserTemplateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `game-user-${crypto.randomUUID()}`;
  }
  return `game-user-${Date.now().toString(36)}`;
}

function initialCatalog() {
  return initializeGameTemplateCatalog(getStorage());
}

export function GameRatingPilot() {
  const loaded = useMemo(initialCatalog, []);
  const [catalog, setCatalog] = useState(loaded.catalog);
  const [selectedId, setSelectedId] = useState(catalog.templates[0]?.id ?? null);
  const [draft, setDraft] = useState<GameRatingDraft | null>(
    catalog.templates[0] ? applyGameTemplate(catalog.templates[0]) : null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [notice, setNotice] = useState(
    loaded.status === 'seeded'
      ? '已创建四个游戏示例模板。它们是作者个人评价，不代表官方结论。'
      : loaded.status === 'unavailable'
        ? '本地模板存储不可用；当前只在本次页面会话中展示模板。'
        : '已恢复本地游戏模板。',
  );

  function selectTemplate(template: GameTemplateDefinition) {
    setSelectedId(template.id);
    setDraft(applyGameTemplate(template));
    setNotice(`已载入“${template.name}”。这是个人评价示例，可继续编辑。`);
  }

  function persist(nextCatalog: typeof catalog, message: string) {
    setCatalog(nextCatalog);
    const result = saveGameTemplateCatalog(getStorage(), nextCatalog);
    setNotice(
      result === 'saved' ? message : '模板已更新，但本地存储不可用，本次修改只保留在当前页面。',
    );
  }

  function copyTemplate(template: GameTemplateDefinition) {
    const copy = copyGameTemplate(template, createUserTemplateId());
    persist(
      { ...catalog, templates: [...catalog.templates, copy] },
      `已复制“${template.name}”，现在可以作为个人模板修改。`,
    );
    selectTemplate(copy);
  }

  function beginRename(template: GameTemplateDefinition) {
    setEditingId(template.id);
    setEditingName(template.name);
  }

  function commitRename(template: GameTemplateDefinition) {
    try {
      persist(renameGameTemplate(catalog, template.id, editingName), '模板名称已更新。');
      setEditingId(null);
    } catch {
      setNotice('模板名称不能为空。');
    }
  }

  function removeTemplate(template: GameTemplateDefinition) {
    if (!window.confirm(`确定删除“${template.name}”吗？这不会删除当前作品。`)) return;
    const nextCatalog = deleteGameTemplate(catalog, template.id);
    persist(nextCatalog, '模板已删除，当前作品不会受到影响。');
    if (selectedId === template.id) {
      const next = nextCatalog.templates[0];
      setSelectedId(next?.id ?? null);
      setDraft(next ? applyGameTemplate(next) : null);
    }
  }

  return (
    <section className="mt-8 space-y-6" aria-labelledby="game-pilot-title">
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 dark:border-cyan-900 dark:bg-cyan-950/40">
        <p className="text-sm font-semibold tracking-wide text-cyan-700 dark:text-cyan-300">
          XDRATE · GAME PILOT 0.5.0
        </p>
        <h2
          id="game-pilot-title"
          className="mt-2 text-2xl font-bold text-slate-950 dark:text-white"
        >
          游戏评分试验
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-700 dark:text-slate-300">
          这里提供少量带封面的作者个人评价模板，用于验证游戏领域字段、评分轴和卡片排版。
          模板可以套用、复制、改名或删除，不代表官方评分、排行榜或平台推荐。
        </p>
        <p
          className="mt-3 text-sm text-slate-600 dark:text-slate-400"
          role="status"
          aria-live="polite"
        >
          {notice}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.templates.map((template) => {
          const cover = template.rating.work.coverAssetPath
            ? coverAssets[template.rating.work.coverAssetPath]
            : undefined;
          const selected = template.id === selectedId;
          return (
            <article
              key={template.id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition dark:bg-slate-900 ${
                selected
                  ? 'border-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-900'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex gap-4 p-4">
                {cover ? (
                  <img
                    src={cover}
                    alt={`${template.rating.work.title} 封面`}
                    className="h-28 w-28 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid h-28 w-28 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    无封面
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
                    {template.source === 'seeded-example' ? '示例模板 / 个人评价' : '我的模板'}
                  </span>
                  {editingId === template.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="input min-w-0"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        aria-label="模板名称"
                      />
                      <button
                        type="button"
                        className="button-primary shrink-0 px-3"
                        onClick={() => commitRename(template)}
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <h3 className="mt-2 truncate text-lg font-bold text-slate-950 dark:text-white">
                      {template.name}
                    </h3>
                  )}
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {template.rating.mode === 'professional' ? '专业模式' : '简易模式'} ·{' '}
                    {template.rating.axes.length} 个评价轴
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => selectTemplate(template)}
                >
                  套用
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => copyTemplate(template)}
                >
                  复制为我的模板
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => beginRename(template)}
                >
                  改名
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300"
                  onClick={() => removeTemplate(template)}
                >
                  删除
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">当前作品副本</h3>
        {draft ? (
          <>
            <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
              {draft.work.title}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              套用后会进入独立编辑状态，原始示例不会被修改。
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {draft.axes.map((axis) => (
                <div key={axis.id} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {axis.name}
                  </span>
                  <span className="float-right tabular-nums text-cyan-700 dark:text-cyan-300">
                    {axis.score}/10
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-slate-500 dark:text-slate-400">暂未套用模板。</p>
        )}
      </div>
    </section>
  );
}
