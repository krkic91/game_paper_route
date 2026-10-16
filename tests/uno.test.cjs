// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../games/uno-logic.js');

function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
let serial = 0;
const card = (color, value) => ({ id: `fixture-${serial++}`, color, value: String(value) });
const red = value => card('red', value);
const blue = value => card('blue', value);
const green = value => card('green', value);
const yellow = value => card('yellow', value);
const wild = value => card(null, value || 'wild');
function fixture(hands, options = {}) {
  return Object.assign(U.createGame({ random: seeded(1) }), {
    hands, deck: [yellow(7), blue(8), green(9), yellow(6), blue(4), green(2)], discard: [red(5)],
    color: 'red', current: 0, direction: 1, phase: 'play', drawnId: null,
    winner: null, score: 0, turn: 0, unoPending: null, unoCalled: [false, false, false, false], blockedTurns: 0,
  }, options);
}
const allCards = state => [...state.hands.flat(), ...state.deck, ...state.discard];
function play(state, index = 0, options) {
  const result = U.play(state, state.current, state.hands[state.current][index].id, options);
  assert.equal(result.ok, true, result.error);
  return result;
}
function unchanged(state, action) {
  const before = structuredClone(state);
  const result = action();
  assert.equal(result.ok, false);
  assert.deepEqual(result.events, []);
  assert.deepEqual(state, before);
}

test('classic deck has 108 unique cards, four seven-card hands and a numeric opening', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const state = U.createGame({ random: seeded(seed) });
    const cards = allCards(state);
    assert.equal(cards.length, 108);
    assert.equal(new Set(cards.map(item => item.id)).size, 108);
    assert.deepEqual(state.hands.map(hand => hand.length), [7, 7, 7, 7]);
    assert.equal(state.deck.length, 79);
    assert.match(state.discard[0].value, /^\d$/);
    assert.equal(state.current, 0);
    assert.equal(state.color, state.discard[0].color);
    for (const color of U.COLORS) {
      assert.equal(cards.filter(item => item.color === color).length, 25);
      assert.equal(cards.filter(item => item.color === color && item.value === '0').length, 1);
      for (const value of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2']) {
        assert.equal(cards.filter(item => item.color === color && item.value === value).length, 2);
      }
    }
    assert.equal(cards.filter(item => item.value === 'wild').length, 4);
    assert.equal(cards.filter(item => item.value === 'wild4').length, 4);
  }
  assert.deepEqual(U.createGame({ random: seeded(20) }), U.createGame({ random: seeded(20) }));
});

test('legal moves match color or value; +4 is prohibited by a matching color only', () => {
  const state = fixture([[red(2), blue(5), blue(2), wild(), wild('wild4')], [blue(4)], [green(3)], [yellow(7)]]);
  assert.deepEqual(U.legalCards(state), [state.hands[0][0].id, state.hands[0][1].id, state.hands[0][3].id]);
  assert.deepEqual(U.legalCards(state, 1), []);
  state.hands[0].shift();
  assert.ok(U.legalCards(state).includes(state.hands[0][3].id), 'a matching number in another color does not block +4');
  state.discard = [red('skip')];
  state.hands[0] = [green('skip'), yellow(9)];
  assert.deepEqual(U.legalCards(state), [state.hands[0][0].id]);
});

test('all rejected actions leave every part of state unchanged', () => {
  const state = fixture([[red(2), blue(2), wild(), wild('wild4')], [red(3)], [green(3)], [yellow(7)]]);
  for (const action of [
    () => U.play(state, 1, state.hands[1][0].id),
    () => U.play(state, 0, 'missing'),
    () => U.play(state, 0, state.hands[0][1].id),
    () => U.play(state, 0, state.hands[0][2].id),
    () => U.play(state, 0, state.hands[0][2].id, { color: 'orange' }),
    () => U.play(state, 0, state.hands[0][0].id, null),
    () => U.play(state, 0, state.hands[0][3].id, { color: 'green' }),
    () => U.draw(state, 1), () => U.draw(state, -1),
    () => U.pass(state, 0), () => U.callUno(state, 0), () => U.catchUno(state, 1),
  ]) unchanged(state, action);
});

test('skip, reverse and draw penalties change the next player in both directions without stacking', () => {
  for (const direction of [1, -1]) {
    for (const value of ['skip', 'reverse', 'draw2', 'wild4']) {
      const action = value === 'wild4' ? wild(value) : red(value);
      const state = fixture([[action, blue(1), blue(2)], [red('draw2')], [green(3)], [yellow(7)]], { direction });
      const target = direction === 1 ? 1 : 3;
      const before = state.hands[target].length;
      const result = play(state, 0, { color: 'blue' });
      if (value === 'reverse') {
        assert.equal(state.direction, -direction);
        assert.equal(state.current, direction === 1 ? 3 : 1);
      } else {
        assert.equal(state.current, 2);
        assert.equal(state.direction, direction);
      }
      assert.equal(state.hands[target].length, before + (value === 'draw2' ? 2 : value === 'wild4' ? 4 : 0));
      assert.equal(state.phase, 'play');
      assert.equal(state.color, value === 'wild4' ? 'blue' : 'red');
      assert.equal(result.events.some(event => event.type === 'skip'), value !== 'reverse');
      assert.equal(state.turn, 1);
    }
  }
});

