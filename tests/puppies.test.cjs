// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const P = require('../games/puppies-logic.js');

const copy = value => JSON.parse(JSON.stringify(value));

test('manual exclusion mode allows marking blocked cells and charges every wrong placement', () => {
  const state = P.create(1);
  P.place(state, state.solution[0], false);
  const index = P.autoMarks(state)[0];
  assert.equal(P.toggleMark(state, index), false, 'default assistance still excludes this cell');
  assert.equal(P.toggleMark(state, index, false), true);
  assert.equal(state.marks[index], true);
  assert.equal(P.place(state, index).code, 'blocked');
  assert.equal(state.lives, 3);
  assert.equal(P.place(state, index, false).code, 'mistake');
  assert.equal(state.lives, 2);
  assert.equal(state.marks[index], true);
  assert.equal(P.undo(state), true);
  assert.equal(state.marks[index], false);
  assert.equal(state.lives, 2, 'undo does not refund mistakes in manual mode');
  P.toggleMark(state, index, false);
  assert.deepEqual(P.restore(copy(state)).marks, state.marks, 'manual notes under excluded cells survive restore');
  assert.equal(P.toggleMark(state, index, false), true);
  assert.equal(state.marks[index], false);
  for (const dog of state.solution.slice(1)) assert.equal(P.place(state, dog, false).code, 'placed');
  assert.equal(state.status, 'won');
});

// Search with plain sets, independently of the production bit-mask solver.
// Reject conflicts as rows are added so exhaustive verification also handles 10×10.
function independentSolutions({ size, regions }) {
  const answers = [], cells = [], columns = new Set(), colors = new Set();
  function search(row, previousColumn) {
    if (row === size) { answers.push(cells.slice()); return; }
    for (let column = 0; column < size; column++) {
      const index = row * size + column, region = regions[index];
      if (columns.has(column) || colors.has(region) || row && Math.abs(column - previousColumn) < 2) continue;
      columns.add(column); colors.add(region); cells.push(index);
      search(row + 1, column);
      columns.delete(column); colors.delete(region); cells.pop();
    }
  }
  search(0, -1);
  return answers;
}

function assertConnected(state, region) {
  const cells = state.regions.flatMap((value, index) => value === region ? [index] : []);
  assert.ok(cells.length, `level ${state.level}, missing region ${region}`);
  const reached = new Set([cells[0]]), pending = [cells[0]];
  while (pending.length) {
    const index = pending.pop(), row = Math.floor(index / state.size), column = index % state.size;
    for (const [r, c] of [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]) {
      if (r < 0 || r >= state.size || c < 0 || c >= state.size) continue;
      const next = r * state.size + c;
      if (state.regions[next] !== region || reached.has(next)) continue;
      reached.add(next);
      pending.push(next);
    }
  }
  assert.equal(reached.size, cells.length, `level ${state.level}, disconnected region ${region}`);
}

test('all 50 levels increase board size gradually and have connected regions with one independent solution', () => {
  assert.equal(P.LEVEL_COUNT, 50);
  const maps = new Set();
  for (let level = 1; level <= P.LEVEL_COUNT; level++) {
    const state = P.create(level);
    const expectedSize = level <= 6 ? 5 : level <= 12 ? 6 : level <= 18 ? 7 : level <= 32 ? 8 : level <= 42 ? 9 : 10;
    assert.equal(state.size, expectedSize, `level ${level}: intended difficulty band`);
    assert.equal(state.regions.length, state.size ** 2);
    assert.equal(new Set(state.regions).size, state.size);
    for (let region = 0; region < state.size; region++) assertConnected(state, region);
    const solutions = independentSolutions(state);
    assert.deepEqual(solutions, [state.solution], `level ${level}`);
    assert.equal(P.countSolutions(state, 2), solutions.length, `level ${level}`);
    assert.equal(P.countSolutions(state, 1), 1);
    maps.add(state.regions.join(''));
  }
  assert.equal(maps.size, 50, 'levels do not repeat the same region map');
});

