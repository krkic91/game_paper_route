// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/battleship-logic.js');
const seeded = initial => { let seed = initial; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; };
const ready = (seed = 17) => { const state = L.createGame({ random: seeded(seed) }); L.randomizeFleet(state); L.start(state); return state; };
function fleetValid(board) {
  assert.equal(board.ships.length, 5);
  assert.deepEqual(board.ships.map(ship => ship.length).sort(), [2, 3, 3, 4, 5]);
  const all = board.ships.flatMap(ship => ship.cells);
  assert.equal(all.length, 17); assert.equal(new Set(all).size, 17);
  assert.ok(all.every(cell => cell >= 0 && cell < 100));
  for (const ship of board.ships) {
    assert.equal(ship.cells.length, ship.length);
    const step = ship.cells[1] - ship.cells[0];
    assert.ok(step === 1 || step === 10);
    assert.ok(ship.cells.every((cell, index) => cell === ship.cells[0] + index * step));
    if (step === 1) assert.equal(Math.floor(ship.cells[0] / 10), Math.floor(ship.cells.at(-1) / 10));
  }
}

test('game starts in placement with full hidden fleet and empty human sea', () => {
  const state = L.createGame({ random: seeded(5) });
  assert.equal(state.phase, 'setup'); assert.equal(state.current, 0);
  assert.equal(state.boards[0].ships.length, 0); fleetValid(state.boards[1]);
  assert.equal(L.start(state).ok, false); assert.equal(L.shoot(state, 0, 1).ok, false);
  assert.throws(() => L.createGame({ random: 5 }), TypeError);
  assert.equal(L.createGame({ difficulty: 'invalid' }).difficulty, 'normal');
});

test('manual placement checks edges, collision and relocation atomically', () => {
  const state = L.createGame();
  assert.equal(L.placeShip(state, 0, 'carrier', 8).ok, false);
  assert.equal(L.placeShip(state, 0, 'carrier', 70, true).ok, false);
  assert.equal(L.placeShip(state, 0, 'carrier', 0).ok, true);
  assert.equal(L.placeShip(state, 0, 'battleship', 2, true).ok, false);
  assert.equal(L.placeShip(state, 0, 'battleship', 10).ok, true, 'touching is allowed');
  const before = JSON.stringify(state);
  assert.equal(L.placeShip(state, 0, 'carrier', 10).ok, false);
  assert.equal(JSON.stringify(state), before, 'failed move preserves previous placement');
  assert.equal(L.placeShip(state, 0, 'carrier', 5, true).ok, true);
  assert.deepEqual(state.boards[0].ships.find(ship => ship.id === 'carrier').cells, [5, 15, 25, 35, 45]);
  assert.equal(state.boards[0].ships.length, 2);
  assert.equal(L.placeShip(state, 0, 'unknown', 50).ok, false);
  assert.equal(L.placeShip(state, 2, 'carrier', 0).ok, false);
  assert.equal(L.placeShip(state, 0, 'carrier', 0, 'vertical').ok, false);
  for (const cell of [-1, 100, NaN, 1.2, '4']) assert.equal(L.placeShip(state, 0, 'carrier', cell).ok, false);
  assert.equal(L.clearFleet(state).ok, true); assert.equal(state.boards[0].ships.length, 0);
});

test('random placement always has five non-overlapping straight ships, including constant RNG', () => {
  for (let seed = 0; seed < 100; seed++) {
    const state = L.createGame({ random: seeded(seed) }); L.randomizeFleet(state);
    state.boards.forEach(fleetValid);
  }
  for (const value of [0, 0.9999999, 1, -1, NaN]) {
    const state = L.createGame({ random: () => value }); L.randomizeFleet(state); state.boards.forEach(fleetValid);
  }
  const first = ready(4), second = ready(4); assert.deepEqual(first, second);
});

test('shots alternate even after a hit, duplicate/out-of-turn shots preserve state', () => {
  const state = ready();
  const cell = state.boards[1].ships[0].cells[0];
  assert.equal(L.shoot(state, 0, cell).result, 'hit'); assert.equal(state.current, 1);
  let before = JSON.stringify(state);
  assert.equal(L.shoot(state, 0, cell + 1).ok, false); assert.equal(JSON.stringify(state), before);
  assert.equal(L.shoot(state, 1, 99).ok, true); assert.equal(state.current, 0);
  before = JSON.stringify(state);
  assert.equal(L.shoot(state, 0, cell).ok, false); assert.equal(JSON.stringify(state), before);
  for (const invalid of [-1, 100, NaN, '1', 1.5]) assert.equal(L.shoot(state, 0, invalid).ok, false);
  assert.equal(L.start(state).ok, false); assert.equal(L.clearFleet(state).ok, false);
  assert.equal(L.randomizeFleet(state).ok, false); assert.equal(L.placeShip(state, 0, 'carrier', 0).ok, false);
});

