// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const X = require('../games/xiangqi-logic.js');
const at = (row, column) => row * 9 + column;
const copy = state => JSON.parse(JSON.stringify(state));
const has = (state, from, to) => X.legalMoves(state, from).some(move => move.to === to);

function position(pieces, turn = 'r') {
  const board = Array(90).fill(null);
  for (const [row, column, piece] of pieces) board[at(row, column)] = piece;
  return { board, turn, status: 'playing', winner: null, reason: null, ply: 0, lastMove: null };
}

function quiet(pieces, turn = 'r') {
  return position([[0, 4, 'bK'], [9, 4, 'rK'], [5, 4, 'rP'], ...pieces], turn);
}

test('Xiangqi starts with 32 pieces, 44 legal moves, and 1920 depth-two positions', () => {
  const state = X.create(), before = copy(state), moves = X.legalMoves(state);
  assert.equal(state.board.filter(Boolean).length, 32);
  assert.equal(state.board[4], 'bK');
  assert.equal(state.board[85], 'rK');
  assert.equal(state.turn, 'r');
  assert.equal(X.inCheck(state), false);
  assert.equal(moves.length, 44);
  let positions = 0;
  for (const move of moves) {
    assert.equal(X.move(state, move), true);
    positions += X.legalMoves(state).length;
    assert.equal(X.undo(state), true);
    assert.deepEqual(state, before);
  }
  assert.equal(positions, 1920);
  assert.equal(X.canUndo(state), false);
});

test('Chariots stop at a friendly piece or after capturing the first enemy', () => {
  const state = quiet([[5, 0, 'rR'], [5, 2, 'rP'], [5, 6, 'bP'], [2, 0, 'bC']]);
  const from = at(5, 0);
  assert.equal(has(state, from, at(5, 1)), true);
  assert.equal(has(state, from, at(5, 2)), false);
  assert.equal(has(state, from, at(5, 6)), false);
  assert.equal(has(state, from, at(2, 0)), true);
  assert.equal(has(state, from, at(1, 0)), false);
  assert.equal(has(state, from, at(4, 1)), false);
});

test('Cannons need exactly one screen to capture and no screen to move to an empty point', () => {
  const state = quiet([[5, 0, 'rC'], [5, 2, 'rP'], [5, 6, 'bR'], [5, 8, 'bN'], [2, 0, 'bN']]);
  const from = at(5, 0);
  // The default king screen on (5,4) would be a second cannon screen; remove it.
  state.board[at(5, 4)] = null;
  state.board[at(6, 4)] = 'rP';
  assert.equal(has(state, from, at(5, 1)), true);
  assert.equal(has(state, from, at(5, 3)), false);
  assert.equal(has(state, from, at(5, 6)), true);
  assert.equal(has(state, from, at(5, 8)), false);
  assert.equal(has(state, from, at(2, 0)), false);
  state.board[at(5, 2)] = 'bP'; // Either army can provide the screen.
  assert.equal(has(state, from, at(5, 6)), true);
  assert.equal(X.move(state, { from, to: at(5, 6) }), true);
  assert.equal(state.lastMove.capture, 'bR');
});

test('A horse can be blocked at its orthogonal leg by either army', () => {
  const state = quiet([[7, 4, 'rN']]), from = at(7, 4);
  assert.equal(X.legalMoves(state, from).length, 8);
  state.board[at(6, 4)] = 'rP';
  state.board[at(7, 3)] = 'rP';
  state.board[at(7, 5)] = 'bP';
  for (const [row, column] of [[5, 3], [5, 5], [6, 2], [8, 2], [6, 6], [8, 6]]) {
    assert.equal(has(state, from, at(row, column)), false);
  }
  assert.equal(has(state, from, at(9, 3)), true);
  assert.equal(has(state, from, at(9, 5)), true);
});

test('Elephants cannot cross the river or pass an occupied eye', () => {
  const red = quiet([[5, 2, 'rB']]), from = at(5, 2);
  assert.equal(has(red, from, at(3, 0)), false);
  assert.equal(has(red, from, at(3, 4)), false);
  assert.equal(has(red, from, at(7, 0)), true);
  assert.equal(has(red, from, at(7, 4)), true);
  red.board[at(6, 3)] = 'bP';
  assert.equal(has(red, from, at(7, 4)), false);
  const black = quiet([[4, 2, 'bB']], 'b');
  assert.equal(has(black, at(4, 2), at(2, 0)), true);
  assert.equal(has(black, at(4, 2), at(6, 0)), false);
});

