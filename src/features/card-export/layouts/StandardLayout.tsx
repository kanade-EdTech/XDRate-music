import { BarChart } from '../components/BarChart';
import { CardAxisReasons } from '../components/CardAxisReasons';
import { CardFooter } from '../components/CardFooter';
import { CardHeader } from '../components/CardHeader';
import { CardNarrative } from '../components/CardNarrative';
import { CardScoreBadge } from '../components/CardScoreBadge';
import { RadarChart } from '../components/RadarChart';
import type { BaseCardLayoutProps } from '../types';

export function StandardLayout({
  draft,
  rating,
  options,
  config,
  dark,
  visibleAxes,
  layoutPlan,
}: BaseCardLayoutProps) {
  const hasNarrative = layoutPlan.hasNarrative;

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ padding: '40px 48px', gap: '16px' }}
    >
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-6">
        {/* Left Column: Header + Score + (Reasons/Breakdown) */}
        <div
          className={`col-span-6 flex min-h-0 flex-col gap-4 overflow-hidden ${
            hasNarrative ? 'justify-between' : 'justify-center'
          }`}
        >
          <div className="flex flex-col gap-4">
            <CardHeader work={draft.work} dark={dark} />
            <CardScoreBadge draft={draft} rating={rating} dark={dark} />
          </div>

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
        </div>

        {/* Right Column: Chart + Narrative */}
        <div
          className={`col-span-6 flex min-h-0 flex-col gap-4 overflow-hidden ${
            hasNarrative ? 'justify-between' : 'justify-center'
          }`}
        >
          <div className="min-h-0 shrink-0" style={{ flexGrow: layoutPlan.chartScale }}>
            {visibleAxes.length < 3 ? (
              <BarChart axes={visibleAxes} dark={dark} />
            ) : (
              <RadarChart
                axes={visibleAxes}
                dark={dark}
                legendColumns={layoutPlan.legendColumns}
                scale={layoutPlan.chartScale}
                size={layoutPlan.chartSize}
              />
            )}
          </div>

          {hasNarrative && (
            <div className="min-h-0 flex-1 overflow-hidden">
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
          )}
        </div>
      </div>

      <div className="shrink-0">
        <CardFooter dark={dark} />
      </div>
    </div>
  );
}
