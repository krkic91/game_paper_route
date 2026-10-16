// version v1.0
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/domino-logic.js');
const tile = (a, b) => ({ id: `${Math.min(a, b)}-${Math.max(a, b)}`, a: Math.min(a, b), b: Math.max(a, b) });
const fixture = (hands, chain = [{ id: '2-4', left: 2, right: 4, player: 3 }]) => ({
  hands, chain, current: 0, openingId: '6-6', phase: 'play', passes: 0,
  winner: null, draw: false, score: 0, reason: null, turn: 0, lastAction: null,
});
function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function assertConservation(state) {
  const ids = state.hands.flat().map(item => item.id).concat(state.chain.map(item => item.id));
  assert.equal(ids.length, 28);
  assert.equal(new Set(ids).size, 28);
  assert.deepEqual(ids.sort(), L.createTiles().map(item => item.id).sort());
  assert.equal(state.hands.reduce((sum, hand) => sum + L.handPips(hand), 0) + state.chain.reduce((sum, item) => sum + item.left + item.right, 0), 168);
  for (let index = 1; index < state.chain.length; index++) assert.equal(state.chain[index - 1].right, state.chain[index].left);
}

test('double-six deck has 28 distinct tiles, seven doubles and 168 dots', () => {
  const tiles = L.createTiles();
  assert.equal(tiles.length, 28);
  assert.equal(new Set(tiles.map(item => item.id)).size, 28);
  assert.equal(tiles.filter(item => item.a === item.b).length, 7);
  assert.equal(L.handPips(tiles), 168);
});

test('deal has four seven-tile hands and only highest double may open', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const state = L.createGame({ random: seeded(seed) });
    assert.deepEqual(state.hands.map(hand => hand.length), [7, 7, 7, 7]);
    assertConservation(state);
    assert.ok(state.hands[state.current].some(item => item.id === '6-6'));
    assert.deepEqual(L.legalMoves(state), [{ type: 'play', tileId: '6-6', end: 'right' }]);
    assert.equal(L.passTurn(state, state.current).ok, false);
  }
});

test('opener prefers a double, with deterministic highest-sum fallback for custom hands', () => {
  assert.deepEqual(L.findOpener([[tile(5, 6)], [tile(0, 0)], [tile(2, 2)], [tile(3, 4)]]), { player: 2, tileId: '2-2' });
  assert.deepEqual(L.findOpener([[tile(1, 5)], [tile(2, 6)], [tile(5, 6)], [tile(4, 6)]]), { player: 2, tileId: '5-6' });
  assert.deepEqual(L.findOpener([[tile(3, 6)], [tile(4, 5)], [], []]), { player: 0, tileId: '3-6' });
  assert.equal(L.findOpener([[], [], [], []]), null);
});

test('random sources are validated and repeatable', () => {
  assert.throws(() => L.createGame({ random: 1 }), TypeError);
  assert.deepEqual(L.createGame({ random: seeded(25) }), L.createGame({ random: seeded(25) }));
  assert.notDeepEqual(L.createGame({ random: seeded(25) }).hands, L.createGame({ random: seeded(26) }).hands);
  assertConservation(L.createGame({ random: () => NaN }));
});

test('tiles are oriented correctly at either end, including zero and doubles', () => {
  for (const [item, end, expected] of [
    [tile(2, 6), 'left', [6, 2]], [tile(0, 2), 'left', [0, 2]],
    [tile(2, 2), 'left', [2, 2]], [tile(0, 4), 'right', [4, 0]],
    [tile(4, 6), 'right', [4, 6]], [tile(4, 4), 'right', [4, 4]],
  ]) {
    const state = fixture([[item, tile(1, 1)], [tile(0, 0)], [tile(3, 3)], [tile(5, 5)]]);
    assert.equal(L.playTile(state, 0, item.id, end).ok, true);
    const placed = state.chain[end === 'left' ? 0 : state.chain.length - 1];
    assert.deepEqual([placed.left, placed.right], expected);
    assert.equal(state.chain[0].right, state.chain[1].left);
    assert.equal(state.current, 1);
    assert.equal(state.hands[0].length, 1);
  }
});

test('a tile fitting both ends offers both choices with distinct exposed ends', () => {
  const state = fixture([[tile(2, 4), tile(0, 0)], [tile(1, 1)], [tile(3, 3)], [tile(5, 5)]], [{ id: 'fixture', left: 2, right: 4, player: 3 }]);
  assert.deepEqual(L.legalMoves(state), [
    { type: 'play', tileId: '2-4', end: 'left' },
    { type: 'play', tileId: '2-4', end: 'right' },
  ]);
  const other = structuredClone(state);
  L.playTile(state, 0, '2-4', 'left');
  L.playTile(other, 0, '2-4', 'right');
  assert.deepEqual([state.chain[0].left, state.chain.at(-1).right], [4, 4]);
  assert.deepEqual([other.chain[0].left, other.chain.at(-1).right], [2, 2]);
});

