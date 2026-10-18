// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/tienlen-logic.js');
const card = (rank, suit = 0) => ({ id: `tl-${rank}-${suit}`, rank, suit });
const cards = (...pairs) => pairs.map(([rank, suit = 0]) => card(rank, suit));
const combo = (...pairs) => L.classify(cards(...pairs));
const run = (start, length, width = 1) => Array.from({ length }, (_, i) => Array.from({ length: width }, (__, suit) => card(start + i, suit))).flat();
const seeded = initial => { let seed = initial; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; };
const fixture = hands => ({ hands, current: 0, trick: null, passed: [false, false, false, false], opening: false, phase: 'play', winner: null, played: [], turn: 0, trickNumber: 1 });
const ids = hand => hand.map(item => item.id);
function conserved(s) {
  const all = s.hands.flat().concat(s.played);
  assert.equal(all.length, 52);
  assert.equal(new Set(ids(all)).size, 52);
  assert.deepEqual(ids(all).sort(), ids(L.createDeck()).sort());
}

test('deal conserves 52 unique cards, 13 per player, and opens with owner of 3 spades', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = L.createGame({ random: seeded(seed) });
    conserved(s);
    assert.deepEqual(s.hands.map(h => h.length), [13, 13, 13, 13]);
    assert.ok(s.hands[s.current].some(c => c.id === 'tl-0-0'));
    assert.ok(L.legalMoves(s).every(m => m.cardIds.includes('tl-0-0')));
    assert.equal(L.pass(s, s.current).ok, false);
  }
  assert.throws(() => L.createGame({ random: 7 }), TypeError);
  assert.deepEqual(L.createGame({ random: seeded(18) }), L.createGame({ random: seeded(18) }));
  conserved(L.createGame({ random: () => NaN }));
});

test('recognizes singles, pairs, triples, quads, straights and consecutive pairs', () => {
  for (const [hand, type] of [[cards([0]), 'single'], [cards([4, 0], [4, 3]), 'pair'], [cards([5, 0], [5, 1], [5, 3]), 'triple'], [run(6, 1, 4), 'quad'], [run(0, 3), 'straight'], [run(0, 12), 'straight'], [run(0, 3, 2), 'pairs'], [run(6, 6, 2), 'pairs']]) {
    assert.equal(L.classify(hand.reverse()).type, type);
  }
  assert.equal(combo([12, 1], [12, 3]).type, 'pair');
});

test('rejects duplicates, forged cards, gaps, two-card runs and runs containing twos', () => {
  for (const hand of [[], null, [card(0), card(0)], [{ ...card(0), id: 'forged' }], [card(13)], [card(0, 4)], run(0, 2), cards([0], [2], [3]), run(10, 3), run(10, 3, 2), cards([0, 0], [0, 1], [1, 0], [1, 1])]) assert.equal(L.classify(hand), null);
});

test('same combinations compare rank then highest suit and require matching lengths', () => {
  assert.equal(L.beats(combo([0, 3]), combo([0, 2])), true);
  assert.equal(L.beats(combo([1, 0]), combo([0, 3])), true);
  assert.equal(L.beats(combo([0, 2]), combo([0, 3])), false);
  assert.equal(L.beats(combo([4, 0], [4, 3]), combo([4, 1], [4, 2])), true);
  assert.equal(L.beats(L.classify(run(1, 4)), L.classify(run(0, 3))), false);
  assert.equal(L.beats(combo([5, 0], [5, 1], [5, 2]), combo([4, 0], [4, 1])), false);
});

test('chop matrix includes three pairs, quads and four pairs without out-of-turn exceptions', () => {
  const three = L.classify(run(0, 3, 2)), four = L.classify(run(0, 4, 2)), quad = L.classify(run(0, 1, 4));
  const oneTwo = combo([12]), twoTwos = combo([12, 0], [12, 1]);
  assert.equal(L.beats(three, oneTwo), true);
  assert.equal(L.beats(three, twoTwos), false);
  for (const target of [oneTwo, twoTwos, three]) assert.equal(L.beats(quad, target), true);
  for (const target of [oneTwo, twoTwos, three, quad]) assert.equal(L.beats(four, target), true);
  assert.equal(L.beats(quad, four), false);
  assert.equal(L.beats(three, combo([11])), false);
});

