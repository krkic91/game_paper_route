// version v1.0
'use strict';
const K = require('./browser-expansion-kit.cjs');
const { assert } = K;
async function setup(page) {
  await K.capture(page, 'ArcadeReversi', {}, (s, fixture) => {
    if (fixture === 'win') {
      s.mode = 'local'; s.board.fill(1); s.board[0] = 0; s.board[1] = -1;
    }
    if (fixture === 'pass') {
      s.mode = 'local';
      s.board = [-1,-1,-1,-1,-1,-1,-1,0,-1,1,1,1,-1,-1,-1,-1,-1,1,1,-1,1,-1,-1,-1,-1,1,1,1,-1,1,-1,-1,-1,1,-1,-1,1,-1,1,1,-1,-1,-1,-1,-1,1,-1,0,-1,-1,-1,-1,-1,-1,1,1,-1,1,1,1,1,1,1,1];
    }
  });
}
async function functional(page) {
  assert.equal(await page.locator('[data-reversi-cell]').count(), 64);
  assert.equal(await page.locator('.reversi-cell.is-legal').count(), 4);
  const opening = await K.state(page);
  await K.press(page, '[data-reversi-hint]');
  assert.equal(await page.locator('.reversi-cell.is-hint').count(), 1);
  assert.match(await page.locator('[data-reversi-explanation]').innerText(), /lật/);
  assert.deepEqual(await K.state(page), opening);
  await page.locator('[data-reversi-cell="19"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.reversiCell), '20');
  await page.keyboard.press('ArrowLeft');
  await K.pauseAfter(page, () => document.querySelector('[data-reversi-cell="19"]').click());
  await page.waitForFunction(() => window.__expansionState.turn === 2);
  await K.press(page, '[data-reversi-undo]'); assert.equal((await K.state(page)).turn, 0);
  await K.press(page, '[data-reversi-flip]');
  assert.equal(await page.locator('[data-reversi-cell]').first().getAttribute('data-reversi-cell'), '63');
  await page.locator('[data-reversi-mode]').selectOption('local');
  await page.locator('[data-reversi-cell="19"]').focus(); await page.keyboard.press('Enter');
  assert.equal((await K.state(page)).turn, 1); assert.equal((await K.state(page)).current, -1);
  await page.waitForTimeout(700); assert.equal((await K.state(page)).turn, 1);
  await K.press(page, '[data-reversi-undo]'); assert.equal((await K.state(page)).turn, 0);
  await page.locator('[data-reversi-mode]').selectOption('ai');
  await page.locator('[data-reversi-human]').selectOption('-1');
  await page.waitForFunction(() => window.__expansionState.turn === 1);
  assert.equal((await K.state(page)).current, -1); assert.equal(await page.locator('[data-reversi-undo]').isDisabled(), true);
  await page.locator('[data-reversi-human]').selectOption('1');
  await K.restart(page, 'pass'); await K.press(page, '[data-reversi-cell="47"]', false, 30);
  assert.equal((await K.state(page)).passed, -1); assert.equal((await K.state(page)).current, 1);
  assert.match(await page.locator('.reversi-workspace .game-status').innerText(), /bỏ lượt/);
  await K.restart(page, 'win'); await K.press(page, '[data-reversi-cell="0"]', false, 30);
  await page.locator('.result-overlay').waitFor(); assert.equal((await K.state(page)).winner, 1);
  await page.evaluate(() => { window.__fixture = 'opening'; }); await K.press(page, '[data-again]');
  assert.equal((await K.state(page)).turn, 0);
  await K.press(page, '[data-reversi-cell="19"]', false, 30); // close while bot is queued
}
async function responsive(page, { touch }) {
  await K.press(page, '[data-reversi-hint]', touch);
  const cell = page.locator('.reversi-cell.is-hint');
  await K.reachable(cell, 30); await cell[touch ? 'tap' : 'click']();
  await page.waitForFunction(() => window.__expansionState.turn === 2);
  await K.press(page, '[data-reversi-undo]', touch); assert.equal((await K.state(page)).turn, 0);
  await K.press(page, '[data-reversi-flip]', touch);
  assert.equal(await page.locator('[data-reversi-cell]').first().getAttribute('data-reversi-cell'), '63');
  await K.reachable(page.locator('[data-reversi-cell="19"]'), 30);
}
K.run({ id: 'reversi', api: 'ArcadeReversi', setup, functional, responsive }).catch(error => { console.error(error); process.exitCode = 1; });
