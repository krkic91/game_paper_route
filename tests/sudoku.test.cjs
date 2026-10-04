// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../games/sudoku-logic.js');

const puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'.split('').map(Number);
const solution = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'.split('').map(Number);

function seeded(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function saved() {
  return { difficulty: 'medium', givens: puzzle.slice(), solution: solution.slice(),
    board: puzzle.slice(), notes: Array(81).fill(0), hints: 0, checks: 0, ended: false };
}

function game() {
  const state = S.restore(saved());
  assert.ok(state);
  return state;
}

test('seeded generation creates distinct uniquely solvable puzzles at all three clue targets', () => {
  for (const [difficulty, target] of Object.entries({ easy: 42, medium: 34, hard: 28 })) {
    const generated = new Set();
    for (let seed = 1; seed <= 20; seed++) {
      const state = S.create(difficulty, seeded(seed));
      assert.equal(state.givens.filter(Boolean).length, target, `${difficulty}, seed ${seed}`);
      assert.equal(S.countSolutions(state.givens), 1, `${difficulty}, seed ${seed}`);
      assert.equal(S.isComplete(state.solution), true);
      assert.deepEqual(state.board, state.givens);
      assert.notStrictEqual(state.board, state.givens);
      state.givens.forEach((value, index) => {
        if (value) assert.equal(value, state.solution[index]);
      });
      assert.deepEqual(state.notes, Array(81).fill(0));
      assert.equal(state.ended, false);
      generated.add(state.givens.join(''));
    }
    assert.equal(generated.size, 20);
  }
});

test('generation accepts deterministic RNG and safely falls back for invalid difficulty', () => {
  assert.deepEqual(S.create('hard', seeded(42)), S.create('hard', seeded(42)));
  assert.equal(S.create('__proto__', seeded(1)).difficulty, 'easy');
  const constantRandom = S.create('hard', () => Number.NaN);
  assert.equal(S.countSolutions(constantRandom.givens), 1);
});

test('solution counting detects zero, one and multiple solutions without mutating input', () => {
  const before = puzzle.slice();
  assert.equal(S.countSolutions(puzzle), 1);
  assert.deepEqual(puzzle, before);
  assert.equal(S.countSolutions(solution), 1);
  assert.equal(S.countSolutions(Array(81).fill(0)), 2);
  assert.equal(S.countSolutions(Array(81).fill(0), 1), 1);
  const duplicate = puzzle.slice();
  duplicate[2] = 5;
  assert.equal(S.countSolutions(duplicate), 0);
  const impossible = puzzle.slice();
  impossible[2] = 1; // No immediate duplicate, but contradicts the unique solution.
  assert.deepEqual(S.conflicts(impossible), []);
  assert.equal(S.countSolutions(impossible), 0);
  for (const invalid of [null, {}, [], Array(81), Array(81).fill(10), Array(81).fill(-1), Array(81).fill('0')]) {
    assert.equal(S.countSolutions(invalid), 0);
    assert.equal(S.isComplete(invalid), false);
  }
});

test('given cells and invalid coordinates cannot be edited or create undo history', () => {
  const state = game();
  const before = JSON.stringify(state);
  for (const [index, value] of [[0, 1], [0, 0], [-1, 1], [81, 1], [2.5, 1], [2, -1], [2, 10], [2, '4']]) {
    assert.equal(S.setValue(state, index, value), false);
  }
  assert.equal(S.setValue(state, 0, 1, { notes: true }), false);
  assert.equal(S.setValue(state, 2, 0), false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(S.undo(state), false);
});

test('notes toggle, number entry prunes every peer unit, and undo restores all affected notes', () => {
  const state = game();
  // Index 2 shares only row with 3, column with 29, box with 11; 40 is unrelated.
  const noteCells = [2, 3, 29, 11, 40];
  for (const index of noteCells) {
    assert.equal(S.setValue(state, index, 4, { notes: true }), true);
    assert.equal(S.setValue(state, index, 9, { notes: true }), true);
  }
  const before = state.notes.slice();
  assert.equal(S.setValue(state, 2, 4), true);
  assert.equal(state.notes[2], 0);
  for (const index of [3, 29, 11]) assert.equal(state.notes[index], 1 << 8);
  assert.equal(state.notes[40], (1 << 3) | (1 << 8));
  assert.equal(S.setValue(state, 2, 7, { notes: true }), false);
  assert.equal(S.undo(state), true);
  assert.equal(state.board[2], 0);
  assert.deepEqual(state.notes, before);
  assert.equal(S.setValue(state, 2, 4, { notes: true }), true);
  assert.equal(state.notes[2], 1 << 8);
  assert.equal(S.setValue(state, 2, 0, { notes: true }), true);
  assert.equal(state.notes[2], 0);
  assert.equal(S.undo(state), true);
  assert.equal(state.notes[2], 1 << 8);
});

test('conflicts identify both endpoints in rows, columns and boxes without touching the board', () => {
  for (const pair of [[0, 8], [0, 72], [0, 10]]) {
    const board = Array(81).fill(0);
    pair.forEach(index => { board[index] = 7; });
    const before = board.slice();
    assert.deepEqual(S.conflicts(board), pair);
    assert.deepEqual(board, before);
  }
  const unrelated = Array(81).fill(0);
  unrelated[0] = unrelated[40] = 7;
  assert.deepEqual(S.conflicts(unrelated), []);
});

test('hints repair a selected cell and assistance counters stay monotonic through undo', () => {
  const state = game();
  assert.equal(S.setValue(state, 2, 1), true);
  assert.deepEqual(S.check(state), [2]);
  assert.equal(state.checks, 1);
  assert.equal(S.hint(state, 2), 2);
  assert.equal(state.board[2], solution[2]);
  assert.equal(state.hints, 1);
  assert.deepEqual(S.check(state), []);
  assert.equal(S.undo(state), true);
  assert.equal(state.board[2], 1);
  assert.equal(state.hints, 1);
  assert.equal(state.checks, 2);
  assert.equal(S.undo(state), true);
  assert.equal(state.board[2], 0);
  assert.equal(state.hints, 1);
  assert.equal(state.checks, 2);
  assert.equal(S.hint(state, 0), 2, 'given selection falls back to first unresolved cell');
  assert.equal(state.hints, 2);
});

test('completing a board ends play and undo can reopen the last move', () => {
  const state = game();
  for (let index = 0; index < 81; index++) {
    if (!state.givens[index]) assert.equal(S.setValue(state, index, state.solution[index]), true);
  }
  assert.equal(S.isComplete(state.board), true);
  assert.equal(state.ended, true);
  assert.equal(S.setValue(state, 2, 0), false);
  assert.equal(S.hint(state, 2), -1);
  assert.equal(S.undo(state), true);
  assert.equal(state.ended, false);
  assert.equal(S.isComplete(state.board), false);
});

test('undo history is private, limited to the most recent 200 actions and absent after restore', () => {
  const state = game();
  for (let index = 0; index < 220; index++) assert.equal(S.setValue(state, 2, index % 2 + 1), true);
  const restored = S.restore(JSON.parse(JSON.stringify(state)));
  assert.ok(restored);
  assert.equal(S.undo(restored), false);
  let undone = 0;
  while (S.undo(state)) undone++;
  assert.equal(undone, 200);
  assert.equal(state.board[2], 2, 'oldest 20 actions are no longer undoable');
});

test('restore preserves valid progress, clones arrays and recalculates completion', () => {
  const raw = saved();
  raw.board[2] = 1; // Incorrect user entries remain available for correction.
  raw.notes[3] = (1 << 3) | (1 << 5);
  raw.hints = 2;
  raw.checks = 3;
  raw.ended = true;
  const state = S.restore(raw);
  assert.ok(state);
  assert.equal(state.ended, false);
  assert.equal(state.board[2], 1);
  assert.equal(state.notes[3], raw.notes[3]);
  assert.equal(state.hints, 2);
  assert.equal(state.checks, 3);
  for (const key of ['givens', 'board', 'solution', 'notes']) assert.notStrictEqual(state[key], raw[key]);
  raw.board[2] = 0;
  assert.equal(state.board[2], 1);
  const completed = saved();
  completed.board = solution.slice();
  assert.equal(S.restore(completed).ended, true);
});

test('restore rejects malformed saves, changed givens, invalid solutions and ambiguous puzzles', () => {
  const mutations = [
    raw => { raw.difficulty = 'expert'; },
    raw => { raw.board = Array(81); },
    raw => { raw.board[2] = 10; },
    raw => { raw.board[0] = 0; },
    raw => { raw.givens[0] = 4; raw.board[0] = 4; },
    raw => { raw.solution[0] = 4; },
    raw => { raw.notes = Array(81); },
    raw => { raw.notes[2] = 512; },
    raw => { raw.notes[2] = 1.5; },
    raw => { raw.notes[0] = 1; },
    raw => { raw.hints = -1; },
    raw => { raw.checks = Number.MAX_SAFE_INTEGER + 1; },
    raw => { raw.hints = '0'; },
    raw => { raw.givens.fill(0); raw.board.fill(0); },
  ];
  for (const mutate of mutations) {
    const raw = saved();
    mutate(raw);
    assert.equal(S.restore(raw), null, mutate.toString());
  }
  for (const invalid of [null, undefined, [], '', 42]) assert.equal(S.restore(invalid), null);
});
