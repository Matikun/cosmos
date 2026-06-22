import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTourStore } from '@cosmos/app-state';
import type { Tour } from '@cosmos/core-types';
import { TourChrome } from '../src/TourChrome';

const TOUR: Tour = {
  id: 'tour-1',
  name: 'Inner planets',
  steps: [
    {
      targetId: 'sol:mercury',
      title: 'Mercury',
      narration: 'The closest planet to the Sun.',
      dwellMs: 4000,
    },
    {
      targetId: 'sol:venus',
      title: 'Venus',
      narration: 'A hothouse world.',
      dwellMs: 4000,
    },
  ],
};

const DEFAULT_STATE = { active: null, stepIndex: -1, playing: false };

afterEach(() => {
  useTourStore.setState(DEFAULT_STATE);
  cleanup();
  vi.restoreAllMocks();
});

describe('TourChrome', () => {
  it('renders nothing when no tour is active', () => {
    const { container } = render(
      <TourChrome onStepChange={vi.fn()} onExit={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the current step title/narration when a tour is active', () => {
    useTourStore.getState().start(TOUR);
    render(<TourChrome onStepChange={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByText('Mercury')).not.toBeNull();
    expect(
      screen.getByText('The closest planet to the Sun.')
    ).not.toBeNull();
  });

  it('next button calls useTourStore.next and onStepChange', async () => {
    const user = userEvent.setup();
    useTourStore.getState().start(TOUR);
    const onStepChange = vi.fn();
    render(<TourChrome onStepChange={onStepChange} onExit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /next step/i }));
    expect(useTourStore.getState().stepIndex).toBe(1);
    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('prev button calls useTourStore.prev and onStepChange', async () => {
    const user = userEvent.setup();
    useTourStore.getState().start(TOUR);
    useTourStore.setState({ stepIndex: 1 });
    const onStepChange = vi.fn();
    render(<TourChrome onStepChange={onStepChange} onExit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /previous step/i }));
    expect(useTourStore.getState().stepIndex).toBe(0);
    expect(onStepChange).toHaveBeenCalledWith(0);
  });

  it('exit calls useTourStore.stop and onExit', async () => {
    const user = userEvent.setup();
    useTourStore.getState().start(TOUR);
    const onExit = vi.fn();
    render(<TourChrome onStepChange={vi.fn()} onExit={onExit} />);
    await user.click(screen.getByRole('button', { name: /exit tour/i }));
    expect(useTourStore.getState().active).toBeNull();
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('play/pause toggles playing', async () => {
    const user = userEvent.setup();
    useTourStore.getState().start(TOUR);
    render(<TourChrome onStepChange={vi.fn()} onExit={vi.fn()} />);
    expect(useTourStore.getState().playing).toBe(true);
    await user.click(screen.getByRole('button', { name: /pause tour/i }));
    expect(useTourStore.getState().playing).toBe(false);
    await user.click(screen.getByRole('button', { name: /play tour/i }));
    expect(useTourStore.getState().playing).toBe(true);
  });
});
