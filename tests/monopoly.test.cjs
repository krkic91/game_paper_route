// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../games/monopoly-logic.js');

function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function fixture(options = {}) {
  const queue = [], fallback = seeded(7);
  const state = M.createGame({ random: () => queue.length ? queue.shift() : fallback(), ...options });
  return { state, dice: (a, b) => queue.push((a - 0.5) / 6, (b - 0.5) / 6) };
}
function cash(state, player, amount) {
  state.bank += state.players[player].cash - amount;
  state.players[player].cash = amount;
}
function ledger(state) {
  assert.equal(state.players.reduce((sum, player) => sum + player.cash, state.bank), 4 * M.START_CASH);
  assert.ok(state.players.every(player => player.cash >= 0 && Number.isInteger(player.cash)));
}
function unchanged(state, action) {
  const before = structuredClone(state), result = action();
  assert.equal(result.ok, false);
  assert.deepEqual(result.events, []);
  assert.deepEqual(state, before);
}
function accepted(result) { assert.equal(result.ok, true, result.error); return result; }

test('24 spaces, seven pairs, four solvent players, bounded short game', () => {
  const { state } = fixture();
  assert.equal(M.BOARD.length, 24);
  assert.equal(M.GROUPS.length, 7);
  for (let group = 0; group < 7; group++) assert.equal(M.BOARD.filter(tile => tile.group === group).length, 2);
  assert.deepEqual(state.players.map(player => player.cash), [1100, 1100, 1100, 1100]);
  assert.equal(state.maxRounds, 30);
  assert.equal(state.phase, 'roll');
  assert.equal(new Set(state.chanceDeck).size, M.CHANCES.length);
  assert.ok(state.properties.every(deed => deed.owner === null && deed.level === 0));
  assert.throws(() => M.createGame({ maxRounds: 31 }), RangeError);
  assert.throws(() => M.createGame({ random: 1 }), TypeError);
  ledger(state);
});

test('roll, purchase and turn advance debit bank once without another roll for doubles', () => {
  const { state, dice } = fixture();
  dice(1, 1);
  accepted(M.roll(state, 0));
  assert.equal(state.players[0].position, 2);
  assert.equal(state.phase, 'buy');
  accepted(M.buy(state, 0));
  assert.equal(state.properties[2].owner, 0);
  assert.equal(state.players[0].cash, 980);
  assert.equal(state.bank, 120);
  assert.equal(state.phase, 'end');
  unchanged(state, () => M.roll(state, 0));
  accepted(M.endTurn(state, 0));
  assert.equal(state.current, 1);
  assert.equal(state.round, 1);
  assert.equal(state.turn, 1);
  ledger(state);
});

test('declining leaves land unowned; insufficient cash cannot buy or take a loan', () => {
  const { state, dice } = fixture();
  cash(state, 0, 10);
  dice(1, 1);
  accepted(M.roll(state, 0));
  unchanged(state, () => M.buy(state, 0));
  accepted(M.decline(state, 0));
  assert.equal(state.properties[2].owner, null);
  assert.equal(state.players[0].cash, 10);
  assert.equal(state.phase, 'end');
  ledger(state);
});

test('invalid actions, wrong player, and wrong phase are no-ops', () => {
  const { state } = fixture();
  for (const action of [
    () => M.roll(state, -1), () => M.roll(state, 1), () => M.roll(state, '0'),
    () => M.buy(state, 0), () => M.decline(state, 0), () => M.endTurn(state, 0),
    () => M.upgrade(state, 0, 1), () => M.upgrade(state, 0, '1'),
    () => M.payBail(state, 0), () => M.act(state, 0, null), () => M.act(state, 0, { type: 'cheat' }),
  ]) unchanged(state, action);
});

test('rent transfers only to another owner and conserves the cash ledger', () => {
  const { state, dice } = fixture();
  state.properties[2].owner = 1;
  dice(1, 1);
  const result = accepted(M.roll(state, 0));
  assert.equal(M.rent(state, 2), 18);
  assert.equal(state.players[0].cash, 1082);
  assert.equal(state.players[1].cash, 1118);
  assert.equal(state.bank, 0);
  assert.equal(result.events.find(event => event.type === 'payment').recipient, 1);
  ledger(state);
  const own = fixture();
  own.state.properties[2].owner = 0;
  own.dice(1, 1);
  accepted(M.roll(own.state, 0));
  assert.equal(own.state.players[0].cash, 1100);
  ledger(own.state);
});

