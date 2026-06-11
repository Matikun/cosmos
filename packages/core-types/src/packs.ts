/** Byte range of one attribute inside a pack's single .bin file. */
export interface BufferSlice {
  readonly byteOffset: number;
  readonly byteLength: number;
}

export const STAR_PACK_FORMAT_VERSION = 1;

/**
 * Manifest of a packed star catalog tile (architecture §5.7, §11). The .bin is
 * little-endian; every slice is 4-byte aligned. Loaders MUST reject manifests
 * whose packFormatVersion differs (§11).
 */
export interface StarPackManifest {
  readonly packFormatVersion: typeof STAR_PACK_FORMAT_VERSION;
  /** Source catalog tag, e.g. "hyg-v41". */
  readonly source: string;
  /** Lowercase hex SHA-256 of the .bin (reproducible builds, §11). */
  readonly contentHashSha256: string;
  readonly count: number;
  /** URLs relative to the manifest's own location. */
  readonly binUrl: string;
  readonly namesUrl: string;
  /**
   * Tile origin in galaxy-context parsecs, f64. Star positions in the .bin are
   * RELATIVE to this origin (context-local GPU buffers, §5.2 / ADR-001).
   * Phase 1 convention: galaxy-context origin = the Sun, axes = galactic
   * (x → galactic center, z → north galactic pole); originPc = [0,0,0].
   */
  readonly originPc: readonly [number, number, number];
  readonly buffers: {
    /** Float32Array, 3 × count, parsecs relative to originPc. */
    readonly positionsPc: BufferSlice;
    /** Float32Array, count — absolute visual magnitude. */
    readonly absMag: BufferSlice;
    /** Float32Array, count — B–V color index. */
    readonly colorIndexBV: BufferSlice;
    /** Uint32Array, count — source-catalog id (HYG `id` column). */
    readonly catalogIds: BufferSlice;
    /** Uint32Array, count — Hipparcos number, 0 = none. */
    readonly hipIds: BufferSlice;
  };
}
