// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/jungle-logic.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
function position(pieces, turn = 0) {
  const state = L.createGame({ first: turn });
  state.board.fill(0);
  for (const [square, piece] of pieces) state.board[square] = piece;
  state.positions = [L.positionKey(state)];
  return state;
}
const allows = (s, from, to) => L.legalMoves(s).some(m => m.from === from && m.to === to);

test('starting arrangement has all sixteen unique animals and rotational symmetry', () => {
  const s = L.createGame();
  assert.equal(s.board.length, 63);
  assert.deepEqual(s.board.filter(Boolean).sort((a, b) => a - b), [-8,-7,-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,7,8]);
  for (let i = 0; i < 63; i++) assert.equal(s.board[i] || 0, -s.board[62 - i] || 0);
  assert.equal(s.board[42], 8); assert.equal(s.board[48], 1);
  assert.equal(L.NAMES[3], 'Sói'); assert.equal(L.NAMES[4], 'Chó');
  assert.equal(L.createGame({ first: 1 }).turn, 1);
  assert.equal(s.board.filter((p, i) => p && L.water(i)).length, 0);
});
test('ordinary animals move one orthogonal step and cannot enter their own den', () => {
  const s = position([[52, 5], [0, -2]]);
  assert.equal(allows(s, 52, 59), false);
  assert.equal(allows(s, 52, 45), true);
  assert.equal(allows(s, 52, 44), false);
  assert.equal(allows(s, 52, 38), false);
  s.turn = 1; s.board[10] = -2;
  assert.equal(allows(s, 10, 3), false);
});
test('higher and equal ranks capture; lower ranks and friendly captures are rejected', () => {
  for (const defender of [-3, -4]) assert.equal(allows(position([[31, 4], [38, defender], [0,-2]]), 31, 38), true);
  for (const defender of [-5, 3]) assert.equal(allows(position([[31, 4], [38, defender], [0,-2]]), 31, 38), false);
});
test('rat beats elephant on land; elephant does not beat rat outside a trap', () => {
  assert.equal(allows(position([[31, 1], [38, -8]]), 31, 38), true);
  assert.equal(allows(position([[31, 8], [38, -1]]), 31, 38), false);
});
test('only rat enters water; no capture across water/land in either direction', () => {
  assert.equal(allows(position([[21, 1], [0, -2]]), 21, 22), true);
  for (const rank of [2,3,4,5,8]) assert.equal(allows(position([[21, rank], [0,-2]]), 21, 22), false);
  assert.equal(allows(position([[22, 1], [21,-8]]), 22, 21), false);
  assert.equal(allows(position([[22, 1], [21,-1]]), 22, 21), false);
  assert.equal(allows(position([[21, 1], [22,-1]]), 21, 22), false);
  assert.equal(allows(position([[22, 1], [23,-1]]), 22, 23), true);
});
test('lion and tiger leap horizontally or vertically, preserving rank checks', () => {
  for (const rank of [6,7]) {
    assert.equal(allows(position([[21,rank],[24,-5],[0,-2]]),21,24), true);
    assert.equal(allows(position([[15,rank],[43,-5],[0,-2]]),15,43), true);
    assert.equal(allows(position([[21,rank],[24,-8],[0,-2]]),21,24), false);
  }
});
test('a rat of either side blocks every square on a river leap', () => {
  for (const square of [22,29,36]) for (const rat of [-1,1]) {
    assert.equal(allows(position([[15,7],[square,rat],[0,-2]]),15,43), false);
  }
  assert.equal(allows(position([[21,6],[23,-1],[0,-2]]),21,24), false);
  assert.equal(allows(position([[21,6],[29,-1],[0,-2]]),21,24), true, 'rat outside the leap path does not block');
});
test('hostile trap weakens defender, own trap does not, leaving restores strength', () => {
  assert.equal(allows(position([[51,2],[52,-8],[0,-1]]),51,52), true);
  assert.equal(allows(position([[9,2],[10,-8],[0,-1]]),9,10), false);
  assert.equal(allows(position([[51,8],[52,-1],[0,-2]]),51,52), true, 'trapped rat can be captured by elephant');
  assert.equal(allows(position([[10,8],[17,-7],[0,-1]]),10,17), true, 'leaving hostile trap restores strength');
});
test('entering enemy den ends round and finished states reject further moves', () => {
  const s = position([[10,2],[56,-8]]);
  assert.equal(L.move(s,10,3).ok, true);
  assert.equal(s.phase,'finished'); assert.equal(s.winner,0); assert.equal(s.reason,'den');
  const saved = JSON.stringify(s);
  assert.equal(L.move(s,56,49).ok,false); assert.equal(JSON.stringify(s),saved);
});
test('capturing last opponent wins because the opponent has no legal moves', () => {
  const s = position([[31,5],[38,-4]]);
  L.move(s,31,38);
  assert.equal(s.winner,0); assert.equal(s.reason,'no-moves');
  assert.deepEqual(s.captured,[-4]);
});
test('illegal actions do not mutate state and undo restores board, captures and repetition', () => {
  const s = position([[31,5],[38,-4],[6,-1]]), before = JSON.stringify(s);
  for (const [from,to] of [[-1,3],[31,32.2],[38,31],[31,33],[null,1]]) assert.equal(L.move(s,from,to).ok,false);
  assert.equal(JSON.stringify(s),before);
  L.move(s,31,38); assert.equal(s.captured.length,1);
  assert.equal(L.undo(s),true); assert.equal(JSON.stringify(s),before);
  assert.equal(L.undo(s),false);
});
test('threefold repetition includes the side to move and draws on the third occurrence', () => {
  const s = position([[42,2],[20,-2]]);
  for (let cycle = 0; cycle < 2; cycle++) for (const [from,to] of [[42,49],[20,13],[49,42],[13,20]]) assert.equal(L.move(s,from,to).ok,true);
  assert.equal(s.reason,'repetition'); assert.equal(s.winner,null); assert.equal(s.ply,8);
  const key = L.positionKey(s); s.turn = 1 - s.turn; assert.notEqual(L.positionKey(s),key);
});
test('100 quiet plies and 300 total plies draw, while captures reset quiet count', () => {
  for (const [field,value,reason] of [['quiet',99,'quiet'],['ply',299,'limit']]) {
    const s = position([[42,2],[20,-2]]); s[field] = value;
    L.move(s,42,49); assert.equal(s.reason,reason); assert.equal(s.winner,null);
  }
  const capture = position([[31,5],[38,-4],[6,-1]]); capture.quiet = 99;
  L.move(capture,31,38); assert.equal(capture.quiet,0); assert.equal(capture.phase,'play');
});
test('all three AI levels choose legal winning moves without mutating the source', () => {
  for (const level of ['easy','normal','hard']) {
    const s = position([[10,2],[56,-8]]), before = JSON.stringify(s);
    assert.deepEqual(L.chooseMove(s,level,rng(31)),{ from:10,to:3,capture:0,jump:false });
    assert.equal(JSON.stringify(s),before);
    const opening = L.createGame(); const action = L.chooseMove(opening,level,rng(2));
    assert.equal(allows(opening,action.from,action.to),true);
  }
});
test('200 seeded complete games preserve all animals, legal terrain and bounded termination', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const s = L.createGame({ first: seed % 2 }), random = rng(seed);
    while (s.phase === 'play') {
      const moves = L.legalMoves(s), decisive = moves.find(m => m.to === L.DENS[1 - s.turn]);
      const captures = moves.filter(m => m.capture);
      const pool = captures.length && random() < .65 ? captures : moves;
      const action = decisive || pool[Math.floor(random() * pool.length)];
      assert.ok(action,`seed ${seed} must have a legal move`);
      assert.equal(L.move(s,action.from,action.to).ok,true);
      const animals = s.board.filter(Boolean).concat(s.captured);
      assert.equal(animals.length,16); assert.equal(new Set(animals).size,16);
      s.board.forEach((p,i) => { if (p && L.water(i)) assert.equal(Math.abs(p),1); });
      assert.ok(s.ply <= 300);
    }
    assert.ok(['den','no-moves','repetition','quiet','limit'].includes(s.reason));
  }
});
