import type { ContextId, QualityTier } from '@cosmos/core-types';
import type { FlightController } from '@cosmos/nav';
import type { StreamingPolicy } from '@cosmos/streaming';

/**
 * E2E/dev test hook (TASK-015 → extended for TASK-029 M2). Event-driven mirrors
 * of app state — written only from store subscriptions, goTo lifecycle events,
 * context switches, and the ≤ 4 Hz display timer; NEVER from a frame callback.
 * Read by e2e/tests/m1.spec.ts and m2.spec.ts; harmless in production.
 */
export interface CosmosTestHook {
  ready: boolean;
  goToActive: boolean;
  selectedId: string | null;
  /** Active scale context, mirrored from the flight controller. */
  contextId: ContextId;
  /** System the camera is inside, or null in 'galaxy' context. */
  anchorSystemId: string | null;
  epochJD: number;
  /** Absolute camera position in its current context (snapshot, not live). */
  cameraPosition: {
    readonly context: ContextId;
    readonly local: readonly [number, number, number];
  };
  /** §5.8 streaming instrumentation (TASK-040), mirrored ≤ 4 Hz from `stats`. */
  streaming: {
    inFlight: number;
    loadedChunks: number;
    renderedPoints: number;
    drawCalls: number;
  };
  /** Active adaptive quality tier (TASK-040), mirrored from `qc.onChange`. */
  qualityTier: QualityTier;
}

export const testHook: CosmosTestHook = {
  ready: false,
  goToActive: false,
  selectedId: null,
  contextId: 'galaxy',
  anchorSystemId: null,
  epochJD: 2451545.0,
  cameraPosition: { context: 'galaxy', local: [0, 0, 0] },
  streaming: { inFlight: 0, loadedChunks: 0, renderedPoints: 0, drawCalls: 0 },
  qualityTier: 'high',
};

/**
 * Module-scoped holder for the live streaming policy (created in App once the
 * octree pack loads). The ≤ 4 Hz display timer reads `stats` through it — never
 * a frame callback.
 */
export const streamingHolder: { current: StreamingPolicy | null } = {
  current: null,
};

/** Mirror low-frequency streaming stats into the test hook (≤ 4 Hz, §5.8). */
export function mirrorStreamingStats(): void {
  const s = streamingHolder.current;
  if (!s) return;
  const st = s.stats;
  testHook.streaming.inFlight = st.inFlight;
  testHook.streaming.loadedChunks = st.loadedChunks;
  testHook.streaming.renderedPoints = st.renderedPoints;
  testHook.streaming.drawCalls = st.drawCalls;
}

/**
 * Module-scoped holder for the live flight controller. The controller is created
 * inside the Canvas (NavDriver); the time-glue display timer and event handlers
 * reach it through this holder at low frequency only.
 */
export const controllerHolder: { current: FlightController | null } = {
  current: null,
};

/** Mirror low-frequency controller state into the test hook (≤ 4 Hz / on events). */
export function mirrorControllerState(): void {
  const c = controllerHolder.current;
  if (!c) return;
  testHook.goToActive = c.goToActive;
  testHook.contextId = c.contextId;
  testHook.anchorSystemId =
    c.contextId === 'system' ? c.systemAnchor?.id ?? null : null;
  const p = c.state.position;
  testHook.cameraPosition = {
    context: p.context,
    local: [p.local[0], p.local[1], p.local[2]],
  };
}

declare global {
  interface Window {
    __cosmos?: CosmosTestHook;
  }
}

if (typeof window !== 'undefined') {
  window.__cosmos = testHook;
}
