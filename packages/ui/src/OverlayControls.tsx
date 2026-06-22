import { type JSX } from 'react';
import { useOverlayStore } from '@cosmos/app-state';

/** Toggles bound to useOverlayStore — constellations / labels / cinematic. */
export function OverlayControls(): JSX.Element {
  const constellations = useOverlayStore((s) => s.constellations);
  const labels = useOverlayStore((s) => s.labels);
  const cinematic = useOverlayStore((s) => s.cinematic);
  const setConstellations = useOverlayStore((s) => s.setConstellations);
  const setLabels = useOverlayStore((s) => s.setLabels);
  const setCinematic = useOverlayStore((s) => s.setCinematic);

  return (
    <div
      className="cosmos-ui-overlays"
      role="group"
      aria-label="Overlay controls"
    >
      <button
        aria-pressed={constellations}
        onClick={() => setConstellations(!constellations)}
      >
        Constellations
      </button>
      <button aria-pressed={labels} onClick={() => setLabels(!labels)}>
        Labels
      </button>
      <button
        aria-pressed={cinematic}
        onClick={() => setCinematic(!cinematic)}
      >
        Cinematic
      </button>
    </div>
  );
}
