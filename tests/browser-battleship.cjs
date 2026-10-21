// version v1.0
'use strict';
const { assert, run, capture, state, restart, press, pauseAfter } = require('./browser-expansion-kit.cjs');
const fixture = (game, name, L) => {
  if (name !== 'win') return;
  L.randomizeFleet(game);
  const cells = game.boards[1].ships.flatMap(ship => ship.cells);
  for (const cell of cells.slice(0, -1)) game.boards[1].shots[cell] = true;
};
run({
  id: 'battleship', api: 'ArcadeBattleship',
  setup: page => capture(page, 'ArcadeBattleship', {}, fixture),
  async functional(page) {
    assert.equal((await state(page)).phase, 'setup');
    assert.equal(await page.locator('[data-bs-launch]').isDisabled(), true);
    await page.locator('[data-bs-difficulty]').selectOption('hard');
    await press(page, '[data-bs-place="9"]', false, 26);
    assert.equal((await state(page)).boards[0].ships.length, 0, 'out-of-bounds placement rejected');
    for (const cell of [0, 20, 40, 60, 80]) await press(page, `[data-bs-place="${cell}"]`, false, 26);
    assert.equal((await state(page)).boards[0].ships.length, 5);
    await press(page, '[data-bs-ship="carrier"]');
    await press(page, '[data-bs-place="10"]', false, 26);
    assert.deepEqual((await state(page)).boards[0].ships.find(ship => ship.id === 'carrier').cells, [10, 11, 12, 13, 14]);
    await page.locator('[data-bs-place="10"]').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.bsPlace), '11');
    await page.keyboard.press('r'); assert.match(await page.locator('[data-bs-rotate]').textContent(), /Dọc/);
    await press(page, '[data-bs-launch]');
    assert.equal((await state(page)).difficulty, 'hard');
    assert.equal(await page.locator('[data-bs-target].bs-ship').count(), 0, 'unhit enemy ships not exposed in DOM');
    assert.equal(await page.locator('[data-bs-target][aria-label$=": tàu"]').count(), 0);
    const cell = (await state(page)).boards[1].ships[0].cells[0];
    await page.evaluate(cell => { window.__testShot = cell; }, cell);
    await pauseAfter(page, () => document.querySelector(`[data-bs-target="${window.__testShot}"]`).click());
    await page.waitForFunction(() => window.__expansionState.turn === 2);
    assert.equal(await page.locator(`[data-bs-target="${cell}"]`).isDisabled(), true);
    assert.equal((await state(page)).current, 0);
    await restart(page, 'win');
    await press(page, '[data-bs-launch]');
    const winCell = (await state(page)).boards[1].ships.flatMap(ship => ship.cells).at(-1);
    await press(page, `[data-bs-target="${winCell}"]`, false, 26);
    await page.locator('.result-overlay').waitFor();
    assert.equal((await state(page)).winner, 0);
    await page.evaluate(() => { window.__fixture = 'opening'; });
    await page.locator('[data-again]').click();
    assert.equal((await state(page)).phase, 'setup'); assert.equal((await state(page)).boards[0].ships.length, 0);
    // Leave an AI turn pending so the kit verifies that closing really cancels it.
    await press(page, '[data-bs-random]'); await press(page, '[data-bs-launch]');
    await page.evaluate(() => document.querySelector('[data-bs-target="99"]').click());
  },
  async responsive(page, { touch }) {
    await press(page, '[data-bs-random]', touch);
    assert.equal((await state(page)).boards[0].ships.length, 5);
    await press(page, '[data-bs-launch]', touch);
    await press(page, '[data-bs-target="99"]', touch, 26);
    await page.waitForFunction(() => window.__expansionState.turn === 2);
    assert.equal((await state(page)).current, 0);
    assert.equal(await page.locator('[data-bs-target].bs-ship').count(), 0);
  },
}).catch(error => { console.error(error); process.exitCode = 1; });
