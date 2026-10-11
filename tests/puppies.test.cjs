// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../games/puppies-logic.js');

const copy = value => JSON.parse(JSON.stringify(value));
const wrongCell = state => state.regions.findIndex((_, index) => !state.solution.includes(index));
const legacyTemplates = [
  [1, 5, '0000001400344243344433444', '41302'],
  [24, 8, '4440000041330023433333234433333344333333666353666666666666666667', '51630427'],
  [50, 10, '1330022244133200224433222222443322244444366622444466655444446666644444666667744466668888446666668899', '3061842579'],
];
function legacyState([level, size, regions, solution]) {
  return { level, size, regions: Array.from(regions, Number),
    solution: Array.from(solution, (column, row) => row * size + Number(column)),
    dogs: Array(size * size).fill(false), marks: Array(size * size).fill(false),
    lives: 3, hints: 0, mistakes: 0, status: 'playing' };
}
function transformedIndex(index, size, transform) {
  let row = Math.floor(index / size), column = index % size;
  if (transform >= 4) column = size - 1 - column;
  for (let turn = 0; turn < transform % 4; turn++) [row, column] = [column, size - 1 - row];
  return row * size + column;
}
function structuralKey({ size, regions }) {
  return Array.from({ length: 8 }, (_, transform) => {
    const moved = Array(size * size), colors = new Map();
    regions.forEach((region, index) => { moved[transformedIndex(index, size, transform)] = region; });
    return moved.map(region => {
      if (!colors.has(region)) colors.set(region, colors.size);
      return colors.get(region);
    }).join(',');
  }).sort()[0];
}

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

test('100 levels provide 500 structurally distinct connected puzzles with exactly one independent solution', () => {
  assert.equal(P.LEVEL_COUNT, 100);
  assert.equal(P.PUZZLES_PER_LEVEL, 5);
  const maps = new Set();
  for (let level = 1; level <= P.LEVEL_COUNT; level++) {
    for (let puzzleIndex = 0; puzzleIndex < P.PUZZLES_PER_LEVEL; puzzleIndex++) {
      const state = P.create(level, puzzleIndex);
      const expectedSize = level <= 10 ? 7 : level <= 25 ? 8 : level <= 40 ? 9 : 10;
      assert.equal(state.catalogVersion, 2);
      assert.equal(state.puzzleIndex, puzzleIndex);
      assert.equal(state.size, expectedSize, `level ${level}: intended difficulty band`);
      assert.equal(state.regions.length, state.size ** 2);
      assert.equal(new Set(state.regions).size, state.size);
      for (let region = 0; region < state.size; region++) assertConnected(state, region);
      const solutions = independentSolutions(state);
      assert.deepEqual(solutions, [state.solution], `level ${level}, template ${puzzleIndex}`);
      assert.equal(P.countSolutions(state, 2), solutions.length, `level ${level}`);
      assert.equal(P.countSolutions(state, 1), 1);
      const key = `${state.size}:${structuralKey(state)}`;
      assert.equal(maps.has(key), false, `level ${level}, template ${puzzleIndex}: not an old layout merely rotated or recolored`);
      maps.add(key);
    }
  }
  assert.equal(maps.size, 500);
});

test('legacy saves retain their original board and progress; a new round upgrades to the harder catalog', () => {
  for (const template of legacyTemplates) {
    for (const ending of ['playing', 'won', 'lost']) {
      const legacy = legacyState(template), note = wrongCell(legacy);
      legacy.dogs[legacy.solution[0]] = true;
      legacy.marks[note] = true;
      legacy.hints = 2;
      if (ending === 'won') legacy.solution.forEach(index => { legacy.dogs[index] = true; });
      if (ending === 'lost') { legacy.lives = 0; legacy.mistakes = 3; }
      legacy.status = ending;
      assert.deepEqual(P.restore(copy(legacy)), legacy, `legacy level ${legacy.level}, ${ending}`);
      const upgraded = P.createShuffled(legacy.level, legacy, () => 0);
      assert.equal(upgraded.catalogVersion, 2);
      assert.equal(upgraded.level, legacy.level);
      assert.equal(upgraded.status, 'playing');
      assert.notEqual(structuralKey(upgraded), structuralKey(legacy));
      const transformed = copy(legacy), size = legacy.size;
      transformed.variant = { transform: 5, colors: Array.from({ length: size }, (_, i) => size - i - 1) };
      transformed.regions = Array(size * size);
      legacy.regions.forEach((color, index) => { transformed.regions[transformedIndex(index, size, 5)] = size - color - 1; });
      transformed.solution = legacy.solution.map(index => transformedIndex(index, size, 5)).sort((a, b) => a - b);
      for (const field of ['dogs', 'marks']) {
        transformed[field] = Array(size * size);
        legacy[field].forEach((value, index) => { transformed[field][transformedIndex(index, size, 5)] = value; });
      }
      assert.deepEqual(P.restore(copy(transformed)), transformed, 'legacy shuffled saves also preserve their exact layout');
    }
  }
});

