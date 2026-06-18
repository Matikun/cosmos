// Fragment shader for the galaxy particle cloud.
// Same pipeline as render-stars with an added uOpacity uniform for
// LOD cross-fades (§5.8 ~0.3 s fades driven by the caller).
export const FRAG = /* glsl */ `
uniform sampler2D uBvLut;
uniform float uExposure;
uniform float uOpacity;
uniform float uScaleLengthPc;
uniform float uArmCount;
uniform float uArmPitchRad;
uniform float uArmWindings;
uniform float uArmWidthPc;
uniform float uDustStrength;

varying float vApparentMag;
varying float vBV;
varying float vRadiusPc;
varying float vPhi;

const float PI = 3.14159265;
const float TWO_PI = 6.2831853;

// Population tint: warm bulge → cool spiral disc (parsecs, galaxy-local xy plane).
const float POP_TINT_LO_PC = 800.0;
const float POP_TINT_HI_PC = 5500.0;
const vec3 WARM_BULGE = vec3(1.0, 0.78, 0.48);
const vec3 COOL_DISC = vec3(0.68, 0.80, 1.0);

float wrapPi(float angle) {
  angle = mod(angle + PI, TWO_PI) - PI;
  return angle;
}

float armPhase(float r) {
  return (uArmWindings * log(r / uScaleLengthPc + 1.0)) / tan(uArmPitchRad);
}

// ADR-004 §3 dust: darken stars on the inner flank of each log-spiral arm.
float dustLaneFactor(float phi, float r) {
  if (r < 500.0) return 0.0;
  float base = armPhase(r);
  float denom = 2.0 * uArmWidthPc * uArmWidthPc;
  float bestG = 0.0;
  float signedArc = 0.0;
  for (int a = 0; a < 4; a++) {
    if (float(a) >= uArmCount) break;
    float center = base + TWO_PI * float(a) / uArmCount;
    float d = r * wrapPi(phi - center);
    float g = exp(-(d * d) / denom);
    if (g > bestG) {
      bestG = g;
      signedArc = d;
    }
  }
  float flank = bestG * smoothstep(-uArmWidthPc * 0.85, -uArmWidthPc * 0.05, signedArc);
  return flank * uDustStrength;
}

void main() {
  float alpha = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
  float brightness = clamp(pow(10.0, -0.4 * vApparentMag), 0.0, 1.0) * uExposure;
  float lutU = (vBV + 0.4) / 2.4;
  vec3 starRgb = texture2D(uBvLut, vec2(lutU, 0.5)).rgb;
  float popT = smoothstep(POP_TINT_LO_PC, POP_TINT_HI_PC, vRadiusPc);
  vec3 popTint = mix(WARM_BULGE, COOL_DISC, popT);
  float popWeight = mix(0.70, 0.40, popT);
  vec3 color = mix(starRgb, popTint, popWeight);

  float dust = dustLaneFactor(vPhi, vRadiusPc);
  color = mix(color, color * vec3(0.55, 0.45, 0.38), dust * 0.85);
  brightness *= 1.0 - dust * 0.72;

  gl_FragColor = vec4(color * brightness, alpha * uOpacity);
}
`;
