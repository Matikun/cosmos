/**
 * §9 budgets + the §9 degradation order's first lever (point count). The tier
 * table (TASK-031 `QUALITY_TIERS`) is the single source of truth for the rendered
 * point cap; `streaming` owns only point-count + LOD. Bloom / atmosphere /
 * resolution scale (the later degradation levers) are the scene-host's job.
 */
import type { QualityTier, StarBatch } from '@cosmos/core-types';
import { QUALITY_TIERS } from '@cosmos/core-types';

/** §9 budgets — exceeded ⇒ graceful degradation (drop LOD, then point count). */
export interface StreamBudgets {
  readonly maxRenderedPoints: number;
  readonly maxDrawCalls: number;
  readonly maxGpuBytes: number;
  readonly maxInFlight: number;
}

/** §9 defaults: ≤ 2M points, ≤ 300 draws, ≤ 350 MB GPU, 6 in-flight (§5.8 4–8). */
export const DEFAULT_BUDGETS: StreamBudgets = {
  maxRenderedPoints: 2_000_000,
  maxDrawCalls: 300,
  maxGpuBytes: 350 * 1024 * 1024,
  maxInFlight: 6,
};

export function resolveBudgets(partial?: Partial<StreamBudgets>): StreamBudgets {
  return {
    maxRenderedPoints: partial?.maxRenderedPoints ?? DEFAULT_BUDGETS.maxRenderedPoints,
    maxDrawCalls: partial?.maxDrawCalls ?? DEFAULT_BUDGETS.maxDrawCalls,
    maxGpuBytes: partial?.maxGpuBytes ?? DEFAULT_BUDGETS.maxGpuBytes,
    maxInFlight: partial?.maxInFlight ?? DEFAULT_BUDGETS.maxInFlight,
  };
}

/**
 * Effective rendered-point cap for the active tier: the lower of the configured
 * budget and the tier-table value (`setQualityTier` scales it, §9 / §5.8).
 */
export function effectiveMaxPoints(budgets: StreamBudgets, tier: QualityTier): number {
  return Math.min(budgets.maxRenderedPoints, QUALITY_TIERS[tier].maxRenderedPoints);
}

/** GPU-resident bytes per point: position (3×f32) + absMag (f32) + colorIndexBV (f32).
 *  catalogIds/hipIds stay CPU-side for picking and are not counted against GPU memory. */
export const GPU_BYTES_PER_POINT = 3 * 4 + 4 + 4;

/** Estimated GPU memory a decoded batch occupies once uploaded (§9 budget). */
export function estimateGpuBytes(batch: StarBatch): number {
  return batch.count * GPU_BYTES_PER_POINT;
}
