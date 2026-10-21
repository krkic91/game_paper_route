// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/reversi-logic.js');
const random = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
// Independent oracle: scan straight segments from every empty square to each
// friendly endpoint, rather than sharing the implementation's direction loop.
function oracle(board, player) {
  const moves = [];
  for (let cell = 0; cell < 64; cell++) {
    if (board[cell]) continue;
    const flips = new Set();
    for (let end = 0; end < 64; end++) {
      if (board[end] !== player) continue;
      const dr = Math.floor(end / 8) - Math.floor(cell / 8), dc = end % 8 - cell % 8;
      if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) continue;
      const length = Math.max(Math.abs(dr), Math.abs(dc));
      if (length < 2) continue;
      const segment = [];
      for (let step = 1; step < length; step++) segment.push((Math.floor(cell / 8) + Math.sign(dr) * step) * 8 + cell % 8 + Math.sign(dc) * step);
      if (segment.every(index => board[index] === -player)) for (const index of segment) flips.add(index);
    }
    if (flips.size) moves.push({ index: cell, flips: [...flips].sort((a, b) => a - b) });
  }
  return moves;
}
const normalized = moves => moves.map(m => ({ index: m.index, flips: [...m.flips].sort((a, b) => a - b) }));
function passPosition() {
  const s = L.createGame({ mode: 'local' });
  s.board = [-1,-1,-1,-1,-1,-1,-1,0,-1,1,1,1,-1,-1,-1,-1,-1,1,1,-1,1,-1,-1,-1,-1,1,1,1,-1,1,-1,-1,-1,1,-1,-1,1,-1,1,1,-1,-1,-1,-1,-1,1,-1,0,-1,-1,-1,-1,-1,-1,1,1,-1,1,1,1,1,1,1,1];
  return s;
}
test('standard initial position, options and known first moves', () => {
  const s = L.createGame({ mode: 'local', human: -1, level: 'hard' });
  assert.equal(s.current, 1); assert.equal(s.mode, 'local'); assert.equal(s.human, -1); assert.equal(s.level, 'hard');
  assert.deepEqual(L.counts(s), { black: 2, white: 2, empty: 60 });
  assert.deepEqual(L.legalMoves(s).map(m => m.index), [19, 26, 37, 44]);
  assert.deepEqual(L.legalMoves(s, -1).map(m => m.index), [20, 29, 34, 43]);
  assert.equal(L.coordinate(0), 'A1'); assert.equal(L.coordinate(63), 'H8');
});
test('all eight directions flip simultaneously', () => {
  const s = L.createGame(); s.board.fill(0);
  for (const dr of [-1, 0, 1]) for (const dc of [-1, 0, 1]) if (dr || dc) {
    s.board[(3 + dr) * 8 + 3 + dc] = -1; s.board[(3 + dr * 2) * 8 + 3 + dc * 2] = 1;
  }
  assert.equal(L.flipsAt(s.board, 27, 1).length, 8);
  const action = L.play(s, 27); assert.equal(action.flips.length, 8);
  assert.deepEqual(L.counts(s), { black: 17, white: 0, empty: 47 });
  assert.equal(s.phase, 'finished'); assert.equal(s.winner, 1);
});
test('gaps, unclosed lines and row wrapping do not capture', () => {
  const board = Array(64).fill(0); board[1] = -1; board[3] = 1;
  assert.deepEqual(L.flipsAt(board, 0, 1), []);
  board.fill(0); board[7] = -1; board[8] = 1;
  assert.deepEqual(L.flipsAt(board, 6, 1), []);
  board.fill(0); board[1] = board[2] = -1;
  assert.deepEqual(L.flipsAt(board, 0, 1), []);
});
test('invalid moves and malformed indices leave all state untouched', () => {
  const s = L.createGame(), before = JSON.stringify(s);
  for (const index of [-1, 64, 2.5, NaN, undefined, '19', 27, 0]) {
    assert.equal(L.play(s, index).ok, false); assert.equal(JSON.stringify(s), before);
  }
  assert.deepEqual(L.flipsAt(s.board, 19, 0), []);
  assert.equal(L.undo(s), false); assert.equal(L.undo(s, 0), false);
});
test('valid move changes only placed/captured cells and updates turn', () => {
  const s = L.createGame(); const before = s.board.slice();
  assert.deepEqual(L.play(s, 19), { ok: true, index: 19, player: 1, flips: [27], passed: null });
  assert.equal(s.current, -1); assert.equal(s.turn, 1); assert.equal(s.lastMove, 19);
  for (let i = 0; i < 64; i++) assert.equal(s.board[i], [19, 27].includes(i) ? 1 : before[i]);
});
test('automatic pass occurs only when next side has no legal move', () => {
  const s = passPosition(); assert.equal(L.play(s, 47).ok, true);
  assert.equal(s.passed, -1); assert.equal(s.current, 1); assert.equal(s.phase, 'play');
  assert.deepEqual(oracle(s.board, -1), []); assert.ok(oracle(s.board, 1).length);
  const explanation = L.explainMove(passPosition(), L.legalMoves(passPosition()).find(m => m.index === 47));
  assert.match(explanation, /đi tiếp/);
  assert.equal(L.play(s, 7).ok, true); assert.equal(s.phase, 'finished');
});
test('both sides without moves end early; empty squares are unscored', () => {
  const s = L.createGame(); s.board.fill(0); s.board[1] = -1; s.board[2] = 1;
  L.play(s, 0); assert.equal(s.phase, 'finished'); assert.equal(s.winner, 1);
  assert.deepEqual(L.counts(s), { black: 3, white: 0, empty: 61 });
  const before = JSON.stringify(s); assert.equal(L.play(s, 3).ok, false); assert.equal(JSON.stringify(s), before);
});
test('full-board ties and white victories use actual final disc counts', () => {
  const s = L.createGame(); s.board.fill(-1); for (let i = 2; i < 32; i++) s.board[i] = 1; s.board[0] = 0;
  L.play(s, 0); assert.equal(s.phase, 'finished'); assert.equal(s.winner, 0);
  assert.deepEqual(L.counts(s), { black: 32, white: 32, empty: 0 });
  const white = L.createGame(); white.board.fill(-1); white.board[0] = 0; white.board[1] = 1; white.current = -1;
  L.play(white, 0); assert.equal(white.winner, -1);
});
test('undo one, paired replies and terminal automatic passes restore exact state', () => {
  const s = L.createGame(), before = JSON.stringify(s);
  L.play(s, 19); L.play(s, L.legalMoves(s)[0].index); assert.equal(L.undo(s, 2), true);
  assert.equal(JSON.stringify(s), before);
  const pass = passPosition(), snapshot = JSON.stringify(pass); L.play(pass, 47); L.play(pass, 7);
  L.undo(pass, 2); assert.equal(JSON.stringify(pass), snapshot);
});
test('AI levels and hint are legal, deterministic and do not mutate input', () => {
  const s = L.createGame(); const rand = random(72);
  for (let turn = 0; turn < 42; turn++) {
    if (turn % 7 === 0) for (const level of ['easy', 'medium', 'hard']) {
      const before = JSON.stringify(s), move = L.chooseMove(s, level);
      assert.ok(L.legalMoves(s).some(m => m.index === move.index));
      assert.equal(JSON.stringify(s), before); assert.match(L.explainMove(s, move), /lật/);
    }
    const moves = L.legalMoves(s); L.play(s, moves[Math.floor(rand() * moves.length)].index);
  }
  const corner = L.createGame(); corner.board.fill(0); corner.board[1] = -1; corner.board[2] = 1;
  assert.equal(L.chooseMove(corner, 'hard').index, 0); assert.match(L.explainMove(corner, L.chooseMove(corner)), /Chiếm góc/);
  L.play(corner, 0); assert.equal(L.chooseMove(corner), null);
});
test('200 seeded full games agree with independent oracle, conserve discs and terminate', () => {
  let skipped = 0, early = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const s = L.createGame(), rand = random(seed); let turn = 0;
    while (s.phase === 'play') {
      const expected = oracle(s.board, s.current), actual = L.legalMoves(s);
      assert.deepEqual(normalized(actual), expected, `seed ${seed}, turn ${turn}`);
      assert.ok(expected.length); const move = expected[Math.floor(rand() * expected.length)], player = s.current;
      const old = s.board.slice(), oldCounts = L.counts(s);
      L.play(s, move.index); turn++;
      for (let i = 0; i < 64; i++) assert.equal(s.board[i], i === move.index || move.flips.includes(i) ? player : old[i]);
      const counts = L.counts(s); assert.equal(counts.empty, oldCounts.empty - 1); assert.equal(counts.black + counts.white, turn + 4);
      if (s.passed !== null) { skipped++; assert.equal(oracle(s.board, s.passed).length, 0); assert.ok(oracle(s.board, s.current).length); }
      assert.ok(turn <= 60);
    }
    assert.equal(oracle(s.board, 1).length, 0); assert.equal(oracle(s.board, -1).length, 0);
    const counts = L.counts(s); if (counts.empty) early++;
    assert.equal(s.winner, Math.sign(counts.black - counts.white));
  }
  assert.ok(skipped > 0); assert.ok(early > 0);
});
