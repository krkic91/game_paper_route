// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/onet-logic.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
function fixture(rows = 4, cols = 4) {
  return { rows, cols, board: Array((rows + 2) * (cols + 2)).fill(0), locks: Array((rows + 2) * (cols + 2)).fill(0), matched: 0, phase: 'play', level: 1, time: 100, hints: 3, shuffles: 2, rescues: 0, remaining: 0 };
}
const at = (s, r, c) => r * (s.cols + 2) + c;
function put(s, r, c, value = 1) { const p = at(s, r, c); s.board[p] = value; if (value > 0) s.remaining++; return p; }
function histogram(s) { return s.board.filter(v => v > 0).sort((a, b) => a - b); }
// Independent grid-walk oracle. Each queue state records incoming direction and
// number of turns; it neither enumerates corners nor uses the production path.
function oracle(s, a, b) {
  if (a === b || !(s.board[a] > 0) || s.board[a] !== s.board[b] || s.locks[a] > s.matched || s.locks[b] > s.matched) return false;
  const w = s.cols + 2, h = s.rows + 2, directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  const queue = [[Math.floor(a / w), a % w, -1, 0]], seen = new Set();
  for (let head = 0; head < queue.length; head++) {
    const [r, c, last, turns] = queue[head];
    for (let dir = 0; dir < 4; dir++) {
      const nr = r + directions[dir][0], nc = c + directions[dir][1], nt = turns + (last >= 0 && last !== dir ? 1 : 0), index = nr * w + nc;
      if (nt > 2 || nr < 0 || nr >= h || nc < 0 || nc >= w || (index !== b && s.board[index] !== 0)) continue;
      if (index === b) return true;
      const key = `${index}/${dir}/${nt}`;
      if (!seen.has(key)) { seen.add(key); queue.push([nr, nc, dir, nt]); }
    }
  }
  return false;
}
function validPath(s, a, b, path) {
  assert.equal(path[0], a); assert.equal(path.at(-1), b); assert.ok(path.length <= 4);
  const w = s.cols + 2;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1], to = path[i], sameRow = Math.floor(from / w) === Math.floor(to / w);
    assert.ok(sameRow || from % w === to % w, 'only orthogonal segments');
    const step = Math.sign(to - from) * (sameRow ? 1 : w);
    assert.notEqual(step, 0);
    for (let p = from; ; p += step) {
      assert.ok(p >= 0 && p < s.board.length);
      if (p !== a && p !== b) assert.equal(s.board[p], 0, 'path cannot cross another tile');
      if (p === to) break;
    }
  }
}

