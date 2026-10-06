// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../games/chess-logic.js');

const square = name => (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97;
const action = (from, to, promotion) => ({ from: square(from), to: square(to), ...(promotion ? { promotion } : {}) });
const play = (state, from, to, promotion) => assert.equal(C.move(state, action(from, to, promotion)), true, `${from}-${to}`);
const has = (state, from, to) => C.legalMoves(state, square(from)).some(move => move.to === square(to));
function perft(state, depth) {
  if (!depth) return 1;
  let count = 0;
  for (const move of C.legalMoves(state)) {
    assert.equal(C.move(state, move), true);
    count += perft(state, depth - 1);
    assert.equal(C.undo(state), true);
  }
  return count;
}

test('initial board and legal move tree match standard chess perft 20 / 400 / 8902', () => {
  const state = C.create(), initial = structuredClone(state);
  assert.equal(state.board.length, 64);
  assert.equal(state.board.filter(Boolean).length, 32);
  assert.equal(state.turn, 'w');
  assert.equal(state.status, 'playing');
  assert.equal(state.castling, 'KQkq');
  assert.equal(C.canUndo(state), false);
  assert.equal(perft(state, 1), 20);
  assert.equal(perft(state, 2), 400);
  assert.equal(perft(state, 3), 8902);
  assert.deepEqual(state, initial);
  assert.equal(C.canUndo(state), false);
});

test('castling-rich Kiwipete position matches perft 48 / 2039', () => {
  const state = C.fromFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assert.equal(perft(state, 1), 48);
  assert.equal(perft(state, 2), 2039);
});

test('rook and pawn endgame exercises en passant and checks: perft 14 / 191 / 2812', () => {
  const state = C.fromFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
  assert.equal(perft(state, 1), 14);
  assert.equal(perft(state, 2), 191);
  assert.equal(perft(state, 3), 2812);
});

test('invalid and out-of-turn moves never change state or history', () => {
  const state = C.create(), initial = structuredClone(state);
  for (const move of [null, {}, { from: -1, to: 22 }, { from: 99, to: 23 },
    { from: '52', to: 36 }, action('e7', 'e5'), action('e2', 'e5'), action('a1', 'a8'), action('e2', 'e4', 'Q')]) {
    assert.equal(C.move(state, move), false);
    assert.deepEqual(state, initial);
    assert.equal(C.canUndo(state), false);
  }
  assert.deepEqual(C.legalMoves(state, -1), []);
  assert.equal(C.undo(state), false);
});

test('absolute pins constrain movement and kings cannot move into attacked squares', () => {
  const state = C.fromFEN('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.equal(C.inCheck(state), false);
  assert.equal(has(state, 'e2', 'd2'), false);
  assert.equal(has(state, 'e2', 'e8'), true);
  const kings = C.fromFEN('8/8/8/8/8/4k3/8/R3K3 w - - 0 1');
  assert.equal(has(kings, 'e1', 'e2'), false);
  assert.equal(has(kings, 'e1', 'd1'), true);
  const checked = C.fromFEN('4r1k1/8/8/8/8/8/R7/4K3 w - - 0 1');
  assert.equal(C.inCheck(checked), true);
  assert.equal(has(checked, 'a2', 'a8'), false);
  assert.equal(has(checked, 'a2', 'e2'), true);
});

test('both white castling sides relocate the rook and undo exactly restores rights', () => {
  for (const [to, rookTo, rookFrom] of [['g1','f1','h1'], ['c1','d1','a1']]) {
    const state = C.fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), initial = structuredClone(state);
    play(state, 'e1', to);
    assert.equal(state.board[square(to)], 'wK');
    assert.equal(state.board[square(rookTo)], 'wR');
    assert.equal(state.board[square(rookFrom)], null);
    assert.equal(state.castling, 'kq');
    assert.equal(C.undo(state), true);
    assert.deepEqual(state, initial);
  }
  const black = C.fromFEN('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
  play(black, 'e8', 'c8');
  assert.equal(black.board[square('d8')], 'bR');
  assert.equal(black.castling, 'KQ');
});

test('castling is rejected out of check, through check, into check or without rook/rights', () => {
  for (const fen of [
    '4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1',
    '5rk1/8/8/8/8/8/8/R3K2R w KQ - 0 1',
    '6rk/8/8/8/8/8/8/R3K2R w KQ - 0 1',
    '4k3/8/8/8/8/8/8/R3K3 w KQ - 0 1',
    '4k3/8/8/8/8/8/8/R3K2R w Q - 0 1'
  ]) assert.equal(has(C.fromFEN(fen), 'e1', 'g1'), false, fen);
  const blocked = C.create();
  assert.equal(has(blocked, 'e1', 'c1'), false);
});

test('moving or capturing an original rook permanently removes only its castling right', () => {
  const state = C.fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  play(state, 'h1', 'h2');
  play(state, 'h8', 'h7');
  play(state, 'h2', 'h1');
  assert.equal(state.castling, 'Qq');
  const capture = C.fromFEN('r3k2r/1B6/8/8/8/8/8/R3K2R w KQkq - 0 1');
  play(capture, 'b7', 'a8');
  assert.equal(capture.castling, 'KQk');
});

test('en passant captures the bypassed pawn, expires and undoes completely', () => {
  const state = C.fromFEN('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  play(state, 'd7', 'd5');
  const initial = structuredClone(state);
  assert.equal(state.enPassant, square('d6'));
  play(state, 'e5', 'd6');
  assert.equal(state.board[square('d5')], null);
  assert.equal(state.board[square('d6')], 'wP');
  assert.equal(state.lastMove.capture, 'bP');
  assert.equal(state.halfmove, 0);
  C.undo(state);
  assert.deepEqual(state, initial);
  play(state, 'e1', 'f1');
  assert.equal(state.enPassant, null);
  play(state, 'e8', 'f8');
  assert.equal(has(state, 'e5', 'd6'), false);
});

test('en passant exposing a rook attack on own king is illegal', () => {
  const state = C.fromFEN('8/8/8/r4pPK/8/8/8/4k3 w - f6 0 1');
  assert.equal(C.inCheck(state), false);
  assert.equal(has(state, 'g5', 'f6'), false);
  assert.ok(state.positions[0].endsWith(':-'));
  const legal = C.fromFEN('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
  assert.ok(legal.positions[0].endsWith(':' + square('d6')));
});

test('all four promotions are legal, default is queen, capturing promotion works and undoes', () => {
  for (const promotion of ['Q','R','B','N']) {
    const state = C.fromFEN('4k2r/6P1/8/8/8/8/8/4K3 w - - 0 1'), initial = structuredClone(state);
    assert.equal(C.legalMoves(state, square('g7')).length, 8);
    play(state, 'g7', 'h8', promotion);
    assert.equal(state.board[square('h8')], 'w' + promotion);
    assert.equal(state.lastMove.capture, 'bR');
    assert.equal(state.lastMove.promotion, promotion);
    C.undo(state);
    assert.deepEqual(state, initial);
  }
  const state = C.fromFEN('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(C.move(state, action('a7', 'a8', 'K')), false);
  play(state, 'a7', 'a8');
  assert.equal(state.board[square('a8')], 'wQ');
});

test('Fool\'s mate ends play and undo reopens the exact previous position', () => {
  const state = C.create();
  play(state, 'f2', 'f3'); play(state, 'e7', 'e5'); play(state, 'g2', 'g4');
  const initial = structuredClone(state);
  play(state, 'd8', 'h4');
  assert.equal(state.status, 'won');
  assert.equal(state.winner, 'b');
  assert.equal(state.reason, 'checkmate');
  assert.equal(C.inCheck(state), true);
  assert.deepEqual(C.legalMoves(state), []);
  assert.equal(C.chooseMove(state), null);
  assert.equal(C.move(state, action('e1', 'f2')), false);
  C.undo(state);
  assert.deepEqual(state, initial);
});

test('stalemate is a draw while bare kings, single minor and same-color bishops are dead positions', () => {
  const stale = C.fromFEN('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
  assert.equal(stale.status, 'draw');
  assert.equal(stale.reason, 'stalemate');
  assert.equal(C.inCheck(stale), false);
  for (const fen of [
    '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
    '4k3/8/8/8/8/8/8/2B1K3 w - - 0 1',
    '4k3/8/8/8/8/8/8/2N1K3 w - - 0 1',
    '4kb2/8/8/8/8/8/8/2B1K3 w - - 0 1'
  ]) assert.equal(C.fromFEN(fen).reason, 'insufficient-material');
  for (const fen of [
    '4k3/8/8/8/8/8/8/1NN1K3 w - - 0 1',
    '2b1k3/8/8/8/8/8/8/2B1K3 w - - 0 1'
  ]) assert.equal(C.fromFEN(fen).status, 'playing');
});

test('third repetition draws automatically and undo restores repetition counters', () => {
  const state = C.create();
  for (let cycle = 0; cycle < 2; cycle++) {
    play(state, 'g1', 'f3'); play(state, 'g8', 'f6'); play(state, 'f3', 'g1'); play(state, 'f6', 'g8');
    assert.equal(state.status, cycle === 0 ? 'playing' : 'draw');
  }
  assert.equal(state.reason, 'threefold-repetition');
  assert.equal(state.positions.length, 9);
  C.undo(state);
  assert.equal(state.status, 'playing');
  assert.equal(state.positions.length, 8);
  play(state, 'f6', 'h5');
  assert.equal(state.status, 'playing');
});

test('fifty-move draw triggers after 100 quiet plies; pawn move and capture reset the clock', () => {
  const state = C.fromFEN('4k3/8/8/8/8/8/8/R3K3 w - - 99 50');
  play(state, 'a1', 'a2');
  assert.equal(state.reason, 'fifty-move');
  C.undo(state);
  assert.equal(state.halfmove, 99);
  assert.equal(state.status, 'playing');
  const pawn = C.fromFEN('4k3/8/8/8/8/8/P7/4K3 w - - 99 50');
  play(pawn, 'a2', 'a3');
  assert.equal(pawn.halfmove, 0);
  assert.equal(pawn.status, 'playing');
  const capture = C.fromFEN('4k3/8/8/8/8/8/n7/R3K3 w - - 99 50');
  play(capture, 'a1', 'a2');
  assert.equal(capture.halfmove, 0);
});

test('checkmate takes precedence over the automatic fifty-move draw', () => {
  const state = C.fromFEN('7k/5K2/8/6Q1/8/8/8/8 w - - 99 50');
  play(state, 'g5', 'g7');
  assert.equal(state.status, 'won');
  assert.equal(state.reason, 'checkmate');
});

test('AI returns legal moves at all difficulties without changing state or undo history', () => {
  const state = C.create(), initial = structuredClone(state), valid = C.legalMoves(state);
  for (const level of ['easy', 'normal', 'hard']) {
    const chosen = C.chooseMove(state, level);
    assert.ok(valid.some(move => JSON.stringify(move) === JSON.stringify(chosen)), level);
    assert.deepEqual(state, initial);
    assert.equal(C.canUndo(state), false);
  }
  const mate = C.fromFEN('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1');
  const chosen = C.chooseMove(mate);
  assert.equal(C.move(mate, chosen), true);
  assert.equal(mate.reason, 'checkmate');
});

test('FEN parser rejects malformed dimensions, pieces, kings, side and counters', () => {
  for (const fen of [null, '', '8/8 w - -',
    '4k3/8/8/8/8/8/8/9K w - - 0 1',
    '4k3/8/8/8/8/8/8/4X3 w - - 0 1',
    '8/8/8/8/8/8/8/4K3 w - - 0 1',
    '4k3/8/8/8/8/8/8/4K3 x - - 0 1',
    '4k3/8/8/8/8/8/8/4K3 w xyz - 0 1',
    '4k3/8/8/8/8/8/8/4K3 w - e9 0 1',
    '4k3/8/8/8/8/8/8/4K3 w - - -1 1'
  ]) assert.throws(() => C.fromFEN(fen), TypeError);
});
