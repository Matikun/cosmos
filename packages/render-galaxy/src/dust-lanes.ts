import * as THREE from 'three';
import { VERT } from './shaders/dust.vert.glsl.js';
import { FRAG } from './shaders/dust.frag.glsl.js';

export interface DustLanesOptions {
  readonly centersUnits: Float32Array;
  readonly radiiUnits: Float32Array;
  readonly dustTexture: THREE.Texture;
  /** Additive glow rgb; default cool-blue arm tint. */
  readonly glowColor?: readonly [number, number, number];
}

export interface DustLanes {
  readonly object: THREE.Object3D;
  setRenderOffset(offsetUnits: readonly [number, number, number]): void;
  setOpacity(a: number): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export function createDustLanes(opts: DustLanesOptions): DustLanes {
  const { centersUnits, radiiUnits, dustTexture, glowColor = [0.55, 0.68, 1.0] } = opts;
  const count = radiiUnits.length;

  // Unit quad; billboard expansion happens in the vertex shader.
  const geometry = new THREE.PlaneGeometry(1, 1);
  // Per-instance center and radius — set once, never reallocated.
  geometry.setAttribute('aCenterUnits', new THREE.InstancedBufferAttribute(centersUnits, 3));
  geometry.setAttribute('aRadius', new THREE.InstancedBufferAttribute(radiiUnits, 1));

  const uniforms = {
    uRenderOffset: { value: new THREE.Vector3(0, 0, 0) },
    uDustTexture: { value: dustTexture },
    uOpacity: { value: 1.0 },
    uGlowColor: { value: new THREE.Vector3(...glowColor) },
  };

  // AdditiveBlending: each billboard adds a soft cool-blue glow tracing the
  // spiral arms (the dominant "this is a spiral galaxy" cue). Occlusion
  // (MultiplyBlending) was tried but is invisible over the sparse point cloud —
  // multiplying the black gaps between stars stays black, so it could only dim
  // the dense core, never define the arms. uOpacity rides in the fragment alpha
  // (additive scales the contribution by src.a), so the layer fades/hides cleanly.
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count);

  let disposed = false;

  return {
    object: mesh,

    setRenderOffset([x, y, z]: readonly [number, number, number]): void {
      const v = uniforms.uRenderOffset.value;
      v.x = x;
      v.y = y;
      v.z = z;
    },

    setOpacity(a: number): void {
      uniforms.uOpacity.value = a;
    },

    setVisible(visible: boolean): void {
      mesh.visible = visible;
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
      // dustTexture is injected by the caller — never dispose it here.
    },
  };
}
