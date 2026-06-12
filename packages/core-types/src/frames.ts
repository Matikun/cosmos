/** IAU 2006 obliquity of the ecliptic at J2000.0, degrees. */
export const OBLIQUITY_J2000_DEG = 23.4392911;

/** J2000 ICRS-equatorial → galactic rotation, row-major (same as TASK-008). */
export const ICRS_TO_GALACTIC: readonly number[] = [
  -0.0548755604, -0.8734370902, -0.4838350155,
   0.4941094279, -0.4448296300,  0.7469822445,
  -0.8676661490, -0.1980763734,  0.4559837762,
];

function _mul3x3(A: readonly number[], B: readonly number[]): readonly number[] {
  const C: number[] = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      C[r * 3 + c] =
        A[r * 3 + 0]! * B[0 * 3 + c]! +
        A[r * 3 + 1]! * B[1 * 3 + c]! +
        A[r * 3 + 2]! * B[2 * 3 + c]!;
    }
  }
  return C;
}

const _eps = (OBLIQUITY_J2000_DEG * Math.PI) / 180;
const _c = Math.cos(_eps);
const _s = Math.sin(_eps);

// Rx(ε): rotates ecliptic coords into equatorial — v_eq = Rx(ε) · v_ecl
const _Rx: readonly number[] = [
  1, 0,    0,
  0, _c,  -_s,
  0, _s,   _c,
];

/**
 * Ecliptic-J2000 → galactic rotation, row-major 3×3. Computed at module load as
 * ICRS_TO_GALACTIC × Rx(OBLIQUITY_J2000_DEG) — never hand-typed.
 */
export const ECLIPTIC_TO_GALACTIC: readonly number[] = _mul3x3(ICRS_TO_GALACTIC, _Rx);

/** out = M·[x,y,z]. Writes into `out`, returns it — zero allocation (§9). */
export function applyMat3(
  m: readonly number[],
  x: number,
  y: number,
  z: number,
  out: [number, number, number],
): [number, number, number] {
  out[0] = m[0]! * x + m[1]! * y + m[2]! * z;
  out[1] = m[3]! * x + m[4]! * y + m[5]! * z;
  out[2] = m[6]! * x + m[7]! * y + m[8]! * z;
  return out;
}