test('illegal tile, wrong player, invalid end and illegal pass never mutate state', () => {
  const state = fixture([[tile(2, 6), tile(1, 1)], [tile(0, 4)], [tile(3, 3)], [tile(5, 5)]]);
  const before = structuredClone(state);
  for (const [player, action] of [
    [1, { type: 'play', tileId: '0-4', end: 'right' }],
    [0, { type: 'play', tileId: '1-1', end: 'left' }],
    [0, { type: 'play', tileId: '2-6', end: 'middle' }],
    [0, { type: 'play', tileId: '6-6', end: 'left' }],
    [0, { type: 'pass' }], [7, { type: 'pass' }], [0, { type: 'draw' }], [0, null],
  ]) {
    assert.equal(L.applyAction(state, player, action).ok, false);
    assert.deepEqual(state, before);
  }
});

test('pass advances only blocked players; a play resets the consecutive pass counter', () => {
  const state = fixture([[tile(1, 1)], [tile(0, 4), tile(6, 6)], [tile(3, 3)], [tile(5, 5)]]);
  assert.deepEqual(L.chooseBotAction(state), { type: 'pass' });
  assert.equal(L.passTurn(state, 0).ok, true);
  assert.equal(state.passes, 1);
  assert.equal(state.current, 1);
  assert.equal(L.playTile(state, 1, '0-4', 'right').ok, true);
  assert.equal(state.passes, 0);
  assert.equal(state.current, 2);
});

test('four consecutive passes finish a blocked round, lowest dots wins', () => {
  const state = fixture([[tile(1, 1)], [tile(3, 3)], [tile(5, 5)], [tile(6, 6)]]);
  for (let player = 0; player < 4; player++) assert.equal(L.passTurn(state, player).ok, true);
  assert.equal(state.phase, 'finished');
  assert.equal(state.reason, 'blocked');
  assert.equal(state.winner, 0);
  assert.equal(state.score, 28);
  assert.equal(state.draw, false);
});

test('tied lowest dots on a blocked table is a draw with no score', () => {
  const state = fixture([[tile(1, 5)], [tile(3, 3)], [tile(5, 5)], [tile(6, 6)]]);
  for (let player = 0; player < 4; player++) L.passTurn(state, player);
  assert.equal(state.winner, null);
  assert.equal(state.draw, true);
  assert.equal(state.score, 0);
});

test('last tile wins immediately and finished games reject further actions', () => {
  const state = fixture([[tile(4, 6)], [tile(1, 1)], [tile(3, 3)], [tile(5, 5)]]);
  assert.equal(L.playTile(state, 0, '4-6', 'right').ok, true);
  assert.equal(state.phase, 'finished');
  assert.equal(state.winner, 0);
  assert.equal(state.reason, 'empty');
  assert.equal(state.score, 18);
  assert.equal(state.passes, 0);
  const before = structuredClone(state);
  assert.equal(L.passTurn(state, 1).ok, false);
  assert.equal(L.playTile(state, 0, '4-6', 'right').ok, false);
  assert.equal(L.chooseBotAction(state), null);
  assert.deepEqual(L.legalMoves(state), []);
  assert.deepEqual(state, before);
});

test('bot uses only its own hand and public information', () => {
  const state = fixture([[tile(2, 6), tile(4, 5), tile(0, 6)], [], [], []]);
  const expected = L.chooseBotAction(state);
  state.hands = new Proxy(state.hands, { get(target, key) {
    if (['1', '2', '3'].includes(key)) throw new Error('Bot inspected a hidden hand');
    return Reflect.get(target, key);
  } });
  assert.deepEqual(L.chooseBotAction(state), expected);
  assert.equal(L.applyAction(state, 0, expected).ok, true);
});

test('300 seeded games finish with legal moves, matching chain and full tile conservation', () => {
  const outcomes = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const random = seeded(seed);
    const state = L.createGame({ random });
    while (state.phase === 'play') {
      assert.ok(state.turn < 120, `seed ${seed} did not finish`);
      const moves = L.legalMoves(state);
      const action = seed % 2 || !moves.length ? L.chooseBotAction(state) : moves[Math.floor(random() * moves.length)];
      assert.equal(L.applyAction(state, state.current, action).ok, true);
      assertConservation(state);
    }
    outcomes.add(state.reason);
    if (state.draw) assert.equal(state.score, 0);
    else if (state.reason === 'empty') assert.equal(state.hands[state.winner].length, 0);
    else assert.equal(L.handPips(state.hands[state.winner]), Math.min(...state.hands.map(L.handPips)));
  }
  assert.deepEqual([...outcomes].sort(), ['blocked', 'empty']);
});
