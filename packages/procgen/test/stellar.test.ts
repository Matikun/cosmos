import { describe, expect, it } from 'vitest';
import {
  sampleMass,
  massToTeff,
  teffToColorBV,
  massToColorBV,
  massToAbsMag,
  IMF_MASS_MIN,
  IMF_MASS_BREAK,
  IMF_MASS_MAX,
  BV_MIN,
  BV_MAX,
} from '../src/stellar.js';

// Forward Ballesteros (2012) relation — the one render-stars uses for its LUT.
// teffToColorBV must invert this.
const bvToTemperature = (bv: number): number =>
  4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));

describe('sampleMass (Kroupa IMF inverse-CDF)', () => {
  it('maps the [0,1) domain onto [MIN, MAX]', () => {
    expect(sampleMass(0)).toBeCloseTo(IMF_MASS_MIN, 6);
    expect(sampleMass(0.999999)).toBeLessThanOrEqual(IMF_MASS_MAX);
    for (let i = 0; i <= 100; i++) {
      const m = sampleMass(i / 101);
      expect(m).toBeGreaterThanOrEqual(IMF_MASS_MIN - 1e-9);
      expect(m).toBeLessThanOrEqual(IMF_MASS_MAX + 1e-9);
    }
  });

  it('is monotonically increasing in u', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 1000; i++) {
      const m = sampleMass(i / 1001);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
  });

  it('is continuous across the break mass', () => {
    // ~73% of stars are below the break; sampling near that quantile gives ~0.5 M☉.
    const massesBelowBreak = Array.from({ length: 10000 }, (_, i) => sampleMass(i / 10000)).filter(
      (m) => m < IMF_MASS_BREAK,
    );
    // Steeply weighted to low mass: majority below the break.
    expect(massesBelowBreak.length / 10000).toBeGreaterThan(0.6);
    expect(massesBelowBreak.length / 10000).toBeLessThan(0.85);
  });
});

describe('massToTeff', () => {
  it('a 1 M☉ star is ~5772 K', () => {
    expect(massToTeff(1)).toBeCloseTo(5772, 0);
  });
  it('is monotonically increasing in mass', () => {
    expect(massToTeff(10)).toBeGreaterThan(massToTeff(1));
    expect(massToTeff(0.2)).toBeLessThan(massToTeff(1));
  });
});

describe('teffToColorBV (inverse Ballesteros)', () => {
  it('round-trips the forward relation across the valid B–V range', () => {
    for (let bv = -0.3; bv <= 1.9; bv += 0.1) {
      const t = bvToTemperature(bv);
      expect(teffToColorBV(t)).toBeCloseTo(bv, 4);
    }
  });

  it('clamps temperatures outside the relation domain into [BV_MIN, BV_MAX]', () => {
    expect(teffToColorBV(massToTeff(IMF_MASS_MAX))).toBe(BV_MIN); // very hot
    expect(teffToColorBV(massToTeff(IMF_MASS_MIN))).toBe(BV_MAX); // very cool
  });

  it('the Sun (M=1) is yellow-ish (bv ≈ 0.65)', () => {
    expect(massToColorBV(1)).toBeGreaterThan(0.55);
    expect(massToColorBV(1)).toBeLessThan(0.75);
  });
});

describe('massToAbsMag', () => {
  it('a 1 M☉ star has M_V = 4.83', () => {
    expect(massToAbsMag(1)).toBeCloseTo(4.83, 6);
  });
  it('brighter (lower magnitude) for more massive stars', () => {
    expect(massToAbsMag(10)).toBeLessThan(massToAbsMag(1));
    expect(massToAbsMag(0.2)).toBeGreaterThan(massToAbsMag(1));
  });
});
