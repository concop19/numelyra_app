/**
 * LinkedIn-Zip-inspired light palette.
 *
 * Black filled checkpoint circles, pink/magenta path, soft pink hint for the
 * "1" cell at start. Centralised so screens stay visually consistent.
 */
export const palette = {
  // Page / surface
  background: '#F7F4EF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E5E1DA',
  borderStrong: '#C8C2B8',

  // Text
  text: '#101418',
  textMuted: '#6E7479',
  textSubtle: '#A2A6AB',

  // Path / accent (LinkedIn Zip pink)
  accent: '#E14E97',
  accentSoft: '#FCE2EE',
  accentEdge: '#F18FBF',

  // Cells
  cellEmpty: '#FFFFFF',
  cellGrid: '#E5E1DA',
  cellHintWash: '#FCE2EE',
  cellHead: '#F8C8DD',

  // Checkpoints (solid black filled)
  checkpointFill: '#0F1216',
  checkpointFillHit: '#0F1216',
  checkpointText: '#FFFFFF',
  checkpointTextHit: '#FFFFFF',

  // Walls
  wall: '#0F1216',

  // States
  success: '#15803D',
  danger: '#D11B5F',
} as const;
