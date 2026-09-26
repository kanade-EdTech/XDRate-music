import { App } from '../app/App';

export function ToyApp() {
  const isGamesToy = window.location.pathname.toLowerCase().includes('/xdrategames');

  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8" data-testid="toy-header">
        <p className="text-sm font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
          XDRATE MUSIC · BILI TOY
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          离线评分卡工具 · Offline rating-card tool
        </p>
      </header>
      <App domain={isGamesToy ? 'game' : 'music'} />
      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6" data-testid="toy-privacy">
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs leading-5 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
          本 Toy 不联网、不读取 B 站账号、不调用小红书
          Bridge，也不会直接发布内容。评分草稿和模板仅保存在当前容器的本地缓存中；PNG
          只在你主动导出时生成并下载。
          <span className="ml-1">
            No network, account access, Xiaohongshu bridge, or direct publishing.
          </span>
        </div>
      </footer>
    </>
  );
}
