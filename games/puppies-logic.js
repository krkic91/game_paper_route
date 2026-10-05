// version v1.0
/* Connected color regions: one puppy per row, column and region; puppies cannot touch. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PuppiesLogic = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  // Each string was generated offline, then checked for connected regions and exactly one solution.
  // Solution digits are column positions, one for each row. Region digits are in row-major order.
  const puzzles = [
    [5, '0000001400344243344433444', '41302'],
    [5, '1300013004330243344433344', '20314'],
    [5, '3330331133331323333333443', '31402'],
    [5, '4440014200442204443344444', '30241'],
    [5, '0000100011022230223300443', '03142'],
    [5, '0000010440444423344444444', '20413'],
    [6, '000000200012222222332222332422322225', '142035'],
    [6, '112202112222222222522223552425555555', '402531'],
    [6, '110111111115111225331155554445555555', '204135'],
    [6, '000001002001002222222232422232222555', '152403'],
    [6, '000000000014020344020344004444005444', '041352'],
    [6, '000111011133233333333333334333334353', '130524'],
    [7, '0111111011111122111111113111111111411155111666511', '0513642'],
    [7, '0000000100333350332235533222555545555555555655555', '3052461'],
    [7, '3000000333100033311203333100335334435553333333633', '1350624'],
    [7, '2200003222331362233336633334666334466665566666666', '2513640'],
    [7, '5005511555551125555512455355445555555555555555565', '2604135'],
    [7, '0000000200001020033302200344622544466654446666644', '2504631'],
    [8, '0000000000100000302222003336200033362044666665466666666676666666', '62417530'],
    [8, '1111100211112222111422223344422235444422454444444446474444444744', '62704135'],
    [8, '0000000000100020333000203333000453330444533336643333364433777666', '42617053'],
    [8, '4022000040220011400200114400003144400111445061117400671177777777', '57360241'],
    [8, '0000333325003331255535332445553344455553444555554645555544457555', '37062514'],
    [8, '4440000041330023433333234433333344333333666353666666666666666667', '51630427']
  ];
  const history = new WeakMap();

  function create(level = 1) {
    if (!Number.isInteger(level) || level < 1 || level > puzzles.length) level = 1;
    const [size, regions, solution] = puzzles[level - 1];
    const state = {
      level, size,
      regions: Array.from(regions, Number),
      solution: Array.from(solution, (column, row) => row * size + Number(column)),
      dogs: Array(size * size).fill(false), marks: Array(size * size).fill(false),
      lives: 3, hints: 0, mistakes: 0, status: 'playing'
    };
    history.set(state, []);
    return state;
  }

  function validIndex(state, index) {
    return Number.isInteger(index) && index >= 0 && index < state.size * state.size;
  }

  function remember(state) {
    const previous = history.get(state) || [];
    previous.push({ dogs: state.dogs.slice(), marks: state.marks.slice() });
    if (previous.length > 200) previous.shift();
    history.set(state, previous);
  }

  function autoMarks(state) {
    const excluded = new Set(), size = state.size;
    state.dogs.forEach((dog, index) => {
      if (!dog) return;
      const row = Math.floor(index / size), column = index % size;
      for (let other = 0; other < size * size; other++) {
        if (state.dogs[other]) continue;
        const otherRow = Math.floor(other / size), otherColumn = other % size;
        if (row === otherRow || column === otherColumn || state.regions[index] === state.regions[other] ||
            (Math.abs(row - otherRow) <= 1 && Math.abs(column - otherColumn) <= 1)) excluded.add(other);
      }
    });
    return Array.from(excluded).sort((a, b) => a - b);
  }

  function updateStatus(state) {
    if (state.lives === 0) state.status = 'lost';
    else if (state.solution.every(index => state.dogs[index])) state.status = 'won';
    else state.status = 'playing';
  }

  function place(state, index) {
    const result = (changed, code) => ({ changed, code, index });
    if (state.status !== 'playing') return result(false, 'ended');
    if (!validIndex(state, index)) return result(false, 'invalid');
    if (state.dogs[index]) {
      remember(state);
      state.dogs[index] = false;
      return result(true, 'removed');
    }
    if (autoMarks(state).includes(index)) return result(false, 'blocked');
    if (!state.solution.includes(index)) {
      state.lives--;
      state.mistakes++;
      updateStatus(state);
      return result(true, 'mistake');
    }
    remember(state);
    state.dogs[index] = true;
    state.marks[index] = false;
    updateStatus(state);
    return result(true, 'placed');
  }

  function toggleMark(state, index) {
    if (state.status !== 'playing' || !validIndex(state, index) || state.dogs[index] || autoMarks(state).includes(index)) return false;
    remember(state);
    state.marks[index] = !state.marks[index];
    return true;
  }

  function hint(state) {
    if (state.status !== 'playing') return -1;
    const index = state.solution.find(cell => !state.dogs[cell]);
    if (index === undefined) return -1;
    remember(state);
    state.dogs[index] = true;
    state.marks[index] = false;
    state.hints++;
    updateStatus(state);
    return index;
  }

  function canUndo(state) {
    return state.status === 'playing' && (history.get(state)?.length || 0) > 0;
  }

  function undo(state) {
    if (!canUndo(state)) return false;
    const previous = history.get(state).pop();
    state.dogs = previous.dogs;
    state.marks = previous.marks;
    return true;
  }

  function restore(raw) {
    if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.level) || raw.level < 1 || raw.level > puzzles.length) return null;
    const expected = create(raw.level);
    const equal = (left, right) => Array.isArray(left) && left.length === right.length && Array.from(left).every((value, i) => value === right[i]);
    if (raw.size !== expected.size || !equal(raw.regions, expected.regions) || !equal(raw.solution, expected.solution)) return null;
    const cells = expected.size * expected.size;
    const booleans = values => Array.isArray(values) && values.length === cells && Array.from(values).every(value => typeof value === 'boolean');
    if (!booleans(raw.dogs) || !booleans(raw.marks)) return null;
    if (!Number.isInteger(raw.lives) || raw.lives < 0 || raw.lives > 3 ||
        !Number.isInteger(raw.mistakes) || raw.mistakes !== 3 - raw.lives ||
        !Number.isSafeInteger(raw.hints) || raw.hints < 0) return null;
    for (let i = 0; i < cells; i++) {
      if (raw.dogs[i] && (!expected.solution.includes(i) || raw.marks[i])) return null;
    }
    expected.dogs = raw.dogs.slice();
    expected.marks = raw.marks.slice();
    expected.lives = raw.lives;
    expected.mistakes = raw.mistakes;
    expected.hints = raw.hints;
    updateStatus(expected);
    if (raw.status !== expected.status || (raw.lives === 0 && expected.solution.every(index => expected.dogs[index]))) return null;
    return expected;
  }

  function countSolutions(puzzle, limit = 2) {
    if (!puzzle || !Number.isInteger(puzzle.size) || puzzle.size < 1 || puzzle.size > 9 ||
        !Number.isInteger(limit) || limit < 1) return 0;
    const { size, regions } = puzzle;
    if (!Array.isArray(regions) || regions.length !== size * size ||
        !Array.from(regions).every(region => Number.isInteger(region) && region >= 0 && region < size) ||
        new Set(regions).size !== size) return 0;
    let count = 0;
    function visit(row, columns, colors, previousColumn) {
      if (count >= limit) return;
      if (row === size) { count++; return; }
      for (let column = 0; column < size; column++) {
        const columnBit = 1 << column, colorBit = 1 << regions[row * size + column];
        if ((columns & columnBit) || (colors & colorBit) || Math.abs(column - previousColumn) <= 1) continue;
        visit(row + 1, columns | columnBit, colors | colorBit, column);
      }
    }
    visit(0, 0, 0, -3);
    return count;
  }

  return { LEVEL_COUNT: puzzles.length, create, place, toggleMark, autoMarks, hint, undo, canUndo, restore, countSolutions };
});