test('Advisors move one diagonal point and generals one orthogonal point inside their palaces', () => {
  const red = quiet([[8, 4, 'rA']]);
  assert.deepEqual(X.legalMoves(red, at(8, 4)).map(move => move.to).sort((a, b) => a - b), [66, 68, 84, 86]);
  assert.equal(has(red, at(8, 4), at(8, 3)), false);
  const king = position([[0, 4, 'bK'], [7, 3, 'rK'], [5, 4, 'rP']]);
  assert.equal(has(king, at(7, 3), at(6, 3)), false);
  assert.equal(has(king, at(7, 3), at(7, 2)), false);
  assert.equal(has(king, at(7, 3), at(8, 4)), false);
  assert.equal(has(king, at(7, 3), at(7, 4)), true);
  assert.equal(has(king, at(7, 3), at(8, 3)), true);
  const black = position([[2, 5, 'bK'], [9, 4, 'rK'], [5, 4, 'rP']], 'b');
  assert.equal(has(black, at(2, 5), at(3, 5)), false);
  assert.equal(has(black, at(2, 5), at(2, 6)), false);
  assert.equal(has(black, at(2, 5), at(1, 5)), true);
});

test('Soldiers gain sideways moves only after crossing and can never retreat or promote', () => {
  const state = quiet([[5, 0, 'rP']]), from = at(5, 0);
  assert.deepEqual(X.legalMoves(state, from), [{ from, to: at(4, 0) }]);
  assert.equal(X.move(state, { from, to: at(4, 0) }), true);
  state.turn = 'r';
  assert.equal(has(state, at(4, 0), at(4, 1)), true);
  assert.equal(has(state, at(4, 0), at(3, 0)), true);
  assert.equal(has(state, at(4, 0), at(5, 0)), false);
  const finalRank = quiet([[0, 0, 'rP']]);
  assert.deepEqual(X.legalMoves(finalRank, 0), [{ from: 0, to: 1 }]);
  assert.equal(X.move(finalRank, { from: 0, to: 1 }), true);
  assert.equal(finalRank.board[1], 'rP');
  const black = quiet([[4, 0, 'bP']], 'b');
  assert.deepEqual(X.legalMoves(black, at(4, 0)), [{ from: at(4, 0), to: at(5, 0) }]);
  black.board[at(4, 0)] = null; black.board[at(5, 0)] = 'bP';
  assert.equal(has(black, at(5, 0), at(5, 1)), true);
  assert.equal(has(black, at(5, 0), at(4, 0)), false);
});

test('A move cannot expose facing generals or leave its general in check', () => {
  const facing = position([[0, 4, 'bK'], [9, 4, 'rK'], [5, 4, 'rR']]);
  assert.equal(X.inCheck(facing), false);
  assert.equal(has(facing, at(5, 4), at(5, 5)), false);
  assert.equal(has(facing, at(5, 4), at(4, 4)), true);
  facing.board[at(5, 4)] = null;
  assert.equal(X.inCheck(facing, 'r'), true);
  assert.equal(X.inCheck(facing, 'b'), true);
  const checked = position([[0, 3, 'bK'], [9, 4, 'rK'], [7, 4, 'bR'], [8, 0, 'rR']]);
  assert.equal(X.inCheck(checked), true);
  assert.equal(has(checked, at(8, 0), at(8, 1)), false);
  assert.equal(has(checked, at(8, 0), at(8, 4)), true);
  assert.equal(has(checked, at(9, 4), at(9, 3)), false);
  assert.equal(has(checked, at(9, 4), at(9, 5)), true);
});

test('Check detection respects horse legs and cannon screens', () => {
  const horse = position([[0, 3, 'bK'], [9, 4, 'rK'], [7, 3, 'bN']]);
  assert.equal(X.inCheck(horse), true);
  horse.board[at(8, 3)] = 'rP';
  assert.equal(X.inCheck(horse), false);
  const cannon = position([[0, 3, 'bK'], [9, 4, 'rK'], [2, 4, 'bC']]);
  assert.equal(X.inCheck(cannon), false);
  cannon.board[at(4, 4)] = 'rP';
  assert.equal(X.inCheck(cannon), true);
  cannon.board[at(6, 4)] = 'bP';
  assert.equal(X.inCheck(cannon), false);
});

test('The enemy general is an attack target, never a capturable move destination', () => {
  const state = position([[0, 4, 'bK'], [9, 3, 'rK'], [1, 4, 'rR']]);
  const before = copy(state);
  assert.equal(X.inCheck(state, 'b'), true);
  assert.equal(has(state, at(1, 4), at(0, 4)), false);
  assert.equal(X.move(state, { from: at(1, 4), to: at(0, 4) }), false);
  assert.deepEqual(state, before);
});

