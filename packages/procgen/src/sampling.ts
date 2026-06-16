/**
 * Spatial sampling primitives — ADR-004 §2 (radial/vertical/bulge profiles) and §3
 * (log-spiral arms via rejection sampling). Every function is a pure function of a
 * uniform draw (or a `next: () => number` for the rejection loop), so they are
 * exercised directly by `sampling.test.ts`.
 */

const TWO_PI = 2 * Math.PI;

// atanh blows up at ±1; clamp the argument a hair inside the domain so an exact
// u = 0 (which createPrng can emit) yields a finite z instead of ±Infinity.
const ATANH_EPS = 1e-9;

/**
 * Disc radius by inverse-CDF of the exponential surface density p(r) ∝ exp(−r/L)
 * truncated at `radiusPc` (ADR-004 §2). Result lies in [0, radiusPc]. A uniform
 * histogram of returned radii falls off as exp(−r/L).
 */
export function sampleDiscRadius(u: number, scaleLengthPc: number, radiusPc: number): number {
  const truncation = 1 - Math.exp(-radiusPc / scaleLengthPc);
  return -scaleLengthPc * Math.log(1 - u * truncation);
}

/**
 * Vertical offset of a sech²-disc by inverse-CDF: z = h·atanh(2u−1)/2 (ADR-004 §2).
 */
export function sampleDiscHeight(u: number, scaleHeightPc: number): number {
  const arg = Math.max(-1 + ATANH_EPS, Math.min(1 - ATANH_EPS, 2 * u - 1));
  return (scaleHeightPc * Math.atanh(arg)) / 2;
}

/**
 * Plummer-like bulge radius r = R_b·√(u^(−2/3) − 1), clamped to `maxRadiusPc`
 * (ADR-004 §2). Spherically distributed by the caller.
 */
export function sampleBulgeRadius(u: number, bulgeRadiusPc: number, maxRadiusPc: number): number {
  const r = bulgeRadiusPc * Math.sqrt(Math.pow(u, -2 / 3) - 1);
  return Math.min(r, maxRadiusPc);
}

/** Arm geometry needed by the azimuth sampler (resolved defaults, ADR-004 §1/§3). */
export interface ArmParams {
  readonly scaleLengthPc: number;
  readonly armCount: number;
  readonly armPitchRad: number;
  readonly armWindings: number;
  readonly armWidthPc: number;
  readonly armContrast: number;
}

/**
 * Log-spiral arm phase θ_arm(r) = windings·ln(r/L + 1)/tan(pitch) (ADR-004 §3).
 */
export function armPhase(r: number, p: ArmParams): number {
  return (p.armWindings * Math.log(r / p.scaleLengthPc + 1)) / Math.tan(p.armPitchRad);
}

/** Wrap an angle to [−π, π]. */
function wrapPi(angle: number): number {
  let a = angle % TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  else if (a < -Math.PI) a += TWO_PI;
  return a;
}

/**
 * Angular density modulation m(φ, r) = 1 + (contrast−1)·Σ_a exp(−d_a²/(2σ²))
 * (ADR-004 §3). d_a is the arc-length distance r·Δφ from φ to arm a's centre
 * (θ_arm + 2π·a/armCount), σ = armWidthPc. Range [1, contrast].
 */
export function armDensity(phi: number, r: number, p: ArmParams): number {
  const base = armPhase(r, p);
  const denom = 2 * p.armWidthPc * p.armWidthPc;
  let sum = 0;
  for (let a = 0; a < p.armCount; a++) {
    const center = base + (TWO_PI * a) / p.armCount;
    const d = r * wrapPi(phi - center);
    sum += Math.exp(-(d * d) / denom);
  }
  return 1 + (p.armContrast - 1) * sum;
}

/**
 * Rejection-sample an azimuth φ ∈ [0, 2π) for a disc star at radius r (ADR-004 §3).
 * Envelope ceiling is `armContrast` (the analytic max of m). Caps at 64 attempts
 * and accepts the last candidate on overflow, guaranteeing termination even for a
 * degenerate `armContrast`. `next` supplies uniform draws in [0, 1) — pass a PRNG's
 * `next` directly to avoid per-call allocation.
 */
export function sampleArmAzimuth(next: () => number, r: number, p: ArmParams): number {
  let phi = 0;
  for (let attempt = 0; attempt < 64; attempt++) {
    phi = next() * TWO_PI;
    const u = next() * p.armContrast;
    if (u < armDensity(phi, r, p)) return phi;
  }
  return phi;
}