test('straight, one-turn and exterior two-turn paths have valid geometry', () => {
  for (const coordinates of [[[2, 1], [2, 4]], [[1, 1], [4, 4]], [[1, 1], [1, 4]]]) {
    const s = fixture(), a = put(s, ...coordinates[0]), b = put(s, ...coordinates[1]);
    if (coordinates[0][0] === 1 && coordinates[1][0] === 1) { put(s, 1, 2, 2); put(s, 2, 1, 2); }
    const path = L.findPath(s, a, b); assert.ok(path); validPath(s, a, b, path);
  }
});
test('mismatched, self, exterior, locked and obstructed endpoints are rejected', () => {
  const s = fixture(), a = put(s, 2, 2), b = put(s, 4, 4);
  assert.equal(L.findPath(s, a, a), null);
  assert.equal(L.findPath(s, -1, b), null);
  s.board[0] = 1; assert.equal(L.findPath(s, 0, b), null); s.board[0] = 0;
  s.board[b] = 2; assert.equal(L.findPath(s, a, b), null); s.board[b] = 1;
  s.locks[b] = 3; assert.equal(L.findPath(s, a, b), null); s.locks[b] = 0;
  for (const [r, c] of [[1, 2], [2, 1], [2, 3], [3, 2]]) put(s, r, c, -1);
  assert.equal(L.findPath(s, a, b), null);
});
test('path search agrees with independent bounded-turn BFS on 1,500 random boards', () => {
  const random = rng(755);
  for (let round = 0; round < 1500; round++) {
    const s = fixture(3 + round % 4, 3 + Math.floor(round / 4) % 4), w = s.cols + 2;
    for (let r = 1; r <= s.rows; r++) for (let c = 1; c <= s.cols; c++) if (random() < .65) s.board[r * w + c] = 2;
    const a = at(s, 1 + Math.floor(random() * s.rows), 1 + Math.floor(random() * s.cols));
    const b = at(s, 1 + Math.floor(random() * s.rows), 1 + Math.floor(random() * s.cols));
    s.board[a] = s.board[b] = 1;
    const path = L.findPath(s, a, b);
    assert.equal(Boolean(path), oracle(s, a, b), `oracle mismatch round ${round}`);
    if (path) validPath(s, a, b, path);
  }
});
test('all 24 levels expose increasing constraints and multiple board shapes', () => {
  assert.deepEqual([L.config(1).rows, L.config(1).cols], [6, 6]);
  assert.deepEqual([L.config(9).rows, L.config(9).cols], [6, 8]);
  assert.deepEqual([L.config(17).rows, L.config(17).cols], [8, 8]);
  assert.equal(L.config(0).level, 1); assert.equal(L.config(999).level, 24);
  assert.ok(L.config(24).types > L.config(1).types);
  assert.ok(L.config(24).lockCount > L.config(5).lockCount);
  assert.ok(L.config(24).hints < L.config(1).hints);
  assert.ok(L.config(24).shuffles < L.config(1).shuffles);
  assert.equal(new Set(Array.from({ length: 4 }, (_, i) => L.createGame({ level: i + 1 }).remaining)).size, 3);
});
test('288 generated boards have a complete legal solution witness, including ice unlocks', () => {
  for (let seed = 1; seed <= 288; seed++) {
    const level = (seed - 1) % 24 + 1, s = L.createGame({ level, random: rng(seed) });
    const pairs = s.solution.map(pair => pair.slice()), total = s.remaining;
    for (const [a, b] of pairs) {
      const path = L.findPath(s, a, b); assert.ok(path, `witness ${seed}, pair ${a}/${b}`); validPath(s, a, b, path);
      assert.equal(L.match(s, a, b).ok, true);
    }
    assert.equal(s.phase, 'won'); assert.equal(s.matched * 2, total); assert.equal(s.remaining, 0); assert.equal(s.rescues, 0);
  }
});
test('288 independently chosen elimination orders finish with pair conservation and bounded rescues', () => {
  for (let seed = 1; seed <= 288; seed++) {
    const random = rng(1000 + seed), s = L.createGame({ level: (seed - 1) % 24 + 1, random }), total = s.remaining;
    let moves = 0;
    while (s.phase === 'play') {
      const legal = L.findMatches(s); assert.ok(legal.length, `stranded seed ${seed}`);
      const move = legal[Math.floor(random() * legal.length)];
      assert.equal(oracle(s, move.a, move.b), true);
      assert.equal(L.match(s, move.a, move.b).ok, true); moves++;
      const counts = new Map(); for (const v of histogram(s)) counts.set(v, (counts.get(v) || 0) + 1);
      for (const count of counts.values()) assert.equal(count % 2, 0);
      assert.equal(s.remaining + s.matched * 2, total); assert.ok(moves <= 32);
    }
    assert.equal(s.phase, 'won'); assert.equal(moves * 2, total); assert.ok(s.rescues <= moves);
  }
});
test('different seeds change arrangements, while the same seed is reproducible', () => {
  for (const level of [1, 8, 17, 24]) {
    const a = L.createGame({ level, random: rng(10) }), b = L.createGame({ level, random: rng(11) }), same = L.createGame({ level, random: rng(10) });
    assert.notDeepEqual(a.board, b.board); assert.deepEqual(a.board, same.board);
  }
});
test('automatic rescue preserves animals, timer and paid tools, including locked deadlocks', () => {
  const s = fixture(2, 2); s.level = 17;
  const a = put(s, 1, 1), b = put(s, 1, 2), c = put(s, 2, 1, 2), d = put(s, 2, 2, 2);
  s.locks[a] = s.locks[b] = s.locks[c] = s.locks[d] = 5;
  const before = histogram(s);
  assert.equal(L.findMatches(s).length, 0); assert.equal(L.rescue(s), true);
  assert.deepEqual(histogram(s), before); assert.equal(s.time, 100); assert.equal(s.hints, 3); assert.equal(s.shuffles, 2); assert.equal(s.rescues, 1);
  assert.ok(L.findMatches(s).length); assert.ok(s.notice.includes('miễn phí'));
});
test('hint and shuffle are finite, preserve counts and expose a legal match', () => {
  const s = L.createGame({ level: 24, random: rng(44) }), before = histogram(s);
  const hint = L.hint(s); assert.equal(hint.ok, true); assert.ok(L.findPath(s, hint.a, hint.b)); assert.equal(s.hints, 1);
  L.hint(s); assert.equal(L.hint(s).ok, false); assert.equal(s.hints, 0);
  assert.equal(L.shuffle(s).ok, true); assert.equal(L.shuffle(s).ok, false); assert.equal(s.shuffles, 0);
  assert.deepEqual(histogram(s), before); assert.ok(L.findMatches(s).length);
});
test('invalid actions do not mutate state; win and timeout make the round terminal', () => {
  const s = fixture(1, 2), a = put(s, 1, 1), b = put(s, 1, 2);
  const before = JSON.stringify(s); assert.equal(L.match(s, a, a).ok, false); assert.equal(JSON.stringify(s), before);
  L.tick(s, -1); L.tick(s, Infinity); assert.equal(s.time, 100);
  assert.equal(L.match(s, a, b).ok, true); assert.equal(s.phase, 'won');
  const won = JSON.stringify(s); L.tick(s, 500); L.match(s, a, b); L.hint(s); L.shuffle(s); assert.equal(JSON.stringify(s), won);
  const loss = L.createGame({ random: rng(1) }); L.tick(loss, loss.time + 1); assert.equal(loss.time, 0); assert.equal(loss.phase, 'lost');
  const frozen = JSON.stringify(loss); const pair = L.findMatches(loss, 1)[0]; assert.equal(L.match(loss, pair.a, pair.b).ok, false); assert.equal(JSON.stringify(loss), frozen);
});
