/**
 * Renderer-facing star tile (§5.9 input contract). Positions are tile-local
 * f32 — NEVER absolute (§5.2). The renderer receives the tile's camera-relative
 * offset separately, per frame, computed by `coords`.
 */
export interface StarBatch {
  readonly count: number;
  /** Tile origin, galaxy-context parsecs, f64. */
  readonly originPc: readonly [number, number, number];
  /** 3 × count, parsecs relative to originPc. */
  readonly positionsPc: Float32Array;
  readonly absMag: Float32Array;
  readonly colorIndexBV: Float32Array;
  readonly catalogIds: Uint32Array;
  readonly hipIds: Uint32Array;
  /** BodyId of star i = `${idPrefix}:${catalogIds[i]}`, e.g. "hyg:32263". */
  readonly idPrefix: string;
}
