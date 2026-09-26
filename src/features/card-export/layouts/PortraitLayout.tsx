import { BarChart } from '../components/BarChart';
import { CardAxisReasons } from '../components/CardAxisReasons';
import { CardFooter } from '../components/CardFooter';
import { CardHeader } from '../components/CardHeader';
import { CardNarrative } from '../components/CardNarrative';
import { CardScoreBadge } from '../components/CardScoreBadge';
import { RadarChart } from '../components/RadarChart';
import type { BaseCardLayoutProps } from '../types';

/**
 * Portrait layout (4:5, 3:4, 2:3, 5:8, 9:16)
 *
 * Content-to-ratio adaptive composition:
 * - When narrative exists: Top Header -> Score+Chart -> Merged Reasons -> Narrative (1fr) -> Footer
 * - When no narrative but reasons exist: Top Header -> Score+Chart -> Merged Reasons (1fr expanded) -> Footer
 * - When neither narrative nor breakdown exists: Top Header -> ScoreBadge -> Hero RadarChart (1fr centered) -> Footer
 */
export function PortraitLayout({
  draft,
  rating,
  options,
  config,
  dark,
  visibleAxes,
  layoutPlan,
}: BaseCardLayoutProps) {
  const isNarrow = config.ratio === '9:16' || config.ratio === '5:8';
  const hasNarrative = layoutPlan.hasNarrative;
  const hasReasons = options.showReasons && visibleAxes.length > 0;

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateRows: hasNarrative
          ? hasReasons
            ? 'auto auto auto 1fr 32px'
            : 'auto auto 1fr 32px'
          : hasReasons
            ? 'auto auto 1fr 32px'
            : 'auto auto 1fr 32px',
        padding: isNarrow ? '32px 36px' : '36px 40px',
        gap: isNarrow ? '14px' : '16px',
      }}
    >
      {/* Row 0 — Header (Title, Artist, Metadata) */}
      <div className="min-h-0 overflow-hidden">
        <CardHeader work={draft.work} dark={dark} compact={isNarrow} />
      </div>

      {hasNarrative ? (
        /* Full mode: Score+Chart -> Merged Reasons -> Narrative */
        <>
          {/* Row 1 — Score badge + Chart side-by-side */}
          <div className="grid min-h-0 grid-cols-12 gap-4 overflow-hidden">
            <div className="col-span-5 min-h-0 overflow-hidden">
              <CardScoreBadge draft={draft} rating={rating} dark={dark} compact={isNarrow} />
            </div>
            <div className="col-span-7 min-h-0 overflow-hidden">
              {visibleAxes.length < 3 ? (
                <BarChart axes={visibleAxes} dark={dark} />
              ) : (
                <RadarChart
                  axes={visibleAxes}
                  dark={dark}
                  compact={isNarrow}
                  legendColumns={1}
                  size={layoutPlan.chartSize}
                />
              )}
            </div>
          </div>

          {/* Row 2 — Merged Reasons */}
          {options.showReasons && hasReasons ? (
            <div className="min-h-0 overflow-hidden">
              <CardAxisReasons
                axes={visibleAxes}
                dark={dark}
                maxItems={layoutPlan.maxReasonItems}
                maxLines={layoutPlan.maxReasonLines}
                unitsPerLine={config.charsPerLine}
              />
            </div>
          ) : (
            <div aria-hidden="true" style={{ display: 'none' }} />
          )}

          {/* Row 3 — Narrative (1fr — takes all remaining space) */}
          <div className="min-h-0 overflow-hidden">
            <CardNarrative
              overallComment={draft.overallComment}
              personalStory={draft.personalStory}
              showStory={options.showStory}
              dark={dark}
              maxCommentLines={layoutPlan.maxCommentLines}
              maxStoryLines={layoutPlan.maxStoryLines}
              charsPerLine={config.charsPerLine}
            />
          </div>
        </>
      ) : hasReasons ? (
        /* No narrative, with breakdown */
        <>
          {/* Row 1 — Score badge + Chart side-by-side */}
          <div className="grid min-h-0 grid-cols-12 gap-4 overflow-hidden">
            <div className="col-span-5 min-h-0 overflow-hidden">
              <CardScoreBadge draft={draft} rating={rating} dark={dark} compact={isNarrow} />
            </div>
            <div className="col-span-7 min-h-0 overflow-hidden">
              {visibleAxes.length < 3 ? (
                <BarChart axes={visibleAxes} dark={dark} />
              ) : (
                <RadarChart
                  axes={visibleAxes}
                  dark={dark}
                  compact={isNarrow}
                  legendColumns={1}
                  size={layoutPlan.chartSize}
                />
              )}
            </div>
          </div>

          {/* Row 2 — Breakdown expands to fill lower area (1fr) */}
          <div className="flex min-h-0 flex-col justify-start gap-3 overflow-hidden">
            <CardAxisReasons
              axes={visibleAxes}
              dark={dark}
              maxItems={layoutPlan.maxReasonItems}
              maxLines={layoutPlan.maxReasonLines}
              unitsPerLine={config.charsPerLine}
            />
          </div>
        </>
      ) : (
        /* Minimalist rating mode: Top ScoreBadge -> Hero RadarChart fills the rest */
        <>
          <div className="min-h-0 overflow-hidden">
            <CardScoreBadge draft={draft} rating={rating} dark={dark} compact={isNarrow} />
          </div>
          <div className="flex min-h-0 flex-col items-center justify-center overflow-hidden">
            <div className="w-full max-w-sm">
              {visibleAxes.length < 3 ? (
                <BarChart axes={visibleAxes} dark={dark} />
              ) : (
                <RadarChart
                  axes={visibleAxes}
                  dark={dark}
                  compact={isNarrow}
                  legendColumns={1}
                  size={layoutPlan.chartSize}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Row 4 — Footer (fixed 32px track) */}
      <div className="flex min-h-0 items-center overflow-hidden">
        <CardFooter dark={dark} signature={draft.personalSignature} />
      </div>
    </div>
  );
}
