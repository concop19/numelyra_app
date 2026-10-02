/**
 * Dark theme with Golden/Yellow grid matching modern puzzle games.
 *
 * Deep obsidian background, crisp golden-yellow grid lines, glowing
 * vibrant rounded snake path, and circular checkpoint dots.
 */
export const palette = {
  // Page / surface
  background: '#090A10',
  surface: '#11131F',
  surfaceElevated: '#181B2B',
  border: '#272B40',
  borderStrong: '#F5BA5B', // Golden border

  // Text
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  textSubtle: '#6B7280',

  // Path / accent (Vibrant flame/gold snake)
  accent: '#FF9100',
  accentSoft: 'rgba(255, 145, 0, 0.2)',
  accentEdge: '#FFB800',

  // Cells - Dark with crisp golden grid lines like reference image
  cellEmpty: '#0B0D14',
  cellGrid: '#D4AF37', // Gold grid lines!
  cellGridMuted: 'rgba(245, 186, 91, 0.35)',
  cellHintWash: 'rgba(255, 184, 0, 0.25)',
  cellHead: '#FFD54F',

  // Checkpoints (Circular golden badges with crisp numbers)
  checkpointFill: '#161928',
  checkpointBorder: '#F5BA5B',
  checkpointFillHit: '#F5BA5B',
  checkpointText: '#FFE082',
  checkpointTextHit: '#090A10',

  // Walls / Barriers
  wall: '#FF4D6D',

  // States
  success: '#10B981',
  danger: '#EF4444',
} as const;
