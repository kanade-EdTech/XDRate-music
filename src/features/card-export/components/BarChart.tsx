import type { RatingAxis } from '../../../domain/rating/types';
import { useI18n } from '../../../i18n/useI18n';

interface BarChartProps {
  axes: RatingAxis[];
  dark: boolean;
}

function formatScore(score: number): string {
  return score.toFixed(1);
}

export function BarChart({ axes, dark }: BarChartProps) {
  const { t } = useI18n();

  return (
    <div
      data-card-region="chart"
      className={`rounded-2xl p-4 shadow-sm backdrop-blur-sm ${
        dark ? 'border border-white/10 bg-white/5' : 'border border-slate-200/60 bg-white/80'
      }`}
    >
      <h4
        className={`text-xs font-bold uppercase tracking-wider ${
          dark ? 'text-slate-200' : 'text-slate-800'
        }`}
      >
        {t('card.axisScores')}
      </h4>
      <ul className="mt-3 space-y-3">
        {axes.map((axis) => (
          <li key={axis.id}>
            <div
              className={`mb-1 flex justify-between gap-2 text-xs font-medium ${
                dark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <span className="truncate">{axis.name.trim() || t('rating.unnamedAxis')}</span>
              <span
                className={`shrink-0 font-mono font-bold tabular-nums whitespace-nowrap ${
                  dark ? 'text-indigo-300' : 'text-indigo-600'
                }`}
              >
                {formatScore(axis.score)}
              </span>
            </div>
            <div
              className={`h-2.5 overflow-hidden rounded-full ${
                dark ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, axis.score * 10))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
