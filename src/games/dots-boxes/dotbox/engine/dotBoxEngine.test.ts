import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  connectLine,
  getCloseableBoxes,
  findNonThirdSideLines,
  getAllOpenLines,
} from './dotBoxEngine';
import { chooseAIMove } from './dotBoxAI';

test('createInitialGameState sets up board correctly', () => {
  const state = createInitialGameState(3);
  assert.equal(state.boardSize, 3);
  assert.equal(state.dotCount, 4);
  assert.equal(state.boxes.length, 9); // 3x3 = 9 boxes
  // Horizontal lines: 4 rows * 3 = 12
  // Vertical lines: 4 cols * 3 = 12
  // Total lines: 24
  assert.equal(Object.keys(state.lines).length, 24);
  assert.equal(state.currentPlayer, 0);
  assert.deepEqual(state.scores, [0, 0]);
  assert.equal(state.isGameOver, false);
});

test('connectLine switches player when no box is closed', () => {
  const state = createInitialGameState(3);
  const openLines = getAllOpenLines(state);
  const firstLine = openLines[0];

  const res = connectLine(state, firstLine.id, 0);
  assert.equal(res.isValid, true);
  assert.equal(res.extraTurn, false);
  assert.equal(res.closedBoxIndices.length, 0);
  assert.equal(res.nextState.lines[firstLine.id].owner, 0);
  assert.equal(res.nextState.currentPlayer, 1); // Turn switched to Player 1
  assert.deepEqual(res.nextState.scores, [0, 0]);
});

test('connectLine grants extra turn and awards score when closing a box', () => {
  let state = createInitialGameState(2); // 2x2 board, 4 boxes
  const box0 = state.boxes[0];
  const [top, right, bottom, left] = box0.lineIds;

  // Player 0 plays top
  state = connectLine(state, top, 0).nextState;
  assert.equal(state.currentPlayer, 1);

  // Player 1 plays right
  state = connectLine(state, right, 1).nextState;
  assert.equal(state.currentPlayer, 0);

  // Player 0 plays bottom
  state = connectLine(state, bottom, 0).nextState;
  assert.equal(state.currentPlayer, 1);

  // Now box 0 has 3 sides filled. Player 1 plays the 4th side (left)
  const res = connectLine(state, left, 1);
  assert.equal(res.isValid, true);
  assert.equal(res.extraTurn, true);
  assert.deepEqual(res.closedBoxIndices, [0]);
  assert.equal(res.nextState.boxes[0].owner, 1);
  assert.deepEqual(res.nextState.scores, [0, 1]);
  assert.equal(res.nextState.currentPlayer, 1); // Extra turn keeps player 1!
});

test('AI returns valid moves on all difficulties', () => {
  const state = createInitialGameState(3);
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    const move = chooseAIMove(state, diff, 1);
    assert.ok(move, `Move should be found for difficulty ${diff}`);
    assert.ok(state.lines[move!], `Move must exist in lines dictionary`);
    assert.equal(state.lines[move!].owner, null, `Move must be an open line`);
  }
});
