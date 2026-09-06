export interface MiniToolViewportMetrics {
  visibleHeight: number;
  keyboardOffset: number;
  keyboardOpen: boolean;
}

export function calculateViewportMetrics(
  layoutHeight: number,
  visualHeight: number | null,
): MiniToolViewportMetrics {
  const safeLayoutHeight = Number.isFinite(layoutHeight) && layoutHeight > 0 ? layoutHeight : 0;
  const safeVisualHeight =
    visualHeight !== null && Number.isFinite(visualHeight) && visualHeight > 0
      ? visualHeight
      : safeLayoutHeight;
  const keyboardOffset = Math.max(0, Math.round(safeLayoutHeight - safeVisualHeight));
  return {
    visibleHeight: safeVisualHeight || safeLayoutHeight,
    keyboardOffset,
    keyboardOpen: keyboardOffset >= 120,
  };
}
