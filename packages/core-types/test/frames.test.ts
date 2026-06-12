import { describe, expect, it } from 'vitest';
import { ECLIPTIC_TO_GALACTIC, applyMat3 } from '../src/frames';

function matMulMt(M: readonly number[]): number[] {
  const R: number[] = new Array(9).fill(0) as number[];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      for (let k = 0; k < 3; k++) {
        R[r * 3 + c]! += M[r * 3 + k]! * M[c * 3 + k]!;
      }
    }
  }
  return R;
}

function det3(M: readonly number[]): number {
  return (
    M[0]! * (M[4]! * M[8]! - M[5]! * M[7]!) -
    M[1]! * (M[3]! * M[8]! - M[5]! * M[6]!) +
    M[2]! * (M[3]! * M[7]! - M[4]! * M[6]!)
  );
}

describe('ECLIPTIC_TO_GALACTIC', () => {
  it('is orthonormal: M·Mᵀ = I within 2e-10', () => {
    // Input matrix values have 10 significant digits; rounding residuals limit
    // achievable orthogonality to ~1.1e-10 in IEEE 754 double arithmetic.
    const MMt = matMulMt(ECLIPTIC_TO_GALACTIC);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const expected = r === c ? 1 : 0;
        expect(Math.abs(MMt[r * 3 + c]! - expected)).toBeLessThan(2e-10);
      }
    }
  });

  it('has determinant +1 within 1e-10', () => {
    expect(Math.abs(det3(ECLIPTIC_TO_GALACTIC) - 1)).toBeLessThan(1e-10);
  });

  it('maps the north ecliptic pole to galactic lon 96.4° ± 0.3°, lat +29.8° ± 0.3°', () => {
    const out: [number, number, number] = [0, 0, 0];
    applyMat3(ECLIPTIC_TO_GALACTIC, 0, 0, 1, out);
    const [x, y, z] = out;
    const latDeg = (Math.asin(z) * 180) / Math.PI;
    let lonDeg = (Math.atan2(y, x) * 180) / Math.PI;
    if (lonDeg < 0) lonDeg += 360;
    expect(Math.abs(lonDeg - 96.4)).toBeLessThan(0.3);
    expect(Math.abs(latDeg - 29.8)).toBeLessThan(0.3);
  });
});

describe('applyMat3', () => {
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

  it('with identity matrix returns its input values', () => {
    const out: [number, number, number] = [0, 0, 0];
    applyMat3(identity, 3, 5, 7, out);
    expect(out).toEqual([3, 5, 7]);
  });

  it('writes into out and returns the same reference (zero-allocation contract)', () => {
    const out: [number, number, number] = [0, 0, 0];
    const result = applyMat3(identity, 1, 2, 3, out);
    expect(result).toBe(out);
  });
});
