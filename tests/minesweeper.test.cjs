// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/minesweeper-logic.js');

function fixture(mineIndices = [0, 2]) {
  const s = L.createGame({ seed: 'fixture' });
  s.mineCount = mineIndices.length;
  mineIndices.forEach(i => { s.mines[i] = true; });
  s.numbers = L.clues(s.mines, s.size);
  s.phase = 'play';
  s.verified = true;
  return s;
}

test('difficulty settings, neighbor boundaries and invalid level', () => {
  assert.deepEqual(Object.values(L.LEVELS).map(l => [l.size, l.mines]), [[8, 10], [10, 18], [12, 30]]);
  assert.deepEqual(L.neighbors(0, 8), [1, 8, 9]);
  assert.equal(L.neighbors(27, 8).length, 8);
  assert.throws(() => L.createGame({ difficulty: 'unknown' }), RangeError);
});

test('ready board stores flags without placing mines; invalid operations leave it unchanged', () => {
  const s = L.createGame({ seed: 1 });
  assert.equal(L.toggleFlag(s, 3).ok, true);
  assert.equal(L.reveal(s, 3).ok, false);
  for (const i of [-1, 64, 1.5, NaN]) {
    const before = JSON.stringify(s);
    assert.equal(L.reveal(s, i).ok, false);
    assert.equal(L.toggleFlag(s, i).ok, false);
    assert.equal(L.chord(s, i).ok, false);
    assert.equal(JSON.stringify(s), before);
  }
  assert.equal(s.phase, 'ready');
  assert.equal(s.mines.some(Boolean), false);
});

test('flags are bounded and can always be removed', () => {
  const s = L.createGame();
  for (let i = 0; i < s.mineCount; i++) assert.equal(L.toggleFlag(s, i).ok, true);
  assert.equal(L.toggleFlag(s, 20).ok, false);
  assert.equal(L.toggleFlag(s, 0).ok, true);
  assert.equal(L.toggleFlag(s, 20).ok, true);
});

test('flood opens connected zero region and boundaries but respects flags', () => {
  const s = fixture();
  s.flagged[63] = true;
  L.reveal(s, 62);
  assert.equal(s.revealed[63], false);
  assert.equal(s.revealed[0], false);
  assert.equal(s.revealed[1], false); // This numbered pocket is not adjacent to a zero.
  assert.equal(s.revealed[9], true);
  assert.equal(s.phase, 'play');
  L.reveal(s, 1);
  L.toggleFlag(s, 63);
  L.reveal(s, 63);
  assert.equal(s.phase, 'won');
  assert.deepEqual(s.flagged, s.mines);
});

test('loss records the clicked mine and final states reject changes', () => {
  const s = fixture();
  assert.equal(L.reveal(s, 0).hit, true);
  assert.equal(s.phase, 'lost');
  assert.equal(s.exploded, 0);
  const before = JSON.stringify(s);
  assert.equal(L.reveal(s, 20).ok, false);
  assert.equal(L.toggleFlag(s, 20).ok, false);
  assert.equal(JSON.stringify(s), before);
  assert.equal(L.score(s), 0);
});

test('chord requires matching flags and wrong flags cause loss', () => {
  const s = fixture();
  s.revealed[9] = true;
  assert.equal(L.chord(s, 9).ok, false);
  L.toggleFlag(s, 1); L.toggleFlag(s, 8);
  assert.equal(L.chord(s, 9).ok, true);
  assert.equal(s.phase, 'lost');
});

test('correct chord reveals safe neighbors; revealed cells cannot be flagged', () => {
  const s = fixture();
  s.revealed[9] = true;
  assert.equal(L.toggleFlag(s, 9).ok, false);
  L.toggleFlag(s, 0); L.toggleFlag(s, 2);
  assert.equal(L.chord(s, 9).ok, true);
  assert.equal(s.revealed[1], true);
  assert.notEqual(s.phase, 'lost');
});

