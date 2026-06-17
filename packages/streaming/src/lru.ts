/**
 * LRU eviction over loaded chunks (§5.8): once a budget is exceeded, evict the
 * least-recently-used chunks first — but NEVER a pinned chunk (the chunk the
 * camera is inside, its ancestors, or anything on the current cut).
 *
 * Access recency is a monotonically increasing tick stamped on each chunk by the
 * policy on use; this module owns the clock and the victim selection, so it is
 * unit-testable in isolation. Selecting victims allocates the returned array — a
 * §5.8 sanctioned rare allocation (eviction is not a steady-state event).
 */

/** Monotonic access clock; `next()` stamps a chunk as most-recently-used. */
export class LruClock {
  private _tick = 0;
  next(): number {
    return ++this._tick;
  }
}

export interface LruQuery<T> {
  /** GPU bytes a candidate currently occupies. */
  readonly bytesOf: (item: T) => number;
  /** Access tick stamped on the candidate (lower = older). */
  readonly tickOf: (item: T) => number;
  /** True ⇒ candidate may never be evicted (camera chunk / ancestor / on cut). */
  readonly pinned: (item: T) => boolean;
  /** Current total resident bytes across all loaded chunks. */
  readonly currentBytes: number;
  /** Hard budget; victims are chosen until resident bytes fall to/under this. */
  readonly maxBytes: number;
}

/**
 * Choose the oldest unpinned chunks to evict until `currentBytes` would fall to or
 * below `maxBytes`. Returns them oldest-first. Pinned chunks are never selected,
 * even if that leaves the budget exceeded (correctness over the cap — §5.8 forbids
 * evicting the camera's chunk).
 */
export function selectLruVictims<T>(items: readonly T[], q: LruQuery<T>): T[] {
  const victims: T[] = [];
  if (q.currentBytes <= q.maxBytes) return victims;

  // Candidates = unpinned, oldest first.
  const candidates = items.filter((it) => !q.pinned(it));
  candidates.sort((a, b) => q.tickOf(a) - q.tickOf(b));

  let freed = 0;
  for (const c of candidates) {
    if (q.currentBytes - freed <= q.maxBytes) break;
    victims.push(c);
    freed += q.bytesOf(c);
  }
  return victims;
}
