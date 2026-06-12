import type { UniversePosition } from './coords';
import type { BodyId } from './bodies';

export const BOOKMARKS_SCHEMA_VERSION = 1;

/** §5.12: versioned schema with migration function from day one. */
export interface BookmarkRecord {
  readonly id: string;
  readonly name: string;
  readonly createdAtIso: string;
  readonly position: UniversePosition;
  /** Camera orientation quaternion [x, y, z, w]. */
  readonly orientation: readonly [number, number, number, number];
  readonly epochJD: number;
  /**
   * Set when position.context === 'system': the system that must be anchored
   * (frame-tree anchor + nav anchor) BEFORE the position can be restored.
   */
  readonly anchorSystemId?: BodyId;
}