test('the original 24 templates remain unchanged so existing saved games still restore', () => {
  const original = Array.from({ length: 24 }, (_, index) => {
    const { size, regions, solution } = P.create(index + 1);
    return { size, regions, solution };
  });
  assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),
    '9b4c416453390977e591ea3c0d2d1d33efdd60f63e47c35c7a271d441b7f46b0');
  const previousLastLevel = P.create(24);
  previousLastLevel.solution.forEach(index => P.place(previousLastLevel, index));
  assert.equal(previousLastLevel.variant, undefined);
  assert.deepEqual(P.restore(copy(previousLastLevel)), previousLastLevel);
});

test('level information exposes the seven difficulty bands without sharing mutable data', () => {
  const bands = [[1, 6, 5, 'Dễ'], [7, 12, 6, 'Vừa'], [13, 18, 7, 'Khá'], [19, 24, 8, 'Khó'],
    [25, 32, 8, 'Rất khó'], [33, 42, 9, 'Chuyên gia'], [43, 50, 10, 'Bậc thầy']];
  for (const [first, last, size, difficulty] of bands) {
    for (let level = first; level <= last; level++) {
      const info = P.getLevelInfo(level);
      assert.deepEqual(info, { level, size, difficulty });
      info.size = 100;
      assert.equal(P.getLevelInfo(level).size, P.create(level).size);
    }
  }
  for (const level of [0, 51, NaN, null, '25']) assert.deepEqual(P.getLevelInfo(level), P.getLevelInfo(1));
});

test('all eight shuffled orientations preserve every level and its unique solution', () => {
  for (let level = 1; level <= P.LEVEL_COUNT; level++) {
    const base = P.create(level), layouts = new Set();
    for (let transform = 0; transform < 8; transform++) {
      const state = P.createShuffled(level, null, () => (transform + 0.25) / 8);
      assert.equal(state.level, level);
      assert.equal(state.size, base.size);
      assert.equal(state.variant.transform, transform);
      assert.deepEqual(state.variant.colors.slice().sort((a, b) => a - b), Array.from({ length: base.size }, (_, i) => i));
      for (let region = 0; region < state.size; region++) {
        assertConnected(state, region);
        assert.equal(state.regions.filter(color => color === state.variant.colors[region]).length,
          base.regions.filter(color => color === region).length, 'each region keeps its area');
      }
      assert.deepEqual(independentSolutions(state), [state.solution], `level ${level}, orientation ${transform}`);
      assert.equal(P.countSolutions(state), 1);
      layouts.add(state.regions.join(''));
    }
    assert.equal(layouts.size, 8);
  }
});

test('each replay changes the answer positions even with a repeated random value', () => {
  for (let level = 1; level <= P.LEVEL_COUNT; level++) {
    let previous = P.create(level);
    for (let round = 0; round < 12; round++) {
      P.hint(previous);
      const snapshot = copy(previous);
      const fresh = P.createShuffled(level, previous, () => 0);
      assert.notDeepEqual(fresh.solution, previous.solution, `level ${level}, round ${round}`);
      assert.notDeepEqual(fresh.regions, previous.regions);
      assert.deepEqual(previous, snapshot, 'new-game creation does not change the previous board');
      assert.equal(fresh.status, 'playing');
      assert.equal(fresh.lives, 3);
      assert.equal(fresh.hints, 0);
      assert.equal(fresh.mistakes, 0);
      assert.ok(fresh.dogs.every(value => !value) && fresh.marks.every(value => !value));
      assert.equal(P.canUndo(fresh), false);
      previous = fresh;
    }
  }
  for (const random of [() => NaN, () => -1, () => 1, () => Infinity]) {
    const state = P.createShuffled(19, null, random);
    assert.equal(P.countSolutions(state), 1);
  }
});

