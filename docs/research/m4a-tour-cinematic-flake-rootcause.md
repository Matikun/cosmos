# m4a guided-tour flake: cinematic never engaged (root cause + fix)

_2026-07-01. Why the M4a guided-tour e2e went red on a docs-only push, and the
root-cause fix (bisect-proven), not a rerun._

## Symptom

`m4a.spec.ts:213 M4a guided tour` timed out (60s) at
`waitForFunction(() => __cosmos.cinematicActive === true)`. The tour went active (card
shown) but the cinematic flight never started. **Flake proof:** the immediately prior CI
run on `3ed013a` was fully green; the red run `e5832a4` differs only by two **markdown**
files (CLAUDE.md + testing-conventions.md), which cannot touch runtime. Same app code,
one green one red ⇒ non-deterministic.

## Root cause

`flyToStep` (the tour's step-0 cinematic driver, `apps/web/src/App.tsx`) began with:

```
const ctrl = controllerHolder.current;
if (ctrl === null || …) return;   // silent bail
```

`controllerHolder.current` is set by `handleController`, a callback invoked when the flight
controller is created **inside the R3F Canvas** — asynchronously. Critically, `__cosmos.ready`
(what the test waits on) tracks only the **data pack** (`pack.status === 'ready'`); it does
**not** gate on the Canvas/controller having mounted. Under CI SwiftShader contention the
WebGL context is slow to create, so the tour can go active a beat before
`controllerHolder.current` exists. The tour-start flight was **fired once** on the
inactive→active transition, so that single bail **silently dropped the entire cinematic** —
one of the silent-swallow sites the TASK-058 error initiative targets. On a fast GPU the
controller mounts instantly, so it never reproduced locally.

## Fix

Make the step-start flight **retry until it engages** instead of firing once and dropping it,
and **surface** a true failure instead of swallowing it:

- `flyToStep` now returns `boolean` (true once `playSpline` was called).
- The tour-start driver polls (`setTimeout`, 50 ms) until `flyToStep` succeeds, bounded by a
  10 s budget; on the deadline it `reportError(…, 'invariant')` (never reached in a healthy
  boot — the controller mounts in well under 10 s even under contention).

This also fixes a real UX bug: a user who starts a tour before the scene settles previously
got a tour card with no flight.

## Empirical proof (bisect)

Injected the exact race — a 2.5 s delay on `controllerHolder.current` assignment — and toggled
only the retry budget:

| Config (controller delayed 2.5 s) | Result |
| --- | --- |
| `START_TIMEOUT_MS = 0` (fire-once, old behavior) | **FAIL** — `cinematicActive` timeout at `m4a.spec.ts:233` (the exact CI failure) |
| `START_TIMEOUT_MS = 10_000` (retry, the fix) | **PASS** (3.7 s) |

Same injected condition, only the retry differs ⇒ the controller-not-ready-at-fire-time gap
is the cause and the retry is the fix. Both temp patches removed; the full m4a suite passes
clean (4/4).
