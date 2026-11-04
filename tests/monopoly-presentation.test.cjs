'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const M = require('../games/monopoly-logic.js');
function fixture() {
  const queue = [];
  const state = M.createGame({ random: () => queue.length ? queue.shift() : 0.1 });
  return { state, dice: (a, b) => queue.push((a - 0.5) / 6, (b - 0.5) / 6) };
}
function setCash(state, amount) { state.bank += state.players[0].cash - amount; state.players[0].cash = amount; }

test('purchase preview is read-only and matches cash and both rents after completing a group', () => {
  const { state } = fixture(); state.phase = 'buy'; state.pending = 2; state.properties[1].owner = 0; setCash(state, 250);
  const before = structuredClone(state), preview = M.investmentPreview(state, 0, { type: 'buy' });
  assert.deepEqual(state, before);
  assert.equal(preview.cost, 120); assert.equal(preview.cashAfter, 130);
  assert.equal(preview.rentBefore, 18); assert.equal(preview.rentAfter, 36);
  assert.equal(preview.groupCompleted, true); assert.equal(preview.lowReserve, true); assert.equal(preview.available, true);
  assert.equal(M.buy(state, 0).ok, true, 'reserve warning must not prohibit a legal purchase');
  assert.equal(state.players[0].cash, preview.cashAfter);
  for (const entry of preview.groupRents) assert.equal(M.rent(state, entry.tile), entry.rent);
});

test('single-property, exact-cash and unaffordable previews do not promise a full group', () => {
  const { state } = fixture(); state.phase = 'buy'; state.pending = 1; setCash(state, 100);
  let preview = M.investmentPreview(state, 0, { type: 'buy' });
  assert.equal(preview.groupCompleted, false); assert.equal(preview.rentAfter, 14);
  assert.equal(preview.cashAfter, 0); assert.equal(preview.available, true);
  setCash(state, 99); preview = M.investmentPreview(state, 0, { type: 'buy' });
  assert.equal(preview.cashAfter, -1); assert.equal(preview.affordable, false); assert.equal(preview.available, false);
  assert.equal(M.buy(state, 0).ok, false);
});

test('upgrade preview follows actual rent at both levels, including outside the current turn', () => {
  const { state } = fixture(); state.properties[1].owner = state.properties[2].owner = 0;
  for (let level = 0; level < 2; level++) {
    const before = structuredClone(state), preview = M.investmentPreview(state, 0, { type: 'upgrade', tile: 1 });
    assert.deepEqual(state, before); assert.equal(preview.rentBefore, M.rent(state, 1));
    assert.equal(M.upgrade(state, 0, 1).ok, true);
    assert.equal(M.rent(state, 1), preview.rentAfter); assert.equal(state.players[0].cash, preview.cashAfter);
  }
  assert.equal(M.investmentPreview(state, 0, { type: 'upgrade', tile: 1 }), null);
  state.current = 1;
  assert.equal(M.investmentPreview(state, 0, { type: 'upgrade', tile: 2 }).available, false);
  state.phase = 'over'; assert.equal(M.investmentPreview(state, 0, { type: 'upgrade', tile: 2 }), null);
});

test('portfolio reports all pairs, missing owners and only legal upgrades without inspecting hidden chance order', () => {
  const { state } = fixture(); state.properties[1].owner = state.properties[2].owner = 0; state.properties[4].owner = 2;
  Object.defineProperty(state, 'chanceDeck', { get() { throw Error('Do not inspect hidden deck'); } });
  const groups = M.portfolio(state, 0);
  assert.equal(groups.length, 7); assert.ok(groups.every(group => group.tiles.length === 2));
  assert.equal(groups[0].owned, 2); assert.equal(groups[0].tiles.filter(tile => tile.canUpgrade).length, 2);
  assert.equal(groups[1].tiles[0].owner, 2); assert.equal(groups[1].tiles[1].owner, null);
  assert.ok(M.investmentPreview(state, 0, { type: 'upgrade', tile: 1 }));
  state.current = 1; assert.ok(M.portfolio(state, 0).every(group => group.tiles.every(tile => !tile.canUpgrade)));
  assert.equal(M.investmentPreview(state, 0, { type: 'buy' }), null);
});

test('queries reject unrelated actions, wrong ownership and incomplete groups', () => {
  const { state } = fixture();
  assert.equal(M.investmentPreview(state, 0, { type: 'roll', tile: 1 }), null);
  assert.equal(M.investmentPreview(state, 0, { type: 'upgrade', tile: 0 }), null);
  state.properties[1].owner = 0;
  assert.equal(M.investmentPreview(state, 0, { type: 'upgrade', tile: 1 }), null);
  assert.equal(M.investmentPreview(null, 0, { type: 'buy' }), null);
  assert.deepEqual(M.portfolio(state, 7), []);
});

