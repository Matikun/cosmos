import { describe, expect, it } from 'vitest';
import { StarDataSourceImpl } from '../src/source.js';

describe('search timing', () => {
  it('search over 120k synthetic names completes in < 50 ms', () => {
    const COUNT = 120_000;

    let state = 42;
    function nextRand(): number {
      state = (state * 1664525 + 1013904223) & 0xffffffff;
      return (state >>> 0) / 0x100000000;
    }
    const adjectives = ['red', 'blue', 'dark', 'bright', 'cold', 'hot', 'dim', 'pale'];
    const nouns = ['star', 'sun', 'dwarf', 'giant', 'nova', 'beta', 'alpha', 'delta'];
    function syntheticName(i: number): string {
      return `${adjectives[Math.floor(nextRand() * adjectives.length)]!}-${nouns[Math.floor(nextRand() * nouns.length)]!}-${String(i)}`;
    }

    const positions = new Float32Array(COUNT * 3);
    const absMag = new Float32Array(COUNT);
    const colorIndexBV = new Float32Array(COUNT);
    const catalogIds = new Uint32Array(COUNT);
    const hipIds = new Uint32Array(COUNT);
    const names: Record<string, string> = {};

    for (let i = 0; i < COUNT; i++) {
      catalogIds[i] = i + 1;
      hipIds[i] = 0;
      absMag[i] = nextRand() * 10 - 2;
      colorIndexBV[i] = nextRand() * 2 - 0.5;
      positions[i * 3] = (nextRand() - 0.5) * 2000;
      positions[i * 3 + 1] = (nextRand() - 0.5) * 2000;
      positions[i * 3 + 2] = (nextRand() - 0.5) * 2000;
      names[String(i + 1)] = syntheticName(i);
    }
    names[String(60001)] = 'sirius-special';

    const synSrc = new StarDataSourceImpl(
      {
        count: COUNT,
        originPc: [0, 0, 0],
        positionsPc: positions,
        absMag,
        colorIndexBV,
        catalogIds,
        hipIds,
        idPrefix: 'hyg',
      },
      names,
    );

    // Warm up; measure the best of a few runs to ignore one-off JIT spikes.
    synSrc.search('sirius');
    let elapsed = Number.POSITIVE_INFINITY;
    for (let run = 0; run < 3; run++) {
      const t0 = performance.now();
      const results = synSrc.search('sirius');
      elapsed = Math.min(elapsed, performance.now() - t0);
      expect(results.length).toBeGreaterThan(0);
    }

    expect(elapsed).toBeLessThan(50);
  });
});
