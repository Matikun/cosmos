import { describe, it, expect } from 'vitest';
import {
  projectedPixelExtent,
  pointSpacing,
  screenSpaceError,
  STREAM_TAN_HALF_FOV,
} from '../src/index.js';

describe('projectedPixelExtent', () => {
  it('shrinks with distance (closer ⇒ larger on screen)', () => {
    const near = projectedPixelExtent(10, 100, 1080, STREAM_TAN_HALF_FOV);
    const far = projectedPixelExtent(10, 1000, 1080, STREAM_TAN_HALF_FOV);
    expect(near).toBeGreaterThan(far);
    expect(near / far).toBeCloseTo(10, 5); // 10× closer ⇒ 10× bigger
  });

  it('scales with viewport height', () => {
    const a = projectedPixelExtent(10, 100, 1080, STREAM_TAN_HALF_FOV);
    const b = projectedPixelExtent(10, 100, 540, STREAM_TAN_HALF_FOV);
    expect(a).toBeCloseTo(2 * b, 5);
  });

  it('returns Infinity at non-positive distance', () => {
    expect(projectedPixelExtent(10, 0, 1080, STREAM_TAN_HALF_FOV)).toBe(Infinity);
  });
});

describe('pointSpacing', () => {
  it('is cbrt(pointCount), floored at 1', () => {
    expect(pointSpacing(27)).toBeCloseTo(3, 10);
    expect(pointSpacing(1)).toBe(1);
    expect(pointSpacing(0)).toBe(1);
  });
});

describe('screenSpaceError', () => {
  it('is pixel extent per point-spacing', () => {
    expect(screenSpaceError(30, 27)).toBeCloseTo(10, 10); // 30px / cbrt(27)=3
  });
  it('rises as the node projects larger', () => {
    expect(screenSpaceError(60, 27)).toBeGreaterThan(screenSpaceError(30, 27));
  });
});
