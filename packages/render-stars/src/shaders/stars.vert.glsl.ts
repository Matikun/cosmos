// Vertex shader for the star point-sprite field (§5.9).
// Three.js built-ins used: projectionMatrix (mat4), viewMatrix (mat4).
// Positions are tile-local parsecs; the tile origin's camera-relative position
// (also parsecs) is supplied as an emulated-double pair uRenderOffsetHi/Lo —
// their sum is the star's camera-relative position in WORLD axes.
//
// Why hi/lo: both `position` (≤ tile half-extent, up to ~32 pc) and the offset
// are large and nearly cancel up close. A single-f32 `position + offset` rounds
// to ~ULP(32 pc) ≈ 0.8 AU steps that shift as the camera moves → visible jitter
// within a few AU of a star (docs/research/star-approach-jitter.md). With the
// offset split, `position + offHi` is an exact f32 subtraction (Sterbenz: same-
// magnitude, opposite-sign operands) and offLo refines it, so the per-frame term
// no longer re-quantizes. The camera's render-space position is identically zero
// (floating origin, ADR-001), so view space is reached by applying only the
// rotational part of viewMatrix.
export const VERT = /* glsl */ `
uniform vec3 uRenderOffsetHi;
uniform vec3 uRenderOffsetLo;
uniform float uBasePointPx;
uniform float uMinPointPx;
uniform float uMaxPointPx;
uniform float uPixelScale;

attribute float aAbsMag;
attribute float aColorBV;

varying float vApparentMag;
varying float vBV;

void main() {
  vec3 viewPos = mat3(viewMatrix) * ((position + uRenderOffsetHi) + uRenderOffsetLo);
  float dPc = max(length(viewPos), 0.001);
  float m = aAbsMag + 5.0 * (log2(dPc) / log2(10.0) - 1.0);
  gl_PointSize = clamp(
    uBasePointPx * pow(10.0, -0.2 * m),
    uMinPointPx,
    uMaxPointPx
  ) * uPixelScale;
  gl_Position = projectionMatrix * vec4(viewPos, 1.0);
  vApparentMag = m;
  vBV = aColorBV;
}
`;
