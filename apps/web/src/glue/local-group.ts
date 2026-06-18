/**
 * Local group + universe⇄galaxy anchor scan (TASK-040, TASK-037 precondition
 * order). The Milky Way is galaxy index 0, pinned at the universe origin; its
 * seed (from the deterministic local group) drives the procgen star cloud.
 */
import { generateLocalGroup, type FlightController } from '@cosmos/nav';
import type { ScaleFrameTree } from '@cosmos/coords';
import type { GalaxyRecord } from '@cosmos/core-types';

export const LOCAL_GROUP_SEED = 1;
export const MILKY_WAY_ID = 'proc:milkyway';
/** Procgen star budget for the Milky Way cloud (§5.8 cap is enforced downstream). */
export const MILKY_WAY_STAR_COUNT = 1_000_000;
/** Universe⇄galaxy anchor scan cadence — ≤ 10 Hz, never per-frame (§5.8). */
export const GALAXY_ANCHOR_SCAN_MS = 100;

export interface LocalGroup {
  /** All procedural galaxies (index 0 reassigned as the Milky Way at the origin). */
  readonly galaxies: readonly GalaxyRecord[];
  /** The Milky Way anchor record: id `proc:milkyway`, positioned at universe origin. */
  readonly milkyWay: GalaxyRecord;
}

/**
 * Build the deterministic local group and designate index 0 as the Milky Way at
 * the universe origin (keeping its generated seed so the cloud is reproducible).
 */
export function makeLocalGroup(seed = LOCAL_GROUP_SEED): LocalGroup {
  const galaxies = generateLocalGroup({ seed });
  const g0 = galaxies[0]!;
  const milkyWay: GalaxyRecord = {
    id: MILKY_WAY_ID,
    kind: 'galaxy',
    positionMpc: [0, 0, 0],
    radiusKpc: g0.radiusKpc,
    seed: g0.seed,
  };
  return { galaxies, milkyWay };
}

/**
 * Start the ≤ 10 Hz universe⇄galaxy anchor scan (TASK-037 normative order: tree
 * anchor FIRST, then the nav anchor). Idempotent — it sets the Milky Way anchor on
 * the first tick and no-ops thereafter (`galaxyAnchor.id` already matches).
 *
 * The task spec gates this on `contextId === 'universe'` to avoid re-anchoring a
 * DIFFERENT galaxy while inside one. Here the local group has a single anchorable
 * galaxy (the Milky Way) pinned at the galaxy frame's default origin `[0,0,0]`, so
 * the one-time set is a no-op shift and is safe in any context — which also lets
 * the production app (which boots in `galaxy`) ascend to `universe`. Returns a
 * cleanup that clears the interval.
 */
export function startGalaxyAnchorScan(
  flight: FlightController,
  tree: ScaleFrameTree,
  milkyWay: GalaxyRecord,
): () => void {
  const id = setInterval(() => {
    if (flight.galaxyAnchor?.id === milkyWay.id) return;
    const p = milkyWay.positionMpc;
    tree.setAnchor('galaxy', [p[0], p[1], p[2]]); // FIRST (TASK-037)
    flight.setGalaxyAnchor({ id: milkyWay.id, positionMpc: p }); // THEN
  }, GALAXY_ANCHOR_SCAN_MS);
  return () => clearInterval(id);
}
