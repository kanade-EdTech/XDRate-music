import { ratingAlgorithmVersion } from '../../../domain/rating/calculateRating';
import { useI18n } from '../../../i18n/useI18n';

interface CardFooterProps {
  dark: boolean;
  signature?: string;
}

export function CardFooter({ dark, signature }: CardFooterProps) {
  const { t } = useI18n();
  const mutedColor = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <footer
      data-card-region="footer"
      className={`flex h-8 w-full shrink-0 items-center justify-between gap-4 text-[11px] font-medium leading-none ${mutedColor}`}
    >
      <span className="whitespace-nowrap">
        {signature?.trim() ? signature.trim() : t('card.disclaimer')}
      </span>
      <span className="whitespace-nowrap">XDRate · {ratingAlgorithmVersion}</span>
    </footer>
  );
}