test('full groups double base rent; improvements apply 4x and 7x base rent', () => {
  const { state } = fixture();
  state.properties[1].owner = state.properties[2].owner = 0;
  assert.equal(M.ownsGroup(state, 0, 0), true);
  assert.equal(M.ownsGroup(state, 1, 0), false);
  assert.equal(M.rent(state, 2), 36);
  assert.deepEqual(M.legalUpgrades(state, 0), [1, 2]);
  accepted(M.upgrade(state, 0, 2));
  assert.equal(M.rent(state, 2), 72);
  accepted(M.upgrade(state, 0, 2));
  assert.equal(M.rent(state, 2), 126);
  assert.equal(state.players[0].cash, 960);
  unchanged(state, () => M.upgrade(state, 0, 2));
  assert.equal(M.netWorth(state, 0), 1320);
  ledger(state);
});

test('upgrading requires both deeds, own turn, enough cash and a roll/end phase', () => {
  const { state } = fixture();
  state.properties[1].owner = 0;
  unchanged(state, () => M.upgrade(state, 0, 1));
  state.properties[2].owner = 0;
  state.phase = 'buy';
  unchanged(state, () => M.upgrade(state, 0, 1));
  state.phase = 'end';
  cash(state, 0, 69);
  unchanged(state, () => M.upgrade(state, 0, 1));
  cash(state, 0, 70);
  accepted(M.upgrade(state, 0, 1));
  assert.equal(state.players[0].cash, 0);
  assert.equal(state.properties[1].level, 1);
  ledger(state);
});

test('passing and landing on Start award exactly one salary', () => {
  for (const position of [22, 23]) {
    const { state, dice } = fixture();
    state.players[0].position = position;
    dice(1, 1);
    const result = accepted(M.roll(state, 0));
    assert.equal(state.players[0].position, (position + 2) % 24);
    assert.equal(state.players[0].cash, 1260);
    assert.equal(result.events.filter(event => event.type === 'credit').length, 1);
    ledger(state);
  }
});

test('go-to-jail gives no salary while a normal visit does not detain', () => {
  const detained = fixture();
  detained.state.players[0].position = 16;
  detained.dice(1, 1);
  accepted(M.roll(detained.state, 0));
  assert.equal(detained.state.players[0].position, 6);
  assert.equal(detained.state.players[0].jailed, true);
  assert.equal(detained.state.players[0].cash, 1100);
  assert.equal(detained.state.phase, 'end');
  const visitor = fixture();
  visitor.state.players[0].position = 4;
  visitor.dice(1, 1);
  accepted(M.roll(visitor.state, 0));
  assert.equal(visitor.state.players[0].position, 6);
  assert.equal(visitor.state.players[0].jailed, false);
  ledger(detained.state); ledger(visitor.state);
});

test('jail: first non-double waits, second non-double pays and moves', () => {
  const { state, dice } = fixture();
  Object.assign(state.players[0], { position: 6, jailed: true });
  dice(1, 2);
  accepted(M.roll(state, 0));
  assert.equal(state.players[0].position, 6);
  assert.equal(state.players[0].jailed, true);
  assert.equal(state.players[0].jailAttempts, 1);
  assert.equal(state.players[0].cash, 1100);
  assert.equal(state.phase, 'end');
  state.phase = 'roll'; // The next visit to this player's turn.
  dice(2, 3);
  accepted(M.roll(state, 0));
  assert.equal(state.players[0].position, 11);
  assert.equal(state.players[0].jailed, false);
  assert.equal(state.players[0].jailAttempts, 0);
  assert.equal(state.players[0].cash, 1050);
  assert.equal(state.phase, 'buy');
  ledger(state);
});

test('jail doubles release for free; voluntary bail debits once before rolling', () => {
  const released = fixture();
  Object.assign(released.state.players[0], { position: 6, jailed: true, jailAttempts: 1 });
  released.dice(3, 3);
  accepted(M.roll(released.state, 0));
  assert.equal(released.state.players[0].position, 12);
  assert.equal(released.state.players[0].jailed, false);
  assert.equal(released.state.players[0].cash, 1100);
  assert.equal(released.state.phase, 'end');
  const bailed = fixture();
  Object.assign(bailed.state.players[0], { position: 6, jailed: true });
  accepted(M.payBail(bailed.state, 0));
  assert.equal(bailed.state.phase, 'roll');
  assert.equal(bailed.state.players[0].cash, 1050);
  assert.equal(bailed.state.players[0].jailed, false);
  unchanged(bailed.state, () => M.payBail(bailed.state, 0));
  ledger(released.state); ledger(bailed.state);
});

