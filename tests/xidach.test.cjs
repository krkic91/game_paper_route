// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/xidach-logic.js');

function hand(...ranks) {
  const copies = new Map();
  return ranks.map(rank => {
    const copy = copies.get(rank) || 0;
    copies.set(rank, copy + 1);
    return { id: `${L.SUITS[copy]}-${rank}`, rank, suit: L.SUITS[copy] };
  });
}
function fixture(player, dealer, upcoming = []) {
  const deck = L.createDeck();
  const take = rank => {
    const index = deck.findIndex(card => card.rank === rank);
    assert.notEqual(index, -1, `Cannot deal rank ${rank}`);
    return deck.splice(index, 1)[0];
  };
  const hands = { player: player.map(take), dealer: dealer.map(take) };
  const top = upcoming.map(take);
  deck.push(...top.reverse());
  return { hands, deck, phase: 'player', outcome: null, reason: '', score: 0 };
}
function random(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function assertConserved(state) {
  const cards = [...state.deck, ...state.hands.player, ...state.hands.dealer];
  assert.equal(cards.length, 52);
  assert.equal(new Set(cards.map(card => card.id)).size, 52);
}

test('deck has 52 unique cards and each new game deals two per player', () => {
  const deck = L.createDeck();
  assert.equal(new Set(deck.map(card => card.id)).size, 52);
  for (const suit of L.SUITS) assert.equal(deck.filter(card => card.suit === suit).length, 13);
  const a = L.createGame({ random: random(55) });
  const b = L.createGame({ random: random(55) });
  assert.deepEqual(a, b);
  assert.equal(a.deck.length, 48);
  assert.equal(a.hands.player.length, 2);
  assert.equal(a.hands.dealer.length, 2);
  assertConserved(a);
});

test('aces use 1, 10 or 11, including several aces and totals near 21', () => {
  assert.deepEqual(L.evaluate(hand(1, 5)).validTotals, [6, 15, 16]);
  assert.equal(L.evaluate(hand(1, 5)).total, 16);
  assert.equal(L.evaluate(hand(1, 5)).soft, true);
  assert.deepEqual(L.evaluate(hand(1, 1, 9)).validTotals, [11, 20, 21]);
  assert.equal(L.evaluate(hand(1, 1, 9)).total, 21);
  assert.equal(L.evaluate(hand(1, 10, 10)).total, 21);
  assert.equal(L.evaluate(hand(1, 10, 10)).soft, false);
  assert.equal(L.evaluate(hand(1, 10, 10, 2)).total, 23);
  assert.equal(L.evaluate(hand(1, 10, 10, 2)).bust, true);
  assert.equal(L.evaluate(hand(11, 12)).total, 20);
});

test('natural and five-card ranks obey Xi ban > Xi dach > Ngu linh > ordinary', () => {
  const xiBan = hand(1, 1), xiDach = hand(1, 13), nguLinh = hand(2, 3, 4, 5, 7), normal = hand(10, 9, 2);
  assert.equal(L.evaluate(xiBan).type, 'xiban');
  assert.equal(L.evaluate(xiDach).type, 'xidach');
  assert.equal(L.evaluate(nguLinh).type, 'ngulinh');
  assert.equal(L.evaluate(nguLinh).total, 21);
  assert.equal(L.evaluate(normal).type, 'normal');
  assert.equal(L.compareHands(xiBan, xiDach), 1);
  assert.equal(L.compareHands(xiDach, nguLinh), 1);
  assert.equal(L.compareHands(nguLinh, normal), 1);
  for (const face of [10, 11, 12, 13]) assert.equal(L.evaluate(hand(1, face)).type, 'xidach');
});

test('Ngu linh uses the smallest valid ace sum and smaller totals win', () => {
  const value = L.evaluate(hand(1, 2, 2, 3, 3));
  assert.equal(value.type, 'ngulinh');
  assert.deepEqual(value.validTotals, [11, 20, 21]);
  assert.equal(value.points, 11);
  assert.equal(L.compareHands(hand(1, 2, 2, 3, 3), hand(2, 2, 3, 3, 4)), 1);
  assert.equal(L.compareHands(hand(2, 2, 3, 3, 4), hand(1, 2, 2, 3, 3)), -1);
});

test('matching natural ranks and matching ordinary or Ngu linh points push', () => {
  assert.equal(L.compareHands(hand(1, 1), hand(1, 1)), 0);
  assert.equal(L.compareHands(hand(1, 10), hand(1, 13)), 0);
  assert.equal(L.compareHands(hand(10, 8), hand(9, 9)), 0);
  assert.equal(L.compareHands(hand(2, 2, 3, 3, 4), hand(1, 2, 2, 4, 5)), 0);
});

test('naturals settle immediately at the deal, including against another natural', () => {
  let naturalCount = 0, bothCount = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    const state = L.createGame({ random: random(seed) });
    const a = L.evaluate(state.hands.player), b = L.evaluate(state.hands.dealer);
    if (a.rank < 3 && b.rank < 3) continue;
    naturalCount++;
    if (a.rank >= 3 && b.rank >= 3) bothCount++;
    assert.equal(state.phase, 'done');
    assert.equal(state.reason, 'natural');
    const comparison = L.compareHands(state.hands.player, state.hands.dealer);
    assert.equal(state.outcome, comparison > 0 ? 'win' : comparison < 0 ? 'loss' : 'push');
    assert.equal(state.deck.length, 48);
  }
  assert.ok(naturalCount > 100);
  assert.ok(bothCount > 0);
});

