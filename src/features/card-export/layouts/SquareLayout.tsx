import { BarChart } from '../components/BarChart';
import { CardAxisReasons } from '../components/CardAxisReasons';
import { CardFooter } from '../components/CardFooter';
import { CardHeader } from '../components/CardHeader';
import { CardNarrative } from '../components/CardNarrative';
import { CardScoreBadge } from '../components/CardScoreBadge';
import { RadarChart } from '../components/RadarChart';
import type { BaseCardLayoutProps } from '../types';

/**
 * Square layout (1:1 — 1000×1000)
 *
 * Content-to-ratio adaptive composition:
 * - When narrative exists: Dual-column middle row (Chart left, Merged Breakdown/Reasons + Narrative right)
 * - When no narrative but reasons/breakdown exist: Dual-column middle row (Chart left, Expanded Reasons right)
 * - When neither narrative nor breakdown exists: Centered hero chart fills the canvas
 *
 * Guaranteed zero dead space across all content states.
 */
export function SquareLayout({
  draft,
  rating,
  options,
  config,
  dark,
  visibleAxes,
  layoutPlan,
}: BaseCardLayoutProps) {
  const hasNarrative = layoutPlan.hasNarrative;
  const hasReasons = options.showReasons && visibleAxes.length > 0;

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr 32px',
        padding: '36px 40px',
        gap: '20px',
      }}
    >
      {/* Row 0 — Header row: metadata (left) + score badge (right) */}
      <div
        className="grid min-h-0 grid-cols-12 gap-5 overflow-hidden"
        style={{ alignItems: 'stretch' }}
      >
        <div className="col-span-7 min-h-0 overflow-hidden">
          <CardHeader work={draft.work} dark={dark} />
        </div>
        <div className="col-span-5 min-h-0 overflow-hidden">
          <CardScoreBadge draft={draft} rating={rating} dark={dark} />
        </div>
      </div>

      {/* Row 1 — Content-adaptive middle section */}
      {hasNarrative ? (
        /* Full mode: Chart (left) + Merged Breakdown/Reasons & Narrative (right) */
        <div className="grid min-h-0 grid-cols-12 gap-5 overflow-hidden">
          {/* Left: chart */}
          <div className="col-span-6 flex min-h-0 flex-col justify-center overflow-hidden">
            {visibleAxes.length < 3 ? (
              <BarChart axes={visibleAxes} dark={dark} />
            ) : (
              <RadarChart
                axes={visibleAxes}
                dark={dark}
                legendColumns={1}
                size={layoutPlan.chartSize}
                fillHeight
              />
            )}
          </div>

          {/* Right: merged reasons + narrative */}
          <div className="col-span-6 flex min-h-0 flex-col justify-between gap-3 overflow-hidden">
            {options.showReasons && (
              <div className="shrink-0">
                <CardAxisReasons
                  axes={visibleAxes}
                  dark={dark}
                  maxItems={layoutPlan.maxReasonItems}
                  maxLines={layoutPlan.maxReasonLines}
                  unitsPerLine={config.charsPerLine}
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-hidden">
              <CardNarrative
                overallComment={draft.overallComment}
                personalStory={options.showStory ? draft.personalStory : undefined}
                showStory={options.showStory}
                dark={dark}
                maxCommentLines={layoutPlan.maxCommentLines}
                maxStoryLines={layoutPlan.maxStoryLines}
                charsPerLine={config.charsPerLine}
              />
            </div>
          </div>
        </div>
      ) : hasReasons ? (
        /* No narrative, with breakdown/reasons: Chart (left) + Expanded Reasons (right) */
        <div className="grid min-h-0 grid-cols-12 gap-5 overflow-hidden">
          <div className="col-span-6 flex min-h-0 flex-col justify-center overflow-hidden">
            {visibleAxes.length < 3 ? (
              <BarChart axes={visibleAxes} dark={dark} />
            ) : (
              <RadarChart
                axes={visibleAxes}
                dark={dark}
                legendColumns={1}
                size={layoutPlan.chartSize}
              />
            )}
          </div>
          <div className="col-span-6 flex min-h-0 flex-col justify-center gap-3 overflow-hidden">
            <CardAxisReasons
              axes={visibleAxes}
              dark={dark}
              maxItems={layoutPlan.maxReasonItems}
              maxLines={layoutPlan.maxReasonLines}
              unitsPerLine={config.charsPerLine}
            />
          </div>
        </div>
      ) : (
        /* Minimalist rating mode: Hero centered chart */
        <div className="flex min-h-0 flex-col items-center justify-center overflow-hidden">
          <div className="w-full max-w-2xl">
            {visibleAxes.length < 3 ? (
              <BarChart axes={visibleAxes} dark={dark} />
            ) : (
              <RadarChart
                axes={visibleAxes}
                dark={dark}
                legendColumns={2}
                size={layoutPlan.chartSize}
              />
            )}
          </div>
        </div>
      )}

      {/* Row 2 — Footer */}
      <div className="flex min-h-0 items-center overflow-hidden">
        <CardFooter dark={dark} signature={draft.personalSignature} />
      </div>
    </div>
  );
}
