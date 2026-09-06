import type { MusicRatingDraft, RatingResult } from '../../../domain/rating/types';
import { useI18n } from '../../../i18n/useI18n';

interface CardScoreBadgeProps {
  draft: MusicRatingDraft;
  rating: RatingResult;
  dark: boolean;
  compact?: boolean;
}

function formatScore(score: number): string {
  return score.toFixed(1);
}

export function CardScoreBadge({ draft, rating, dark, compact = false }: CardScoreBadgeProps) {
  const { t } = useI18n();
  const textColor = dark ? 'text-white' : 'text-slate-900';
  const mutedColor = dark ? 'text-slate-300' : 'text-slate-600';

  const modeLabel =
    draft.mode === 'simple'
      ? t('rating.simpleMode')
      : draft.mode === 'professional'
        ? t('rating.professionalMode')
        : t('rating.customMode');

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl p-5 shadow-sm backdrop-blur-sm ${
        dark ? 'border border-white/10 bg-white/5' : 'border border-slate-200/60 bg-white/80'
      }`}
    >
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${mutedColor}`}>
          {t('card.aggregate')}
        </p>
        {rating.status === 'ready' ? (
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`${
                compact ? 'text-4xl' : 'text-5xl'
              } font-black tracking-tight tabular-nums whitespace-nowrap ${textColor}`}
            >
              {formatScore(rating.score100)}
            </span>
            <span className={`shrink-0 text-sm font-bold whitespace-nowrap ${mutedColor}`}>
              / 100
            </span>
          </div>
        ) : (
          <p className={`mt-2 text-sm font-semibold ${textColor}`}>{t('card.uncalculable')}</p>
        )}
      </div>

      <div
        className={`mt-4 border-t pt-3 text-xs font-medium ${
          dark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-600'
        }`}
      >
        <p className="truncate">
          <span className="font-semibold">{t('card.mode')}:</span> {modeLabel}
        </p>
      </div>
    </div>
  );
}
