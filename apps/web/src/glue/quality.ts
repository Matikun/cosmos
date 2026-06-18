/**
 * Adaptive quality wiring (TASK-040, §9). The SceneHost's PerformanceMonitor steps
 * the tier; this glue relays each change to the streaming point cap and mirrors the
 * tier into the test hook. Bloom/atmosphere flags are exposed by scene-host's
 * `useQuality()` for a post chain; this composition keeps them as flag-only wiring
 * (no new post-processing dependency, and the galaxy/system view stays visually
 * identical to M2 — only `streaming`'s point count responds to the tier).
 */
import type { QualityController } from '@cosmos/scene-host';
import type { StreamingPolicy } from '@cosmos/streaming';
import type { QualityTier } from '@cosmos/core-types';

/**
 * Build the `onQualityController` handler: on mount and on every (debounced) tier
 * change, drive the streaming point cap and notify `onTier` (test-hook mirror).
 */
export function wireQuality(
  streaming: StreamingPolicy,
  onTier?: (tier: QualityTier) => void,
): (qc: QualityController) => void {
  return (qc: QualityController): void => {
    streaming.setQualityTier(qc.tier);
    onTier?.(qc.tier);
    qc.onChange((settings) => {
      streaming.setQualityTier(settings.tier);
      onTier?.(settings.tier);
    });
  };
}
