import type { WorkMetadata } from '../../../domain/rating/types';
import { messages } from '../../../i18n/messages';
import { useI18n } from '../../../i18n/useI18n';

const defaultArtistLabels = new Set(
  Object.values(messages).map((locale) => locale['metadata.artist']),
);
const defaultAlbumLabels = new Set(
  Object.values(messages).map((locale) => locale['metadata.album']),
);

interface CardHeaderProps {
  work: WorkMetadata;
  dark: boolean;
  compact?: boolean;
}

export function CardHeader({ work, dark, compact = false }: CardHeaderProps) {
  const { t } = useI18n();
  const formatMetadata = (label: string | null, value: string, defaultLabels?: Set<string>) => {
    const normalizedLabel = label?.trim() ?? '';
    return normalizedLabel && !defaultLabels?.has(normalizedLabel)
      ? `${normalizedLabel}${t('metadata.labelSeparator')}${value.trim()}`
      : value.trim();
  };
  const artistText = work.artist.trim()
    ? formatMetadata(work.artistLabel, work.artist, defaultArtistLabels)
    : t('card.unknownArtist');
  const secondaryMetadata = [
    ...(work.album.trim()
      ? [{ id: 'album', text: formatMetadata(work.albumLabel, work.album, defaultAlbumLabels) }]
      : []),
    ...work.extraFields
      .filter((field) => field.value.trim())
      .map((field) => ({ id: field.id, text: formatMetadata(field.label, field.value) })),
    ...(work.releaseYear.trim() ? [{ id: 'releaseYear', text: work.releaseYear.trim() }] : []),
  ];
  const textColor = dark ? 'text-white' : 'text-slate-900';
  const mutedColor = dark ? 'text-slate-300' : 'text-slate-600';
  const coverSizeClass = compact ? 'h-20 w-20' : 'h-24 w-24';

  return (
    <header data-card-region="header" className="flex items-start justify-between gap-5">
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs font-bold uppercase tracking-[0.2em] ${
            dark ? 'text-indigo-400' : 'text-indigo-600'
          }`}
        >
          XDRate Music
        </p>
        <h3
          className={`mt-2 line-clamp-2 break-words text-2xl font-black leading-tight sm:text-3xl ${textColor}`}
          title={work.title.trim() || t('card.untitled')}
        >
          {work.title.trim() || t('card.untitled')}
        </h3>
        <p
          className={`mt-1.5 line-clamp-1 break-words text-base font-semibold leading-snug ${mutedColor}`}
          title={artistText}
        >
          {artistText}
        </p>
        {secondaryMetadata.length > 0 && (
          <p className={`mt-1 text-xs font-medium leading-normal ${mutedColor}`}>
            {secondaryMetadata.map((item, index) => (
              <span key={item.id} className="break-words">
                {index > 0 && <span> · </span>}
                {item.text}
              </span>
            ))}
          </p>
        )}
      </div>

      {work.coverDataUrl ? (
        <img
          src={work.coverDataUrl}
          alt=""
          className={`${coverSizeClass} shrink-0 rounded-2xl object-cover shadow-md ring-1 ${
            dark ? 'ring-white/20' : 'ring-black/10'
          }`}
        />
      ) : (
        <div
          className={`grid ${coverSizeClass} shrink-0 place-items-center rounded-2xl text-2xl font-bold shadow-md ring-1 ${
            dark
              ? 'bg-slate-800 text-slate-400 ring-white/10'
              : 'bg-white text-slate-500 ring-black/5'
          }`}
          aria-hidden="true"
        >
          ♫
        </div>
      )}
    </header>
  );
}
