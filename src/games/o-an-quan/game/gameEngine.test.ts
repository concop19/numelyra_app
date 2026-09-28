import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMPUTER_PLAYER,
  HUMAN_PLAYER,
  PLAYER_TOP,
  applyMove,
  buildMoveTrace,
  canSelectCell,
  chooseComputerMove,
  cloneState,
  createInitialState,
  scoreTotal,
} from './gameEngine';

test('starts with ten citizen cells, two mandarins, and the human turn', () => {
    const state = createInitialState();
    assert.equal(state.currentPlayer, HUMAN_PLAYER);
    assert.equal(state.cells.filter((cell: any) => cell.type === 'citizen').every((cell: any) => cell.citizens === 5), true);
    assert.equal(state.cells[0].mandarins + state.cells[6].mandarins, 2);
});

test('only permits occupied cells belonging to the active player', () => {
    const state = createInitialState();
    assert.equal(canSelectCell(state, 11), true);
    assert.equal(canSelectCell(state, 1), false);
    state.cells[11].citizens = 0;
    assert.equal(canSelectCell(state, 11), false);
});

test('creates a complete animated trace and hands the turn to the computer', () => {
    const state = createInitialState();
    const trace = buildMoveTrace(state, 11, -1);
    assert.equal(trace.ok, true);
    assert.equal(trace.frames[0].phase, 'pickup');
    assert.equal(trace.frames.at(-1).phase, 'finish');
    assert.equal(trace.state.currentPlayer, COMPUTER_PLAYER);
});

test('keeps historical snapshots isolated for Undo', () => {
    const before = createInitialState();
    const snapshot = cloneState(before);
    const result = applyMove(before, 11, -1);
    assert.equal(result.ok, true);
    assert.equal(snapshot.cells[11].citizens, 5);
    assert.equal(scoreTotal(snapshot.scores[PLAYER_TOP]), 0);
});

test('pauses for captures and awards both citizens and mandarins', () => {
  const state = createInitialState();
  state.cells.forEach((cell: any) => { cell.citizens = 0; cell.mandarins = 0; });
  state.cells[6].mandarins = 1;
  state.cells[7].citizens = 1;
  state.cells[10].citizens = 3;
  const trace = buildMoveTrace(state, 7, 1);
  assert.equal(trace.frames.some((frame: any) => frame.phase === 'capturePrompt'), true);
  assert.equal(trace.frames.some((frame: any) => frame.phase === 'capture'), true);
  assert.equal(trace.state.scores[HUMAN_PLAYER].citizens, 3);
});

test('reseeds an empty incoming side and deducts five citizens', () => {
  const state = createInitialState();
  state.cells.forEach((cell: any, index: number) => { if (index !== 11) cell.citizens = 0; });
  state.cells[11].citizens = 1;
  const trace = buildMoveTrace(state, 11, -1);
  assert.equal(trace.state.currentPlayer, COMPUTER_PLAYER);
  assert.equal(trace.state.scores[COMPUTER_PLAYER].citizens, -5);
  assert.equal([1, 2, 3, 4, 5].every((index) => trace.state.cells[index].citizens === 1), true);
});

test('ends the game and sweeps the remaining citizens after the final mandarin', () => {
  const state = createInitialState();
  state.cells.forEach((cell: any) => { cell.citizens = 0; cell.mandarins = 0; });
  state.cells[0].mandarins = 1;
  state.cells[9].citizens = 1;
  const trace = buildMoveTrace(state, 9, 1);
  assert.equal(trace.state.winner, HUMAN_PLAYER);
  assert.equal(trace.state.scores[HUMAN_PLAYER].mandarins, 1);
  assert.equal(trace.state.scores[HUMAN_PLAYER].citizens, 1);
});

test('returns a legal move for the computer at all supported difficulty levels', () => {
    const afterHuman = applyMove(createInitialState(), 11, -1).state;
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const move = chooseComputerMove(afterHuman, difficulty);
      assert.notEqual(move, null);
      assert.equal(canSelectCell(afterHuman, move!.index), true);
    }
});
