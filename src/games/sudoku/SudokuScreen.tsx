import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  useColorScheme,
  StatusBar as RNStatusBar,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, darkTheme, Theme, spacing, typography } from './src/styles/theme';
import {
  Difficulty,
  BoardState,
  generateSudoku,
  getConflictGrid,
  isBoardSolved,
} from './src/utils/sudokuLogic';
import { Header } from './src/components/Header';
import { SudokuBoard } from './src/components/SudokuBoard';
import { ControlPanel } from './src/components/ControlPanel';

type SudokuScreenProps = { dailyMode?: boolean; onDailyComplete?: () => void };

export default function App({ dailyMode = false, onDailyComplete }: SudokuScreenProps) {
  // System theme detection
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === 'dark');
  const theme: Theme = isDarkMode ? darkTheme : lightTheme;

  // Game States
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [board, setBoard] = useState<BoardState>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [history, setHistory] = useState<BoardState[]>([]);
  const [notesMode, setNotesMode] = useState(false);
  
  // Timer States
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Victory State
  const [isGameWon, setIsGameWon] = useState(false);
  const [errorsCount, setErrorsCount] = useState(0);
  const dailyCompletedRef = useRef(false);

  // Initialize Game on Mount
  useEffect(() => {
    startNewGame(difficulty);
    return () => stopTimer();
  }, []);

  // Update theme state if system preference changes and user hasn't toggled manually
  useEffect(() => {
    setIsDarkMode(systemScheme === 'dark');
  }, [systemScheme]);

  // Start Timer logic
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isPaused && !isGameWon && board.length > 0) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [isPaused, isGameWon, board]);

  useEffect(() => {
    if (dailyMode && isGameWon && !dailyCompletedRef.current) {
      dailyCompletedRef.current = true;
      onDailyComplete?.();
    }
  }, [dailyMode, isGameWon, onDailyComplete]);

  // Start New Game
  const startNewGame = (diff: Difficulty) => {
    const now = new Date();
    const dailySeed = now.getFullYear() * 10_000 + (now.getMonth() + 1) * 100 + now.getDate();
    const { startBoard, solution: solvedBoard } = generateSudoku(diff, dailyMode ? dailySeed : undefined);
    setBoard(startBoard);
    setSolution(solvedBoard);
    setSelectedCell(null);
    setHistory([]);
    setNotesMode(false);
    setSeconds(0);
    setIsPaused(false);
    setIsGameWon(false);
    setErrorsCount(0);
  };

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleChangeDifficulty = (newDiff: Difficulty) => {
    if (newDiff !== difficulty) {
      setDifficulty(newDiff);
      startNewGame(newDiff);
    }
  };

  // Helper to clone BoardState
  const cloneBoard = (currentBoard: BoardState): BoardState => {
    return currentBoard.map((row) =>
      row.map((cell) => ({
        ...cell,
        notes: [...cell.notes],
      }))
    );
  };

  // Add state to history before modifications
  const saveToHistory = (currentBoard: BoardState) => {
    setHistory((prev) => [...prev, cloneBoard(currentBoard)]);
  };

  const handleCellPress = (row: number, col: number) => {
    setSelectedCell([row, col]);
  };

  // Automatically clean up notes in same row, column, and box when a number is placed
  const autoCleanNotes = (currentBoard: BoardState, r: number, c: number, value: number) => {
    // Row and column cleanup
    for (let i = 0; i < 9; i++) {
      // Row cleanup
      if (i !== c) {
        currentBoard[r][i].notes = currentBoard[r][i].notes.filter((n) => n !== value);
      }
      // Column cleanup
      if (i !== r) {
        currentBoard[i][c].notes = currentBoard[i][c].notes.filter((n) => n !== value);
      }
    }

    // 3x3 Box cleanup
    const boxRowStart = Math.floor(r / 3) * 3;
    const boxColStart = Math.floor(c / 3) * 3;
    for (let i = boxRowStart; i < boxRowStart + 3; i++) {
      for (let j = boxColStart; j < boxColStart + 3; j++) {
        if (i !== r || j !== c) {
          currentBoard[i][j].notes = currentBoard[i][j].notes.filter((n) => n !== value);
        }
      }
    }
  };

  const handleNumberPress = (num: number) => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    const cell = board[r][c];

    // Cannot modify clues
    if (cell.isClue) return;

    // Save previous state for Undo
    saveToHistory(board);

    const newBoard = cloneBoard(board);
    const targetCell = newBoard[r][c];

    if (notesMode) {
      if (targetCell.value > 0) {
        // Clear value if overriding with notes
        targetCell.value = 0;
      }
      // Toggle note
      if (targetCell.notes.includes(num)) {
        targetCell.notes = targetCell.notes.filter((n) => n !== num);
      } else {
        targetCell.notes = [...targetCell.notes, num].sort((a, b) => a - b);
      }
    } else {
      // Overwrite value (if same value is tapped again, erase it)
      if (targetCell.value === num) {
        targetCell.value = 0;
      } else {
        // Increment error count if selected value is incorrect compared to solved board
        if (num !== solution[r][c]) {
          setErrorsCount((prev) => prev + 1);
        } else {
          // Only auto-clean notes in row/col/box if the placed number is correct
          autoCleanNotes(newBoard, r, c, num);
        }
        targetCell.value = num;
        targetCell.notes = []; // Clear notes of the current cell if setting a number
      }
    }

    setBoard(newBoard);

    // Check if board solved
    if (isBoardSolved(newBoard, solution)) {
      setIsGameWon(true);
      stopTimer();
    }
  };

  const handleErase = () => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    const cell = board[r][c];

    if (cell.isClue) return;

    saveToHistory(board);

    const newBoard = cloneBoard(board);
    newBoard[r][c].value = 0;
    newBoard[r][c].notes = [];

    setBoard(newBoard);
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const previousBoard = history[history.length - 1];
    setBoard(previousBoard);
    setHistory((prev) => prev.slice(0, -1));
  };

  const handleToggleNotesMode = () => {
    setNotesMode(!notesMode);
  };

  // Computes the frequency of each placed number on the board
  const getNumberCounts = (): Record<number, number> => {
    const counts: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
    };

    board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.value > 0) {
          counts[cell.value] = (counts[cell.value] || 0) + 1;
        }
      });
    });

    return counts;
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const conflicts = board.length > 0 ? getConflictGrid(board) : [];
  const counts = board.length > 0 ? getNumberCounts() : {};

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Dynamic Status Bar Styling */}
      <RNStatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={styles.mainContainer}>
        {board.length > 0 && (
          <>
            {/* Header Area */}
            <Header
              theme={theme}
              isDarkMode={isDarkMode}
              onToggleTheme={handleToggleTheme}
              seconds={seconds}
              errorsCount={errorsCount}
              isPaused={isPaused}
              onTogglePause={handleTogglePause}
              currentDifficulty={difficulty}
              onChangeDifficulty={handleChangeDifficulty}
              onNewGame={() => startNewGame(difficulty)}
            />
            {dailyMode && <Text style={[typography.caption, { color: theme.colors.accent, textAlign: 'center', fontWeight: '800' }]}>✦ SUDOKU DAILY</Text>}

            {/* Board Area */}
            <View style={styles.boardWrapper}>
              <SudokuBoard
                board={board}
                solution={solution}
                selectedCell={selectedCell}
                conflicts={conflicts}
                isPaused={isPaused}
                onCellPress={handleCellPress}
                onTogglePause={handleTogglePause}
                theme={theme}
              />
            </View>

            {/* Control Panel Area */}
            <ControlPanel
              theme={theme}
              onNumberPress={handleNumberPress}
              onUndo={handleUndo}
              onErase={handleErase}
              notesMode={notesMode}
              onToggleNotesMode={handleToggleNotesMode}
              canUndo={history.length > 0}
              numberCounts={counts}
            />
          </>
        )}
      </View>

      {/* Victory Modal */}
      <Modal
        visible={isGameWon}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.victoryCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.trophyIcon, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="trophy" size={54} color={theme.colors.accent} />
            </View>

            <Text style={[styles.victoryTitle, typography.h1, { color: theme.colors.text }]}>
              Congratulations!
            </Text>
            
            <Text style={[styles.victorySubtitle, typography.body, { color: theme.colors.textSecondary }]}>
              You successfully solved the puzzle!
            </Text>

            {/* Match Stats */}
            <View style={[styles.statsContainer, { borderColor: theme.colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, typography.caption, { color: theme.colors.textSecondary }]}>
                  DIFFICULTY
                </Text>
                <Text style={[styles.statValue, typography.bodySemibold, { color: theme.colors.text }]}>
                  {difficulty.toUpperCase()}
                </Text>
              </View>
              
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.statItem}>
                <Text style={[styles.statLabel, typography.caption, { color: theme.colors.textSecondary }]}>
                  ERRORS
                </Text>
                <Text style={[styles.statValue, typography.bodySemibold, { color: theme.colors.text }]}>
                  {errorsCount}
                </Text>
              </View>
              
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.statItem}>
                <Text style={[styles.statLabel, typography.caption, { color: theme.colors.textSecondary }]}>
                  TIME
                </Text>
                <Text style={[styles.statValue, typography.bodySemibold, { color: theme.colors.text }]}>
                  {formatTime(seconds)}
                </Text>
              </View>
            </View>

            {/* Play Again Button */}
            <TouchableOpacity
              onPress={() => startNewGame(difficulty)}
              style={[styles.victoryButton, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.8}
            >
              <Text style={styles.victoryButtonText}>Play Again</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  boardWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  victoryCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  trophyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  victoryTitle: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  victorySubtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing.md,
    width: '100%',
    marginBottom: spacing.xl,
    justifyContent: 'space-evenly',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    letterSpacing: 1,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  victoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  victoryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
