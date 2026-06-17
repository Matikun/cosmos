/**
 * Cross-fade ramps for tile/chunk swaps (§5.8): `VisibleChunk.opacity` rises 0→1
 * over `crossFadeMs` when a chunk enters the cut and falls 1→0 when it is evicted,
 * so the consumer's `setOpacity` blends LOD swaps instead of popping. Pure +
 * allocation-free.
 */

/** §5.8 default cross-fade duration, ms (~0.3 s). */
export const DEFAULT_CROSS_FADE_MS = 300;

/** §5.8 default LOD hysteresis: cross a threshold by 15% before switching. */
export const DEFAULT_LOD_HYSTERESIS = 0.15;

/**
 * Advance `opacity` toward `target` (0 or 1) by one frame. `crossFadeMs <= 0`
 * snaps instantly. Clamped to [0, 1].
 */
export function advanceFade(
  opacity: number,
  target: 0 | 1,
  dtMs: number,
  crossFadeMs: number,
): number {
  if (crossFadeMs <= 0) return target;
  const step = (dtMs / crossFadeMs) * (target === 1 ? 1 : -1);
  const next = opacity + step;
  if (next <= 0) return 0;
  if (next >= 1) return 1;
  return next;
}