test('shuffled saves restore the exact board, progress and private array ownership', () => {
  const playing = P.createShuffled(19, null, () => 0.42);
  P.hint(playing);
  const wrong = playing.dogs.findIndex((_, i) => !playing.solution.includes(i));
  P.toggleMark(playing, wrong, false);
  P.place(playing, wrong, false);
  const won = P.createShuffled(4, null, () => 0.91);
  won.solution.forEach(index => P.place(won, index));
  const lost = P.createShuffled(24, null, () => 0.73);
  const mistake = lost.dogs.findIndex((_, i) => !lost.solution.includes(i));
  for (let i = 0; i < 3; i++) P.place(lost, mistake);
  for (const state of [playing, won, lost]) {
    const raw = copy(state), restored = P.restore(raw);
    assert.deepEqual(restored, state);
    assert.notStrictEqual(restored.variant.colors, raw.variant.colors);
    assert.notStrictEqual(restored.regions, raw.regions);
    assert.notStrictEqual(restored.solution, raw.solution);
    assert.equal(P.canUndo(restored), false);
    raw.variant.colors[0] = 99;
    assert.deepEqual(restored.variant, state.variant);
  }
  const legacy = P.create(1);
  P.hint(legacy);
  assert.equal(legacy.variant, undefined);
  assert.deepEqual(P.restore(copy(legacy)), legacy, 'pre-shuffle saves remain supported');
});

test('new difficulty bands preserve shuffled boards, notes and terminal results across saves', () => {
  for (const level of [25, 33, 43, 50]) {
    for (const ending of ['playing', 'won', 'lost']) {
      const state = P.createShuffled(level, null, () => 0.61);
      const wrong = state.regions.findIndex((_, index) => !state.solution.includes(index));
      P.toggleMark(state, wrong, false);
      P.hint(state);
      if (ending === 'won') state.solution.filter(index => !state.dogs[index]).forEach(index => P.place(state, index, false));
      else if (ending === 'lost') for (let attempt = 0; attempt < 3; attempt++) P.place(state, wrong, false);
      const raw = copy(state), restored = P.restore(raw);
      assert.equal(restored?.level, level, `restore level ${level}`);
      assert.equal(restored.status, ending);
      assert.deepEqual(restored, state);
      assert.equal(P.canUndo(restored), false);
      for (const field of ['regions', 'solution', 'dogs', 'marks']) assert.notStrictEqual(restored[field], raw[field]);
    }
  }
});

test('restore rejects forged shuffle metadata or a board that disagrees with it', () => {
  const source = P.createShuffled(1, null, () => 0.55);
  for (const variant of [null, {}, { transform: -1, colors: [0, 1, 2, 3, 4] },
    { transform: 8, colors: [0, 1, 2, 3, 4] }, { transform: 1.5, colors: [0, 1, 2, 3, 4] },
    { transform: '1', colors: [0, 1, 2, 3, 4] }, { transform: 1, colors: [0, 0, 2, 3, 4] },
    { transform: 1, colors: [0, 1, 2, 3, 5] }, { transform: 1, colors: [0, 1, 2, 3] },
    { transform: 1, colors: [0, 1, 2, 3, '4'] }, { transform: 1, colors: Array(5) }]) {
    const raw = copy(source); raw.variant = variant;
    assert.equal(P.restore(raw), null);
  }
  for (const mutate of [raw => { raw.variant.transform = (raw.variant.transform + 1) % 8; },
    raw => { [raw.variant.colors[0], raw.variant.colors[1]] = [raw.variant.colors[1], raw.variant.colors[0]]; },
    raw => { delete raw.variant; }, raw => { raw.regions[0] = (raw.regions[0] + 1) % raw.size; },
    raw => { raw.solution[0] = (raw.solution[0] + 1) % (raw.size ** 2); }]) {
    const raw = copy(source); mutate(raw);
    assert.equal(P.restore(raw), null);
  }
});