test('illegal actions never mutate state, including wrong turn, duplicates and missing opening card', () => {
  const s = fixture([cards([0], [1]), cards([2]), cards([3]), cards([4])]);
  s.opening = true;
  const before = structuredClone(s);
  for (const act of [() => L.play(s, 1, ['tl-2-0']), () => L.play(s, 0, []), () => L.play(s, 0, ['tl-0-0', 'tl-0-0']), () => L.play(s, 0, ['tl-9-0']), () => L.play(s, 0, ['tl-1-0']), () => L.play(s, 0, ['tl-0-0', 'tl-1-0']), () => L.pass(s, 0), () => L.pass(s, -1)]) {
    assert.equal(act().ok, false);
    assert.deepEqual(s, before);
  }
});

test('passing locks a seat out until all others yield and last player leads a new trick', () => {
  const s = fixture([cards([0], [8]), cards([1], [9]), cards([2], [10]), cards([3], [11])]);
  assert.equal(L.play(s, 0, ['tl-0-0']).ok, true);
  assert.equal(L.pass(s, 1).ok, true);
  assert.equal(L.play(s, 2, ['tl-2-0']).ok, true);
  assert.equal(L.pass(s, 3).ok, true);
  assert.equal(s.current, 0);
  assert.equal(L.play(s, 0, ['tl-0-0']).ok, false);
  assert.equal(L.pass(s, 0).ok, true);
  assert.equal(s.current, 2);
  assert.equal(s.trick, null);
  assert.equal(s.trickNumber, 2);
  assert.deepEqual(s.passed, [false, false, false, false]);
  assert.equal(L.pass(s, 2).ok, false);
  assert.equal(L.play(s, 2, ['tl-10-0']).ok, true);
  assert.equal(s.winner, 2);
});

test('first empty hand wins immediately and finished state cannot act', () => {
  const s = fixture([run(0, 3), cards([4]), cards([5]), cards([6])]);
  assert.equal(L.play(s, 0, ids(s.hands[0])).ok, true);
  assert.equal(s.phase, 'finished');
  assert.equal(s.winner, 0);
  assert.equal(s.hands[0].length, 0);
  const before = structuredClone(s);
  assert.equal(L.play(s, 1, ['tl-4-0']).ok, false);
  assert.equal(L.pass(s, 0).ok, false);
  assert.deepEqual(s, before);
});

test('legal move enumeration agrees with an exhaustive subset oracle', () => {
  for (let seed = 1; seed <= 24; seed++) {
    const s = L.createGame({ random: seeded(seed) }), player = s.current, hand = s.hands[player];
    if (seed % 2 === 0) { s.opening = false; s.trick = { player: (player + 3) % 4, cards: [card(4, 1)], combo: combo([4, 1]) }; }
    const expected = [];
    for (let mask = 1; mask < 1 << hand.length; mask++) {
      const selected = hand.filter((_, index) => mask & (1 << index));
      const classified = L.classify(selected);
      if ((!s.opening || ids(selected).includes('tl-0-0')) && L.beats(classified, s.trick && s.trick.combo)) expected.push(ids(selected).sort().join(','));
    }
    const actual = L.legalMoves(s).map(move => move.cardIds.slice().sort().join(','));
    assert.equal(new Set(actual).size, actual.length);
    assert.deepEqual(actual.sort(), expected.sort());
  }
});

test('bot choice is unchanged when opponents hidden cards are replaced', () => {
  const s = L.createGame({ random: seeded(19) });
  const before = L.chooseMove(s), p = s.current;
  for (let i = 0; i < 4; i++) if (i !== p) s.hands[i] = new Proxy([], { get() { throw new Error('Read hidden cards'); } });
  assert.deepEqual(L.chooseMove(s), before);
});

test('300 seeded games terminate legally with card conservation after every action', () => {
  const winners = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const s = L.createGame({ random: seeded(seed) });
    let steps = 0;
    while (s.phase === 'play' && steps++ < 500) {
      const move = L.chooseMove(s), p = s.current;
      const result = move.type === 'play' ? L.play(s, p, move.cardIds) : L.pass(s, p);
      assert.equal(result.ok, true, `seed ${seed}, step ${steps}`);
      conserved(s);
    }
    assert.equal(s.phase, 'finished', `seed ${seed} must finish`);
    assert.equal(s.hands[s.winner].length, 0);
    winners.add(s.winner);
  }
  assert.equal(winners.size, 4);
});
