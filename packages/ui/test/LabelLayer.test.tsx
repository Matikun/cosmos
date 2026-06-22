import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LabelLayer } from '../src/LabelLayer';
import type { ProjectedLabel } from '../src/types';

afterEach(() => {
  cleanup();
});

function label(overrides: Partial<ProjectedLabel>): ProjectedLabel {
  return {
    id: 'id',
    text: 'text',
    xPx: 0,
    yPx: 0,
    priority: 1,
    visible: true,
    ...overrides,
  };
}

describe('LabelLayer', () => {
  it('renders text at (xPx, yPx)', () => {
    render(
      <LabelLayer
        labels={[label({ id: 'sirius', text: 'Sirius', xPx: 120, yPx: 80 })]}
      />
    );
    const el = screen.getByText('Sirius');
    expect(el.style.left).toBe('120px');
    expect(el.style.top).toBe('80px');
  });

  it('skips labels with visible: false', () => {
    render(
      <LabelLayer
        labels={[
          label({ id: 'a', text: 'Visible', visible: true }),
          label({ id: 'b', text: 'Hidden', visible: false }),
        ]}
      />
    );
    expect(screen.getByText('Visible')).not.toBeNull();
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('caps at maxVisible, keeping the lowest-priority (most important)', () => {
    const labels = [
      label({ id: 'a', text: 'A', priority: 3 }),
      label({ id: 'b', text: 'B', priority: 1 }),
      label({ id: 'c', text: 'C', priority: 2 }),
    ];
    render(<LabelLayer labels={labels} maxVisible={2} />);
    expect(screen.getByText('B')).not.toBeNull();
    expect(screen.getByText('C')).not.toBeNull();
    expect(screen.queryByText('A')).toBeNull();
  });

  it('root has pointer-events: none', () => {
    const { container } = render(<LabelLayer labels={[]} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.pointerEvents).toBe('none');
  });
});