test('level information exposes six harder difficulty bands without sharing mutable data', () => {
  const bands = [[1, 10, 7, 'Khó'], [11, 25, 8, 'Rất khó'], [26, 40, 9, 'Chuyên gia'],
    [41, 60, 10, 'Bậc thầy'], [61, 80, 10, 'Siêu khó'], [81, 100, 10, 'Thử thách tối thượng']];
  for (const [first, last, size, difficulty] of bands) {
    for (let level = first; level <= last; level++) {
      const info = P.getLevelInfo(level);
      assert.deepEqual(info, { level, size, difficulty });
      info.size = 100;
      assert.equal(P.getLevelInfo(level).size, P.create(level).size);
    }
  }
  for (const level of [0, 101, NaN, null, '25']) assert.deepEqual(P.getLevelInfo(level), P.getLevelInfo(1));
});

test('every replacement is harder, all levels progress, and replay alternatives have comparable logical difficulty', () => {
  const { rateOrientations } = require('../scripts/generate-puppies.cjs');
  // Frozen ratings of the original 50 puzzles under the same eight-orientation
  // logical solver. This is a reproducible proxy, not a human difficulty measure.
  const originalScores = [60.25, 50.5, 45.25, 52.875, 48.25, 63, 64.875, 72.125, 82.5, 93.125,
    70.625, 62.375, 93.25, 68, 79.25, 87, 68.5, 53, 82.25, 103.75, 78.75, 48, 48.25, 66.25,
    140, 160, 180, 212.25, 230.75, 247.375, 270.875, 290.25, 297, 313.5, 319.75, 325.125,
    345.25, 351.875, 361.5, 367.875, 386.375, 387.25, 392.75, 419.5, 431.5, 443.125,
    452.125, 528, 565.375, 726.5];
  let previousMean = 0;
  for (let level = 1; level <= P.LEVEL_COUNT; level++) {
    const scores = [];
    for (let puzzleIndex = 0; puzzleIndex < P.PUZZLES_PER_LEVEL; puzzleIndex++) {
      const state = P.create(level, puzzleIndex), areas = Array(state.size).fill(0);
      state.regions.forEach(region => areas[region]++);
      assert.ok(areas.every(area => area >= 3), `level ${level}, template ${puzzleIndex}: no one- or two-cell region giveaways`);
      assert.ok(areas.every(area => area <= state.size ** 2 * 0.32), `level ${level}, template ${puzzleIndex}: no dominant region larger than 32% of the board`);
      const rating = rateOrientations(state);
      assert.ok(Number.isFinite(rating.score) && rating.score > 0);
      if (level <= 50) assert.ok(rating.score > originalScores[level - 1], `level ${level}, template ${puzzleIndex}: harder than the old puzzle by the same logical metric`);
      scores.push(rating.score);
    }
    assert.ok(Math.max(...scores) <= Math.min(...scores) * 1.3, `level ${level}: five alternatives stay within 30% by the logical metric`);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    assert.ok(mean > previousMean, `level ${level}: average logical rating increases`);
    previousMean = mean;
  }
});

