// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/blocks-logic.js');
function rng(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function game(seed = 1) { return L.createGame({ random: rng(seed) }); }
function piece(state, kind, x, y, rotation = 0) { state.active = { kind, x, y, rotation }; state.gravityTime = 0; state.lockTime = 0; }
function seconds(state, duration) { for (let i = 0; i < Math.round(duration * 120); i++) L.advance(state, 1 / 120); }
test('10 × 20 empty well, four cells per shape, three queued previews', () => {
  const s = game(); assert.equal(s.board.length, 20); assert.equal(s.board[0].length, 10); assert.ok(s.queue.length >= 3);
  for (const kind of L.KINDS) for (let rotation = 0; rotation < 4; rotation++) {
    const cells = L.cells({ kind, rotation, x: 3, y: 0 });
    assert.equal(cells.length, 4); assert.equal(new Set(cells.map(c => `${c.x}:${c.y}`)).size, 4);
  }
});
test('each consecutive seven drawn pieces contain all seven shapes', () => {
  const s = game(), drawn = [];
  for (let i = 0; i < 140; i++) {
    drawn.push(s.active.kind); L.hardDrop(s); s.board.forEach(row => row.fill(null));
    assert.equal(s.phase, 'play');
  }
  for (let i = 0; i < drawn.length; i += 7) assert.deepEqual(drawn.slice(i, i + 7).sort(), [...L.KINDS].sort());
});
test('four rotations return to orientation, inverse rotates undo and O does not drift', () => {
  for (const kind of L.KINDS) {
    const s = game(); piece(s, kind, 3, 5); const initial = L.cells(s.active);
    for (let i = 0; i < 4; i++) L.rotate(s, 1);
    assert.deepEqual(L.cells(s.active), initial);
    L.rotate(s, 1); L.rotate(s, -1); assert.deepEqual(L.cells(s.active), initial);
  }
});
test('wall and floor kicks preserve legal cells; blocked rotations and moves are rejected', () => {
  const s = game(); piece(s, 'I', -2, 6, 1);
  assert.equal(L.collides(s, s.active), false); assert.equal(L.rotate(s, 1), true); assert.equal(L.collides(s, s.active), false);
  piece(s, 'T', 3, 18); assert.equal(L.rotate(s, 1), true); assert.equal(L.collides(s, s.active), false);
  piece(s, 'O', 0, 18); assert.equal(L.move(s, -1), false);
  s.board.forEach(row => row.fill('J')); piece(s, 'T', 3, 8);
  assert.equal(L.rotate(s, 1), false); assert.equal(L.move(s, 1), false);
});
test('ghost settles exactly above a blocker and hard drop uses that position', () => {
  const s = game(); piece(s, 'O', 4, 0); s.board[15][4] = 'J';
  assert.equal(L.ghostY(s), 13); assert.equal(L.hardDrop(s), true);
  assert.equal(s.board[13][4], 'O'); assert.equal(s.board[14][5], 'O'); assert.equal(s.score, 26); assert.equal(s.pieces, 1);
});
test('soft drop earns one point, cannot enter floor and does not lock immediately', () => {
  const s = game(); piece(s, 'O', 4, 17);
  assert.equal(L.softDrop(s), true); assert.equal(s.score, 1); assert.equal(s.active.y, 18);
  assert.equal(L.softDrop(s), false); assert.equal(s.pieces, 0);
  seconds(s, 0.49); assert.equal(s.pieces, 0); seconds(s, 0.02); assert.equal(s.pieces, 1);
});
test('single, double, triple and four-row clears preserve board and award distinct scores', () => {
  for (let count = 1; count <= 4; count++) {
    const s = game(); piece(s, 'I', 2, 16, 1);
    for (let y = 20 - count; y < 20; y++) s.board[y] = Array.from({ length: 10 }, (_, x) => x === 4 ? null : 'J');
    L.hardDrop(s); assert.equal(s.lines, count); assert.equal(s.score, [0, 100, 300, 500, 800][count]);
    assert.equal(s.board.flat().filter(Boolean).length, 4 - count); assert.equal(s.board.length, 20);
  }
});
test('combos require successive clearing pieces and level rises each ten lines', () => {
  const s = game(); s.lines = 9;
  const clear = () => { s.board.forEach(row => row.fill(null)); s.board[19] = Array.from({ length: 10 }, (_, x) => x >= 3 && x <= 6 ? null : 'S'); piece(s, 'I', 3, 18); L.hardDrop(s); };
  clear(); assert.equal(s.level, 2); assert.equal(s.score, 100); assert.equal(s.combo, 0);
  clear(); assert.equal(s.score, 400); assert.equal(s.combo, 1);
  s.board.forEach(row => row.fill(null)); L.hardDrop(s); assert.equal(s.combo, -1);
});
test('hold consumes one queue piece only when empty, swaps thereafter, at most once per piece', () => {
  const s = game(), first = s.active.kind, second = s.queue[0];
  assert.equal(L.hold(s), true); assert.equal(s.hold, first); assert.equal(s.active.kind, second); assert.equal(L.hold(s), false);
  L.hardDrop(s); const current = s.active.kind, queue = s.queue.slice();
  assert.equal(L.hold(s), true); assert.equal(s.active.kind, first); assert.equal(s.hold, current); assert.deepEqual(s.queue, queue);
  assert.equal(s.active.rotation, 0); assert.equal(s.holdUsed, true);
});
test('lock-out above the visible well and obstructed spawn both end the game', () => {
  const s = game(); piece(s, 'T', 3, -1); s.board[1].fill('S');
  L.hardDrop(s); assert.equal(s.phase, 'over'); assert.equal(s.pieces, 0);
  const spawn = game(); spawn.queue[0] = 'O'; piece(spawn, 'O', 0, 18); spawn.board[0][4] = 'L';
  L.hardDrop(spawn); assert.equal(spawn.phase, 'over'); assert.equal(spawn.pieces, 1);
  const json = JSON.stringify(spawn);
  assert.equal(L.move(spawn, 1), false); assert.equal(L.rotate(spawn), false); assert.equal(L.hold(spawn), false); assert.equal(L.hardDrop(spawn), false);
  seconds(spawn, 1); assert.equal(JSON.stringify(spawn), json);
});
test('grounded movement resets lock at most fifteen times, invalid movement does not reset it', () => {
  const s = game(); piece(s, 'O', 4, 18);
  for (let i = 0; i < 15; i++) { s.lockTime = 0.4; L.move(s, i % 2 ? -1 : 1); assert.equal(s.lockTime, 0); }
  assert.equal(s.lockResets, 15); s.lockTime = 0.4; L.move(s, -1); assert.equal(s.lockTime, 0.4);
  seconds(s, 0.11); assert.equal(s.pieces, 1);
  const wall = game(); piece(wall, 'O', 0, 18); wall.lockTime = 0.4; L.move(wall, -1); assert.equal(wall.lockTime, 0.4); assert.equal(wall.lockResets, 0);
});
test('fixed-step gravity is partition invariant, bounded and ignores invalid elapsed time', () => {
  const a = game(10), b = game(10);
  for (let i = 0; i < 120; i++) L.advance(a, 1 / 60);
  for (let i = 0; i < 8; i++) L.advance(b, 0.25);
  assert.deepEqual(a.active, b.active); assert.equal(a.pieces, b.pieces); assert.equal(a.score, b.score);
  assert.ok(Math.abs(a.gravityTime - b.gravityTime) < 1e-8); assert.ok(Math.abs(a.accumulator - b.accumulator) < 1e-8);
  const s = game(), y = s.active.y; L.advance(s, 100); assert.equal(s.active.y, y);
  const json = JSON.stringify(s); for (const dt of [NaN, Infinity, -1, 0]) L.advance(s, dt); assert.equal(JSON.stringify(s), json);
  assert.ok(L.dropInterval({ level: 100 }) >= 0.075);
});
test('150 seeded games terminate and conserve cells through every placement and clear', () => {
  let placements = 0, clears = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const s = game(seed), random = rng(seed * 91);
    for (let turn = 0; turn < 500 && s.phase === 'play'; turn++) {
      if (random() < 0.2) L.hold(s);
      if (s.phase !== 'play') break;
      for (let r = Math.floor(random() * 4); r > 0; r--) L.rotate(s, 1);
      const direction = random() < 0.5 ? -1 : 1;
      for (let x = Math.floor(random() * 10); x > 0; x--) L.move(s, direction);
      const before = s.board.flat().filter(Boolean).length, lines = s.lines, pieces = s.pieces;
      L.hardDrop(s);
      const locked = s.pieces - pieces;
      assert.equal(s.board.flat().filter(Boolean).length, before + 4 * locked - 10 * (s.lines - lines));
      assert.ok(s.board.flat().every(kind => kind === null || L.KINDS.includes(kind))); placements += locked; clears += s.lines - lines;
      if (s.phase === 'play') assert.equal(L.collides(s, s.active), false);
    }
    assert.equal(s.phase, 'over', `seed ${seed} finishes`);
  }
  assert.ok(placements > 1000); assert.ok(clears >= 0);
});
