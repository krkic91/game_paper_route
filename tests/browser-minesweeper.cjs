// version v1.0
'use strict';
const { assert, run, capture, state, restart, press, pauseAfter, reachable } = require('./browser-expansion-kit.cjs');
const cell = i => `[data-ms-cell="${i}"]`;
async function settle(page) {
  await page.waitForFunction(() => !['ready', 'generating'].includes(window.__expansionState.phase));
}
async function startBoard(page, touch = false) { await press(page, cell(27), touch); await settle(page); }
async function solveThroughUI(page) {
  for (let step = 0; step < 150; step++) {
    const move = await page.evaluate(() => {
      const s = window.__expansionState, L = window.ArcadeMinesweeper;
      if (s.phase !== 'play') return null;
      const d = L.deduce(s.size, s.mineCount, s.numbers.map((n, i) => s.revealed[i] ? n : null), s.flagged);
      return d.mines.length ? { flag: true, index: d.mines[0] } : { flag: false, index: d.safe[0] };
    });
    if (!move) break;
    assert.ok(Number.isInteger(move.index), 'verified board must supply a deduction');
    // Controls and board both use production events; deductions inspect visible clues only.
    await page.locator(`[data-ms-mode="${move.flag ? 'flag' : 'reveal'}"]`).click();
    await page.locator(cell(move.index)).click();
  }
  assert.equal((await state(page)).phase, 'won');
  await page.locator('.result-overlay').waitFor();
}
async function functional(page) {
  assert.equal(await page.locator('[data-ms-cell]').count(), 64);
  await page.locator(cell(0)).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator(':focus').getAttribute('data-ms-cell'), '1');
  await page.keyboard.press('f');
  assert.equal((await state(page)).flagged[1], true);
  await page.keyboard.press('f');
  assert.equal((await state(page)).flagged[1], false);
  await startBoard(page);
  assert.equal((await state(page)).verified, true);
  await pauseAfter(page, () => {}, 450);
  const oldTime = (await state(page)).elapsed;
  // WebKit may defer the first animation frame after the pause overlay closes.
  // Assert observable resumed game time instead of assuming a fixed frame deadline.
  await page.waitForFunction(previous => window.__expansionState.elapsed > previous, oldTime, { timeout: 5000 });
  assert.ok((await state(page)).elapsed > oldTime);
  const hidden = await page.evaluate(() => window.__expansionState.revealed.findIndex(value => !value));
  const label = await page.locator(cell(hidden)).getAttribute('aria-label');
  assert.ok(label.endsWith('chưa mở'), 'hidden cell must not leak mine location in DOM');
  await solveThroughUI(page);
  await page.locator('[data-again]').click();
  assert.equal((await state(page)).phase, 'ready');
  await startBoard(page);
  const mine = await page.evaluate(() => window.__expansionState.mines.findIndex(Boolean));
  await page.locator(cell(mine)).click();
  assert.equal((await state(page)).phase, 'lost');
  await page.locator('.result-overlay').waitFor();
  await restart(page);
  await page.locator('[data-ms-daily]').check();
  await settle(page);
  const daily = (await state(page)).mines;
  await restart(page); await settle(page);
  assert.deepEqual((await state(page)).mines, daily);
  await page.locator('[data-ms-level]').selectOption('hard');
  await settle(page);
  assert.equal(await page.locator('[data-ms-cell]').count(), 144);
  assert.equal((await state(page)).verified, true);
  await reachable(page.locator(cell(143)));
}
async function responsive(page, { touch }) {
  await startBoard(page, touch);
  await press(page, '[data-ms-mode="flag"]', touch);
  const hidden = await page.evaluate(() => window.__expansionState.revealed.findIndex(value => !value));
  await press(page, cell(hidden), touch);
  assert.equal((await state(page)).flagged[hidden], true);
  await press(page, cell(hidden), touch);
  assert.equal((await state(page)).flagged[hidden], false);
  await page.locator('[data-ms-level]').selectOption('hard');
  assert.equal(await page.locator('[data-ms-cell]').count(), 144);
  await press(page, cell(143), touch);
  await settle(page);
  assert.equal((await state(page)).verified, true);
  await reachable(page.locator('[data-ms-mode="reveal"]'));
  await reachable(page.locator('[data-ms-mode="flag"]'));
}
run({ id: 'minesweeper', api: 'ArcadeMinesweeper', setup: page => capture(page, 'ArcadeMinesweeper', { seed: 'browser-217' }), functional, responsive }).catch(error => { console.error(error); process.exitCode = 1; });
