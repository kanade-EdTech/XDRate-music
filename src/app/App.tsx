import { RatingEditor } from '../features/rating-editor/RatingEditor';
import { appMetadata } from '../config/appMetadata';
import { useI18n } from '../i18n/useI18n';
import { platformServices } from '../platform';

export function App() {
  const { locale, setLocale, t } = useI18n();

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-6xl overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">XDRate Music</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t('app.title')}
            </h1>
          </div>
          <div className="flex max-w-44 shrink-0 flex-col items-end gap-1 sm:max-w-none">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="sr-only">{t('app.language')}</span>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={locale}
                onChange={(event) => setLocale(event.target.value as typeof locale)}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <p
              className="text-right text-xs font-medium text-slate-500 dark:text-slate-400"
              data-testid="app-version"
            >
              {t('app.version')} {appMetadata.version} · {appMetadata.publisher} ·{' '}
              {platformServices.runtime.kind === 'desktop'
                ? t('app.runtimeDesktop')
                : t('app.runtimeBrowser')}
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          {t('app.description')}
        </p>
      </section>
      <RatingEditor />
    </main>
  );
}
