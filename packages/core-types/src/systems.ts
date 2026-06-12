import type { BodyId, PlanetRecord, StarRecord } from './bodies';

export const SYSTEMS_PACK_FORMAT_VERSION = 1;

/**
 * One star system: a host star plus a FLAT list of orbiting bodies (planets and
 * moons; moons reference their planet via parentId). Element frame convention:
 * `KeplerElements` on these bodies are in ECLIPTIC-J2000-style axes; runtime
 * positions must be rotated by ECLIPTIC_TO_GALACTIC (src/frames.ts) before
 * entering a scale context (contexts use galactic axes, ADR-001 / TASK-008).
 */
export interface StarSystemRecord {
  /** "sol" or "exo:<host-slug>". */
  readonly id: BodyId;
  readonly name: string;
  /** Host star. For Sol this is the existing HYG record id "hyg:0". */
  readonly star: StarRecord;
  /** Planets and moons, flat. Body ids: "<systemId>:<body-slug>". */
  readonly bodies: readonly PlanetRecord[];
}

/** A systems pack is a single JSON file (no .bin — body counts are small). */
export interface SystemsPackManifest {
  readonly packFormatVersion: typeof SYSTEMS_PACK_FORMAT_VERSION;
  /** e.g. "jpl-approx-pos-1800-2050" or "nasa-exoplanet-archive-pscomppars". */
  readonly source: string;
  /** ISO date the pack was generated (build provenance, §11). */
  readonly generatedAtIso: string;
  readonly systems: readonly StarSystemRecord[];
}
