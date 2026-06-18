// Fragment shader for spiral-arm glow billboards (dust lanes / HII regions).
// Blending is AdditiveBlending, so each billboard ADDS a soft glow over the
// star cloud. uGlowColor selects the tint (cool blue for arm hints, magenta
// for HII knots). uOpacity rides in alpha and fades/hides the layer cleanly.
export const FRAG = /* glsl */ `
uniform sampler2D uDustTexture;
uniform float uOpacity;
uniform vec3 uGlowColor;

varying vec2 vUv;

void main() {
  float coverage = texture2D(uDustTexture, vUv).a;
  gl_FragColor = vec4(uGlowColor, coverage * uOpacity);
}
`;
