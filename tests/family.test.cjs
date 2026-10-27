'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../games/draughts-logic.js');
const M = require('../games/match3-logic.js');
const P = require('../games/phom-logic.js');
const K = require('../games/penalty-logic.js');
const W = require('../games/wordchain-logic.js');
const F = require('../games/fishing-logic.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

test('draughts: 12 pieces each, legal opening, invalid paths leave state untouched', () => {
  const s = D.createGame();
  assert.equal(s.board.filter(p => p === 1).length, 12); assert.equal(s.board.filter(p => p === -1).length, 12);
  assert.equal(D.legalMoves(s).length, 7); const before = JSON.stringify(s);
  for (const path of [null, [], [40, 32], [41, 24], ['41', 32]]) { assert.equal(D.play(s, path).ok, false); assert.equal(JSON.stringify(s), before); }
  assert.equal(D.play(s, [40, 33]).ok, true); assert.equal(s.current, -1);
  D.undo(s); assert.equal(JSON.stringify(s), before);
});
test('draughts: compulsory multiple capture, free choice of branch, no partial moves', () => {
  const s = D.createGame(); s.board.fill(0); s.board[42] = 1; for (const i of [33, 17, 35, 19, 7]) s.board[i] = -1;
  const paths = D.legalMoves(s).map(m => m.path);
  assert.deepEqual(paths, [[42, 24, 10], [42, 28, 10]]);
  assert.equal(D.play(s, [42, 24]).ok, false);
  assert.equal(D.play(s, [42, 24, 10]).ok, true); assert.equal(s.board[33], 0); assert.equal(s.board[17], 0); assert.equal(s.board[35], -1);
});
test('draughts: promotion ends capture, kings cannot fly, immobility loses', () => {
  const s = D.createGame(); s.board.fill(0); s.board[17] = 1; s.board[10] = s.board[12] = -1;
  assert.deepEqual(D.legalMoves(s).map(m => m.path), [[17, 3]]);
  D.play(s, [17, 3]); assert.equal(s.board[3], 2); assert.equal(s.board[12], -1);
  const t = D.createGame(); t.board.fill(0); t.board[42] = 2; t.board[7] = -1;
  assert.equal(D.legalMoves(t).length, 4); assert.equal(D.play(t, [42, 21]).ok, false);
  t.board[7] = 0; t.board[33] = -1; D.play(t, [42, 24]); assert.equal(t.winner, 1); assert.equal(t.phase, 'finished');
});
test('draughts: threefold repetition and 80 quiet king plies are automatic draws', () => {
  const s = D.createGame(); s.board.fill(0); s.board[56] = 2; s.board[7] = -2; s.positions = [`1:${s.board.join(',')}`];
  for (let cycle = 0; cycle < 2; cycle++) for (const path of [[56,49],[7,14],[49,56],[14,7]]) assert.ok(D.play(s, path).ok);
  assert.equal(s.winner, 0); assert.equal(s.phase, 'finished');
  const t = D.createGame(); t.board.fill(0); t.board[56] = 2; t.board[7] = -2; t.quiet = 79;
  D.play(t, [56,49]); assert.equal(t.winner, 0);
});
test('draughts: minimax returns legal paths without mutating the game', () => {
  const s = D.createGame(); const random = rng(23);
  for (let n = 0; n < 35 && s.phase === 'play'; n++) {
    const before = JSON.stringify(s), move = D.chooseMove(s, n % 2 ? 'easy' : 'medium');
    assert.equal(JSON.stringify(s), before); assert.ok(D.legalMoves(s).some(m => JSON.stringify(m.path) === JSON.stringify(move.path)));
    const available = D.legalMoves(s); D.play(s, n % 2 ? available[Math.floor(random() * available.length)].path : move.path);
  }
});

test('match3: generated boards are stable and playable, including constant RNGs', () => {
  for (const random of [() => 0, () => 0.99999, ...Array.from({ length: 40 }, (_, i) => rng(i))]) {
    const board = M.generate(random); assert.equal(board.length, 64); assert.deepEqual(M.matches(board), []); assert.ok(M.moves(board).length);
    assert.ok(board.every(v => Number.isInteger(v) && v >= 0 && v < 6));
  }
});
test('match3: crossing lines count each gem once, cannot wrap rows or waste a move', () => {
  const board = Array.from({ length: 64 }, (_, i) => i);
  for (const i of [26,27,28,19,35]) board[i] = 99;
  assert.deepEqual(M.matches(board).sort((a,b)=>a-b), [19,26,27,28,35]);
  const s = M.createGame(rng(8)), before = JSON.stringify(s);
  for (const pair of [[7,8],[0,63],[-1,0],[0,0],[1.1,2]]) { assert.equal(M.swap(s, ...pair), false); assert.equal(JSON.stringify(s), before); }
});
test('match3: complete 30-turn games settle, score cascades and retain valid boards', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const random = rng(seed), s = M.createGame(random); let earned = 0;
    for (let turn = 0; turn < 30; turn++) {
      const move = M.moves(s.board)[0]; assert.ok(M.swap(s, ...move));
      assert.equal(M.swap(s, ...move), false);
      let limit = 0;
      while (s.phase === 'cascade' && limit++ < 35) { const result = M.cascade(s, random); earned += result.points || 0; }
      assert.ok(limit < 35); assert.deepEqual(M.matches(s.board), []); assert.ok(M.moves(s.board).length);
      assert.equal(s.movesLeft, 29 - turn); assert.equal(s.score, earned);
    }
    assert.equal(s.phase, 'finished'); assert.equal(M.swap(s, ...M.moves(s.board)[0]), false);
  }
});

