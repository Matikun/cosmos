/**
 * The single Cosmos worker entry (§5.13, TASK-040). The streaming policy
 * dispatches BOTH `procgen.galaxy` and `octree.decode` to one pool, so every
 * pooled worker must serve both methods. This is the ONLY place the §5.13 Vite
 * `new Worker(new URL(...))` syntax points at (see glue/streaming.ts).
 *
 * It imports only `serveWorker` + the two PURE handlers — no Three.js, no React,
 * no `coords`. The handlers produce raw `StarBatch` buffers that are transferred
 * (not cloned) back to the main thread.
 */
import { serveWorker } from '@cosmos/workers';
import { galaxyWorkerHandler } from '@cosmos/procgen';
import { octreeDecodeHandler } from '@cosmos/data';

serveWorker({
  'procgen.galaxy': galaxyWorkerHandler,
  'octree.decode': octreeDecodeHandler,
});
