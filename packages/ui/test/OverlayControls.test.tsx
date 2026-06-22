import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useOverlayStore } from '@cosmos/app-state';
import { OverlayControls } from '../src/OverlayControls';

const DEFAULT_STATE = {
  constellations: false,
  labels: false,
  cinematic: false,
};

afterEach(() => {
  useOverlayStore.setState(DEFAULT_STATE);
  cleanup();
});

describe('OverlayControls', () => {
  it('reflects current store state via aria-pressed', () => {
    useOverlayStore.setState({ constellations: true, labels: false, cinematic: true });
    render(<OverlayControls />);
    expect(
      screen.getByRole('button', { name: /constellations/i }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: /labels/i }).getAttribute('aria-pressed')
    ).toBe('false');
    expect(
      screen.getByRole('button', { name: /cinematic/i }).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('toggling constellations flips useOverlayStore.constellations', async () => {
    const user = userEvent.setup();
    render(<OverlayControls />);
    await user.click(screen.getByRole('button', { name: /constellations/i }));
    expect(useOverlayStore.getState().constellations).toBe(true);
  });

  it('toggling labels flips useOverlayStore.labels', async () => {
    const user = userEvent.setup();
    render(<OverlayControls />);
    await user.click(screen.getByRole('button', { name: /labels/i }));
    expect(useOverlayStore.getState().labels).toBe(true);
  });

  it('toggling cinematic flips useOverlayStore.cinematic', async () => {
    const user = userEvent.setup();
    render(<OverlayControls />);
    await user.click(screen.getByRole('button', { name: /cinematic/i }));
    expect(useOverlayStore.getState().cinematic).toBe(true);
  });
});
