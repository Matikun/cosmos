import { type JSX } from 'react';
import type { LabelLayerProps } from './types';

/** App-projected screen-space body labels. ui never sees the camera —
 *  the app throttles `labels` to ≤ 10 Hz and recomputes xPx/yPx (§5.12). */
export function LabelLayer({
  labels,
  maxVisible = 24,
}: LabelLayerProps): JSX.Element {
  const shown = labels
    .filter((l) => l.visible)
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxVisible);

  return (
    <div
      className="cosmos-ui-labels"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      {shown.map((l) => (
        <span
          key={l.id}
          className="cosmos-ui-label"
          style={{ left: l.xPx, top: l.yPx }}
        >
          {l.text}
        </span>
      ))}
    </div>
  );
}