test('phom: meld definitions, low ace, overlapping runs and sets solved exactly', () => {
  assert.equal(P.isMeld([0,1,2]), true); assert.equal(P.isMeld([0,13,26]), true);
  assert.equal(P.isMeld([11,12,0]), false); assert.equal(P.isMeld([1,1,1]), false); assert.equal(P.isMeld([0,14,28]), false);
  const result = P.layout([4,5,6,19,32,45]); assert.equal(result.points, 0); assert.equal(result.melds.length, 2);
  assert.equal(P.layout([6,19,32], [6,19]), null, 'two eaten cards may not share a meld');
  assert.equal(P.layout([6,19,32], [50]), null);
});
test('phom: taking requires a protected meld; drawing twice and discarding eaten cards fail', () => {
  const s = P.createGame(rng(1)); s.phase = 'draw'; s.current = 1; s.hands[1] = [6,19,0,1,8,24,38,49,51];
  s.last = { player: 0, card: 32 }; s.discards[0] = [32];
  assert.equal(P.canTake(s), true); assert.equal(P.draw(s, true), true); assert.ok(s.eaten[1].includes(32)); assert.equal(s.discards[0].length, 0);
  const before = JSON.stringify(s); assert.equal(P.draw(s), false); assert.equal(P.discard(s, 32), false); assert.equal(JSON.stringify(s), before);
  assert.ok(P.discards(s).every(c => P.layout(s.hands[1].filter(x => x !== c), s.eaten[1])));
});
test('phom: full four-player games conserve all 52 cards and always terminate', () => {
  for (let seed = 0; seed < 18; seed++) {
    const s = P.createGame(rng(seed)); let actions = 0;
    assert.deepEqual(s.hands.map(h => h.length), [10,9,9,9]); assert.equal(s.stock.length, 15);
    while (s.phase !== 'finished' && actions++ < 40) {
      const before = JSON.stringify(s), command = P.chooseMove(s); assert.equal(JSON.stringify(s), before);
      assert.ok(command.type === 'draw' ? P.draw(s, command.take) : P.discard(s, command.card));
      const cards = [...s.stock, ...s.hands.flat(), ...s.discards.flat(), ...s.melds.flat(2)];
      assert.equal(cards.length, 52); assert.equal(new Set(cards).size, 52);
      for (let p = 0; p < 4; p++) if (!s.laid[p]) assert.ok(P.layout(s.hands[p], s.eaten[p]));
    }
    assert.equal(s.phase, 'finished'); assert.ok(actions <= 31); assert.ok(s.winner >= 0 && s.winner < 4);
    if (s.results.type === 'points') { assert.deepEqual(s.turns, [4,4,4,4]); assert.ok(s.results.ranking.length === 4); }
  }
});
test('phom: heuristic never inspects hidden opponent hands or the stock order', () => {
  const s = P.createGame(rng(111)), command = P.chooseMove(s);
  for (let p = 1; p < 4; p++) s.hands[p].reverse(); s.stock.reverse();
  assert.deepEqual(P.chooseMove(s), command);
  for (let p = 1; p < 4; p++) s.hands[p] = new Proxy([], { get() { throw Error('Hidden hand accessed'); } });
  s.stock = new Proxy([], { get() { throw Error('Hidden stock accessed'); } });
  assert.deepEqual(P.chooseMove(s), command);
});
test('phom: final lay sends to an earlier meld, including chained extensions and a sending win', () => {
  const s = P.createGame(rng(2)); s.current = 1; s.phase = 'discard'; s.turns[1] = 3;
  s.laid[0] = true; s.melds[0] = [[0,1,2]]; s.hands[0] = [50];
  s.hands[1] = [6,19,32,4,3,51]; s.eaten[1] = [19];
  assert.ok(P.discard(s, 51));
  assert.deepEqual(s.melds[0][0], [0,1,2,3,4]); assert.equal(s.hands[1].length, 0);
  assert.equal(s.winner, 1); assert.equal(s.results.type, 'u'); assert.deepEqual(s.sent, [{ from: 1, to: 0, card: 3 }, { from: 1, to: 0, card: 4 }]);
});
test('phom: points favor a meld over mom and equal scores favor the earlier seat', () => {
  const s = P.createGame(rng(4)); s.current = 3; s.phase = 'discard'; s.turns = [4,4,4,3]; s.laid = [true,true,true,false];
  s.melds = [[],[[0,1,2]],[[13,14,15]],[]]; s.hands = [[0],[12],[25],[3,17,31,51]]; s.eaten = [[],[],[],[]];
  assert.ok(P.discard(s, 51)); assert.equal(s.phase, 'finished'); assert.equal(s.winner, 1);
  assert.deepEqual(s.results.ranking.slice(0,2), [1,2]); assert.equal(s.results.scores[0], 1);
});