test('unaffordable forced jail fine bankrupts before any movement', () => {
  const { state, dice } = fixture();
  Object.assign(state.players[0], { position: 6, jailed: true, jailAttempts: 1 });
  cash(state, 0, 20);
  unchanged(state, () => M.payBail(state, 0));
  dice(1, 2);
  accepted(M.roll(state, 0));
  assert.equal(state.players[0].bankrupt, true);
  assert.equal(state.players[0].position, 6);
  assert.equal(state.players[0].cash, 0);
  assert.equal(state.phase, 'end');
  accepted(M.endTurn(state, 0));
  assert.equal(state.current, 1);
  ledger(state);
});

test('automatic liquidation sells improvements at half cost before land', () => {
  const { state, dice } = fixture();
  cash(state, 0, 20);
  state.properties[1].owner = state.properties[2].owner = 0;
  state.properties[2].level = 2;
  state.players[0].position = 6;
  dice(1, 1); // Tax of 90 at position 8.
  accepted(M.roll(state, 0));
  assert.equal(state.properties[2].level, 0);
  assert.equal(state.properties[1].owner, 0);
  assert.equal(state.properties[2].owner, 0);
  assert.equal(state.players[0].cash, 0);
  assert.equal(state.players[0].bankrupt, false);
  ledger(state);
});

test('liquidation refunds land at half value and makes it purchasable again', () => {
  const { state, dice } = fixture();
  cash(state, 0, 20);
  state.properties[1].owner = state.properties[2].owner = 0;
  state.players[0].position = 15;
  dice(1, 1); // Tax of 120: 20 + 50 + 60 - 120.
  accepted(M.roll(state, 0));
  assert.deepEqual(state.properties[1], { owner: null, level: 0 });
  assert.deepEqual(state.properties[2], { owner: null, level: 0 });
  assert.equal(state.players[0].cash, 10);
  assert.equal(state.players[0].bankrupt, false);
  ledger(state);
});

test('bankruptcy pays available funds only, returns deeds to bank and skips the debtor', () => {
  const { state, dice } = fixture();
  cash(state, 0, 10);
  state.properties[1].owner = 0;
  state.properties[22].owner = state.properties[23].owner = 1;
  state.properties[23].level = 2; // Rent 448; available cash after selling = 60.
  state.players[0].position = 21;
  dice(1, 1);
  const result = accepted(M.roll(state, 0));
  assert.equal(state.players[0].cash, 0);
  assert.equal(state.players[0].bankrupt, true);
  assert.equal(state.players[1].cash, 1160);
  assert.equal(state.properties[1].owner, null);
  assert.equal(result.events.find(event => event.type === 'payment').required, 448);
  accepted(M.endTurn(state, 0));
  assert.equal(state.current, 1);
  ledger(state);
});

test('chance cards cover credits, fees, Start, jail and per-level repairs', () => {
  for (let index = 0; index < M.CHANCES.length; index++) {
    const { state, dice } = fixture();
    state.chanceDeck = [index];
    state.properties[1] = { owner: 0, level: 2 };
    state.properties[2] = { owner: 0, level: 1 };
    dice(1, 2); // Chance at 3.
    const result = accepted(M.roll(state, 0));
    const card = M.CHANCES[index];
    assert.equal(result.events.find(event => event.type === 'chance').card, index);
    if (card.type === 'credit') assert.equal(state.players[0].cash, 1100 + card.amount);
    if (card.type === 'debit') assert.equal(state.players[0].cash, 1100 - card.amount);
    if (card.type === 'repair') assert.equal(state.players[0].cash, 1010);
    if (card.type === 'start') { assert.equal(state.players[0].position, 0); assert.equal(state.players[0].cash, 1260); }
    if (card.type === 'jail') { assert.equal(state.players[0].position, 6); assert.equal(state.players[0].jailed, true); }
    ledger(state);
  }
});

