import { describe, expect, it } from 'vitest';
import { STAR_PACK_FORMAT_VERSION } from '../src/packs';
import type { StarPackManifest, StarBatch, BufferSlice } from '../src/index';

describe('STAR_PACK_FORMAT_VERSION', () => {
  it('equals 1', () => {
    expect(STAR_PACK_FORMAT_VERSION).toBe(1);
  });
});

describe('StarPackManifest shape', () => {
  it('accepts a valid manifest literal', () => {
    const slice: BufferSlice = { byteOffset: 0, byteLength: 12 };
    const manifest: StarPackManifest = {
      packFormatVersion: STAR_PACK_FORMAT_VERSION,
      source: 'hyg-v41',
      contentHashSha256: 'ab'.repeat(32),
      count: 3,
      binUrl: 'stars.abcd1234.bin',
      namesUrl: 'names.json',
      originPc: [0, 0, 0],
      buffers: {
        positionsPc: { byteOffset: 0, byteLength: 36 },
        absMag: slice,
        colorIndexBV: slice,
        catalogIds: slice,
        hipIds: slice,
      },
    };
    expect(manifest.packFormatVersion).toBe(1);
    expect(manifest.count).toBe(3);
  });

  it('compile-time: wrong packFormatVersion is rejected', () => {
    const _bad: StarPackManifest = {
      // @ts-expect-error packFormatVersion must be typeof STAR_PACK_FORMAT_VERSION (1), not 2
      packFormatVersion: 2,
      source: 'hyg-v41',
      contentHashSha256: 'ab'.repeat(32),
      count: 1,
      binUrl: 'stars.bin',
      namesUrl: 'names.json',
      originPc: [0, 0, 0],
      buffers: {
        positionsPc: { byteOffset: 0, byteLength: 12 },
        absMag: { byteOffset: 12, byteLength: 4 },
        colorIndexBV: { byteOffset: 16, byteLength: 4 },
        catalogIds: { byteOffset: 20, byteLength: 4 },
        hipIds: { byteOffset: 24, byteLength: 4 },
      },
    };
    void _bad;
  });

  it('compile-time: missing buffer slice is rejected', () => {
    const _bad: StarPackManifest = {
      packFormatVersion: STAR_PACK_FORMAT_VERSION,
      source: 'hyg-v41',
      contentHashSha256: 'ab'.repeat(32),
      count: 1,
      binUrl: 'stars.bin',
      namesUrl: 'names.json',
      originPc: [0, 0, 0],
      // @ts-expect-error buffers.hipIds is missing
      buffers: {
        positionsPc: { byteOffset: 0, byteLength: 12 },
        absMag: { byteOffset: 12, byteLength: 4 },
        colorIndexBV: { byteOffset: 16, byteLength: 4 },
        catalogIds: { byteOffset: 20, byteLength: 4 },
      },
    };
    void _bad;
  });

  it('compile-time: mutating a readonly field is rejected', () => {
    const manifest: StarPackManifest = {
      packFormatVersion: STAR_PACK_FORMAT_VERSION,
      source: 'hyg-v41',
      contentHashSha256: 'ab'.repeat(32),
      count: 3,
      binUrl: 'stars.bin',
      namesUrl: 'names.json',
      originPc: [0, 0, 0],
      buffers: {
        positionsPc: { byteOffset: 0, byteLength: 36 },
        absMag: { byteOffset: 36, byteLength: 12 },
        colorIndexBV: { byteOffset: 48, byteLength: 12 },
        catalogIds: { byteOffset: 60, byteLength: 12 },
        hipIds: { byteOffset: 72, byteLength: 12 },
      },
    };
    // @ts-expect-error count is readonly
    manifest.count = 99;
    void manifest;
  });
});

describe('StarBatch shape', () => {
  it('accepts a valid StarBatch', () => {
    const batch: StarBatch = {
      count: 2,
      originPc: [0, 0, 0],
      positionsPc: new Float32Array(6),
      absMag: new Float32Array(2),
      colorIndexBV: new Float32Array(2),
      catalogIds: new Uint32Array(2),
      hipIds: new Uint32Array(2),
      idPrefix: 'hyg',
    };
    expect(batch.count).toBe(2);
    expect(batch.idPrefix).toBe('hyg');
  });
});
