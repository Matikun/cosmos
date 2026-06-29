# BUG-8 — `combineOctreeSources` drops the shallower catalog (fixed)

**Status:** FIXED + gated by a deterministic unit test (`apps/web/src/glue/octree-combined.test.ts`,
6 tests, 93% stmt coverage of the file). `pnpm lint && typecheck && test` green.
**Scope:** app glue only (`apps/web/src/glue/octree-combined.ts`); no frozen package touched.
**Supersedes:** the BUG-8 note in `docs/agent-tasks/TASK-052-integration-bugs.md`, whose
"FIXED in working tree, NOT committed" fix was lost — the committed combine was still the
original orphaning version until this commit.

## Symptom

Inside the galaxy the streaming catalog tier is `HYG ∪ Gaia` streamed through one policy
(ADR-006 §5). With the committed 135-star Gaia sample you see HYG but **zero Gaia**. With a
real dense Gaia pack the failure **flips**: HYG (the bright, named stars) **vanishes on
approach** wherever Gaia is dense. Procgen masks it visually, so it had gone unnoticed —
this is the "Gaia realness unrealized" gap.

## Root cause

`combineOctreeSources` merges the two octrees into one the policy walks. The original
`mergeNode` OR-ed child masks:

```ts
childMask |= n.manifest.childMask;
isLeaf: childMask === 0,
```

So a node that is **interior in either source** is interior in the union. The policy's SSE
descent (`packages/streaming/src/policy.ts` `selectOctree`) then **skips an interior node
and loads its finer children** — but the source that *terminated* at that node (a leaf) has
no finer children, and `loadTile` only loaded from sources that own the exact cut key. Its
points live in a node that is never in the cut ⇒ **dropped**.

The victim is always the **shallower** source — whichever terminates at a coarser level:

- **Shallow Gaia sample (depth 0) + HYG (depth 1):** Gaia orphaned.
- **HYG (depth 1) + dense Gaia (depth 11):** HYG orphaned. ← the production-dangerous form.

## Proof it fails — measured on the real packs

`tools`/harness simulates the real `selectOctree` descent at a depth cap (cap = how deep the
camera pulls the cut) over the actual manifests. `HYG_pts` / `GAIA_pts` = points the cut
actually loads.

**Real pack — HYG (113,495) + `octree-gaia` (5,342,258):**

```
         BROKEN (owners-only)        FIXED (push-down)
descend  cutNodes   HYG_pts    GAIA_pts      HYG_pts    GAIA_pts
  cap=0       1      4,096       4,096       4,096       4,096
  cap=1       8    109,399      32,768     109,399      32,768
  cap=2       8          0      32,768     109,399      32,768   ← HYG dropped to ZERO
  cap=5     106          0     118,974     109,399     118,974
  cap=11   1093          0   4,629,554     109,399   4,629,554
```

As soon as the cut descends past depth 1 (`cap≥2`) **HYG → 0 points, 0 cells**. On approach,
every named star disappears in the regions Gaia subdivides.

**Sample — HYG + `octree-gaia-sample` (135):**

```
descend  cutNodes   HYG_pts    GAIA_pts      HYG_pts    GAIA_pts
  cap=0       1      4,096         135       4,096         135
  cap=1       8    109,399           0     109,399         135   ← Gaia dropped to ZERO
  cap=11      8    109,399           0     109,399         135
```

Symmetric: the shallow Gaia sample drops to 0 as soon as the cut descends past the root.

## The fix — push-down at load time

When the cut descends past where a source terminates, that source's points must be
**pushed down** into the descendant cut cells. `loadTile(K)` now, per source:

1. **Owns K** → load its own tile (unchanged).
2. **Terminates above K** → find its deepest node on the path to K; if that node is a
   **leaf**, decode it (cached — a shared ancestor is fetched once across sibling cut cells),
   keep the subset of its points whose absolute position falls inside K's half-open cube, and
   rebase them to K's centre so they concatenate with the owning source's tile.

Octree cells **partition** space, so each pushed point lands in **exactly one** cut cell — no
double-draw. An **internal** (non-leaf) ancestor is skipped: it means the source pruned its
subtree toward K and only a decimated representative exists, so there is nothing real to
contribute.

The `FIXED` columns above (computed by conservation — each ancestor's points distribute across
its descendant cut cells) show every source's points are **conserved at every depth**, while
the source that owns the cut cells is **unchanged** (Gaia identical on the real pack, HYG
identical on the sample) — confirming no duplication.

## Proof it works — deterministic unit test

`apps/web/src/glue/octree-combined.test.ts` builds two in-memory sources reproducing the
topology (shallow source terminates at level 1; deep source subdivides to level 2), runs a
faithful copy of the `selectOctree` descent, and asserts:

- **Reproduces the drop:** the original owners-only rule loads **0** shallow points across the
  deep cut (deep intact).
- **Fix conserves:** push-down loads **all** shallow points, deep intact, **order-independent**,
  **no double-draw** (total == original), correct far-view (cut stops at the shared parent →
  both load), single-source pass-through.

## Known follow-up (pre-existing, NOT fixed here)

`concatBatches` merges the parts into one `StarBatch` with a single `idPrefix` (the first
part's). Positions/colours/magnitudes are correct (rendering — the BUG-8 goal — is fixed), but
a pushed-down point sharing a tile inherits the wrong `idPrefix` ⇒ wrong bodyId for
picking/labels. Fixing it needs `StarBatch` to carry per-point catalog identity (touches
frozen core-types/render contracts) → its own task.

## Relationship to TASK-058

TASK-058 §3 adds an `assertInvariant` that every source contributes where it has points in
range. That invariant is exactly the **post-condition this push-down guarantees** — it could
not be adopted before this fix, because the un-fixed combine violates it on the real happy
path (HYG orphaned on approach). With BUG-8 closed, the assert is a true no-op on the happy
path and fires only on a genuine regression.
