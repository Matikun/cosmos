import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { OctreeManifest } from '@cosmos/core-types';
import { buildOctree } from '../../../../tools/pack-octree/src/build.js';

export interface Fixture {
  dir: string;
  manifestUrl: string;
  manifest: OctreeManifest;
  fetchImpl: typeof fetch;
}

/** Deterministic LCG so the fixture is reproducible (no Math.random). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * A tight star cluster near (100,100,100) inside a 1024 pc root cube, split at
 * maxPointsPerTile=2 so the octree is ~8 levels deep over the cluster. Approaching
 * the cluster makes the deep nodes project large ⇒ SSE descends; retreating ascends.
 */
export function buildClusteredOctree(starCount = 48): Fixture {
  const rnd = lcg(0xc05c05);
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: 100 + (rnd() - 0.5) * 6,
      y: 100 + (rnd() - 0.5) * 6,
      z: 100 + (rnd() - 0.5) * 6,
      absMag: -2 + rnd() * 12,
      colorIndexBV: rnd() * 2 - 0.3,
      catalogId: i + 1,
      hipId: 0,
    });
  }

  const dir = join(tmpdir(), `cosmos-streaming-octree-${Date.now()}-${Math.floor(rnd() * 1e9)}`);
  const manifest = buildOctree(stars, dir, {
    rootHalfExtent: 1024,
    source: 'streaming-test',
    idPrefix: 'sttest',
    maxPointsPerTile: 2,
  });

  const manifestUrl = `file:///${dir.replace(/\\/g, '/')}/octree.json`;
  const fetchImpl: typeof fetch = async (input: RequestInfo | URL) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = fileURLToPath(href);
    const buf = readFileSync(path);
    if (path.endsWith('.json')) {
      return new Response(buf.toString('utf8'), { status: 200 });
    }
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(buf);
    return new Response(ab, { status: 200 });
  };

  return { dir, manifestUrl, manifest, fetchImpl };
}

/**
 * A dense octree filling the whole ±1000 pc root cube uniformly, split at
 * maxPointsPerTile=18000 so it is a near-uniform level-2 tree (~64 leaves of
 * ~9k points each, each well under the 512 KB tile cap). A camera at the origin
 * descends to every leaf, so the rendered cut equals the full catalog — large
 * enough that a 'low' tier (≤ 500k point cap) must collapse leaves into coarser
 * parents to stay under budget.
 */
export function buildDenseOctree(starCount: number): Fixture {
  const rnd = lcg(0x5eed1234);
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: (rnd() - 0.5) * 2000,
      y: (rnd() - 0.5) * 2000,
      z: (rnd() - 0.5) * 2000,
      absMag: -2 + rnd() * 12,
      colorIndexBV: rnd() * 2 - 0.3,
      catalogId: i + 1,
      hipId: 0,
    });
  }

  const dir = join(tmpdir(), `cosmos-streaming-dense-${Date.now()}-${Math.floor(rnd() * 1e9)}`);
  const manifest = buildOctree(stars, dir, {
    rootHalfExtent: 1024,
    source: 'streaming-test-dense',
    idPrefix: 'stdense',
    maxPointsPerTile: 18000,
  });

  const manifestUrl = `file:///${dir.replace(/\\/g, '/')}/octree.json`;
  const fetchImpl: typeof fetch = async (input: RequestInfo | URL) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = fileURLToPath(href);
    const buf = readFileSync(path);
    if (path.endsWith('.json')) return new Response(buf.toString('utf8'), { status: 200 });
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(buf);
    return new Response(ab, { status: 200 });
  };

  return { dir, manifestUrl, manifest, fetchImpl };
}

/** Drain the microtask/timer queue so async loadTile fetch+hash reaches the pool. */
export async function tick(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 0));
}