test('sinking exposes only that ship and removes exactly its length from remaining ships', () => {
  const state = ready(); const ship = state.boards[1].ships.find(item => item.id === 'cruiser');
  for (const cell of ship.cells.slice(0, -1)) state.boards[1].shots[cell] = true;
  let view = L.getView(state, 0);
  assert.equal(view.sunkShips.length, 0); assert.equal(view.remainingLengths.filter(length => length === 3).length, 2);
  const result = L.shoot(state, 0, ship.cells.at(-1)); assert.equal(result.result, 'sunk'); assert.equal(result.shipId, ship.id);
  view = L.getView(state, 0); assert.deepEqual(view.sunkShips[0], ship);
  assert.equal(view.remainingLengths.filter(length => length === 3).length, 1);
  for (const cell of ship.cells) assert.equal(view.target[cell], 'sunk');
  assert.equal(view.revealed, undefined);
});

test('seventeenth hit ends the round, reveals remaining fleet, and rejects later actions', () => {
  const state = ready(); const occupied = state.boards[1].ships.flatMap(ship => ship.cells);
  for (const cell of occupied.slice(0, -1)) state.boards[1].shots[cell] = true;
  const result = L.shoot(state, 0, occupied.at(-1));
  assert.equal(result.result, 'sunk'); assert.equal(state.phase, 'finished'); assert.equal(state.winner, 0);
  assert.equal(L.getView(state, 1).revealed.length, 5);
  const before = JSON.stringify(state); assert.equal(L.shoot(state, 1, 99).ok, false); assert.equal(JSON.stringify(state), before);
});

test('public views contain no unknown enemy positions and cannot mutate engine state', () => {
  const state = ready(), view = L.getView(state, 0);
  assert.deepEqual(view.target, Array(100).fill('unknown'));
  assert.deepEqual(view.sunkShips, []); assert.equal(view.revealed, undefined);
  assert.equal('boards' in view, false); assert.equal('ships' in view, false);
  view.own.ships[0].cells[0] = -100; view.own.shots[1] = true; view.target[4] = 'sunk'; view.remainingLengths.length = 0;
  assert.notEqual(state.boards[0].ships[0].cells[0], -100); assert.equal(state.boards[0].shots[1], false);
  assert.throws(() => L.getView(state, 5), TypeError);
});

test('AI decisions are identical for different hidden opposing layouts and own fleet positions', () => {
  const a = ready(1), b = ready(2); a.current = b.current = 1;
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const av = L.getView(a, 1), bv = L.getView(b, 1);
    for (let seed = 1; seed < 30; seed++) assert.equal(L.chooseShot(av, difficulty, seeded(seed)), L.chooseShot(bv, difficulty, seeded(seed)));
    av.own = new Proxy({}, { get() { throw new Error('AI must not inspect own or hidden layout'); } });
    assert.ok(Number.isInteger(L.chooseShot(av, difficulty, seeded(4))));
  }
});

test('normal AI follows the line of connected hits; hard AI uses possible ship footprints', () => {
  const view = L.getView(ready(), 0); view.target[44] = view.target[45] = 'hit';
  for (let seed = 1; seed <= 30; seed++) assert.ok([43, 46].includes(L.chooseShot(view, 'normal', seeded(seed))));
  view.target.fill('miss'); view.target[0] = 'hit'; view.target[1] = view.target[2] = 'unknown'; view.target[99] = 'unknown'; view.remainingLengths = [2];
  assert.equal(L.chooseShot(view, 'hard', seeded(1)), 1);
  view.target.fill('miss'); assert.equal(L.chooseShot(view), null);
  view.phase = 'finished'; assert.equal(L.chooseShot(view), null);
});

test('240 complete seeded rounds terminate with legal alternating shots and intact fleets', () => {
  for (let seed = 1; seed <= 240; seed++) {
    const state = ready(seed), random = seeded(seed + 1000), difficulty = ['easy', 'normal', 'hard'][seed % 3];
    while (state.phase === 'battle') {
      const player = state.current, cell = L.chooseShot(L.getView(state, player), difficulty, random);
      assert.ok(Number.isInteger(cell)); assert.equal(state.boards[1 - player].shots[cell], false);
      assert.equal(L.shoot(state, player, cell).ok, true);
      assert.ok(state.turn <= 199);
      if (state.phase === 'battle') assert.equal(state.current, 1 - player);
    }
    assert.ok([0, 1].includes(state.winner)); state.boards.forEach(fleetValid);
    assert.ok(state.boards[1 - state.winner].ships.every(ship => ship.cells.every(cell => state.boards[1 - state.winner].shots[cell])));
    assert.equal(state.boards.reduce((sum, board) => sum + board.shots.filter(Boolean).length, 0), state.turn);
  }
});
