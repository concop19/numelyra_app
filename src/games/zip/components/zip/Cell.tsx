/**
 * A single grid tile — pure background. The path, checkpoints, and walls
 * are rendered as overlays in `Grid` so they layer correctly above the path.
 *
 * The only stateful background is `isHinted`: a soft pink wash on the cell
 * suggested by the manual "Hint" button. Otherwise the tile is plain white.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/game/colors';

interface CellProps {
  readonly size: number;
}

function CellInner({ size }: CellProps) {
  return (
    <View
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor: palette.cellEmpty,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    borderWidth: 1,
    borderColor: palette.cellGrid,
  },
});

export const Cell = memo(CellInner);
