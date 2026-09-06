import type { KeyboardEvent } from 'react';
import { useI18n } from '../../../i18n/useI18n';

interface StarRatingProps {
  value: number; // 0 = unrated; rated values are 1..10
  onChange: (score: number) => void;
  label?: string;
  disabled?: boolean;
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function StarRating({ value, onChange, label, disabled = false }: StarRatingProps) {
  const { t } = useI18n();
  const clampedValue =
    Number.isFinite(value) && value >= 1 ? Math.min(10, Math.max(1, Math.round(value))) : 0;
  const isRated = clampedValue >= 1;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    let nextValue: number;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        nextValue = isRated ? Math.max(1, clampedValue - 1) : 1;
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        nextValue = isRated ? Math.min(10, clampedValue + 1) : 1;
        event.preventDefault();
        break;
      case 'PageDown':
        nextValue = isRated ? Math.max(1, clampedValue - 1) : 1;
        event.preventDefault();
        break;
      case 'PageUp':
        nextValue = isRated ? Math.min(10, clampedValue + 1) : 1;
        event.preventDefault();
        break;
      case 'Home':
        nextValue = 1;
        event.preventDefault();
        break;
      case 'End':
        nextValue = 10;
        event.preventDefault();
        break;
      default:
        return;
    }

    onChange(nextValue);
  }

  function handleStarClick(starIndex: number) {
    if (disabled) return;
    onChange(starIndex + 1);
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {/* Keep all ten portrait targets on one row; scrolling is only a narrow-screen fallback. */}
      <div
        data-rating-scroll="stars"
        className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-1 sm:w-auto"
      >
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label || t('rating.score')}
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuetext={
            isRated
              ? `${clampedValue} ${t('rating.starScoreAriaText')}`
              : t('rating.unratedAriaText')
          }
          onKeyDown={handleKeyDown}
          className={`inline-flex w-max flex-nowrap items-center rounded-lg border border-slate-200/80 bg-slate-50/50 p-0.5 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/50 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          {Array.from({ length: 10 }, (_, i) => {
            const fillRatio = Math.max(0, Math.min(1, clampedValue - i));
            const fillPercent = Math.round(fillRatio * 100);

            return (
              <span
                key={i}
                aria-hidden="true"
                onClick={() => handleStarClick(i)}
                className="group relative flex h-10 w-8 min-h-10 min-w-8 cursor-pointer touch-manipulation items-center justify-center transition-transform hover:scale-110 active:scale-95"
              >
                {/* Background empty star */}
                <StarOutlineIcon className="h-5 w-5 text-slate-300 transition-colors group-hover:text-slate-400 dark:text-slate-600 dark:group-hover:text-slate-500" />

                {/* Foreground filled star with partial width clip */}
                {fillPercent > 0 && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-start overflow-hidden pl-1.5"
                    style={{ width: `${fillPercent}%` }}
                  >
                    <StarIcon className="h-5 w-5 shrink-0 text-amber-400 dark:text-amber-300" />
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {!isRated && (
        <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
          {t('rating.unratedHint')}
        </span>
      )}
    </div>
  );
}
