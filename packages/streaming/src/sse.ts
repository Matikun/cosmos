/**
 * Screen-space-error (SSE) LOD projection — pure, allocation-free (ADR-003 §5,
 * architecture §5.8).
 *
 * A node's projected size in pixels divided by its point spacing is the SSE: the
 * average gap (in pixels) between the points the node represents. When that gap is
 * large the node looks sparse on screen and we descend to its children; when small
 * the node is "good enough" and is the chosen LOD. The metric is unitless in the
 * extent/distance ratio, so `streaming` evaluates it directly in render-context
 * units (see policy: extents are converted into the camera's context first).
 */

/** Vertical field of view used for the pixel projection, radians (~60°).
 *  Fixed because `update()` receives only the viewport height, not a camera. */
export const STREAM_VERTICAL_FOV_RAD = (60 * Math.PI) / 180;

/** tan(fov/2): half the viewport height in render units at unit distance. */
export const STREAM_TAN_HALF_FOV = Math.tan(STREAM_VERTICAL_FOV_RAD / 2);

/** Descend when SSE exceeds this many pixels-per-point-spacing (tuned, §5.8). */
export const DEFAULT_SSE_THRESHOLD_PX = 8;

/**
 * Projected on-screen extent of a node, in pixels. `halfExtentUnits` and
 * `distUnits` MUST be in the same units (the caller normalises both into the
 * camera's render context). A node half-extent `h` at distance `d` subtends
 * `≈ h/d` radians; half the screen height subtends `tanHalfFov`, so the full node
 * (2h) spans `(h/d) · viewportHeightPx / tanHalfFov` pixels.
 */
export function projectedPixelExtent(
  halfExtentUnits: number,
  distUnits: number,
  viewportHeightPx: number,
  tanHalfFov: number,
): number {
  if (distUnits <= 0) return Infinity;
  return (halfExtentUnits / distUnits) * (viewportHeightPx / tanHalfFov);
}

/**
 * Points-per-axis spacing of a node: `cbrt(pointCount)`, floored at 1. Dividing the
 * pixel extent by this yields pixels between adjacent represented points.
 */
export function pointSpacing(pointCount: number): number {
  return Math.max(1, Math.cbrt(Math.max(1, pointCount)));
}

/** SSE = projected node extent (px) ÷ point spacing. Larger ⇒ coarser-looking. */
export function screenSpaceError(pixelExtent: number, pointCount: number): number {
  return pixelExtent / pointSpacing(pointCount);
}
