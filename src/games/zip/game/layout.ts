/**
 * Shared layout constants. Kept in one place so the path thickness and the
 * checkpoint circle diameter stay in sync (they should visually match —
 * the path is a "snake" of the same width as the numbered dots).
 */

/** Diameter of the numbered checkpoint dots, as a fraction of cellSize. */
export const CHECKPOINT_DOT_FRACTION = 0.48;

/** Path thickness, as a fraction of cellSize. Locked to the dot diameter. */
export const PATH_THICKNESS_FRACTION = CHECKPOINT_DOT_FRACTION;

/** Font size for the number inside a dot, as a fraction of dot diameter. */
export const CHECKPOINT_FONT_FRACTION = 0.52;