test('new games have independent arrays, fresh counters and safe invalid-level fallback', () => {
  const state = P.create();
  assert.equal(state.level, 1);
  assert.equal(state.status, 'playing');
  assert.equal(state.lives, 3);
  assert.equal(state.hints, 0);
  assert.equal(state.mistakes, 0);
  assert.deepEqual(state.dogs, Array(25).fill(false));
  assert.deepEqual(state.marks, Array(25).fill(false));
  assert.equal(P.canUndo(state), false);
  const other = P.create(1);
  state.regions[0] = 99;
  state.solution[0] = 99;
  state.dogs[0] = true;
  state.marks[1] = true;
  assert.deepEqual(other, P.create(1));
  for (const level of [0, -1, 51, 1.5, '2', null, NaN, Infinity]) {
    assert.equal(P.create(level).level, 1);
  }
});

test('solution counting handles impossible and ambiguous maps and rejects invalid input', () => {
  const rowRegions = size => ({ size, regions: Array.from({ length: size ** 2 }, (_, i) => Math.floor(i / size)) });
  assert.equal(P.countSolutions(rowRegions(1)), 1);
  assert.equal(P.countSolutions(rowRegions(2)), 0, 'two puppies always touch on a 2 by 2 board');
  const ambiguous = rowRegions(5), before = copy(ambiguous);
  assert.equal(P.countSolutions(ambiguous), 2, 'default search stops after two solutions');
  assert.equal(P.countSolutions(ambiguous, 1), 1);
  assert.equal(P.countSolutions(ambiguous, 100), independentSolutions(ambiguous).length);
  assert.deepEqual(ambiguous, before);
  assert.equal(P.countSolutions(rowRegions(10)), 2, 'the solver accepts 10×10 boards');
  for (const invalid of [null, {}, { size: 0 }, { size: 11 }, { size: 2.5 },
    { size: 2, regions: [0, 0, 0, 0] }, { size: 2, regions: [0, 1] },
    { size: 2, regions: [0, 1, 2, 1] }, { size: 2, regions: [0, 1, -1, 1] },
    { size: 2, regions: [0, 1, '0', 1] }, { size: 2, regions: Array(4) }]) {
    assert.equal(P.countSolutions(invalid), 0);
  }
  for (const limit of [0, -1, 1.5, '2', Infinity]) assert.equal(P.countSolutions(ambiguous, limit), 0);
});

test('automatic crosses cover row, column, region and nearby diagonals without costing lives', () => {
  const state = P.create(1);
  assert.equal(P.place(state, 22).code, 'placed');
  const excluded = P.autoMarks(state);
  assert.ok(excluded.includes(20), 'same row');
  assert.ok(excluded.includes(2), 'same column');
  assert.ok(excluded.includes(11), 'same region, two rows away and a different column');
  assert.ok(excluded.includes(18), 'touching diagonally');
  assert.ok(!excluded.includes(22), 'placed dog is not crossed');
  for (const index of state.solution.filter(index => index !== 22)) assert.ok(!excluded.includes(index));
  const before = copy(state);
  for (const index of excluded) {
    assert.deepEqual(P.place(state, index), { changed: false, code: 'blocked', index });
    assert.equal(P.toggleMark(state, index), false);
  }
  assert.deepEqual(state, before);
  assert.deepEqual(state.marks, Array(25).fill(false), 'automatic crosses are not manual notes');
});

test('dogs on a distant shared diagonal remain legal', () => {
  const state = P.create(3);
  // Row 1 / column 4 and row 4 / column 1 share a diagonal, but do not touch.
  assert.ok(state.solution.includes(3) && state.solution.includes(15));
  assert.equal(P.place(state, 3).code, 'placed');
  assert.ok(!P.autoMarks(state).includes(15));
  assert.equal(P.place(state, 15).code, 'placed');
  assert.equal(state.dogs[3] && state.dogs[15], true);
  assert.equal(state.lives, 3);
});

