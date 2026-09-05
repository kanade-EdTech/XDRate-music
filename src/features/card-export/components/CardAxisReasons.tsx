import type { RatingAxis } from '../../../domain/rating/types';
import { useI18n } from '../../../i18n/useI18n';
import { estimateTextUnits } from '../layoutPlan';

interface CardAxisReasonsProps {
  axes: RatingAxis[];
  dark: boolean;
  maxItems: number;
  maxLines: number;
  unitsPerLine: number;
}

function formatScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Unified Axis Scores and Reasons card section (D-015 contract).
 *
 * - Every enabled axis is retained in the merged list, showing its name and exact score.
 * - Non-empty reasons appear directly below their respective axis entry.
 * - When all reasons are empty, gracefully degrades to name and score without empty lines.
 * - Any unrendered or truncated non-empty reason is strictly counted in `incompleteCount`.
 */
export function CardAxisReasons({
  axes,
  dark,
  maxItems,
  maxLines,
  unitsPerLine,
}: CardAxisReasonsProps) {
  const { t } = useI18n();
  const displayedAxes = axes.slice(0, maxItems);
  const hasAnyReason = displayedAxes.some((axis) => axis.reason.trim().length > 0);

  // Strict truncation calculation for non-empty reasons
  const incompleteCount = axes.filter((axis, index) => {
    const hasReason = axis.reason.trim().length > 0;
    if (!hasReason) return false;
    if (index >= maxItems) return true;
    return estimateTextUnits(axis.reason) > Math.max(1, maxLines * unitsPerLine);
  }).length;

  if (displayedAxes.length === 0) return null;

  return (
    <section
      data-card-region="reasons"
      className={`rounded-2xl p-4 shadow-sm backdrop-blur-sm ${
        dark ? 'border border-white/10 bg-white/5' : 'border border-slate-200/60 bg-white/80'
      }`}
    >
      <h4
        className={dark ? 'text-xs font-bold text-slate-300' : 'text-xs font-bold text-slate-600'}
      >
        {hasAnyReason ? t('card.axisReasons') : t('card.axisScores')}
      </h4>
      <ul className="mt-2.5 space-y-2">
        {displayedAxes.map((axis) => {
          const hasReason = axis.reason.trim().length > 0;

          return (
            <li
              key={axis.id}
              className={
                dark
                  ? 'border-b border-white/5 pb-2 last:border-0 last:pb-0'
                  : 'border-b border-slate-100 pb-2 last:border-0 last:pb-0'
              }
            >
              <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                <span className={dark ? 'min-w-0 text-slate-100' : 'min-w-0 text-slate-900'}>
                  {axis.name.trim() || t('rating.unnamedAxis')}
                </span>
                <span
                  className={`shrink-0 font-mono font-bold tabular-nums whitespace-nowrap ${
                    dark ? 'text-slate-200' : 'text-slate-700'
                  }`}
                >
                  {formatScore(axis.score)}
                </span>
              </div>
              {hasReason && (
                <p
                  className={
                    dark
                      ? 'mt-1 text-[11px] leading-relaxed text-slate-300'
                      : 'mt-1 text-[11px] leading-relaxed text-slate-600'
                  }
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: maxLines,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {axis.reason.trim()}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {incompleteCount > 0 && (
        <p className={dark ? 'mt-2 text-[10px] text-slate-400' : 'mt-2 text-[10px] text-slate-500'}>
          {t('card.truncatedReasons')} {incompleteCount}
        </p>
      )}
    </section>
  );
}
