import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Platform,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BOARD_SIZE,
  BOARD_WIDTH_MULTIPLIER,
  MARGIN,
  theme,
} from "../constants";
import BackgroundCell from "./BackgroundCell";
import { useGame, Direction } from "../hooks";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Cell from "./Cell";
import GameOverScreen from "./GameOverScreen";

type Props = { dailyTarget?: number; onDailyComplete?: () => void };

const Board = ({ dailyTarget, onDailyComplete }: Props) => {
  const { width } = useWindowDimensions();
  const backgroundCells = useMemo(() => {
    return new Array(BOARD_SIZE * BOARD_SIZE)
      .fill(0)
      .map((_, index) => <BackgroundCell key={index.toString()} />);
  }, []);

  const { logBoard, board, move, startGame, gameOver } = useGame();
  const dailyCompleted = useRef(false);
  const highestTile = Math.max(0, ...board.map((cell) => cell.value));
  const [bestTile, setBestTile] = useState(0);

  useEffect(() => { AsyncStorage.getItem('game-2048:best-tile:v1').then((value) => setBestTile(Number(value) || 0)).catch(() => undefined); }, []);
  useEffect(() => {
    if (highestTile > bestTile) {
      setBestTile(highestTile);
      void AsyncStorage.setItem('game-2048:best-tile:v1', String(highestTile));
    }
  }, [bestTile, highestTile]);

  // Board is module-scoped in the original game. Start a clean run whenever
  // this screen is entered so a completed practice run cannot satisfy Daily.
  useEffect(() => {
    dailyCompleted.current = false;
    startGame();
  }, [dailyTarget, startGame]);

  useEffect(() => {
    if (dailyTarget && !dailyCompleted.current && highestTile >= dailyTarget) {
      dailyCompleted.current = true;
      onDailyComplete?.();
    }
  }, [dailyTarget, highestTile, onDailyComplete]);

  // Desktop Web keyboard navigation (Arrow keys & WASD)
  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    ) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        move("up");
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        move("down");
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        move("left");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        move("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener?.("keydown", handleKeyDown);
  }, [gameOver, move]);

  const flingGesture = Gesture.Pan().onEnd((e) => {
    if (gameOver) {
      return;
    }
    const absX = Math.abs(e.translationX);
    const absY = Math.abs(e.translationY);
    let direction: Direction;
    if (absX < absY) {
      if (e.translationY < 0) {
        console.log("UP");
        direction = "up";
      } else {
        direction = "down";
        console.log("DOWN");
      }
    } else {
      if (e.translationX < 0) {
        direction = "left";
        console.log("LEFT");
      } else {
        direction = "right";
        console.log("RIGHT");
      }
    }

    runOnJS(move)(direction);
  });

  logBoard();

  const cells = board.map(({ x, y, value, id }) => (
    <Cell x={x} y={y} value={value} key={id} />
  ));

  if (board.length === 0) {
    startGame();
  }

  return (
    <>
      {gameOver && <GameOverScreen onTryAgain={startGame} />}
      <GestureDetector gesture={flingGesture}>
        <View
          style={[
            styles.container,
            // TODO: add fix for small screens
            {
              width: width * BOARD_WIDTH_MULTIPLIER,
              height: width * BOARD_WIDTH_MULTIPLIER,
            },
          ]}
        >
          {backgroundCells}
          {cells}
        </View>
      </GestureDetector>
      <Text style={styles.bestTile}>Tốt nhất: {bestTile || '—'}</Text>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.backgroundSecondary,
    marginLeft: "auto",
    marginRight: "auto",
    borderRadius: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    padding: MARGIN,
    position: "relative",
  },
  bestTile: { color: theme.textPrimary, fontFamily: theme.fonts.bold, textAlign: 'center', marginTop: 10 },
});

export default Board;