test('penalty: early clinch at 3–0 after three kicks each, no extra kicks after final', () => {
  const s = K.createGame();
  for (let i = 0; i < 3; i++) { assert.ok(K.kick(s, 0, 1)); assert.ok(K.kick(s, 0, 0)); }
  assert.equal(s.phase, 'finished'); assert.equal(s.winner, 0); assert.deepEqual(s.scores, [3,0]);
  const before = JSON.stringify(s); assert.equal(K.kick(s, 0, 1), false); assert.equal(JSON.stringify(s), before);
});
test('penalty: tied regulation enters sudden death and must complete each pair', () => {
  const s = K.createGame('local'); for (let i = 0; i < 10; i++) assert.ok(K.kick(s, 0, 1));
  assert.equal(s.phase, 'play'); K.kick(s, 0, 1); assert.equal(s.phase, 'play');
  K.kick(s, 0, 0); assert.equal(s.phase, 'finished'); assert.equal(s.winner, 0);
  const t = K.createGame(); for (const v of [-1,6,1.2,undefined,'1']) assert.equal(K.kick(t, v, 0), false);
  assert.deepEqual(t.kicks, [[],[]]);
});

test('wordchain: curated entries are normalized two-syllable words, starts have continuations', () => {
  assert.ok(W.WORDS.length >= 150); assert.equal(new Set(W.WORDS).size, W.WORDS.length);
  assert.ok(W.WORDS.every(w => w.split(' ').length === 2 && W.normalize(w) === w));
  for (let i = 0; i < 10; i++) assert.ok(W.candidates(W.createGame(() => i / 10)).length);
  assert.equal(W.normalize('  HỌC   SINH  '), 'học sinh'); assert.equal(W.normalize('học sinh'.normalize('NFD')), 'học sinh');
});
test('wordchain: invalid/reused words rejected without mutation, hints limited, timers expire', () => {
  const s = W.createGame(() => 0), before = JSON.stringify(s);
  assert.equal(W.submit(s, '<img src=x>').ok, false); assert.equal(W.submit(s, 'nhà cửa').ok, false); assert.equal(JSON.stringify(s), before);
  assert.equal(W.submit(s, 'SINH NHẬT').ok, true); assert.equal(s.score, 10); assert.equal(s.word, 'nhật ký');
  for (let i = 0; i < 3; i++) assert.ok(W.hint(s)); assert.equal(W.hint(s), null); assert.equal(s.score, 0);
  s.word = 'học sinh'; const repeated = JSON.stringify(s); assert.equal(W.submit(s, 'sinh nhật').ok, false); assert.equal(JSON.stringify(s), repeated);
  W.tick(s, 100); assert.equal(s.phase, 'finished'); assert.equal(s.seconds, 0); assert.equal(W.submit(s, 'sinh nhật').ok, false);
});
test('wordchain: dictionary play never repeats and terminates finitely', () => {
  for (let seed = 0; seed < 15; seed++) {
    const random = rng(seed), s = W.createGame(random); let n = 0;
    while (s.phase === 'play' && n++ < 500) { assert.ok(W.submit(s, W.candidates(s)[0], random).ok); }
    assert.equal(s.phase, 'finished'); assert.equal(new Set(s.used).size, s.used.length); assert.ok(s.turns > 0);
  }
});

test('fishing: cast, bite window, successful controlled reel and no repeated reward', () => {
  const s = F.createGame(); F.action(s, () => 0); F.tick(s, 0.1); F.action(s, () => 0);
  assert.equal(s.phase, 'waiting'); assert.equal(F.action(s), false);
  for (let i = 0; i < 20; i++) F.tick(s, 0.1);
  assert.equal(s.phase, 'bite'); F.action(s);
  let rewards = 0;
  for (let i = 0; i < 200; i++) { const event = F.tick(s, 0.05, s.tension < 0.5); if (event) rewards++; }
  assert.equal(s.phase, 'caught'); assert.equal(s.catches, 1); assert.equal(rewards, 1); assert.equal(s.score, F.FISH[0].points);
  F.action(s); assert.equal(s.phase, 'aim'); assert.equal(s.score, F.FISH[0].points);
});
test('fishing: missing a bite or holding the reel too long releases fish without a reward', () => {
  const s = F.createGame(); F.action(s); F.action(s, () => 0);
  for (let i = 0; i < 60; i++) F.tick(s, 0.1); assert.equal(s.phase, 'escaped'); assert.equal(s.score, 0);
  F.action(s); F.action(s, () => 0); for (let i = 0; i < 16; i++) F.tick(s, 0.1); F.action(s);
  for (let i = 0; i < 50; i++) F.tick(s, 0.1, true); assert.equal(s.phase, 'escaped'); assert.equal(s.score, 0);
});
