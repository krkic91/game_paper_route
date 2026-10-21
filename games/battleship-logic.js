// version v1.0
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeBattleship = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const SIZE = 10;
  const FLEET = Object.freeze([
    { id: 'carrier', name: 'Tàu sân bay', length: 5 },
    { id: 'battleship', name: 'Thiết giáp hạm', length: 4 },
    { id: 'cruiser', name: 'Tuần dương hạm', length: 3 },
    { id: 'submarine', name: 'Tàu ngầm', length: 3 },
    { id: 'destroyer', name: 'Khu trục hạm', length: 2 },
  ].map(Object.freeze));
  const randoms = new WeakMap();
  const validPlayer = p => p === 0 || p === 1;
  const validCell = cell => Number.isInteger(cell) && cell >= 0 && cell < 100;
  const fail = error => ({ ok: false, error });
  const unit = random => {
    const value = Number(random());
    return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999999, value)) : 0;
  };
  const pick = (items, random) => items[Math.floor(unit(random) * items.length)];
  const cellsFor = (cell, length, vertical) => {
    if (!validCell(cell) || !Number.isInteger(length) || length < 1 || length > 10) return null;
    const row = Math.floor(cell / 10), column = cell % 10;
    if ((vertical ? row : column) + length > 10) return null;
    return Array.from({ length }, (_, i) => cell + i * (vertical ? 10 : 1));
  };
  const emptyBoard = () => ({ ships: [], shots: Array(100).fill(false) });
  const sunk = (board, ship) => ship.cells.every(cell => board.shots[cell]);

  function createGame({ random = Math.random, difficulty = 'normal' } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    const state = { boards: [emptyBoard(), emptyBoard()], phase: 'setup', current: 0, turn: 0, winner: null, lastShot: null, difficulty: ['easy', 'normal', 'hard'].includes(difficulty) ? difficulty : 'normal' };
    randoms.set(state, random);
    randomizeFleet(state, 1);
    return state;
  }

  function placeShip(state, player, id, cell, vertical = false) {
    if (!state || state.phase !== 'setup' || !validPlayer(player)) return fail('Chỉ xếp tàu trước khi xuất trận.');
    const spec = FLEET.find(ship => ship.id === id);
    if (!spec || typeof vertical !== 'boolean') return fail('Tàu hoặc hướng đặt không hợp lệ.');
    const cells = cellsFor(cell, spec.length, vertical);
    if (!cells) return fail('Tàu vượt ra ngoài bản đồ. Chọn ô khác hoặc xoay tàu.');
    const board = state.boards[player];
    if (board.ships.some(ship => ship.id !== id && ship.cells.some(position => cells.includes(position)))) return fail('Các tàu không được chồng lên nhau.');
    const ship = { id, length: spec.length, cells };
    const previous = board.ships.findIndex(item => item.id === id);
    if (previous < 0) board.ships.push(ship); else board.ships[previous] = ship;
    return { ok: true, ship };
  }

  function clearFleet(state, player = 0) {
    if (!state || state.phase !== 'setup' || !validPlayer(player)) return fail('Không thể đổi đội tàu sau khi xuất trận.');
    state.boards[player] = emptyBoard();
    return { ok: true };
  }

  function randomizeFleet(state, player = 0) {
    if (!state || state.phase !== 'setup' || !validPlayer(player)) return fail('Không thể đổi đội tàu sau khi xuất trận.');
    const random = randoms.get(state) || Math.random;
    // Enumerating candidates guarantees termination even with a constant random source.
    const board = emptyBoard();
    for (const spec of FLEET) {
      const occupied = new Set(board.ships.flatMap(ship => ship.cells));
      const candidates = [];
      for (let cell = 0; cell < 100; cell++) for (const vertical of [false, true]) {
        const cells = cellsFor(cell, spec.length, vertical);
        if (cells && cells.every(position => !occupied.has(position))) candidates.push(cells);
      }
      board.ships.push({ id: spec.id, length: spec.length, cells: pick(candidates, random) });
    }
    state.boards[player] = board;
    return { ok: true };
  }

  function start(state) {
    if (!state || state.phase !== 'setup') return fail('Ván này đã bắt đầu.');
    if (!state.boards.every(board => FLEET.every(spec => board.ships.some(ship => ship.id === spec.id)))) return fail('Hãy đặt đủ cả 5 tàu trước khi xuất trận.');
    state.phase = 'battle';
    return { ok: true };
  }

  function shoot(state, player, cell) {
    if (!state || state.phase !== 'battle' || !validPlayer(player) || state.current !== player) return fail('Chưa đến lượt khai hỏa của bạn.');
    if (!validCell(cell)) return fail('Ô bắn không hợp lệ.');
    const board = state.boards[1 - player];
    if (board.shots[cell]) return fail('Ô này đã được bắn. Hãy chọn ô khác.');
    board.shots[cell] = true;
    const ship = board.ships.find(item => item.cells.includes(cell));
    const result = ship ? sunk(board, ship) ? 'sunk' : 'hit' : 'miss';
    state.lastShot = { player, cell, result, shipId: result === 'sunk' ? ship.id : null };
    state.turn++;
    if (board.ships.every(item => sunk(board, item))) {
      state.phase = 'finished'; state.winner = player;
    } else state.current = 1 - player;
    return { ok: true, ...state.lastShot };
  }

  function getView(state, player) {
    if (!validPlayer(player)) throw new TypeError('invalid player');
    const target = state.boards[1 - player];
    const sunkShips = target.ships.filter(ship => sunk(target, ship));
    const sunkCells = new Set(sunkShips.flatMap(ship => ship.cells));
    // Only revealed hits are considered here; unsunk positions never enter the view.
    const hitCells = new Set(target.ships.flatMap(ship => ship.cells.filter(cell => target.shots[cell])));
    const view = {
      phase: state.phase, current: state.current, player, turn: state.turn, winner: state.winner,
      own: { ships: state.boards[player].ships.map(ship => ({ ...ship, cells: [...ship.cells] })), shots: [...state.boards[player].shots] },
      target: Array.from({ length: 100 }, (_, cell) => !target.shots[cell] ? 'unknown' : sunkCells.has(cell) ? 'sunk' : hitCells.has(cell) ? 'hit' : 'miss'),
      sunkShips: sunkShips.map(ship => ({ id: ship.id, length: ship.length, cells: [...ship.cells] })),
      remainingLengths: target.ships.filter(ship => !sunk(target, ship)).map(ship => ship.length),
    };
    if (state.phase === 'finished') view.revealed = target.ships.map(ship => ({ ...ship, cells: [...ship.cells] }));
    return view;
  }

  function chooseShot(view, difficulty = 'normal', random = Math.random) {
    // Accept only a public view. No full state or opposing board is passed to this AI.
    if (!view || view.phase !== 'battle' || view.current !== view.player) return null;
    const cells = view.target, unknown = cells.map((value, cell) => value === 'unknown' ? cell : -1).filter(cell => cell >= 0);
    if (!unknown.length) return null;
    if (difficulty === 'easy') return pick(unknown, random);
    const hits = cells.map((value, cell) => value === 'hit' ? cell : -1).filter(cell => cell >= 0);
    const neighbors = cell => [cell - 10, cell + 10, ...(cell % 10 ? [cell - 1] : []), ...(cell % 10 < 9 ? [cell + 1] : [])].filter(validCell);
    if (difficulty !== 'hard') {
      const scores = Array(100).fill(0);
      for (const hit of hits) for (const cell of neighbors(hit)) if (cells[cell] === 'unknown') {
        scores[cell] += 1;
        const delta = cell - hit, previous = hit - delta;
        if (neighbors(hit).includes(previous) && cells[previous] === 'hit') scores[cell] += 4;
      }
      const highest = Math.max(...scores);
      if (highest) return pick(unknown.filter(cell => scores[cell] === highest), random);
      const parity = unknown.filter(cell => (Math.floor(cell / 10) + cell % 10) % 2 === 0);
      return pick(parity.length ? parity : unknown, random);
    }
    const scores = Array(100).fill(0), targeting = Array(100).fill(0);
    for (const length of view.remainingLengths) for (let start = 0; start < 100; start++) for (const vertical of [false, true]) {
      const line = cellsFor(start, length, vertical);
      if (!line || line.some(cell => cells[cell] === 'miss' || cells[cell] === 'sunk')) continue;
      const hitCount = line.filter(cell => cells[cell] === 'hit').length;
      for (const cell of line) if (cells[cell] === 'unknown') {
        scores[cell]++;
        if (hitCount) targeting[cell] += hitCount * hitCount;
      }
    }
    const weights = Math.max(...targeting) ? targeting : scores;
    const highest = Math.max(...unknown.map(cell => weights[cell]));
    return pick(unknown.filter(cell => weights[cell] === highest), random);
  }

  return Object.freeze({ SIZE, FLEET, cellsFor, createGame, placeShip, clearFleet, randomizeFleet, start, shoot, getView, chooseShot });
});
