// version v1.0
'use strict';
const { assert, run, capture, state, press, restart, pauseAfter } = require('./browser-expansion-kit.cjs');
const cell = index => `[data-onet-cell="${index}"]`;
const currentMove = page => page.evaluate(() => window.ArcadeOnet.findMatches(window.__expansionState, 1)[0]);
async function pair(page, touch = false) {
  const move = await currentMove(page); assert.ok(move);
  const before = await state(page);
  await press(page, cell(move.a), touch, 32); await press(page, cell(move.b), touch, 32);
  await page.waitForFunction(matched => window.__expansionState.matched === matched + 1, before.matched);
  await page.waitForFunction(() => !document.querySelector('.onet-cell.is-matched'));
}
run({
  id: 'onet', api: 'ArcadeOnet',
  async setup(page) {
    await capture(page, 'ArcadeOnet', {}, (s, fixture, L) => {
      if (fixture === 'win') {
        const move = L.findMatches(s, 1)[0], value = s.board[move.a];
        s.board.fill(0); s.locks.fill(0); s.board[move.a] = s.board[move.b] = value;
        s.remaining = 2; s.matched = 0; s.time = 99;
      }
      if (fixture === 'loss') s.time = .12;
      if (fixture === 'stalled') { for (let p = 0; p < s.board.length; p++) if (s.board[p]) s.locks[p] = 3; }
    });
  },
  async functional(page) {
    let s = await state(page); assert.equal(s.level, 1); assert.equal(s.remaining, 36);
    assert.equal(await page.locator('[data-onet-cell]').count(), 36);
    await pair(page); assert.equal((await state(page)).remaining, 34);
    await pauseAfter(page, () => document.querySelector('[data-onet-hint]').click());
    assert.equal((await state(page)).hints, 2); assert.equal(await page.locator('.onet-cell.is-hint').count(), 2);
    assert.ok(await page.locator('.onet-path polyline').getAttribute('points'));
    const hinted = await page.locator('.onet-cell.is-hint').evaluateAll(elements => elements.map(el => el.dataset.onetCell));
    await page.locator(cell(hinted[0])).focus(); await page.keyboard.press('Enter');
    await page.locator(cell(hinted[1])).focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__expansionState.matched === 2);
    await page.waitForFunction(() => !document.querySelector('.onet-cell.is-matched'));
    const beforeShuffle = (await state(page)).board.filter(Boolean).sort();
    await press(page, '[data-onet-shuffle]');
    assert.deepEqual((await state(page)).board.filter(Boolean).sort(), beforeShuffle);
    assert.equal((await state(page)).shuffles, 1);
    // Restart in the same task as a pending match animation. Its old callback
    // must not rewrite the replacement board or finish the replacement round.
    await page.evaluate(() => {
      const m = window.ArcadeOnet.findMatches(window.__expansionState, 1)[0];
      document.querySelector(`[data-onet-cell="${m.a}"]`).click();
      document.querySelector(`[data-onet-cell="${m.b}"]`).click();
      document.querySelector('#restart-game').click();
    });
    await page.waitForTimeout(500); s = await state(page);
    assert.equal(s.matched, 0); assert.equal(s.remaining, 36); assert.equal(await page.locator('[data-onet-cell]').count(), 36);
    await page.locator('[data-onet-level]').selectOption('24');
    s = await state(page); assert.equal(s.level, 24); assert.equal(s.rows, 8); assert.equal(s.cols, 8);
    const locked = s.locks.findIndex(v => v > s.matched); assert.ok(locked >= 0);
    await press(page, cell(locked));
    assert.equal(await page.locator('.onet-cell.is-selected').count(), 0);
    assert.match(await page.locator('.game-status').innerText(), /đóng băng/);
    await restart(page, 'stalled'); await press(page, '[data-onet-hint]');
    assert.equal((await state(page)).rescues, 1); assert.equal(await page.locator('.onet-cell.is-hint').count(), 2);
    await page.locator('[data-onet-level]').selectOption('1');
    await restart(page, 'win'); await pair(page);
    await page.locator('.result-overlay').waitFor(); assert.equal((await state(page)).phase, 'won');
    await press(page, '[data-onet-next]'); assert.equal((await state(page)).level, 2);
    await restart(page, 'loss'); await page.locator('.result-overlay').waitFor();
    assert.equal((await state(page)).phase, 'lost'); assert.match(await page.locator('.game-result-card h3').innerText(), /Hết thời gian/);
    await page.evaluate(() => { window.__fixture = 'opening'; });
    await press(page, '[data-again]'); assert.equal((await state(page)).phase, 'play');
  },
  async responsive(page, { touch }) {
    await page.locator('[data-onet-level]').selectOption('24');
    assert.equal((await state(page)).cols, 8);
    await press(page, '[data-onet-hint]', touch); assert.equal(await page.locator('.onet-cell.is-hint').count(), 2);
    await pair(page, touch); assert.equal((await state(page)).matched, 1);
    await press(page, '[data-onet-shuffle]', touch); assert.equal((await state(page)).shuffles, 0);
    const s = await state(page), far = s.board.map((value, index) => ({ value, index })).filter(p => p.value);
    assert.ok(far.length);
    // Reach both extremes of the contained scrolling board on narrow screens.
    await press(page, cell(far[0].index), touch, 32);
    await press(page, cell(far.at(-1).index), touch, 32);
  },
}).catch(error => { console.error(error); process.exitCode = 1; });
