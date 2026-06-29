import { defineConfig } from 'vitest/config';

/**
 * App-level unit tests (TASK-058 / BUG-8). Scoped to `src/glue/**` — the pure app
 * glue (octree combine, etc.) that has no DOM/Three dependency — so the node env is
 * enough and the React scene tree is never imported. The full app is covered by the
 * e2e suite, not here.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/glue/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/glue/octree-combined.ts'],
      thresholds: {
        statements: 90,
      },
    },
  },
});
