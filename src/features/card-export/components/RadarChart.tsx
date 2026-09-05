import type { RatingAxis } from '../../../domain/rating/types';
import { useI18n } from '../../../i18n/useI18n';

interface RadarChartProps {
  axes: RatingAxis[];
  dark: boolean;
  compact?: boolean;
  legendColumns?: 1 | 2;
  scale?: number;
  size?: number;
  fillHeight?: boolean;
}

function formatScore(score: number): string {
  return score.toFixed(1);
}

export function RadarChart({
  axes,
  dark,
  compact = false,
  legendColumns = 1,
  scale = 1,
  size: explicitSize,
  fillHeight = false,
}: RadarChartProps) {
  const { t } = useI18n();
  const displayAxes = axes.slice(0, 8);
  const count = displayAxes.length;

  const size = explicitSize ?? Math.round((compact ? 200 : 240) * scale);
  const center = size / 2;
  const radius = Math.round(size * 0.375);

  const angle = (index: number) => (Math.PI * 2 * index) / count - Math.PI / 2;
  const point = (index: number, value: number) => {
    const r = radius * Math.max(0, Math.min(1, value));
    const a = angle(index);
    return `${(center + Math.cos(a) * r).toFixed(1)},${(center + Math.sin(a) * r).toFixed(1)}`;
  };

  const polygonPoints = (value: number) =>
    displayAxes.map((_, index) => point(index, value)).join(' ');

  const dataPoints = displayAxes.map((axis, index) => point(index, axis.score / 10)).join(' ');

  const gridStroke = dark ? '#475569' : '#cbd5e1';
  const axisStroke = dark ? '#334155' : '#e2e8f0';

  return (
    <figure
      data-card-region="chart"
      className={`flex flex-col justify-between rounded-2xl p-4 shadow-sm backdrop-blur-sm ${
        fillHeight ? 'h-full ' : ''
      }${dark ? 'border border-white/10 bg-white/5' : 'border border-slate-200/60 bg-white/80'}`}
    >
      <figcaption
        className={`text-xs font-bold uppercase tracking-wider ${
          dark ? 'text-slate-200' : 'text-slate-800'
        }`}
      >
        {t('card.radarDescription')}
      </figcaption>

      <div className="my-auto flex flex-col items-center justify-center gap-4">
        {/* SVG Graphic with pure shapes and vertex markers */}
        <div className="relative shrink-0">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            className="h-auto max-w-full overflow-visible"
            role="img"
            aria-label={t('card.radarDescription')}
          >
            {/* Grid polygons */}
            {[0.25, 0.5, 0.75, 1.0].map((level) => (
              <polygon
                key={level}
                points={polygonPoints(level)}
                fill={level === 1.0 ? (dark ? '#0f172a33' : '#f8fafc55') : 'none'}
                stroke={gridStroke}
                strokeWidth={level === 1.0 ? '1.5' : '1'}
                strokeDasharray={level === 1.0 ? undefined : '3,3'}
              />
            ))}

            {/* Radial spoke lines */}
            {displayAxes.map((_, index) => {
              const a = angle(index);
              return (
                <line
                  key={index}
                  x1={center}
                  y1={center}
                  x2={(center + Math.cos(a) * radius).toFixed(1)}
                  y2={(center + Math.sin(a) * radius).toFixed(1)}
                  stroke={axisStroke}
                  strokeWidth="1"
                />
              );
            })}

            {/* Data shape */}
            <polygon
              points={dataPoints}
              fill="rgba(99, 102, 241, 0.35)"
              stroke="#6366f1"
              strokeWidth="2.5"
            />

            {/* Vertex nodes */}
            {displayAxes.map((axis, index) => {
              const a = angle(index);
              const r = radius * Math.max(0, Math.min(1, axis.score / 10));
              const cx = center + Math.cos(a) * r;
              const cy = center + Math.sin(a) * r;
              return (
                <g key={axis.id}>
                  <circle
                    cx={cx.toFixed(1)}
                    cy={cy.toFixed(1)}
                    r="4"
                    fill="#4f46e5"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Independent Axis Legend */}
        <div className="w-full min-w-0 flex-1">
          <div
            className={`grid ${
              legendColumns === 2 ? 'grid-cols-2 gap-x-3 gap-y-1.5' : 'grid-cols-1 gap-y-1.5'
            } text-xs`}
          >
            {displayAxes.map((axis) => (
              <div
                key={axis.id}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1 ${
                  dark ? 'bg-white/5 text-slate-200' : 'bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full bg-indigo-500"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words font-medium leading-tight">
                    {axis.name.trim() || t('rating.unnamedAxis')}
                  </span>
                </div>
                <span
                  className={`ml-2 shrink-0 font-mono font-bold tabular-nums whitespace-nowrap ${
                    dark ? 'text-indigo-300' : 'text-indigo-600'
                  }`}
                >
                  {formatScore(axis.score)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ul className="sr-only">
        {displayAxes.map((axis) => (
          <li key={axis.id}>
            {axis.name || t('rating.unnamedAxis')}: {formatScore(axis.score)}
          </li>
        ))}
      </ul>
    </figure>
  );
}
