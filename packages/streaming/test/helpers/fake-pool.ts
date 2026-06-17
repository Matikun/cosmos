import type {
  WorkerPool,
  WorkerMethod,
  WorkerMethodParams,
  DispatchOptions,
  CancelToken,
} from '@cosmos/workers';
import { WorkerCancelledError } from '@cosmos/workers';
import type { OctreeTileManifest, ProcgenGalaxyRequest, StarBatch } from '@cosmos/core-types';
import { galaxyWorkerHandler } from '@cosmos/procgen';

export interface FakeDispatch {
  method: WorkerMethod;
  params: WorkerMethodParams[WorkerMethod];
  cancelled: boolean;
}

export interface FakePool extends WorkerPool {
  readonly dispatches: FakeDispatch[];
  /** Resolve every currently-held dispatch (decoding octree tiles / generating galaxies). */
  flush(): void;
  /** Count of dispatches still held (in-flight on the worker side). */
  readonly held: number;
}

interface Held {
  record: FakeDispatch;
  resolve: (b: StarBatch) => void;
  reject: (e: unknown) => void;
  token: CancelToken | undefined;
  onCancel: (() => void) | undefined;
}

interface OctreeDecodeParams {
  tile: OctreeTileManifest;
  idPrefix: string;
  bin: ArrayBuffer;
}

/** Replicates @cosmos/data's decodeTile without deep-importing it (boundary-lint clean). */
function decode(p: OctreeDecodeParams): StarBatch {
  const { tile, bin } = p;
  const b = tile.buffers;
  return {
    count: tile.pointCount,
    originPc: tile.centerUnits,
    positionsPc: new Float32Array(bin, b.positionsPc.byteOffset, b.positionsPc.byteLength / 4),
    absMag: new Float32Array(bin, b.absMag.byteOffset, b.absMag.byteLength / 4),
    colorIndexBV: new Float32Array(bin, b.colorIndexBV.byteOffset, b.colorIndexBV.byteLength / 4),
    catalogIds: new Uint32Array(bin, b.catalogIds.byteOffset, b.catalogIds.byteLength / 4),
    hipIds: new Uint32Array(bin, b.hipIds.byteOffset, b.hipIds.byteLength / 4),
    idPrefix: p.idPrefix,
  };
}

/**
 * Deterministic fake WorkerPool: every dispatch is HELD until `flush()` is called,
 * so tests script exactly when batches become ready. Cancellation (token abort) is
 * recorded on the dispatch, mirroring the real pool's worker-side cancellation.
 */
export function createFakePool(): FakePool {
  const dispatches: FakeDispatch[] = [];
  const heldList: Held[] = [];

  return {
    size: 4,
    get inFlight() {
      return heldList.length;
    },
    get held() {
      return heldList.length;
    },
    dispatches,

    dispatch(
      method: WorkerMethod,
      params: WorkerMethodParams[WorkerMethod],
      opts?: DispatchOptions,
    ): Promise<StarBatch> {
      const record: FakeDispatch = { method, params, cancelled: false };
      dispatches.push(record);

      return new Promise<StarBatch>((resolve, reject) => {
        const token = opts?.token;
        if (token?.cancelled) {
          record.cancelled = true;
          reject(new WorkerCancelledError());
          return;
        }
        const held: Held = { record, resolve, reject, token, onCancel: undefined };
        const onCancel = (): void => {
          record.cancelled = true;
          const i = heldList.indexOf(held);
          if (i >= 0) heldList.splice(i, 1);
          reject(new WorkerCancelledError());
        };
        held.onCancel = onCancel;
        token?.signal.addEventListener('abort', onCancel, { once: true });
        heldList.push(held);
      });
    },

    flush() {
      const batch = heldList.splice(0, heldList.length);
      for (const h of batch) {
        if (h.token) h.token.signal.removeEventListener('abort', h.onCancel!);
        if (h.token?.cancelled) {
          h.record.cancelled = true;
          h.reject(new WorkerCancelledError());
          continue;
        }
        try {
          if (h.record.method === 'octree.decode') {
            h.resolve(decode(h.record.params as unknown as OctreeDecodeParams));
          } else {
            const { batch: b } = galaxyWorkerHandler(
              h.record.params as ProcgenGalaxyRequest,
              () => false,
            );
            h.resolve(b);
          }
        } catch (err) {
          h.reject(err);
        }
      }
    },

    dispose() {
      heldList.length = 0;
    },
  };
}
