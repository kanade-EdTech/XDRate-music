import type { ChangeEvent, KeyboardEvent } from 'react';
import { useI18n } from '../../../i18n/useI18n';

interface BananaRatingProps {
  value: number; // -5..0 (negative number)
  onChange: (score: number) => void;
  label?: string;
  disabled?: boolean;
}

function BananaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2c-.6 0-1.1.4-1.3 1C9.6 5.8 7.3 8.7 4.5 11.2c-1.6 1.4-2.1 3.7-1.1 5.6 1 1.9 3.2 2.8 5.3 2.1 1.7-.5 3.3-1.4 4.8-2.6 1.5 1.2 3.1 2.1 4.8 2.6 2.1.7 4.3-.2 5.3-2.1 1-1.9.5-4.2-1.1-5.6-2.8-2.5-5.1-5.4-6.2-8.2-.2-.6-.7-1-1.3-1z" />
    </svg>
  );
}

function BananaOutlineIcon({ className }: { className?: string }) {
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
      <path d="M12 2c-.6 0-1.1.4-1.3 1C9.6 5.8 7.3 8.7 4.5 11.2c-1.6 1.4-2.1 3.7-1.1 5.6 1 1.9 3.2 2.8 5.3 2.1 1.7-.5 3.3-1.4 4.8-2.6 1.5 1.2 3.1 2.1 4.8 2.6 2.1.7 4.3-.2 5.3-2.1 1-1.9.5-4.2-1.1-5.6-2.8-2.5-5.1-5.4-6.2-8.2-.2-.6-.7-1-1.3-1z" />
    </svg>
  );
}

export function BananaRating({ value, onChange, label, disabled = false }: BananaRatingProps) {
  const { t } = useI18n();
  // value is in [-5, 0]. magnitude is in [0, 5].
  const clampedValue = Math.min(0, Math.max(-5, Number.isFinite(value) ? value : 0));
  const magnitude = Math.abs(clampedValue);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    let nextValue: number;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        // Decrease deduction magnitude (less negative, towards 0)
        nextValue = Math.min(0, Math.round((clampedValue + 0.1) * 10) / 10);
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        // Increase deduction magnitude (more negative, towards -5)
        nextValue = Math.max(-5, Math.round((clampedValue - 0.1) * 10) / 10);
        event.preventDefault();
        break;
      case 'PageUp':
        nextValue = Math.min(0, Math.round((clampedValue + 1) * 10) / 10);
        event.preventDefault();
        break;
      case 'PageDown':
        nextValue = Math.max(-5, Math.round((clampedValue - 1) * 10) / 10);
        event.preventDefault();
        break;
      case 'Home':
        nextValue = 0;
        event.preventDefault();
        break;
      case 'End':
        nextValue = -5;
        event.preventDefault();
        break;
      default:
        return;
    }

    onChange(nextValue);
  }

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(event.target.value);
    if (Number.isFinite(parsed)) {
      onChange(Math.min(0, Math.max(-5, Math.round(parsed * 10) / 10)));
    }
  }

  function handleBananaClick(bananaIndex: number) {
    if (disabled) return;
    onChange(-(bananaIndex + 1));
  }

  const ariaValueText = t('rating.bananaScoreAriaText').replace('{score}', magnitude.toFixed(1));

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      {/* Use the same local-overflow contract as the ten-star control. */}
      <div
        data-rating-scroll="bananas"
        className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-1 sm:w-auto"
      >
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label || t('rating.negativeScore')}
          aria-valuenow={clampedValue}
          aria-valuemin={-5}
          aria-valuemax={0}
          aria-valuetext={ariaValueText}
          onKeyDown={handleKeyDown}
          className={`inline-flex w-max flex-nowrap items-center rounded-xl border border-rose-200/80 bg-rose-50/50 p-1 transition-colors focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-rose-900/60 dark:bg-rose-950/30 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const fillRatio = Math.max(0, Math.min(1, magnitude - i));
            const fillPercent = Math.round(fillRatio * 100);

            return (
              <span
                key={i}
                aria-hidden="true"
                onClick={() => handleBananaClick(i)}
                className="group relative flex h-11 w-11 min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation items-center justify-center transition-transform hover:scale-110 active:scale-95"
              >
                {/* Background empty banana peel */}
                <BananaOutlineIcon className="h-6 w-6 text-slate-300 transition-colors group-hover:text-slate-400 dark:text-slate-600 dark:group-hover:text-slate-500" />

                {/* Foreground filled banana peel with partial width clip */}
                {fillPercent > 0 && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-start overflow-hidden pl-2.5"
                    style={{ width: `${fillPercent}%` }}
                  >
                    <BananaIcon className="h-6 w-6 shrink-0 text-amber-500 dark:text-amber-400" />
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Number input and reset button with >= 44x44px target */}
      <div className="flex items-center gap-2">
        <input
          aria-label={`${label || t('rating.negativeScore')} ${t('rating.scoreValueLabel')}`}
          type="number"
          min={-5}
          max={0}
          step="0.1"
          value={clampedValue}
          disabled={disabled}
          onChange={handleNumberChange}
          className="input h-11 w-20 text-center font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400"
        />
        <button
          type="button"
          disabled={disabled || clampedValue === 0}
          onClick={() => onChange(0)}
          title={t('rating.resetZero')}
          aria-label={t('rating.resetZero')}
          className="h-11 min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600"
        >
          {t('rating.resetZero')}
        </button>
      </div>
    </div>
  );
}