test('chance deck reshuffles only after all cards have been drawn', () => {
  const { state, dice } = fixture();
  const seen = new Set();
  for (let count = 0; count < M.CHANCES.length + 1; count++) {
    state.current = 0;
    state.phase = 'roll';
    state.players[0].position = 0;
    state.players[0].jailed = false;
    dice(1, 2);
    const result = accepted(M.roll(state, 0));
    const index = result.events.find(event => event.type === 'chance').card;
    if (count < M.CHANCES.length) { assert.equal(seen.has(index), false); seen.add(index); }
  }
  assert.equal(state.chanceIndex, 1);
  ledger(state);
});

test('the final surviving player wins immediately after bankruptcy', () => {
  const { state, dice } = fixture();
  for (const player of [2, 3]) { cash(state, player, 0); state.players[player].bankrupt = true; }
  cash(state, 0, 1);
  state.players[0].position = 6;
  dice(1, 1);
  accepted(M.roll(state, 0));
  assert.equal(state.phase, 'over');
  assert.equal(state.reason, 'last-player');
  assert.deepEqual(state.winners, [1]);
  assert.equal(state.ranking[0].player, 1);
  unchanged(state, () => M.endTurn(state, 0));
  ledger(state);
});

test('round limit grants every remaining seat a turn, ranks assets and handles ties', () => {
  const { state } = fixture({ maxRounds: 2 });
  state.current = 3;
  state.phase = 'end';
  state.round = 1;
  accepted(M.endTurn(state, 3));
  assert.equal(state.round, 2);
  assert.equal(state.current, 0);
  assert.equal(state.phase, 'roll');
  for (let player = 0; player < 4; player++) {
    assert.equal(state.current, player);
    state.phase = 'end';
    accepted(M.endTurn(state, player));
  }
  assert.equal(state.phase, 'over');
  assert.equal(state.round, 2);
  assert.equal(state.reason, 'round-limit');
  assert.deepEqual(state.winners, [0, 1, 2, 3]);
  const richer = fixture({ maxRounds: 1 }).state;
  richer.current = 3;
  richer.phase = 'end';
  richer.properties[23] = { owner: 2, level: 2 };
  accepted(M.endTurn(richer, 3));
  assert.deepEqual(richer.winners, [2]);
  assert.equal(richer.ranking[0].worth, 1840);
});

test('round increments correctly when seat zero or the last seat has gone bankrupt', () => {
  for (const eliminated of [0, 3]) {
    const { state } = fixture({ maxRounds: 2 });
    cash(state, eliminated, 0);
    state.players[eliminated].bankrupt = true;
    state.current = eliminated === 3 ? 2 : 3;
    state.phase = 'end';
    accepted(M.endTurn(state, state.current));
    assert.equal(state.round, 2);
    assert.equal(state.current, eliminated === 0 ? 1 : 0);
    ledger(state);
  }
});

test('300 seeded bot games finish within 30 rounds with valid ownership, money and ledger', () => {
  let bankruptcies = 0, upgrades = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const state = M.createGame({ random: seeded(seed) });
    let actions = 0;
    while (state.phase !== 'over') {
      assert.ok(actions++ < 800, `seed ${seed} failed to terminate`);
      const action = M.botAction(state);
      const result = accepted(M.act(state, state.current, action));
      upgrades += result.events.filter(event => event.type === 'upgrade').length;
      bankruptcies += result.events.filter(event => event.type === 'bankrupt').length;
      ledger(state);
      assert.ok(state.round >= 1 && state.round <= 30);
      for (const tile of M.BOARD) {
        const deed = state.properties[tile.index];
        assert.ok(deed.owner === null || (Number.isInteger(deed.owner) && deed.owner >= 0 && deed.owner < 4));
        assert.ok(Number.isInteger(deed.level) && deed.level >= 0 && deed.level <= 2);
        if (deed.owner !== null) assert.equal(state.players[deed.owner].bankrupt, false);
        if (deed.level > 0) assert.equal(M.ownsGroup(state, deed.owner, tile.group), true);
      }
    }
    assert.ok(state.winners.length > 0);
    assert.equal(M.botAction(state), null);
    for (const type of ['roll', 'buy', 'decline', 'end', 'upgrade', 'bail']) unchanged(state, () => M.act(state, state.current, { type, tile: 1 }));
  }
  assert.ok(upgrades > 0);
  assert.ok(bankruptcies > 0);
});
