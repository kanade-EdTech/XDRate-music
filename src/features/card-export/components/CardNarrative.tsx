import { useI18n } from '../../../i18n/useI18n';

interface CardNarrativeProps {
  overallComment?: string;
  personalStory?: string;
  showStory: boolean;
  dark: boolean;
  maxCommentLines?: number;
  maxStoryLines?: number;
  /** Estimated characters-per-line for this ratio's logical canvas width */
  charsPerLine?: number;
}

/**
 * Estimate the maximum characters that will be visible after line-clamping.
 * This is a conservative heuristic:
 *   - Chinese/CJK characters average ~1.0× the font size in width
 *   - Latin characters average ~0.55× the font size in width
 * We use 28 chars/line as a reasonable mixed-script baseline.
 */
function estimateMaxChars(maxLines: number, charsPerLine: number): number {
  return maxLines * charsPerLine;
}

export function CardNarrative({
  overallComment,
  personalStory,
  showStory,
  dark,
  maxCommentLines = 4,
  maxStoryLines = 3,
  charsPerLine = 28,
}: CardNarrativeProps) {
  const { t } = useI18n();
  const textColor = dark ? 'text-slate-100' : 'text-slate-900';
  const storyColor = dark ? 'text-slate-300' : 'text-slate-600';
  const hintColor = dark ? 'text-slate-500' : 'text-slate-400';

  const commentTrimmed = overallComment?.trim() ?? '';
  const storyTrimmed = personalStory?.trim() ?? '';

  const maxCommentChars = estimateMaxChars(maxCommentLines, charsPerLine);
  const maxStoryChars = estimateMaxChars(maxStoryLines, charsPerLine);

  const commentTruncated = commentTrimmed.length > maxCommentChars;
  const storyTruncated = storyTrimmed.length > maxStoryChars;

  if (!commentTrimmed && (!showStory || !storyTrimmed)) {
    return null;
  }

  return (
    <div className="space-y-3">
      {commentTrimmed && (
        <div
          data-card-region="comment"
          className={`rounded-2xl p-4 shadow-sm backdrop-blur-sm ${
            dark ? 'border border-white/10 bg-white/5' : 'border border-slate-200/60 bg-white/80'
          }`}
        >
          <p
            className={`font-normal leading-relaxed ${textColor}`}
            style={{
              fontSize: 'var(--card-body-fs, 13px)',
              lineHeight: 'var(--card-body-lh, 1.65)',
              display: '-webkit-box',
              WebkitLineClamp: maxCommentLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            &ldquo;{commentTrimmed}&rdquo;
          </p>
          {commentTruncated && (
            <p className={`mt-1 text-[10px] italic leading-tight ${hintColor}`} aria-live="polite">
              {t('card.truncatedComment')} {maxCommentChars} {t('card.truncatedSuffix')}
            </p>
          )}
        </div>
      )}

      {showStory && storyTrimmed && (
        <div
          data-card-region="story"
          className={`rounded-2xl p-4 shadow-sm backdrop-blur-sm ${
            dark ? 'border border-white/10 bg-white/5' : 'border border-slate-200/60 bg-white/80'
          }`}
        >
          <p
            className={`italic leading-relaxed ${storyColor}`}
            style={{
              fontSize: 'var(--card-caption-fs, 11px)',
              lineHeight: 'var(--card-caption-lh, 1.5)',
              display: '-webkit-box',
              WebkitLineClamp: maxStoryLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {storyTrimmed}
          </p>
          {storyTruncated && (
            <p className={`mt-1 text-[10px] italic leading-tight ${hintColor}`} aria-live="polite">
              {t('card.truncatedStory')} {maxStoryChars} {t('card.truncatedSuffix')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
