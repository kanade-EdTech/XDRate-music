import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';

import { isRatedAxis } from '../../domain/rating/calculateRating';
import type { MusicRatingDraft, RatingResult } from '../../domain/rating/types';
import { useI18n } from '../../i18n/useI18n';
import { detectCardOverflow } from './detectOverflow';
import { LandscapeLayout } from './layouts/LandscapeLayout';
import { PortraitLayout } from './layouts/PortraitLayout';
import { SquareLayout } from './layouts/SquareLayout';
import { profileCardContent, resolveCardLayout } from './layoutPlan';
import { StandardLayout } from './layouts/StandardLayout';
import { getRatioConfig } from './ratioConfig';
import type { CardOptions, CardOverflowResult, CardRatio, CardTheme } from './types';

export type { CardOptions, CardOverflowResult, CardRatio, CardTheme };

interface CardPreviewProps {
  cardRef: RefObject<HTMLDivElement | null>;
  draft: MusicRatingDraft;
  rating: RatingResult;
  options: CardOptions;
  onOverflowChange?: (result: CardOverflowResult) => void;
  onReadyChange?: (ready: boolean) => void;
}

export function CardPreview({
  cardRef,
  draft,
  rating,
  options,
  onOverflowChange,
  onReadyChange,
}: CardPreviewProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [isReady, setIsReady] = useState(false);
  const [fallbackState, setFallbackState] = useState<{
    signature: string;
    level: 0 | 1 | 2;
  }>({ signature: '', level: 0 });

  const config = getRatioConfig(options.ratio);
  const dark = options.theme === 'dark';
  const visibleAxes = draft.axes.filter(isRatedAxis);
  const contentProfile = useMemo(() => profileCardContent(draft, options), [draft, options]);
  const contentSignature = useMemo(() => JSON.stringify({ draft, options }), [draft, options]);
  const fallbackLevel =
    fallbackState.signature === contentSignature ? fallbackState.level : (0 as const);
  const layoutPlan = useMemo(
    () => resolveCardLayout(config, contentProfile, fallbackLevel),
    [config, contentProfile, fallbackLevel],
  );

  // ── Measure preview container width for proportional scaling ──────────────
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) setContainerWidth(width);
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) setContainerWidth(entry.contentRect.width);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // ── Ready-state gate: wait for fonts + cover decode ───────────────────────
  //
  // We show the "Preparing preview" overlay on initial mount until fonts have
  // loaded and the first cover image has decoded.  After that, isReady stays
  // true for the lifetime of the component — subsequent cover swaps are fast
  // (data-URL decode) and don't warrant re-showing the overlay.
  //
  // Rules satisfied:
  //   - No synchronous setState inside an effect body (react-hooks/set-state-in-effect)
  //   - No ref access during render (react-hooks/refs)
  //   - setIsReady(true) is always called asynchronously (inside rAF)
  const readyGenRef = useRef(0);

  useEffect(() => {
    // Each mount/cover-change gets its own generation; only the latest wins.
    readyGenRef.current += 1;
    const myGen = readyGenRef.current;

    async function waitForStability() {
      // 1) Wait for all fonts to finish loading
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }

      // 2) If a cover image exists, decode it before marking ready
      const coverUrl = draft.work.coverDataUrl;
      if (coverUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // never block on errors
          img.src = coverUrl;
        });
      }

      // Only mark ready if this effect invocation is still current
      requestAnimationFrame(() => {
        if (readyGenRef.current === myGen) setIsReady(true);
      });
    }

    void waitForStability();
    // Run once on mount: captures the initial cover URL.  fonts.ready is
    // idempotent and always resolves immediately on subsequent calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Notify parent of ready state ──────────────────────────────────────────
  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  // ── Content overflow check ─────────────────────────────────────────────────
  const runOverflowCheck = useCallback(() => {
    if (cardRef.current && isReady) {
      const result = detectCardOverflow(cardRef.current);
      if (result.hasOverflow && fallbackLevel < 2) {
        setFallbackState((current) => {
          const currentLevel = current.signature === contentSignature ? current.level : 0;
          return {
            signature: contentSignature,
            level: currentLevel < 2 ? ((currentLevel + 1) as 0 | 1 | 2) : currentLevel,
          };
        });
        return;
      }
      onOverflowChange?.(result);
    }
  }, [cardRef, contentSignature, fallbackLevel, isReady, onOverflowChange]);

  useEffect(() => {
    runOverflowCheck();
    const timer = window.setTimeout(runOverflowCheck, 120);
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(runOverflowCheck).catch(() => {});
    }
    return () => window.clearTimeout(timer);
  }, [draft, rating, options, config, layoutPlan, runOverflowCheck]);

  // ── Derived layout values ──────────────────────────────────────────────────
  const scale = containerWidth > 0 ? containerWidth / config.width : 1;
  const scaledHeight = Math.round(config.height * scale);

  const layoutProps = { draft, rating, options, config, dark, visibleAxes, layoutPlan };

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 max-w-full overflow-hidden rounded-2xl shadow-xl transition-all duration-300"
      style={{ height: `${scaledHeight}px` }}
    >
      {/* ── Preparing overlay ─────────────────────────────────────────────── */}
      {!isReady && (
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl text-sm font-medium ${
            dark ? 'bg-slate-900/80 text-slate-300' : 'bg-white/80 text-slate-500'
          }`}
          aria-live="polite"
          aria-label={t('card.preparingPreview')}
        >
          <span className="animate-pulse">{t('card.preparingPreview')}</span>
        </div>
      )}

      {/* ── Logical card canvas (fixed dimensions, scale to fit) ────────── */}
      <div
        style={{
          width: `${config.width}px`,
          height: `${config.height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          ref={cardRef}
          data-card-region="card"
          className={`card-canvas relative isolate flex select-none flex-col ${
            dark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-950'
          }`}
          style={{ width: `${config.width}px`, height: `${config.height}px` }}
        >
          {/* Decorative background gradient */}
          <div
            className={`pointer-events-none absolute inset-0 -z-10 opacity-70 ${
              dark
                ? 'bg-[radial-gradient(circle_at_top_right,_#4338ca_0,_transparent_45%),radial-gradient(circle_at_bottom_left,_#0f766e_0,_transparent_40%)]'
                : 'bg-[radial-gradient(circle_at_top_right,_#c7d2fe_0,_transparent_45%),radial-gradient(circle_at_bottom_left,_#99f6e4_0,_transparent_40%)]'
            }`}
            aria-hidden="true"
          />

          {config.family === 'landscape' && <LandscapeLayout {...layoutProps} />}
          {config.family === 'standard' && <StandardLayout {...layoutProps} />}
          {config.family === 'square' && <SquareLayout {...layoutProps} />}
          {config.family === 'portrait' && <PortraitLayout {...layoutProps} />}
        </div>
      </div>
    </div>
  );
}
