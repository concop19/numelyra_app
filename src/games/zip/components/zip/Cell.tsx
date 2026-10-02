/**
 * A single grid tile — dark surface with crisp golden grid border lines.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '../../game/colors';

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
    borderWidth: 0.75,
    borderColor: palette.cellGrid,
  },
});

export const Cell = memo(CellInner);