test('liquidation receipts enumerate each refund once even when the net cash change is zero', () => {
  const { state, dice } = fixture(); setCash(state, 20);
  state.properties[1].owner = state.properties[2].owner = 0; state.properties[2].level = 2;
  state.players[0].position = 15; dice(1, 1);
  const before = state.players.map(p => p.cash), result = M.roll(state, 0), eventsBefore = structuredClone(result.events);
  const flow = M.cashFlow(result.events);
  assert.deepEqual(result.events, eventsBefore);
  assert.deepEqual(flow.sales.map(sale => [sale.tile, sale.asset, sale.amount]), [[2, 'level', 35], [2, 'level', 35], [1, 'land', 50]]);
  assert.equal(flow.received[0], 120); assert.equal(flow.paid[0], 120); assert.equal(flow.deltas[0], 0);
  assert.deepEqual(flow.deltas, state.players.map((p, id) => p.cash - before[id]));
  assert.equal(state.properties[1].owner, null); assert.equal(M.portfolio(state, 0)[0].owned, 1);
});

test('rent receipt credits the actual payment to the owner, including partial payment at bankruptcy', () => {
  const { state, dice } = fixture(); setCash(state, 10); state.properties[1].owner = 0;
  state.properties[22].owner = state.properties[23].owner = 1; state.properties[23].level = 2;
  state.players[0].position = 21; dice(1, 1);
  const before = state.players.map(p => p.cash), result = M.roll(state, 0), flow = M.cashFlow(result.events);
  assert.equal(flow.paid[0], 60); assert.equal(flow.received[1], 60);
  assert.deepEqual(flow.deltas, state.players.map((p, id) => p.cash - before[id]));
  assert.ok(flow.entries.some(text => text.includes('còn thiếu 388')));
  assert.equal(state.players[0].bankrupt, true);
});

test('salary plus purchase/upgrade/bail receipts match actual balances and nonfinancial events add no cash', () => {
  const { state, dice } = fixture(); state.players[0].position = 23; dice(1, 1);
  for (const action of [{ type: 'roll' }, { type: 'buy' }]) {
    const before = state.players.map(p => p.cash), result = M.act(state, 0, action);
    assert.equal(result.ok, true); assert.deepEqual(M.cashFlow(result.events).deltas, state.players.map((p, id) => p.cash - before[id]));
  }
  state.properties[2].owner = 0;
  for (const action of [{ type: 'upgrade', tile: 1 }, { type: 'bail' }]) {
    if (action.type === 'bail') { state.phase = 'roll'; state.players[0].jailed = true; }
    const before = state.players.map(p => p.cash), result = M.act(state, 0, action);
    assert.equal(result.ok, true); assert.deepEqual(M.cashFlow(result.events).deltas, state.players.map((p, id) => p.cash - before[id]));
  }
  assert.deepEqual(M.cashFlow([{ type: 'dice', player: 0 }]).entries, []);
  assert.deepEqual(M.cashFlow([]).deltas, [0, 0, 0, 0]);
});

test('3D ownership badges exist at level zero, survive upgrades, and disappear after sale', () => {
  const A = { editions: {}, editionHelpers: { selected: () => false, text: el => el?.textContent || '' } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/3d/extended-boards.js'), 'utf8'), { window: { Arcade3D: A } });
  const el = {
    dataset: { monopolyOwner: '0' },
    style: { gridColumn: '2', gridRow: '7', getPropertyValue: key => key === '--owner' ? '#b9d68d' : '#c49372' },
    querySelector: selector => ({ textContent: selector.includes('name') ? 'Phố Gốm' : '1' }), querySelectorAll: () => [],
  };
  let models = A.editions.monopoly().read({ all: () => [el] });
  assert.equal(models.find(item => item.key === 'owner-name-0').text, '1');
  assert.equal(models.find(item => item.key === 'owner-band-0').color, '#b9d68d');
  assert.equal(models.filter(item => item.key.startsWith('house-')).length, 0);
  el.querySelector = selector => ({ textContent: selector.includes('name') ? 'Phố Gốm' : '▰▰ 1' });
  models = A.editions.monopoly().read({ all: () => [el] });
  assert.equal(models.filter(item => item.key.startsWith('house-')).length, 2);
  assert.ok(models.some(item => item.key === 'owner-name-0'));
  el.dataset.monopolyOwner = '';
  models = A.editions.monopoly().read({ all: () => [el] });
  assert.equal(models.some(item => item.key.startsWith('owner-')), false);
});
