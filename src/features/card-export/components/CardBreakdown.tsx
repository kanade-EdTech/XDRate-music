import type { RatingAxis } from '../../../domain/rating/types';
import { useI18n } from '../../../i18n/useI18n';

interface CardBreakdownProps {
  axes: RatingAxis[];
  dark: boolean;
  maxItems?: number;
  columns?: 1 | 2;
}

function formatScore(score: number): string {
  return score.toFixed(1);
}

export function CardBreakdown({ axes, dark, maxItems = 8, columns = 2 }: CardBreakdownProps) {
  const { t } = useI18n();
  const textColor = dark ? 'text-white' : 'text-slate-900';
  const mutedColor = dark ? 'text-slate-300' : 'text-slate-600';
  const displayAxes = axes.slice(0, maxItems);

  if (displayAxes.length === 0) return null;

  return (
    <div
      data-card-region="axes"
      className={`rounded-2xl p-4 shadow-sm backdrop-blur-sm ${
        dark ? 'border border-white/10 bg-white/5' : 'border border-slate-200/60 bg-white/80'
      }`}
    >
      <h4 className={`text-xs font-bold uppercase tracking-wider ${mutedColor}`}>
        {t('card.axisScores')}
      </h4>
      <ul
        className={`mt-2.5 grid gap-x-4 gap-y-2 text-xs font-medium ${
          columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {displayAxes.map((axis) => (
          <li
            key={axis.id}
            className={`flex items-center justify-between gap-2 border-b pb-1 last:border-0 ${
              dark ? 'border-white/5' : 'border-slate-100'
            }`}
          >
            <span className={`min-w-0 break-words leading-tight ${mutedColor}`}>
              {axis.name.trim() || t('rating.unnamedAxis')}
            </span>
            <span
              className={`shrink-0 font-mono font-bold tabular-nums whitespace-nowrap ${textColor}`}
            >
              {formatScore(axis.score)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
