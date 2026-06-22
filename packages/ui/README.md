# @cosmos/ui

React HUD components for the Cosmos explorer: a keyboard-driven search palette and a selected-star info panel.

## Components

### `SearchPalette`

A keyboard-driven search palette that queries a `BodyLookupAdapter`.

**Props:**
- `adapter: BodyLookupAdapter` — data source (injected by the app)
- `onGoTo(id: BodyId): void` — called on Enter or click; the app handles selection and fly-to

**Keyboard shortcuts:**
- `Ctrl+K` or `/` (when no input is focused) — opens the palette
- `Esc` — closes without selecting
- `↑` / `↓` — move the highlighted result (wraps around)
- `Enter` — calls `onGoTo` with the highlighted result's id and closes

Renders **nothing** while closed. Shows at most 12 results with an 80 ms input debounce.

### `InfoPanel`

Subscribes to `useSelectionStore` from `@cosmos/app-state`. Hidden when no body is selected.

**Props:**
- `adapter: BodyLookupAdapter` — used to look up the selected star's record
- `onGoTo(id: BodyId): void` — called by the "Go to" button

Displays: name (or id as fallback), distance from Sol in parsecs and light-years (3 significant digits, 1 pc = 3.26156 ly), absolute magnitude, B–V color index with spectral class, and HIP number (for `hyg:*` ids).

### `spectralClassFromBV(bv: number)`

Pure function exported for testing. Maps a B–V color index to an approximate main-sequence spectral class:

| B–V range     | Class |
|---------------|-------|
| `< 0.0`       | B     |
| `[0.0, 0.3)`  | A     |
| `[0.3, 0.58)` | F     |
| `[0.58, 0.81)`| G     |
| `[0.81, 1.40)`| K     |
| `≥ 1.40`      | M     |

## Pointer-events contract

These panels use `pointer-events: auto` on their root elements so they capture clicks and keyboard events. The **app** is responsible for wrapping all HUD panels in a shared overlay container styled with `pointer-events: none`, preventing the overlay from blocking the 3D canvas beneath it:

```css
/* app-level */
.hud-overlay {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 80;
}
```

```html
<!-- app-level HTML -->
<div class="hud-overlay">
  <!-- panels mount here; each has pointer-events: auto -->
</div>
```

Import `@cosmos/ui/ui.css` in the app entry point for the default panel styles.

## Overlays & tours (Phase 4)

### `OverlayControls`

Subscribes to `useOverlayStore` (`@cosmos/app-state`) itself — no props. Three toggle
buttons (constellations / labels / cinematic) with `aria-pressed` reflecting store state.

### `LabelLayer`

A screen-space label layer. **`ui` never imports Three.js or sees the camera** — the app
projects world positions to screen pixels (throttled to ≤ ~10 Hz, not per frame) and passes
the result in as `ProjectedLabel[]`.

**Props:**
- `labels: readonly ProjectedLabel[]` — `{ id, text, xPx, yPx, priority, visible }`
- `maxVisible?: number` — caps rendered labels (default 24)

De-clutters by sorting on `priority` (lower = more important), dropping `visible: false`
entries, and keeping only the top `maxVisible`. Root has `pointer-events: none` so labels
never block the canvas.

### `TourChrome`

Title + narration card with play/pause/prev/next/exit, driven entirely by `useTourStore`
(`@cosmos/app-state`). Renders nothing when no tour is active (`useTourStore.active === null`).

**Props:**
- `onStepChange(stepIndex: number): void` — called after next/prev so the app can fly nav to
  the new step
- `onExit(): void` — called on exit so the app can stop cinematic playback

`TourChrome` only reflects store state and emits these two callbacks — it does not own the
camera flight (that's the app, via `nav`, per TASK-052).

## Boundaries

- **No Three.js** — enforced by ESLint (`packages/ui/**` rule). The app does all world→screen
  projection for `LabelLayer`; `ui` only ever sees pixel coordinates.
- No fetch or `@cosmos/data` imports — all data flows through the injected `BodyLookupAdapter`
  or through `app-state` stores.
- No per-frame data — `LabelLayer` receives already-throttled props; `TourChrome` and
  `OverlayControls` react only to store changes.
