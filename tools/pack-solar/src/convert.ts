import type { KeplerElements, PlanetRecord, StarRecord, StarSystemRecord, SystemsPackManifest } from '@cosmos/core-types';
import { SYSTEMS_PACK_FORMAT_VERSION } from '@cosmos/core-types';
import type { SourceData } from './schema.js';

const DEG_TO_RAD = Math.PI / 180;

/** 1 AU in km (IERS 2012) — same constant used in @cosmos/orbits. */
const AU_KM = 1.495978707e8;

/** Seconds in one Julian century (36525 Julian days × 86400 s/day). */
const SECONDS_PER_CENTURY = 36525 * 86400;

/** J2000.0 epoch Julian Date. */
const J2000_JD = 2451545.0;

/** Normalize angle to the half-open interval (−π, π]. */
function normAngle(rad: number): number {
  const TWO_PI = 2 * Math.PI;
  let a = rad % TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  else if (a <= -Math.PI) a += TWO_PI;
  return a;
}

/**
 * Convert a JPL Table 1 planet entry to KeplerElements.
 *
 * Effective μ: n is derived from the table's Ldot rate (deg/century) via
 *   n = Ldot * (π/180) / (36525 * 86400)   [rad/s]
 *   μ = n² * a³                             [km³/s², a in km]
 * This bakes the secular mean motion into Kepler's third law so propagation
 * matches JPL rates without storing secular drift terms. Do NOT use the Sun's
 * GM here — each planet's μ encodes its own mean motion from the table.
 *
 * Angles derived in degrees at this boundary, converted once (§5.5):
 *   ω = ϖ − Ω   (argument of periapsis from longitude of perihelion)
 *   M₀ = L − ϖ  (mean anomaly at J2000 from mean longitude)
 */
function planetElements(p: SourceData['jplTable1'][number]): KeplerElements {
  const omega_deg = p.long_peri - p.node;
  const M0_deg = p.L - p.long_peri;

  const n = (p.Ldot * DEG_TO_RAD) / SECONDS_PER_CENTURY;
  const aKm = p.a * AU_KM;
  const muKm3S2 = n * n * aKm * aKm * aKm;

  return {
    semiMajorAxisAu: p.a,
    eccentricity: p.e,
    inclinationRad: normAngle(p.I * DEG_TO_RAD),
    ascendingNodeLongitudeRad: normAngle(p.node * DEG_TO_RAD),
    argumentOfPeriapsisRad: normAngle(omega_deg * DEG_TO_RAD),
    meanAnomalyAtEpochRad: normAngle(M0_deg * DEG_TO_RAD),
    epochJD: J2000_JD,
    muKm3S2,
  };
}

/**
 * Convert moon orbital data to KeplerElements.
 * Moon semi-major axis is given in km and converted to AU here (§5.5).
 * μ is the parent planet's GM (not the Sun's).
 * Ω = ω = M₀ = 0 — accepted Phase 2 approximation (task §5.7).
 */
function moonElements(m: SourceData['moonsTable'][number], parentGmKm3S2: number): KeplerElements {
  return {
    semiMajorAxisAu: m.aKm / AU_KM,
    eccentricity: m.e,
    inclinationRad: m.iDeg * DEG_TO_RAD,
    ascendingNodeLongitudeRad: 0,
    argumentOfPeriapsisRad: 0,
    meanAnomalyAtEpochRad: 0,
    epochJD: J2000_JD,
    muKm3S2: parentGmKm3S2,
  };
}

function buildSolDisc(): PlanetRecord {
  return {
    id: 'sol:sun',
    kind: 'planet',
    name: 'Sun',
    parentId: 'hyg:0',
    radiusKm: 695700,
    rotationPeriodH: 609.12,
    unlit: true,
    textures: { albedoUrl: '../textures/sol/sun.ktx2' },
  };
}

function buildPlanet(
  entry: SourceData['jplTable1'][number],
  phys: SourceData['physicalTable'][number],
  saturnRing: SourceData['saturnRing'],
): PlanetRecord {
  const elements = planetElements(entry);
  const albedoUrl = `../textures/sol/${entry.slug}.ktx2`;

  if (entry.id === 'sol:saturn') {
    return {
      id: entry.id,
      kind: 'planet',
      name: entry.name,
      parentId: 'hyg:0',
      radiusKm: phys.radiusKm,
      elements,
      rotationPeriodH: phys.rotationPeriodH,
      axialTiltRad: phys.axialTiltDeg * DEG_TO_RAD,
      textures: { albedoUrl, ringUrl: '../textures/sol/saturn_ring.ktx2' },
      ring: { innerRadiusKm: saturnRing.innerRadiusKm, outerRadiusKm: saturnRing.outerRadiusKm },
    };
  }

  return {
    id: entry.id,
    kind: 'planet',
    name: entry.name,
    parentId: 'hyg:0',
    radiusKm: phys.radiusKm,
    elements,
    rotationPeriodH: phys.rotationPeriodH,
    axialTiltRad: phys.axialTiltDeg * DEG_TO_RAD,
    textures: { albedoUrl },
  };
}

function buildMoon(
  moon: SourceData['moonsTable'][number],
  parentGmKm3S2: number,
): PlanetRecord {
  const elements = moonElements(moon, parentGmKm3S2);

  // Tidally locked: rotation period equals orbital period = 2π / n (in hours)
  const n = Math.sqrt(parentGmKm3S2 / (moon.aKm * moon.aKm * moon.aKm));
  const rotationPeriodH = (2 * Math.PI / n) / 3600;

  if (moon.slug !== undefined) {
    return {
      id: moon.id,
      kind: 'planet',
      name: moon.name,
      parentId: moon.parentId,
      radiusKm: moon.radiusKm,
      elements,
      rotationPeriodH,
      axialTiltRad: 0,
      textures: { albedoUrl: `../textures/sol/${moon.slug}.ktx2` },
    };
  }

  return {
    id: moon.id,
    kind: 'planet',
    name: moon.name,
    parentId: moon.parentId,
    radiusKm: moon.radiusKm,
    elements,
    rotationPeriodH,
    axialTiltRad: 0,
    surfaceColorLinear: moon.surfaceColorLinear as [number, number, number],
  };
}

/** Build the SystemsPackManifest from the validated source data. Pure — no I/O. */
export function buildPack(source: SourceData): SystemsPackManifest {
  const bodies: PlanetRecord[] = [];

  bodies.push(buildSolDisc());

  for (const entry of source.jplTable1) {
    const phys = source.physicalTable.find((x) => x.id === entry.id);
    if (phys === undefined) throw new Error(`No physical data for ${entry.id}`);
    bodies.push(buildPlanet(entry, phys, source.saturnRing));
  }

  for (const moon of source.moonsTable) {
    const parentGm = source.parentGm[moon.parentId];
    if (parentGm === undefined) throw new Error(`No parent GM for ${moon.parentId}`);
    bodies.push(buildMoon(moon, parentGm));
  }

  const star: StarRecord = {
    id: 'hyg:0',
    kind: 'star',
    name: 'Sol',
    positionPc: [0, 0, 0],
    absMag: 4.83,
    colorIndexBV: 0.65,
  };

  const system: StarSystemRecord = {
    id: 'sol',
    name: 'Sol',
    star,
    bodies,
  };

  return {
    packFormatVersion: SYSTEMS_PACK_FORMAT_VERSION,
    source: 'jpl-approx-pos-1800-2050',
    generatedAtIso: source.generatedAtIso,
    systems: [system],
  };
}