test('Checkmate ends play and undo restores the complete preceding position', () => {
  const state = position([[0, 4, 'bK'], [9, 3, 'rK'], [1, 8, 'rR'], [2, 3, 'rR']]);
  const before = copy(state);
  assert.equal(X.move(state, { from: at(2, 3), to: at(0, 3) }), true);
  assert.equal(state.status, 'won');
  assert.equal(state.winner, 'r');
  assert.equal(state.reason, 'checkmate');
  assert.equal(X.inCheck(state), true);
  assert.deepEqual(X.legalMoves(state), []);
  assert.equal(X.chooseMove(state), null);
  assert.equal(X.move(state, { from: at(0, 4), to: at(0, 5) }), false);
  assert.equal(X.undo(state), true);
  assert.deepEqual(state, before);
  assert.equal(X.canUndo(state), false);
});

test('Stalemate loses in Xiangqi even though the blocked general is not checked', () => {
  const state = position([[0, 4, 'bK'], [9, 3, 'rK'], [2, 5, 'rR'], [2, 8, 'rR']]);
  assert.equal(X.move(state, { from: at(2, 8), to: at(1, 8) }), true);
  assert.equal(X.inCheck(state), false);
  assert.equal(state.status, 'won');
  assert.equal(state.winner, 'r');
  assert.equal(state.reason, 'stalemate');
});

test('Casual threefold repetition draws and undo also rolls back its count', () => {
  const state = X.create();
  const cycle = [{ from: 82, to: 65 }, { from: 1, to: 20 }, { from: 65, to: 82 }, { from: 20, to: 1 }];
  for (let repeat = 0; repeat < 2; repeat++) {
    for (const move of cycle) assert.equal(X.move(state, move), true);
    assert.equal(state.status, repeat === 0 ? 'playing' : 'draw');
  }
  assert.equal(state.reason, 'repetition');
  assert.equal(state.winner, null);
  assert.equal(X.undo(state), true);
  assert.equal(state.status, 'playing');
  assert.equal(X.move(state, cycle[3]), true);
  assert.equal(state.status, 'draw');
  while (X.undo(state)) { /* Reset all eight half moves. */ }
  assert.deepEqual(state, X.create());
});

test('Malformed, wrong-side, and geometrically invalid requests cannot mutate state or history', () => {
  const state = X.create(), before = copy(state);
  for (const request of [null, {}, { from: -1, to: 0 }, { from: 90, to: 0 }, { from: '54', to: 45 }, { from: 54, to: '45' }, { from: 0, to: 9 }, { from: 54, to: 55 }, { from: 54, to: 54 }]) {
    assert.equal(X.move(state, request), false);
    assert.deepEqual(state, before);
    assert.equal(X.canUndo(state), false);
  }
  assert.equal(X.undo(state), false);
});

test('The computer chooses a legal move without mutating state or undo history', () => {
  const state = X.create(), before = copy(state);
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const move = X.chooseMove(state, difficulty);
    assert.ok(X.legalMoves(state).some(candidate => candidate.from === move.from && candidate.to === move.to));
    assert.deepEqual(state, before);
    assert.equal(X.canUndo(state), false);
  }
  assert.equal(X.move(state, { from: 54, to: 45 }), true);
  const afterMove = copy(state);
  X.chooseMove(state);
  assert.deepEqual(state, afterMove);
  assert.equal(X.undo(state), true);
  assert.deepEqual(state, before);
});

test('The computer takes a mate in one and avoids an immediate loss in normal mode', () => {
  const mate = position([[0, 4, 'bK'], [9, 3, 'rK'], [1, 8, 'rR'], [2, 3, 'rR']]);
  assert.equal(X.move(mate, X.chooseMove(mate)), true);
  assert.equal(mate.status, 'won');
  assert.equal(mate.winner, 'r');
  // Without this black chariot every legal move loses immediately. With it,
  // capturing the red chariot is the only move that prevents mate in one.
  const defense = position([[0, 4, 'bK'], [0, 8, 'bR'], [9, 3, 'rK'], [1, 8, 'rR'], [2, 3, 'rR']], 'b');
  const losingMove = { from: at(0, 4), to: at(0, 5) };
  assert.equal(X.move(defense, losingMove), true);
  assert.equal(X.legalMoves(defense).some(reply => {
    X.move(defense, reply);
    const won = defense.status === 'won' && defense.winner === 'r';
    X.undo(defense);
    return won;
  }), true);
  assert.equal(X.undo(defense), true);
  const move = X.chooseMove(defense);
  assert.deepEqual(move, { from: at(0, 8), to: at(1, 8) });
  assert.equal(X.move(defense, move), true);
  const canMate = X.legalMoves(defense).some(reply => {
    X.move(defense, reply);
    const won = defense.status === 'won' && defense.winner === 'r';
    X.undo(defense);
    return won;
  });
  assert.equal(canMate, false);
});
