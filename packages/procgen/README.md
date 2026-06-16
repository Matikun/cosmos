# @cosmos/procgen

Deterministic, seedable galaxy star generator (architecture §5.6, [ADR-004](../../docs/decisions/ADR-004-galaxy-density-wave.md)). **Every output is a pure function of `(seed, params)`** — it runs byte-identically on the main thread (tests) and in a worker (production). No Three.js, no DOM, no React; imports `@cosmos/core-types` only.

## API

```ts
import { generateGalaxy, galaxyWorkerHandler } from '@cosmos/procgen';

const { batch, layout, buffer } = generateGalaxy({ seed: 1, starCount: 1_000_000 });
```

### `generateGalaxy(params: GalaxyGenParams): GalaxyResult`

Generates a galaxy as a packed [`StarBatch`](../core-types/src/batches.ts). The batch is galaxy-context centred (`originPc = [0,0,0]`), `idPrefix = gal<seed>`, `catalogIds[i] = i`, `hipIds = 0`. Defaults come from `PROCGEN_GALAXY_DEFAULTS`. Allocates **exactly one** backing `ArrayBuffer`; the inner star loop allocates nothing.

`GalaxyResult` is `{ batch, layout, buffer }`:

- `buffer` — the single `ArrayBuffer` every `batch` typed array views (the thing to transfer, §5.13).
- `layout` — JSON-able `GalaxyBufferLayout` describing each attribute's byte slice, in packing order: `positionsPc` (3×count f32), `absMag` (f32), `colorIndexBV` (f32), `catalogIds` (u32), `hipIds` (u32). Every slice is 4-byte aligned.

### `galaxyWorkerHandler(req, isCancelled)`

The §5.13 worker handler, injected into a worker entry's `serveWorker` (this package exports the handler; it does **not** import `@cosmos/workers`). `isCancelled` is polled inside the star loop; on cancel it returns early with `count` = stars drawn so far (the pool discards a cancelled result).

## The model (transcribed from ADR-004 — normative)

All math, parameters and the seed hierarchy are pinned by ADR-004; this package transcribes, it does not invent.

- **Coordinates (§1):** galaxy-context parsecs, disc in x–y, +z north, centred at origin.
- **Radial / vertical (§2):** exponential disc `Σ(r) ∝ exp(−r/L)` by inverse-CDF for `r`; sech²-disc inverse-CDF for `z`; a `bulgeFraction` of stars instead use a Plummer-like spherical bulge.
- **Spiral arms (§3):** log-spiral phase `θ_arm(r)`, angular density modulation with `armCount` arms, **rejection sampling** of `φ` with envelope ceiling `armContrast`, 64-attempt cap then accept-last (guarantees termination).
- **IMF + colour (§4):** [Kroupa (2001)](https://doi.org/10.1046/j.1365-8711.2001.04022.x) broken power law on `[0.1, 50] M☉` by inverse-CDF; `T_eff = 5772·M^0.54`; T→B–V via the **inverse [Ballesteros (2012)](https://doi.org/10.1209/0295-5075/97/34008)** relation — the same relation `@cosmos/render-stars` uses forward for its blackbody LUT, kept consistent; `L = M^3.5`, `M_V = 4.83 − 2.5·log10(L)`.
- **Seeds (§5):** `sectorSeed = hashCombine(galaxySeed, sectorId)`, then `createPrng(sectorSeed).fork(streamId)` for independent placement / mass / jitter streams. Phase 3 generates the galaxy as a single sector (`sectorId = 0`); the per-sector structure exists so `@cosmos/streaming` can later request sub-regions. The jitter stream is forked (hierarchy intact) but unused — §4 derives colour purely from mass. **No `seed + index`** anywhere.

## Determinism doctrine

- `Math.random()` is lint-banned in this package; all entropy flows from `createPrng`/`hashCombine`/`fork`.
- A committed golden SHA-256 of `generateGalaxy({seed:1, starCount:1000}).buffer` ([fixture](test/fixtures/golden-hash.json)) guards against accidental math changes. Regenerate it **only** via a reviewed task — a change there means the model changed.

## Source modules

- `src/galaxy.ts` — `generateGalaxy` + `galaxyWorkerHandler` (packing, seed hierarchy, the star loop).
- `src/sampling.ts` — spatial inverse-CDF + rejection helpers (pure, exported for tests).
- `src/stellar.ts` — IMF sampler + mass→T→B–V→M_V relations (pure, exported for tests).
