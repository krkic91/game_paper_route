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
    [8, '4440000041330023433333234433333344333333666353666666666666666667', '51630427'],
    // 25–32: no singleton regions; offline logical ratings increase within this band.
    [8, '4400444444211444422244444444443344444466445544664455466677554666', '24175360'],
    [8, '2220222212202222122222222322222223222224222225546665554466667744', '30617524'],
    [8, '1220333312203333222333332333333323334433253333332533367333333677', '30264157'],
    [8, '2215550022155555222555555555553355554455555555555655555556777755', '62075314'],
    [8, '2222200011222222222222222222223325224222255242226657222266572222', '61574203'],
    [8, '3166660031112600333226663334666633346666655666666666666666666677', '62403157'],
    [8, '0000002200110022000002220030222200344422004445526044775260047722', '13724605'],
    [8, '3333002233113322333332223333332234433352644333526773333377733333', '53741602'],
    // 33–42: no singleton regions; offline logical ratings increase within this band.
    [9, '444400000444411000444344002444344042444444444455444444448446747448446777888444777', '648302571'],
    [9, '000001777000201777000277477033777477577774476577777776777777776777777888777777888', '253160847'],
    [9, '116666000111666000221666666333366666446666666666556666666666666666666677666668877', '720314685'],
    [9, '333300044333300114333322444333334444365444444665444444666444447664444447888444444', '475362081'],
    [9, '000055555110025555660022555633025555660024555666664555666666666676666686677666686', '304258617'],
    [9, '111111001111111111112221111152222233555442222555555522555566222555777822557778822', '702841536'],
    [9, '111110000111111127111177727311177777311777774115777774115566777118877777111877777', '517082463'],
    [9, '006666666006666116026666663027466553007466556077666566777666666777776666777788666', '071836425'],
    [9, '111110011111121111111121331111111334511111134511111111666666111777666111666666881', '524680317'],
    [9, '111122200111112200415532222455535555455555555465555555665555555668555557668555557', '736405182'],
    // 43–50: no singleton regions; offline logical ratings increase within this band.
    [10, '0222222222023222221193322222229332249999933294999599999999957779999669777999999988889999998889999999', '0842597136'],
    [10, '3333000333333333311323333333332333333333333373333436357733346665773333668773333366873333337777993333', '6807931425'],
    [10, '0099999999009911999909999922999433999999943999599994999559699999999667999999999799899999999989999999', '0463157928'],
    [10, '2000000000220000110022000000002200000003240000000324660500002666050000266670000022997008002299700800', '8609152473'],
    [10, '1111110011111111101111111121111411112133444661111375566111117766661111777777771177778877117799777711', '7968024153'],
    [10, '4421116660422221116042222666664336666666466666666646665566664666666666666666676666688867666668666699', '9642051738'],
    [10, '0000000000000000001100022000110033444411333344444433334554443663474444333347444488337744448899944444', '7942861503'],
    [10, '1330022244133200224433222222443322244444366622444466655444446666644444666667744466668888446666668899', '3061842579']
  ];
  const history = new WeakMap();

  function getLevelInfo(level = 1) {
    if (!Number.isInteger(level) || level < 1 || level > puzzles.length) level = 1;
    const difficulty = level <= 6 ? 'Dễ' : level <= 12 ? 'Vừa' : level <= 18 ? 'Khá' :
      level <= 24 ? 'Khó' : level <= 32 ? 'Rất khó' : level <= 42 ? 'Chuyên gia' : 'Bậc thầy';
    return { level, size: puzzles[level - 1][0], difficulty };
  }

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

  // Square symmetries preserve rows/columns, adjacency and connected regions exactly.
  // Arbitrary row/column permutations would change those constraints and the difficulty.
  function transformCell(index, size, transform) {
    let row = Math.floor(index / size), column = index % size;
    if (transform >= 4) column = size - 1 - column;
    for (let turn = 0; turn < transform % 4; turn++) [row, column] = [column, size - 1 - row];
    return row * size + column;
  }

  function applyVariant(state, variant) {
    const regions = Array(state.size * state.size);
    state.regions.forEach((region, index) => {
      regions[transformCell(index, state.size, variant.transform)] = variant.colors[region];
    });
    state.regions = regions;
    state.solution = state.solution.map(index => transformCell(index, state.size, variant.transform)).sort((a, b) => a - b);
    state.variant = { transform: variant.transform, colors: variant.colors.slice() };
    return state;
  }

  function createShuffled(level = 1, previous = null, random = Math.random) {
    const state = create(level);
    const pick = length => {
      const value = typeof random === 'function' ? random() : Math.random();
      return Number.isFinite(value) && value >= 0 && value < 1 ? Math.floor(value * length) : 0;
    };
    const previousSolution = previous?.level === state.level && Array.isArray(previous.solution) ?
      previous.solution.slice().sort((a, b) => a - b).join(',') : null;
    const transforms = Array.from({ length: 8 }, (_, transform) => transform).filter(transform =>
      state.solution.map(index => transformCell(index, state.size, transform)).sort((a, b) => a - b).join(',') !== previousSolution);
    const transform = transforms[pick(transforms.length)];
    const colors = Array.from({ length: state.size }, (_, index) => index);
    for (let end = colors.length - 1; end > 0; end--) {
      const swap = pick(end + 1);
      [colors[end], colors[swap]] = [colors[swap], colors[end]];
    }
    return applyVariant(state, { transform, colors });
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

  function place(state, index, autoMark = true) {
    const result = (changed, code) => ({ changed, code, index });
    if (state.status !== 'playing') return result(false, 'ended');
    if (!validIndex(state, index)) return result(false, 'invalid');
    if (state.dogs[index]) {
      remember(state);
      state.dogs[index] = false;
      return result(true, 'removed');
    }
    if (autoMark && autoMarks(state).includes(index)) return result(false, 'blocked');
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

  function toggleMark(state, index, autoMark = true) {
    if (state.status !== 'playing' || !validIndex(state, index) || state.dogs[index] || (autoMark && autoMarks(state).includes(index))) return false;
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
    if (raw.variant !== undefined) {
      const variant = raw.variant;
      if (!variant || !Number.isInteger(variant.transform) || variant.transform < 0 || variant.transform > 7 ||
          !Array.isArray(variant.colors) || variant.colors.length !== expected.size ||
          !Array.from(variant.colors).every(color => Number.isInteger(color) && color >= 0 && color < expected.size) ||
          new Set(variant.colors).size !== expected.size) return null;
      applyVariant(expected, variant);
    }
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
    if (!puzzle || !Number.isInteger(puzzle.size) || puzzle.size < 1 || puzzle.size > 10 ||
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

  return { LEVEL_COUNT: puzzles.length, getLevelInfo, create, createShuffled, place, toggleMark, autoMarks, hint, undo, canUndo, restore, countSolutions };
});