test('visible-only deduction identifies single constraints and subset differences', () => {
  const visible = Array(9).fill(null), flags = Array(9).fill(false);
  // A corner clue sees {1,3,4}; a neighboring edge clue sees {1,3,4,6,7}.
  visible[0] = 1; visible[3] = 1;
  const result = L.deduce(3, 2, visible, flags);
  assert.equal(result.contradiction, false);
  assert.ok(result.safe.includes(6));
  assert.ok(result.safe.includes(7));
  const allSafe = L.deduce(2, 0, [0, null, null, null], Array(4).fill(false));
  assert.deepEqual(new Set(allSafe.safe), new Set([1, 2, 3]));
});

test('deductions are sound against exhaustive compatible 3×3 mine arrangements', () => {
  for (let mask = 0; mask < 512; mask++) {
    const mines = Array.from({ length: 9 }, (_, i) => Boolean(mask & (1 << i)));
    const numbers = L.clues(mines, 3), count = mines.filter(Boolean).length;
    const visible = numbers.map((n, i) => !mines[i] && i % 2 === 0 ? n : null);
    const result = L.deduce(3, count, visible, Array(9).fill(false));
    assert.equal(result.contradiction, false);
    for (const i of result.safe) assert.equal(mines[i], false);
    for (const i of result.mines) assert.equal(mines[i], true);
  }
});

test('300 seeded boards are first-click safe, verified and solved using only visible deductions', () => {
  for (const difficulty of Object.keys(L.LEVELS)) for (let seed = 0; seed < 100; seed++) {
    const s = L.createGame({ difficulty, seed }), first = seed % (s.size ** 2);
    L.reveal(s, first);
    assert.equal(s.verified, true);
    assert.equal(s.mines.filter(Boolean).length, s.mineCount);
    assert.ok([first, ...L.neighbors(first, s.size)].every(i => !s.mines[i]));
    assert.equal(L.solve(s.mines, s.size, first).solved, true);
    let steps = 0;
    while (s.phase === 'play' && steps++ < s.size ** 2) {
      const visible = s.numbers.map((n, i) => s.revealed[i] ? n : null);
      const deduction = L.deduce(s.size, s.mineCount, visible, s.flagged);
      assert.ok(deduction.safe.length || deduction.mines.length);
      for (const i of deduction.mines) if (!s.flagged[i] && s.phase === 'play') assert.equal(L.toggleFlag(s, i).ok, true);
      for (const i of deduction.safe) if (!s.revealed[i] && s.phase === 'play') assert.equal(L.reveal(s, i).ok, true);
    }
    assert.equal(s.phase, 'won', `${difficulty}/${seed}`);
    assert.equal(s.revealed.filter(Boolean).length, s.size ** 2 - s.mineCount);
  }
});

test('constructive fallback is safe and verified for every starting cell in all difficulties', () => {
  for (const difficulty of Object.keys(L.LEVELS)) {
    const level = L.LEVELS[difficulty];
    for (let first = 0; first < level.size ** 2; first++) {
      const s = L.createGame({ difficulty, seed: first });
      const generator = L.generate(s, first, 0);
      assert.equal(generator.next().done, true);
      assert.equal(s.fallback, true);
      assert.ok([first, ...L.neighbors(first, s.size)].every(i => !s.mines[i]));
      assert.equal(s.mines.filter(Boolean).length, s.mineCount);
      assert.equal(L.solve(s.mines, s.size, first).solved, true);
    }
  }
});

test('daily layouts reproduce by local date and difficulty; normal seeds vary', () => {
  const a = L.createGame({ daily: true, date: '2026-10-19', difficulty: 'hard', seed: 1 });
  const b = L.createGame({ daily: true, date: '2026-10-19', difficulty: 'hard', seed: 999 });
  const c = L.createGame({ daily: true, date: '2026-10-20', difficulty: 'hard' });
  [a, b, c].forEach(s => L.reveal(s, 78));
  assert.deepEqual(a.mines, b.mines);
  assert.notDeepEqual(a.mines, c.mines);
  assert.equal(L.dateKey(new Date(2026, 0, 2, 23, 59)), '2026-01-02');
});

test('score rewards completion, time and difficulty without going negative', () => {
  const s = fixture(); L.reveal(s, 63); L.reveal(s, 1);
  assert.equal(s.phase, 'won');
  assert.equal(L.score(s), 2000);
  s.elapsed = 10;
  assert.equal(L.score(s), 1970);
  s.elapsed = 99999;
  assert.equal(L.score(s), 100);
});
