import { describe, it, expect } from 'vitest';
import { LruClock, selectLruVictims } from '../src/index.js';

interface Item {
  id: string;
  bytes: number;
  tick: number;
  pinned: boolean;
}

function q(items: Item[], maxBytes: number) {
  const currentBytes = items.reduce((s, it) => s + it.bytes, 0);
  return selectLruVictims(items, {
    bytesOf: (it) => it.bytes,
    tickOf: (it) => it.tick,
    pinned: (it) => it.pinned,
    currentBytes,
    maxBytes,
  });
}

describe('LruClock', () => {
  it('is strictly increasing', () => {
    const c = new LruClock();
    const a = c.next();
    const b = c.next();
    expect(b).toBeGreaterThan(a);
  });
});

describe('selectLruVictims', () => {
  it('returns nothing when under budget', () => {
    const items: Item[] = [{ id: 'a', bytes: 10, tick: 1, pinned: false }];
    expect(q(items, 100)).toHaveLength(0);
  });

  it('evicts oldest-first until under budget', () => {
    const items: Item[] = [
      { id: 'a', bytes: 10, tick: 1, pinned: false },
      { id: 'b', bytes: 10, tick: 2, pinned: false },
      { id: 'c', bytes: 10, tick: 3, pinned: false },
    ];
    const victims = q(items, 15); // need to free 15 ⇒ evict a then b
    expect(victims.map((v) => v.id)).toEqual(['a', 'b']);
  });

  it('never evicts a pinned chunk even if that leaves the budget exceeded', () => {
    const items: Item[] = [
      { id: 'a', bytes: 10, tick: 1, pinned: true },
      { id: 'b', bytes: 10, tick: 2, pinned: false },
    ];
    const victims = q(items, 5); // would need to free 15 but only b is evictable
    expect(victims.map((v) => v.id)).toEqual(['b']);
  });
});
