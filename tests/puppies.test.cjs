// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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

// Enumerate column permutations independently of the production bit-mask solver.
function independentSolutions({ size, regions }) {
  const answers = [];
  function permute(columns, remaining) {
    if (remaining.length) {
      for (const column of remaining) {
        permute([...columns, column], remaining.filter(other => other !== column));
      }
      return;
    }
    const cells = columns.map((column, row) => row * size + column);
    if (new Set(cells.map(index => regions[index])).size !== size) return;
    for (let row = 1; row < size; row++) {
      if (Math.abs(columns[row] - columns[row - 1]) < 2) return;
    }
    answers.push(cells);
  }
  permute([], Array.from({ length: size }, (_, index) => index));
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

test('all 24 levels have connected regions and one independently verified solution', () => {
  assert.equal(P.LEVEL_COUNT, 24);
  const maps = new Set();
  for (let level = 1; level <= P.LEVEL_COUNT; level++) {
    const state = P.create(level);
    assert.equal(state.size, 5 + Math.floor((level - 1) / 6));
    assert.equal(state.regions.length, state.size ** 2);
    assert.equal(new Set(state.regions).size, state.size);
    for (let region = 0; region < state.size; region++) assertConnected(state, region);
    const solutions = independentSolutions(state);
    assert.deepEqual(solutions, [state.solution], `level ${level}`);
    assert.equal(P.countSolutions(state, 2), solutions.length, `level ${level}`);
    assert.equal(P.countSolutions(state, 1), 1);
    maps.add(state.regions.join(''));
  }
  assert.equal(maps.size, 24, 'levels do not repeat the same region map');
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
  for (const level of [0, -1, 25, 1.5, '2', null, NaN, Infinity]) {
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
  for (const invalid of [null, {}, { size: 0 }, { size: 10 }, { size: 2.5 },
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
    const state = P.create(24);
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
    raw => { raw.level = 25; },
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
