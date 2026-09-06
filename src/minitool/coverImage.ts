export const MAX_COVER_INPUT_BYTES = 20 * 1024 * 1024;
export const TARGET_COVER_BYTES = 512 * 1024;
export const MAX_COVER_EDGE = 1280;

export interface CoverDimensions {
  width: number;
  height: number;
}

export interface CompressedCover {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
  outputBytes: number;
  mimeType: string;
}

export type CoverCompressionResult =
  | { status: 'ready'; cover: CompressedCover }
  | { status: 'invalid-type' | 'too-large' | 'decode-failed' | 'encode-failed' };

const acceptedCoverTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function calculateCoverDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge = MAX_COVER_EDGE,
): CoverDimensions | null {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    !Number.isFinite(maxEdge) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    maxEdge <= 0
  ) {
    return null;
  }
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

export async function compressCoverImage(file: File): Promise<CoverCompressionResult> {
  if (!acceptedCoverTypes.has(file.type.toLowerCase())) return { status: 'invalid-type' };
  if (file.size <= 0 || file.size > MAX_COVER_INPUT_BYTES) return { status: 'too-large' };

  const sourceUrl = URL.createObjectURL(file);
  let image: HTMLImageElement | null;
  try {
    image = await loadImage(sourceUrl);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return { status: 'decode-failed' };
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return { status: 'encode-failed' };

  const edgeCandidates = [MAX_COVER_EDGE, 1024, 768];
  const qualityCandidates = [0.84, 0.72, 0.6];
  let smallest: { blob: Blob; dimensions: CoverDimensions } | null = null;

  try {
    for (const edge of edgeCandidates) {
      const dimensions = calculateCoverDimensions(image.naturalWidth, image.naturalHeight, edge);
      if (!dimensions) return { status: 'decode-failed' };
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      context.clearRect(0, 0, dimensions.width, dimensions.height);
      context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

      for (const quality of qualityCandidates) {
        const encoded = await encodeCanvas(canvas, 'image/webp', quality);
        if (!encoded) continue;
        if (!smallest || encoded.size < smallest.blob.size) {
          smallest = { blob: encoded, dimensions };
        }
        if (encoded.size <= TARGET_COVER_BYTES) {
          return {
            status: 'ready',
            cover: {
              blob: encoded,
              width: dimensions.width,
              height: dimensions.height,
              originalBytes: file.size,
              outputBytes: encoded.size,
              mimeType: encoded.type || 'image/webp',
            },
          };
        }
      }
    }
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }

  if (!smallest) return { status: 'encode-failed' };
  return {
    status: 'ready',
    cover: {
      blob: smallest.blob,
      width: smallest.dimensions.width,
      height: smallest.dimensions.height,
      originalBytes: file.size,
      outputBytes: smallest.blob.size,
      mimeType: smallest.blob.type || 'image/webp',
    },
  };
}
