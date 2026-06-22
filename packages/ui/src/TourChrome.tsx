import { type JSX } from 'react';
import { useTourStore } from '@cosmos/app-state';
import { Icon } from './Icon';
import type { TourChromeProps } from './types';

/** Title + narration card with play/pause/prev/next/exit, driven by
 *  useTourStore. Renders nothing when no tour is active. The app owns the
 *  camera flight — this only reflects store state and emits callbacks. */
export function TourChrome({
  onStepChange,
  onExit,
}: TourChromeProps): JSX.Element {
  const active = useTourStore((s) => s.active);
  const stepIndex = useTourStore((s) => s.stepIndex);
  const playing = useTourStore((s) => s.playing);
  const next = useTourStore((s) => s.next);
  const prev = useTourStore((s) => s.prev);
  const setPlaying = useTourStore((s) => s.setPlaying);
  const stop = useTourStore((s) => s.stop);

  if (!active) return <></>;

  const step = active.steps[stepIndex];
  if (!step) return <></>;
  const lastIndex = active.steps.length - 1;

  function handleNext(): void {
    next();
    onStepChange(Math.min(stepIndex + 1, lastIndex));
  }

  function handlePrev(): void {
    prev();
    onStepChange(Math.max(stepIndex - 1, 0));
  }

  function handleExit(): void {
    stop();
    onExit();
  }

  return (
    <div className="cosmos-ui-tour" role="region" aria-label="Guided tour">
      <button
        className="cosmos-ui-tour-exit"
        aria-label="Exit tour"
        onClick={handleExit}
      >
        <Icon name="close" size={14} />
      </button>
      <h3 className="cosmos-ui-tour-title">{step.title}</h3>
      <p className="cosmos-ui-tour-narration">{step.narration}</p>
      <div className="cosmos-ui-tour-controls">
        <button
          aria-label="Previous step"
          onClick={handlePrev}
          disabled={stepIndex <= 0}
        >
          <Icon name="rewind" size={14} />
        </button>
        <button
          aria-label={playing ? 'Pause tour' : 'Play tour'}
          onClick={() => setPlaying(!playing)}
        >
          <Icon name={playing ? 'pause' : 'play'} size={14} />
        </button>
        <button
          aria-label="Next step"
          onClick={handleNext}
          disabled={stepIndex >= lastIndex}
        >
          <Icon name="forward" size={14} />
        </button>
      </div>
    </div>
  );
}
