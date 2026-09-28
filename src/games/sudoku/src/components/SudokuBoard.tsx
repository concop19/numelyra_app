import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, spacing, typography } from '../styles/theme';
import { BoardState, CellState } from '../utils/sudokuLogic';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_PADDING = spacing.lg;
const BOARD_SIZE = SCREEN_WIDTH - BOARD_PADDING * 2;
const CELL_SIZE = Math.floor(BOARD_SIZE / 9);
const ACTUAL_BOARD_SIZE = CELL_SIZE * 9;

interface SudokuBoardProps {
  board: BoardState;
  solution: number[][];
  selectedCell: [number, number] | null;
  conflicts: boolean[][];
  isPaused: boolean;
  onCellPress: (row: number, col: number) => void;
  onTogglePause: () => void;
  theme: Theme;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  board,
  solution,
  selectedCell,
  conflicts,
  isPaused,
  onCellPress,
  onTogglePause,
  theme,
}) => {
  const [selectedRow, selectedCol] = selectedCell || [-1, -1];
  const selectedValue = selectedCell ? board[selectedRow][selectedCol]?.value : 0;

  // Determine if a cell is highlighted (shares row, col, or box with selected cell)
  const isCellHighlighted = (r: number, c: number) => {
    if (selectedRow === -1) return false;
    if (r === selectedRow || c === selectedCol) return true;

    // Check same 3x3 box
    const selectedBoxRow = Math.floor(selectedRow / 3);
    const selectedBoxCol = Math.floor(selectedCol / 3);
    const currentBoxRow = Math.floor(r / 3);
    const currentBoxCol = Math.floor(c / 3);
    return selectedBoxRow === currentBoxRow && selectedBoxCol === currentBoxCol;
  };

  // Render 3x3 pencil marks (notes) inside an empty cell
  const renderCellNotes = (notes: number[]) => {
    const noteGrid = [];
    for (let num = 1; num <= 9; num++) {
      const hasNote = notes.includes(num);
      noteGrid.push(
        <View key={num} style={styles.noteCell}>
          <Text
            style={[
              styles.noteText,
              typography.boardNote,
              {
                color: theme.colors.textSecondary,
                opacity: hasNote ? 1 : 0,
              },
            ]}
          >
            {num}
          </Text>
        </View>
      );
    }

    return <View style={styles.notesGrid}>{noteGrid}</View>;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.boardFrame,
          {
            width: ACTUAL_BOARD_SIZE,
            height: ACTUAL_BOARD_SIZE,
            borderColor: theme.colors.gridMajorBorder,
            backgroundColor: theme.colors.cellBg,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        {/* Render Cells */}
        {board.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => {
              const isSelected = r === selectedRow && c === selectedCol;
              const isHighlighted = isCellHighlighted(r, c);
              const isMatch = selectedValue > 0 && cell.value === selectedValue;
              const isConflict = conflicts[r] && conflicts[r][c];
              
              // Check if user entry is incorrect compared to actual solution
              const isIncorrect =
                cell.value > 0 &&
                !cell.isClue &&
                solution &&
                solution[r] &&
                solution[r][c] !== undefined &&
                cell.value !== solution[r][c];

              const isError = isConflict || isIncorrect;

              // Calculate background color based on status priorities:
              // 1. Selected cell (highest priority)
              // 2. Conflict or Incorrect error
              // 3. Exact matching numbers
              // 4. Highlighted area (row/col/box)
              // 5. Default background
              let cellBgColor = theme.colors.cellBg;
              if (isSelected) {
                cellBgColor = theme.colors.cellBgSelected;
              } else if (isError) {
                cellBgColor = theme.colors.cellBgError;
              } else if (isMatch) {
                cellBgColor = theme.colors.cellBgMatch;
              } else if (isHighlighted) {
                cellBgColor = theme.colors.cellBgHighlight;
              }

              // Apply grid partition borders (thick borders between 3x3 grids)
              const borderRightWidth = c === 2 || c === 5 ? 2.5 : 0.8;
              const borderBottomWidth = r === 2 || r === 5 ? 2.5 : 0.8;

              const borderRightColor =
                c === 2 || c === 5
                  ? theme.colors.gridMajorBorder
                  : theme.colors.border;
              const borderBottomColor =
                r === 2 || r === 5
                  ? theme.colors.gridMajorBorder
                  : theme.colors.border;

              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cell,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: cellBgColor,
                      borderRightWidth: c !== 8 ? borderRightWidth : 0,
                      borderBottomWidth: r !== 8 ? borderBottomWidth : 0,
                      borderRightColor,
                      borderBottomColor,
                    },
                  ]}
                  onPress={() => onCellPress(r, c)}
                  activeOpacity={0.8}
                  disabled={isPaused}
                >
                  {cell.value > 0 ? (
                    <Text
                      style={[
                        cell.isClue ? typography.boardClue : typography.boardUser,
                        {
                          color: isError
                            ? theme.colors.textError
                            : cell.isClue
                            ? theme.colors.textClue
                            : theme.colors.textUser,
                        },
                      ]}
                    >
                      {cell.value}
                    </Text>
                  ) : (
                    renderCellNotes(cell.notes)
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Paused Overlay */}
        {isPaused && (
          <TouchableOpacity
            style={[styles.pausedOverlay, { backgroundColor: theme.colors.background }]}
            onPress={onTogglePause}
            activeOpacity={0.9}
          >
            <View style={[styles.pausedCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="play" size={44} color={theme.colors.accent} />
              <Text
                style={[
                  styles.pausedTitle,
                  typography.h2,
                  { color: theme.colors.text, marginTop: spacing.sm },
                ]}
              >
                Game Paused
              </Text>
              <Text
                style={[
                  styles.pausedSubtitle,
                  typography.caption,
                  { color: theme.colors.textSecondary, marginTop: spacing.xs },
                ]}
              >
                Tap anywhere to resume
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  boardFrame: {
    borderWidth: 2.5,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesGrid: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    padding: 3,
  },
  noteCell: {
    width: '33.33%',
    height: '33.33%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteText: {
    fontSize: 9,
    textAlign: 'center',
  },
  pausedOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedCard: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  pausedTitle: {
    fontWeight: '700',
  },
  pausedSubtitle: {
    fontSize: 13,
  },
});