test('invalid coordinates and notes on occupied cells leave state and history unchanged', () => {
  const state = P.create(1), before = copy(state);
  for (const index of [-1, 25, 2.5, '4', null, undefined, NaN, Infinity]) {
    assert.equal(P.place(state, index).code, 'invalid');
    assert.equal(P.toggleMark(state, index), false);
  }
  assert.deepEqual(state, before);
  assert.equal(P.undo(state), false);
  P.place(state, 4);
  assert.equal(P.toggleMark(state, 4), false);
  assert.equal(state.dogs[4], true);
  assert.equal(state.marks[4], false);
});

test('manual notes, placement and dog removal can be undone without losing hidden notes', () => {
  const state = P.create(1);
  assert.equal(P.toggleMark(state, 4), true);
  assert.equal(P.toggleMark(state, 0), true);
  assert.equal(P.place(state, 4).code, 'placed');
  assert.equal(state.marks[4], false);
  assert.equal(state.marks[0], true, 'a note survives when an automatic cross covers it');
  assert.equal(P.place(state, 4).code, 'removed');
  assert.deepEqual(P.autoMarks(state), []);
  assert.equal(state.marks[0], true);
  assert.equal(P.undo(state), true);
  assert.equal(state.dogs[4], true);
  assert.equal(P.undo(state), true);
  assert.equal(state.dogs[4], false);
  assert.equal(state.marks[4], true);
  assert.equal(P.toggleMark(state, 4), true);
  assert.equal(state.marks[4], false);
});

test('incorrect guesses spend lives, preserve notes, and cannot be refunded with undo', () => {
  const state = P.create(1);
  P.toggleMark(state, 0);
  assert.deepEqual(P.place(state, 0), { changed: true, code: 'mistake', index: 0 });
  assert.equal(state.dogs[0], false);
  assert.equal(state.marks[0], true);
  assert.equal(state.lives, 2);
  assert.equal(state.mistakes, 1);
  assert.equal(P.undo(state), true, 'undo restores the note action preceding the mistake');
  assert.equal(state.marks[0], false);
  assert.equal(state.lives, 2);
  assert.equal(state.mistakes, 1);
  assert.equal(P.undo(state), false, 'a mistake does not create a refundable history entry');
});

test('the third wrong guess ends play and new-game creation resets lives and history', () => {
  const state = P.create(1);
  P.toggleMark(state, 1);
  for (let guess = 1; guess <= 3; guess++) {
    assert.equal(P.place(state, 0).code, 'mistake');
    assert.equal(state.lives, 3 - guess);
    assert.equal(state.mistakes, guess);
  }
  assert.equal(state.status, 'lost');
  const before = copy(state);
  assert.equal(P.place(state, 4).code, 'ended');
  assert.equal(P.toggleMark(state, 1), false);
  assert.equal(P.hint(state), -1);
  assert.equal(P.undo(state), false);
  assert.equal(P.canUndo(state), false);
  assert.deepEqual(state, before);
  const restarted = P.create(state.level);
  assert.deepEqual(restarted.regions, state.regions);
  assert.equal(restarted.status, 'playing');
  assert.equal(restarted.lives, 3);
  assert.equal(P.canUndo(restarted), false);
});

test('hints place an unresolved dog and undo preserves the assistance count', () => {
  const state = P.create(1), [first, second] = state.solution;
  P.toggleMark(state, first);
  assert.equal(P.hint(state), first);
  assert.equal(state.dogs[first], true);
  assert.equal(state.marks[first], false);
  assert.equal(state.hints, 1);
  assert.equal(state.lives, 3);
  assert.equal(P.undo(state), true);
  assert.equal(state.dogs[first], false);
  assert.equal(state.marks[first], true);
  assert.equal(state.hints, 1);
  assert.equal(P.hint(state), first);
  assert.equal(P.hint(state), second);
  assert.equal(state.hints, 3);
});