test('all eight orientations of all 500 templates preserve the unique answer and region structure', () => {
  for (let level = 1; level <= P.LEVEL_COUNT; level++) {
    for (let puzzleIndex = 0; puzzleIndex < P.PUZZLES_PER_LEVEL; puzzleIndex++) {
      const base = P.create(level, puzzleIndex), layouts = new Set();
      for (let transform = 0; transform < 8; transform++) {
        let calls = 0;
        const state = P.createShuffled(level, null, () => calls++ === 0 ? (puzzleIndex + 0.25) / 5 : (transform + 0.25) / 8);
        assert.equal(state.level, level);
        assert.equal(state.size, base.size);
        assert.equal(state.puzzleIndex, puzzleIndex);
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
  }
});

test('replays exhaust five different structures before reuse even with constant RNG and reloads', () => {
  for (let level = 1; level <= P.LEVEL_COUNT; level++) {
    let previous = P.create(level);
    let seen = new Set([previous.puzzleIndex]);
    for (let round = 1; round <= 12; round++) {
      P.hint(previous);
      const snapshot = copy(previous);
      const fresh = P.createShuffled(level, previous, () => 0);
      assert.notDeepEqual(fresh.solution, previous.solution, `level ${level}, round ${round}`);
      assert.notEqual(structuralKey(fresh), structuralKey(previous), 'replay changes the actual puzzle rather than just orientation or colors');
      if (seen.size === 5) seen = new Set();
      assert.equal(seen.has(fresh.puzzleIndex), false, 'all five templates are used before a template repeats');
      seen.add(fresh.puzzleIndex);
      assert.deepEqual(new Set(fresh.puzzleCycle), seen);
      assert.deepEqual(previous, snapshot, 'new-game creation does not change the previous board');
      assert.equal(fresh.status, 'playing');
      assert.equal(fresh.lives, 3);
      assert.equal(fresh.hints, 0);
      assert.equal(fresh.mistakes, 0);
      assert.ok(fresh.dogs.every(value => !value) && fresh.marks.every(value => !value));
      assert.equal(P.canUndo(fresh), false);
      previous = P.restore(copy(fresh));
      assert.deepEqual(previous, fresh, 'reload preserves the template deck as well as the board');
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
  const legacy = legacyState(legacyTemplates[0]);
  P.hint(legacy);
  assert.equal(legacy.variant, undefined);
  assert.deepEqual(P.restore(copy(legacy)), legacy, 'pre-shuffle saves remain supported');
});

test('new difficulty bands preserve shuffled boards, notes and terminal results across saves', () => {
  for (const level of [1, 11, 26, 41, 51, 61, 81, 100]) {
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
  const colors = Array.from({ length: source.size }, (_, index) => index);
  for (const variant of [null, {}, { transform: -1, colors },
    { transform: 8, colors }, { transform: 1.5, colors }, { transform: '1', colors },
    { transform: 1, colors: [0, ...colors.slice(0, -1)] },
    { transform: 1, colors: [...colors.slice(0, -1), source.size] },
    { transform: 1, colors: colors.slice(0, -1) },
    { transform: 1, colors: [...colors.slice(0, -1), String(source.size - 1)] },
    { transform: 1, colors: Array(source.size) }]) {
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

test('restore rejects forged catalog identity and replay deck metadata', () => {
  const source = P.createShuffled(50, null, () => 0.55);
  for (const mutate of [raw => { delete raw.catalogVersion; }, raw => { raw.catalogVersion = 1; },
    raw => { raw.catalogVersion = '2'; }, raw => { raw.catalogVersion = 3; },
    raw => { delete raw.puzzleIndex; }, raw => { raw.puzzleIndex = -1; }, raw => { raw.puzzleIndex = 5; },
    raw => { raw.puzzleIndex = 1.5; }, raw => { raw.puzzleIndex = '2'; },
    raw => { raw.puzzleIndex = (raw.puzzleIndex + 1) % 5; raw.puzzleCycle = [raw.puzzleIndex]; },
    raw => { delete raw.puzzleCycle; }, raw => { raw.puzzleCycle = null; }, raw => { raw.puzzleCycle = []; },
    raw => { raw.puzzleCycle = [raw.puzzleIndex, raw.puzzleIndex]; },
    raw => { raw.puzzleCycle = [(raw.puzzleIndex + 1) % 5]; },
    raw => { raw.puzzleCycle = [-1, raw.puzzleIndex]; }, raw => { raw.puzzleCycle = [5, raw.puzzleIndex]; },
    raw => { raw.puzzleCycle = [0.5, raw.puzzleIndex]; }, raw => { raw.puzzleCycle = Array(2); }]) {
    const raw = copy(source); mutate(raw);
    assert.equal(P.restore(raw), null, mutate.toString());
  }
  const state = P.createShuffled(10, P.create(10), () => 0);
  const raw = copy(state), restored = P.restore(raw);
  assert.notStrictEqual(raw.puzzleCycle, restored.puzzleCycle);
  raw.puzzleCycle[0] = 99;
  assert.deepEqual(restored.puzzleCycle, state.puzzleCycle);
});

test('new games have independent arrays, fresh counters and safe invalid-level fallback', () => {
  const state = P.create();
  assert.equal(state.level, 1);
  assert.equal(state.status, 'playing');
  assert.equal(state.lives, 3);
  assert.equal(state.hints, 0);
  assert.equal(state.mistakes, 0);
  assert.deepEqual(state.dogs, Array(state.size ** 2).fill(false));
  assert.deepEqual(state.marks, Array(state.size ** 2).fill(false));
  assert.equal(P.canUndo(state), false);
  const other = P.create(1);
  state.regions[0] = 99;
  state.solution[0] = 99;
  state.dogs[0] = true;
  state.marks[1] = true;
  assert.deepEqual(other, P.create(1));
  for (const level of [0, -1, 101, 1.5, '2', null, NaN, Infinity]) {
    assert.equal(P.create(level).level, 1);
  }
  for (const puzzleIndex of [-1, 5, 1.5, '2', null, NaN, Infinity]) assert.equal(P.create(1, puzzleIndex).puzzleIndex, 0);
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
  const dog = state.solution[Math.floor(state.size / 2)];
  assert.equal(P.place(state, dog).code, 'placed');
  const excluded = P.autoMarks(state);
  const row = Math.floor(dog / state.size), column = dog % state.size;
  const expected = state.regions.flatMap((region, index) => {
    const otherRow = Math.floor(index / state.size), otherColumn = index % state.size;
    return index !== dog && (otherRow === row || otherColumn === column || region === state.regions[dog] ||
      Math.abs(otherRow - row) <= 1 && Math.abs(otherColumn - column) <= 1) ? [index] : [];
  });
  assert.deepEqual(excluded.slice().sort((a, b) => a - b), expected, 'the full exclusion set matches all four rules');
  assert.ok(!excluded.includes(dog), 'placed dog is not crossed');
  for (const index of state.solution.filter(index => index !== dog)) assert.ok(!excluded.includes(index));
  const before = copy(state);
  for (const index of excluded) {
    assert.deepEqual(P.place(state, index), { changed: false, code: 'blocked', index });
    assert.equal(P.toggleMark(state, index), false);
  }
  assert.deepEqual(state, before);
  assert.deepEqual(state.marks, Array(state.size ** 2).fill(false), 'automatic crosses are not manual notes');
});

test('dogs on a distant shared diagonal remain legal', () => {
  const state = legacyState([3, 5, '3330331133331323333333443', '31402']);
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
  for (const index of [-1, state.size ** 2, 2.5, '4', null, undefined, NaN, Infinity]) {
    assert.equal(P.place(state, index).code, 'invalid');
    assert.equal(P.toggleMark(state, index), false);
  }
  assert.deepEqual(state, before);
  assert.equal(P.undo(state), false);
  const dog = state.solution[0];
  P.place(state, dog);
  assert.equal(P.toggleMark(state, dog), false);
  assert.equal(state.dogs[dog], true);
  assert.equal(state.marks[dog], false);
});

test('manual notes, placement and dog removal can be undone without losing hidden notes', () => {
  const state = P.create(1);
  const dog = state.solution[0], note = (dog + 1) % state.size;
  assert.equal(P.toggleMark(state, dog), true);
  assert.equal(P.toggleMark(state, note), true);
  assert.equal(P.place(state, dog).code, 'placed');
  assert.equal(state.marks[dog], false);
  assert.equal(state.marks[note], true, 'a note survives when an automatic cross covers it');
  assert.equal(P.place(state, dog).code, 'removed');
  assert.deepEqual(P.autoMarks(state), []);
  assert.equal(state.marks[note], true);
  assert.equal(P.undo(state), true);
  assert.equal(state.dogs[dog], true);
  assert.equal(P.undo(state), true);
  assert.equal(state.dogs[dog], false);
  assert.equal(state.marks[dog], true);
  assert.equal(P.toggleMark(state, dog), true);
  assert.equal(state.marks[dog], false);
});

test('incorrect guesses spend lives, preserve notes, and cannot be refunded with undo', () => {
  const state = P.create(1);
  const wrong = wrongCell(state);
  P.toggleMark(state, wrong);
  assert.deepEqual(P.place(state, wrong), { changed: true, code: 'mistake', index: wrong });
  assert.equal(state.dogs[wrong], false);
  assert.equal(state.marks[wrong], true);
  assert.equal(state.lives, 2);
  assert.equal(state.mistakes, 1);
  assert.equal(P.undo(state), true, 'undo restores the note action preceding the mistake');
  assert.equal(state.marks[wrong], false);
  assert.equal(state.lives, 2);
  assert.equal(state.mistakes, 1);
  assert.equal(P.undo(state), false, 'a mistake does not create a refundable history entry');
});

test('the third wrong guess ends play and new-game creation resets lives and history', () => {
  const state = P.create(1);
  const wrong = wrongCell(state);
  P.toggleMark(state, 1);
  for (let guess = 1; guess <= 3; guess++) {
    assert.equal(P.place(state, wrong).code, 'mistake');
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
    const state = P.create(100);
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
  for (let guess = 0; guess < 3; guess++) P.place(lost, wrongCell(lost));
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
    raw => { raw.level = 101; },
    raw => { raw.level = '1'; },
    raw => { raw.size = 6; },
    raw => { raw.regions[0] = (raw.regions[0] + 1) % raw.size; },
    raw => { raw.solution[0] = (raw.solution[0] + 1) % raw.size; },
    raw => { raw.regions = Array(raw.size ** 2); },
    raw => { raw.solution = Array(raw.size); },
    raw => { raw.dogs = Array(raw.size ** 2); },
    raw => { raw.marks = Array(raw.size ** 2); },
    raw => { raw.dogs.pop(); },
    raw => { raw.marks.push(false); },
    raw => { raw.dogs[4] = 1; },
    raw => { raw.marks[0] = 'false'; },
    raw => { raw.dogs[wrongCell(raw)] = true; },
    raw => { raw.dogs[raw.solution[0]] = true; raw.marks[raw.solution[0]] = true; },
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
