import { describe, expect, it } from 'vitest';
import {
  SYSTEMS_PACK_FORMAT_VERSION,
  BOOKMARKS_SCHEMA_VERSION,
} from '../src/index';
import type { SystemsPackManifest, StarSystemRecord } from '../src/systems';

describe('SYSTEMS_PACK_FORMAT_VERSION', () => {
  it('equals 1', () => {
    expect(SYSTEMS_PACK_FORMAT_VERSION).toBe(1);
  });
});

describe('BOOKMARKS_SCHEMA_VERSION', () => {
  it('equals 1', () => {
    expect(BOOKMARKS_SCHEMA_VERSION).toBe(1);
  });
});

describe('SystemsPackManifest shape', () => {
  const validSystem: StarSystemRecord = {
    id: 'sol',
    name: 'Solar System',
    star: {
      id: 'hyg:0',
      kind: 'star',
      name: 'Sol',
      positionPc: [0, 0, 0],
      absMag: 4.83,
      colorIndexBV: 0.65,
    },
    bodies: [
      {
        id: 'sol:earth',
        kind: 'planet',
        name: 'Earth',
        parentId: 'hyg:0',
        radiusKm: 6371,
        rotationPeriodH: 23.934,
        axialTiltRad: 0.4091,
        elements: {
          semiMajorAxisAu: 1.0,
          eccentricity: 0.0167,
          inclinationRad: 0.0,
          ascendingNodeLongitudeRad: 0.0,
          argumentOfPeriapsisRad: 1.7968,
          meanAnomalyAtEpochRad: 6.24,
          epochJD: 2451545.0,
          muKm3S2: 1.327124e11,
        },
      },
    ],
  };

  it('accepts a valid SystemsPackManifest literal', () => {
    const manifest: SystemsPackManifest = {
      packFormatVersion: SYSTEMS_PACK_FORMAT_VERSION,
      source: 'jpl-approx-pos-1800-2050',
      generatedAtIso: '2024-01-01T00:00:00Z',
      systems: [validSystem],
    };
    expect(manifest.packFormatVersion).toBe(1);
    expect(manifest.systems).toHaveLength(1);
  });

  it('compile-time: wrong packFormatVersion is rejected', () => {
    const _bad: SystemsPackManifest = {
      // @ts-expect-error packFormatVersion must be typeof SYSTEMS_PACK_FORMAT_VERSION (1), not 2
      packFormatVersion: 2,
      source: 'test',
      generatedAtIso: '2024-01-01T00:00:00Z',
      systems: [],
    };
    void _bad;
  });

  it('compile-time: missing star is rejected', () => {
    // @ts-expect-error star is required on StarSystemRecord
    const _bad: StarSystemRecord = {
      id: 'sol',
      name: 'Solar System',
      bodies: [],
    };
    void _bad;
  });

  it('compile-time: mutating a readonly field is rejected', () => {
    const manifest: SystemsPackManifest = {
      packFormatVersion: SYSTEMS_PACK_FORMAT_VERSION,
      source: 'test',
      generatedAtIso: '2024-01-01T00:00:00Z',
      systems: [],
    };
    // @ts-expect-error source is readonly
    manifest.source = 'other';
    void manifest;
  });
});