test('drawing is allowed with a playable hand but only the freshly drawn card may then be played', () => {
  const state = fixture([[red(3), blue(2)], [blue(4)], [green(3)], [yellow(7)]], { deck: [red(7)] });
  const old = state.hands[0][0].id;
  assert.equal(U.draw(state, 0).ok, true);
  assert.equal(state.phase, 'drawn');
  assert.equal(state.current, 0);
  assert.deepEqual(U.legalCards(state), [state.drawnId]);
  unchanged(state, () => U.draw(state, 0));
  unchanged(state, () => U.play(state, 0, old));
  assert.equal(U.play(state, 0, state.drawnId).ok, true);
  assert.equal(state.current, 1);
  assert.equal(state.drawnId, null);
  assert.equal(state.hands[0].length, 2);
});

test('a playable drawn card may be kept; a non-playable drawn card automatically ends the turn', () => {
  const state = fixture([[red(3)], [blue(4)], [green(3)], [yellow(7)]], { deck: [blue(9), red(7)] });
  assert.equal(U.draw(state, 0).ok, true);
  assert.equal(U.pass(state, 0).ok, true);
  assert.equal(state.current, 1);
  assert.equal(state.hands[0].length, 2);
  assert.equal(U.draw(state, 1).ok, true);
  assert.equal(state.current, 2);
  assert.equal(state.phase, 'play');
  assert.equal(state.drawnId, null);
  assert.equal(state.hands[1].length, 2);
});

test('a freshly drawn +4 is playable only when the existing hand has no active color', () => {
  for (const matching of [false, true]) {
    const state = fixture([[matching ? red(2) : blue(2)], [blue(4)], [green(3)], [yellow(7)]], { deck: [wild('wild4')] });
    assert.equal(U.draw(state, 0).ok, true);
    assert.equal(state.phase, matching ? 'play' : 'drawn');
    assert.equal(state.current, matching ? 1 : 0);
  }
});

test('wild sets the active color and requires the next play to follow it', () => {
  const state = fixture([[wild(), red(3)], [red(4), green(4)], [blue(3)], [yellow(7)]]);
  play(state, 0, { color: 'green', uno: true });
  assert.equal(state.discard.at(-1).color, null);
  assert.equal(state.color, 'green');
  assert.deepEqual(U.legalCards(state), [state.hands[1][1].id]);
});

test('UNO may be declared with a play or rescued before another player acts', () => {
  for (const announce of [false, true]) {
    const state = fixture([[red(2), blue(3)], [red(4)], [green(3)], [yellow(7)]]);
    play(state, 0, { uno: announce });
    assert.equal(state.unoPending, announce ? null : 0);
    assert.equal(state.unoCalled[0], announce);
    if (!announce) assert.equal(U.callUno(state, 0).ok, true);
    assert.equal(state.unoPending, null);
    assert.equal(state.unoCalled[0], true);
    unchanged(state, () => U.callUno(state, 0));
    unchanged(state, () => U.catchUno(state, 1));
  }
});

test('catching a missed UNO draws two without consuming the current turn', () => {
  const state = fixture([[red(2), blue(3)], [red(4), green(9)], [green(3)], [yellow(7)]]);
  play(state);
  const turn = state.turn;
  unchanged(state, () => U.catchUno(state, 0));
  unchanged(state, () => U.callUno(state, 1));
  assert.equal(U.catchUno(state, 3).ok, true, 'any other player can catch');
  assert.equal(state.current, 1);
  assert.equal(state.turn, turn);
  assert.equal(state.hands[0].length, 3);
  assert.equal(state.unoPending, null);
  assert.equal(state.unoCalled[0], false);
  unchanged(state, () => U.catchUno(state, 1));
});

test('invalid actions preserve the UNO window; the next valid play or draw closes it', () => {
  for (const kind of ['play', 'draw']) {
    const state = fixture([[red(2), blue(3)], [red(4), green(9)], [green(3)], [yellow(7)]]);
    play(state);
    unchanged(state, () => U.play(state, 1, 'missing'));
    assert.equal(state.unoPending, 0);
    if (kind === 'play') play(state, 0, { uno: true });
    else assert.equal(U.draw(state, 1).ok, true);
    assert.notEqual(state.unoPending, 0);
    unchanged(state, () => U.callUno(state, 0));
  }
});

