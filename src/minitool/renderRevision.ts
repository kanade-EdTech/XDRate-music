import type { MusicRatingDraft } from '../domain/rating/types';
import type { CardRatio, CardTheme } from '../features/card-export/types';

export interface RenderRevisionInput {
  rating: MusicRatingDraft;
  ratio: CardRatio;
  coverUrl?: string | null;
  theme?: CardTheme | string;
  personalSignature?: string;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Produces a deterministic invalidation key for the exact inputs used to render a card.
 * This is an invalidation key, not a security hash.
 */
export function createRenderRevision(input: RenderRevisionInput): string {
  const serialized = JSON.stringify({
    rating: input.rating,
    ratio: input.ratio,
    coverUrl: input.coverUrl ?? null,
    theme: input.theme ?? 'light',
    personalSignature: input.personalSignature?.trim() ?? '',
  });
  return `render-v1-${hashString(serialized)}`;
}