test('completing a level wins once and locks subsequent moves, hints and undo', () => {
  for (const byHint of [false, true]) {
    const state = P.create(50);
    for (const index of state.solution) {
      if (byHint) assert.equal(P.hint(state), index);
      else assert.equal(P.place(state, index).code, 'placed');
    }
    assert.equal(state.status, 'won');
    assert.equal(state.dogs.filter(Boolean).length, state.size);
    const before = copy(state);
    assert.equal(P.place(state, state.solution[0]).code, 'ended');
    assert.equal(P.toggleMark(state, 0), false);
    assert.equal(P.hint(state), -1);
    assert.equal(P.undo(state), false);
    assert.equal(P.canUndo(state), false);
    assert.deepEqual(state, before);
  }
});

test('undo keeps only 200 actions and does not survive serialization', () => {
  const state = P.create(1);
  for (let action = 0; action < 221; action++) assert.equal(P.toggleMark(state, 0), true);
  const restored = P.restore(copy(state));
  assert.ok(restored);
  assert.equal(P.canUndo(restored), false);
  let undone = 0;
  while (P.undo(state)) undone++;
  assert.equal(undone, 200);
  assert.equal(state.marks[0], true, 'the first 21 actions are outside undo history');
});

test('restore clones valid playing, won and lost saves without changing progress', () => {
  const playing = P.create(19);
  P.place(playing, playing.dogs.findIndex((_, index) => !playing.solution.includes(index)));
  P.hint(playing);
  const note = playing.marks.findIndex((_, index) => !playing.dogs[index] && !P.autoMarks(playing).includes(index));
  P.toggleMark(playing, note);
  const won = P.create(2);
  won.solution.forEach(index => P.place(won, index));
  const lost = P.create(1);
  for (let guess = 0; guess < 3; guess++) P.place(lost, 0);
  for (const original of [playing, won, lost]) {
    const raw = copy(original), restored = P.restore(raw);
    assert.ok(restored);
    assert.deepEqual(restored, original);
    for (const field of ['regions', 'solution', 'dogs', 'marks']) assert.notStrictEqual(restored[field], raw[field]);
    raw.marks[0] = !raw.marks[0];
    assert.equal(restored.marks[0], original.marks[0]);
    assert.equal(P.canUndo(restored), false);
  }
});

test('restore rejects changed puzzles, malformed arrays, forged results and inconsistent counters', () => {
  const mutations = [
    raw => { raw.level = 0; },
    raw => { raw.level = 51; },
    raw => { raw.level = '1'; },
    raw => { raw.size = 6; },
    raw => { raw.regions[0] = 1; },
    raw => { raw.solution[0] = 0; },
    raw => { raw.regions = Array(25); },
    raw => { raw.solution = Array(5); },
    raw => { raw.dogs = Array(25); },
    raw => { raw.marks = Array(25); },
    raw => { raw.dogs.pop(); },
    raw => { raw.marks.push(false); },
    raw => { raw.dogs[4] = 1; },
    raw => { raw.marks[0] = 'false'; },
    raw => { raw.dogs[0] = true; },
    raw => { raw.dogs[4] = true; raw.marks[4] = true; },
    raw => { raw.lives = -1; raw.mistakes = 4; },
    raw => { raw.lives = 4; raw.mistakes = -1; },
    raw => { raw.lives = 2.5; raw.mistakes = 0.5; },
    raw => { raw.lives = 2; },
    raw => { raw.mistakes = '0'; },
    raw => { raw.hints = -1; },
    raw => { raw.hints = Number.MAX_SAFE_INTEGER + 1; },
    raw => { raw.hints = 1.5; },
    raw => { raw.hints = '0'; },
    raw => { raw.status = 'won'; },
    raw => { raw.status = 'lost'; },
    raw => { raw.solution.forEach(index => { raw.dogs[index] = true; }); },
    raw => { raw.lives = 0; raw.mistakes = 3; raw.status = 'lost'; raw.solution.forEach(index => { raw.dogs[index] = true; }); }
  ];
  for (const mutate of mutations) {
    const raw = copy(P.create(1));
    mutate(raw);
    assert.equal(P.restore(raw), null, mutate.toString());
  }
  for (const invalid of [null, undefined, [], '', 42]) assert.equal(P.restore(invalid), null);
});