test('an exhausted draw pile is reshuffled with the top discard and active wild color preserved', () => {
  const top = wild();
  const state = fixture([[blue(2)], [blue(4)], [blue(3)], [yellow(7)]], {
    deck: [], discard: [red(8), yellow(9), top], color: 'green',
  });
  const before = allCards(state).map(item => item.id).sort();
  const result = U.draw(state, 0);
  assert.equal(result.ok, true);
  assert.ok(result.events.some(event => event.type === 'reshuffle' && event.count === 2));
  assert.deepEqual(state.discard, [top]);
  assert.equal(state.color, 'green');
  assert.equal(state.hands[0].length, 2);
  assert.deepEqual(allCards(state).map(item => item.id).sort(), before);
});

test('the final action penalty is drawn and included in the winner score before round completion', () => {
  for (const value of ['draw2', 'wild4']) {
    const state = fixture([[value === 'draw2' ? red(value) : wild(value)], [blue(2)], [green('skip')], [wild()]], {
      deck: [blue(4), blue(3), blue(2), blue(1)],
    });
    play(state, 0, { color: 'green' });
    assert.equal(state.phase, 'finished');
    assert.equal(state.winner, 0);
    assert.equal(state.score, value === 'draw2' ? 75 : 82);
    assert.equal(state.hands[1].length, value === 'draw2' ? 3 : 5);
    assert.equal(state.unoPending, null);
    assert.deepEqual(U.legalCards(state), []);
    assert.equal(U.chooseBotAction(state), null);
    unchanged(state, () => U.draw(state, 0));
    unchanged(state, () => U.pass(state, 0));
    unchanged(state, () => U.play(state, 0, 'missing'));
    unchanged(state, () => U.callUno(state, 0));
    unchanged(state, () => U.catchUno(state, 1));
  }
});

test('draw exhaustion never invents cards and ends only after four genuinely blocked turns', () => {
  const state = fixture([[blue(2)], [blue(4)], [green(3)], [yellow(7)]], { deck: [] });
  for (let player = 0; player < 4; player++) assert.equal(U.draw(state, player).ok, true);
  assert.equal(state.winner, -1);
  assert.equal(state.phase, 'finished');
  assert.equal(state.score, 0);
  assert.equal(allCards(state).length, 5);

  const voluntary = fixture([[red(2)], [blue(4)], [green(3)], [yellow(7)]], { deck: [] });
  for (let i = 0; i < 12; i++) assert.equal(U.draw(voluntary, voluntary.current).ok, true);
  assert.equal(voluntary.phase, 'play', 'a player declining a legal play is not a deadlock');
});

test('bots choose the strongest remaining color and use only their hand and public opponent counts', () => {
  const state = fixture([[wild(), green(1), green(2), blue(7)], [blue(3)], [green(3)], [yellow(7)]]);
  const before = structuredClone(state);
  const action = U.chooseBotAction(state);
  assert.deepEqual(action, { type: 'play', cardId: state.hands[0][0].id, uno: true, color: 'green' });
  assert.deepEqual(state, before);
  state.hands[1][0] = red(0);
  state.hands[2][0] = wild('wild4');
  state.deck = [red('skip')];
  assert.deepEqual(U.chooseBotAction(state), action);

  const defensive = fixture([[red(8), red('skip'), blue(3)], [yellow(1)], [green(3)], [yellow(7)]]);
  assert.equal(U.chooseBotAction(defensive).cardId, defensive.hands[0][1].id);
});

test('300 seeded complete bot rounds preserve all 108 cards and finish with a valid winner and score', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const state = U.createGame({ random: seeded(seed) });
    let actions = 0;
    while (state.phase !== 'finished' && actions++ < 3000) {
      const action = U.chooseBotAction(state);
      assert.ok(action, `seed ${seed}: action exists`);
      const player = state.current;
      const result = action.type === 'play' ? U.play(state, player, action.cardId, action) :
        action.type === 'draw' ? U.draw(state, player) : U.pass(state, player);
      assert.equal(result.ok, true, `seed ${seed}: ${result.error}`);
      const cards = allCards(state);
      assert.equal(cards.length, 108, `seed ${seed}: card count`);
      assert.equal(new Set(cards.map(item => item.id)).size, 108, `seed ${seed}: card uniqueness`);
      assert.ok(state.hands.every(hand => hand.length >= 0));
      assert.ok(U.COLORS.includes(state.color));
    }
    assert.equal(state.phase, 'finished', `seed ${seed}: round must terminate in under 3000 actions`);
    assert.ok(state.winner >= 0 && state.winner < 4, `seed ${seed}: winner`);
    assert.equal(state.hands[state.winner].length, 0);
    assert.equal(state.score, state.hands.flat().reduce((sum, item) => sum + U.cardPoints(item), 0));
  }
});
