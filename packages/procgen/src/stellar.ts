/**
 * Stellar property relations — ADR-004 §4. Pure functions of mass; no randomness
 * lives here (the IMF *sampler* is the only stochastic piece and it takes a uniform
 * `u`). Every relation is transcribed from ADR-004, not re-derived.
 */

// --- Kroupa (2001) initial mass function ------------------------------------
// Broken power law dN/dM ∝ M^(-α): α = 1.3 on [0.1, 0.5), α = 2.3 on [0.5, 50].
// Kroupa, P. 2001, MNRAS 322, 231.

export const IMF_MASS_MIN = 0.1;
export const IMF_MASS_BREAK = 0.5;
export const IMF_MASS_MAX = 50;

const ALPHA_LOW = 1.3;
const ALPHA_HIGH = 2.3;

// Continuity at the break: ξ_low(break) = ξ_high(break) ⇒ with k_low = 1,
// k_high = break^(α_high − α_low).
const K_HIGH = Math.pow(IMF_MASS_BREAK, ALPHA_HIGH - ALPHA_LOW);

const E_LOW = 1 - ALPHA_LOW; // exponent of the integrated power law, low segment
const E_HIGH = 1 - ALPHA_HIGH; // … high segment

/** ∫ M^(−α) dM evaluated on [lo, hi] (α ≠ 1). */
function powerIntegral(lo: number, hi: number, e: number): number {
  return (Math.pow(hi, e) - Math.pow(lo, e)) / e;
}

const SEG_LOW = powerIntegral(IMF_MASS_MIN, IMF_MASS_BREAK, E_LOW); // k_low = 1
const SEG_HIGH = K_HIGH * powerIntegral(IMF_MASS_BREAK, IMF_MASS_MAX, E_HIGH);
const IMF_TOTAL = SEG_LOW + SEG_HIGH;

/**
 * Inverse-CDF sample of the Kroupa IMF for a uniform `u ∈ [0, 1)`. Returns mass in
 * solar masses on [0.1, 50]. Monotonic in `u`, so a uniform grid of `u` reproduces
 * the analytic distribution exactly (used by the statistical color test).
 */
export function sampleMass(u: number): number {
  const target = u * IMF_TOTAL;
  if (target < SEG_LOW) {
    // (M^E_LOW − min^E_LOW) / E_LOW = target
    const v = Math.pow(IMF_MASS_MIN, E_LOW) + target * E_LOW;
    return Math.pow(v, 1 / E_LOW);
  }
  const t2 = (target - SEG_LOW) / K_HIGH;
  const v = Math.pow(IMF_MASS_BREAK, E_HIGH) + t2 * E_HIGH;
  return Math.pow(v, 1 / E_HIGH);
}

// --- Mass → temperature → colour → magnitude --------------------------------

/** Simplified main-sequence relation: T_eff = 5772·(M/M☉)^0.54 K (ADR-004 §4). */
export function massToTeff(massSolar: number): number {
  return 5772 * Math.pow(massSolar, 0.54);
}

// Valid range of the Ballesteros relation (matches the render-stars LUT domain).
export const BV_MIN = -0.4;
export const BV_MAX = 2.0;

/**
 * Inverse of the Ballesteros (2012) B–V → temperature relation that `render-stars`
 * uses forward for its blackbody LUT (`bvToTemperature`):
 *
 *   T = 4600·(1/(0.92·bv + 1.7) + 1/(0.92·bv + 0.62))
 *
 * Solving for x = 0.92·bv gives a quadratic k·x² + (2.32k−2)·x + (1.054k−2.32) = 0
 * with k = T/4600; the physical root is the larger one. Clamped to [-0.4, 2.0] so
 * the colour stays inside the LUT domain (the IMF tails run hotter/cooler than the
 * relation is valid for). Ballesteros, F. J. 2012, EPL 97, 34008.
 */
export function teffToColorBV(teffK: number): number {
  const k = teffK / 4600;
  const a = k;
  const b = 2.32 * k - 2;
  const c = 1.054 * k - 2.32;
  const disc = b * b - 4 * a * c;
  const x = (-b + Math.sqrt(disc)) / (2 * a);
  const bv = x / 0.92;
  return Math.min(BV_MAX, Math.max(BV_MIN, bv));
}

/** Mass → B–V colour index via T_eff then the inverse Ballesteros relation. */
export function massToColorBV(massSolar: number): number {
  return teffToColorBV(massToTeff(massSolar));
}

/**
 * Absolute visual magnitude via mass–luminosity L = (M/M☉)^3.5 L☉ and
 * M_V = 4.83 − 2.5·log10(L/L☉) = 4.83 − 8.75·log10(M/M☉) (ADR-004 §4).
 */
export function massToAbsMag(massSolar: number): number {
  return 4.83 - 8.75 * Math.log10(massSolar);
}
