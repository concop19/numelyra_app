import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Platform,
} from "react-native";
import React, { useEffect, useMemo } from "react";
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

const Board = () => {
  const { width } = useWindowDimensions();
  const backgroundCells = useMemo(() => {
    return new Array(BOARD_SIZE * BOARD_SIZE)
      .fill(0)
      .map((_, index) => <BackgroundCell key={index.toString()} />);
  }, []);

  const { logBoard, board, move, startGame, gameOver } = useGame();

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
});

export default Board;