test('stand requires 16 points; invalid actions never change state', () => {
  const state = fixture([10, 5], [10, 7]);
  const before = JSON.stringify(state);
  assert.equal(L.canStand(state), false);
  assert.equal(L.stand(state).ok, false);
  assert.equal(L.dealerStep(state).ok, false);
  assert.equal(JSON.stringify(state), before);
  const soft16 = fixture([1, 5], [10, 7]);
  assert.equal(L.canStand(soft16), true);
  assert.equal(L.stand(soft16).ok, true);
  assert.equal(soft16.phase, 'dealer');
  const dealerPhase = JSON.stringify(soft16);
  assert.equal(L.hit(soft16).ok, false);
  assert.equal(L.stand(soft16).ok, false);
  assert.equal(JSON.stringify(soft16), dealerPhase);
});

test('player bust ends immediately without a dealer draw and scores zero', () => {
  const state = fixture([10, 6], [2, 3], [10]);
  assert.equal(L.hit(state).ok, true);
  assert.equal(state.phase, 'done');
  assert.equal(state.reason, 'player-bust');
  assert.equal(state.outcome, 'loss');
  assert.equal(state.score, 0);
  assert.equal(state.hands.dealer.length, 2);
  const before = JSON.stringify(state);
  for (const action of [L.hit, L.stand, L.dealerStep]) assert.equal(action(state).ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(L.compareHands(hand(10, 10, 2), hand(10, 10, 3)), -1);
  assertConserved(state);
});

test('21 points and five cards automatically end the player turn', () => {
  const twentyOne = fixture([10, 6], [10, 8], [5]);
  L.hit(twentyOne);
  assert.equal(twentyOne.phase, 'dealer');
  assert.equal(L.hit(twentyOne).ok, false);
  L.dealerStep(twentyOne);
  assert.equal(twentyOne.outcome, 'win');
  assert.equal(twentyOne.score, 100);
  const five = fixture([2, 2], [10, 9], [3, 3, 4]);
  L.hit(five); L.hit(five); L.hit(five);
  assert.equal(five.hands.player.length, 5);
  assert.equal(five.phase, 'dealer');
  assert.equal(L.hit(five).ok, false);
  assert.equal(L.evaluate(five.hands.player).type, 'ngulinh');
  L.dealerStep(five);
  assert.equal(five.outcome, 'win');
  assertConserved(five);
});

test('dealer stands on soft 17, hits below 17 and stops on five cards', () => {
  const soft17 = fixture([10, 8], [1, 6], [10]);
  L.stand(soft17); L.dealerStep(soft17);
  assert.equal(soft17.hands.dealer.length, 2);
  assert.equal(soft17.outcome, 'win');
  const below = fixture([10, 8], [10, 6], [2]);
  L.stand(below); L.dealerStep(below);
  assert.equal(below.hands.dealer.length, 3);
  assert.equal(below.outcome, 'push');
  const five = fixture([10, 8], [2, 2], [3, 3, 4]);
  L.stand(five);
  L.dealerStep(five); L.dealerStep(five); L.dealerStep(five);
  assert.equal(five.hands.dealer.length, 5);
  assert.equal(five.phase, 'done');
  assert.equal(five.outcome, 'loss');
  assertConserved(five);
});

test('dealer policy is independent of the player hand', () => {
  const low = fixture([10, 6], [7, 5], [3, 8]);
  const high = JSON.parse(JSON.stringify(low));
  high.hands.player = hand(10, 9);
  L.stand(low); L.stand(high);
  while (low.phase === 'dealer') L.dealerStep(low);
  while (high.phase === 'dealer') L.dealerStep(high);
  assert.deepEqual(low.hands.dealer, high.hands.dealer);
  assert.deepEqual(low.deck, high.deck);
});

test('public view hides the hole card and deck contents until the dealer turn', () => {
  const state = fixture([10, 6], [7, 9]);
  const view = L.publicState(state);
  assert.equal(view.hands.dealer[1], null);
  assert.equal(view.dealerValue, null);
  assert.equal(view.deck, undefined);
  assert.equal(view.deckCount, 48);
  view.hands.player[0].rank = 1;
  assert.equal(state.hands.player[0].rank, 10);
  L.stand(state);
  assert.deepEqual(L.publicState(state).hands.dealer, state.hands.dealer);
  assert.equal(L.publicState(state).dealerValue.total, 16);
});

test('1000 seeded rounds finish without exceeding five cards or losing deck cards', () => {
  const outcomes = new Set();
  for (let seed = 1; seed <= 1000; seed++) {
    const state = L.createGame({ random: random(seed) });
    let moves = 0;
    while (state.phase !== 'done') {
      assert.ok(++moves <= 8, `Round ${seed} must terminate`);
      const result = state.phase === 'dealer' ? L.dealerStep(state) : L.evaluate(state.hands.player).total < 18 ? L.hit(state) : L.stand(state);
      assert.equal(result.ok, true);
      assert.ok(state.hands.player.length <= 5);
      assert.ok(state.hands.dealer.length <= 5);
      assertConserved(state);
    }
    outcomes.add(state.outcome);
    assert.equal(state.score, state.outcome === 'win' ? 100 : 0);
  }
  assert.deepEqual([...outcomes].sort(), ['loss', 'push', 'win']);
});
