// version v1.0
/* "Đi trước" option for Caro, Chess and Xiangqi in a real browser.
   Requires Playwright (npm install --no-save playwright) and a running npm start server. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOTS || join(__dirname, '../test-results/first-move');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath = process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined);
mkdirSync(output, { recursive: true });

async function open(page, id, ready) {
  await page.goto(`${base}/#play/${id}`);
  await page.locator(ready).waitFor();
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll');
}

async function caro(page, name) {
  await open(page, 'caro', '.caro-board');
  const first = page.locator('[data-caro-first]');
  assert.equal(await first.inputValue(), 'human');
  assert.equal(await page.locator('.caro-cell.mark-x, .caro-cell.mark-o').count(), 0, 'you open by default');
  // Mid-game change asks first.
  await page.locator('[data-cell="0"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.caro-cell.mark-o').length === 1);
  let asked = 0;
  page.once('dialog', (dialog) => { asked++; dialog.accept(); });
  await first.selectOption('bot');
  assert.equal(asked, 1);
  // The computer plays X in the centre, you play O.
  await page.waitForFunction(() => document.querySelector('[data-cell="112"]').classList.contains('mark-x'));
  assert.equal(await page.locator('.caro-cell.mark-x, .caro-cell.mark-o').count(), 1);
  assert.match(await page.locator('[data-stat="turn"]').textContent(), /Bạn · O/);
  await page.locator('[data-cell="113"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.caro-cell.mark-x').length === 2);
  assert.equal(await page.locator('[data-cell="113"]').getAttribute('class').then((c) => c.includes('mark-o')), true);
  await noOverflow(page);
  await page.screenshot({ path: join(output, `${name}-caro.png`) });
  // Remembered after reload; hidden for two players.
  await page.reload();
  await page.locator('.caro-board').waitFor();
  assert.equal(await first.inputValue(), 'bot');
  await page.waitForFunction(() => document.querySelector('[data-cell="112"]').classList.contains('mark-x'));
  await page.locator('.game-mode select').selectOption('local');
  assert.equal(await page.locator('[data-caro-first-wrap]').isVisible(), false);
  assert.equal(await page.locator('.caro-cell.mark-x').count(), 0, 'two players: X (Người 1) opens');
  await page.locator('.game-mode select').selectOption('bot');
  await first.selectOption('human');
}

async function royal(page, kind, name) {
  await open(page, kind, `.royal-workspace[data-game="${kind}"]`);
  const first = page.locator('[data-royal-first]');
  const starter = kind === 'chess' ? 'w' : 'r';
  assert.equal(await first.inputValue(), 'human');
  assert.equal(await page.locator('.royal-workspace').getAttribute('data-turn'), starter);
  await first.selectOption('bot'); // no move yet: no confirmation needed
  // The computer moves first with White/Red, you play Black from the bottom of the board.
  await page.waitForFunction(() => document.querySelector('.royal-workspace').dataset.ply === '1', null, { timeout: 15000 });
  assert.equal(await page.locator('.royal-workspace').getAttribute('data-turn'), 'b');
  assert.match(await page.locator('[data-royal-player="bottom"]').textContent(), /Đen.*Bạn/);
  assert.match(await page.locator('[data-royal-player="top"]').textContent(), /Máy/);
  assert.equal(await page.locator('[data-royal-action="undo"]').isDisabled(), true, "can't undo the computer's opening");
  assert.match(await page.locator('.game-status').textContent(), /Máy cầm quân .* đi trước/);
  // Black's pieces sit on the bottom rows of the screen.
  const bottomRight = await page.locator('.royal-row').last().locator('.royal-cell').last().getAttribute('data-piece');
  assert.equal(bottomRight[0], 'b');
  // Play one black move and check the computer replies.
  const move = await page.evaluate((chess) => {
    const L = chess ? window.ChessLogic : window.XiangqiLogic;
    const cells = [...document.querySelectorAll('.royal-cell')];
    for (const cell of cells) {
      if (!cell.dataset.piece.startsWith('b')) continue;
      cell.click();
      const target = document.querySelector('.royal-cell[data-legal="true"]');
      if (target) return { from: cell.dataset.cell, to: target.dataset.cell, ok: Boolean(L) };
    }
    return null;
  }, kind === 'chess');
  assert.ok(move, 'black has a legal move');
  await page.locator(`.royal-cell[data-cell="${move.to}"]`).click();
  await page.waitForFunction(() => document.querySelector('.royal-workspace').dataset.ply === '3', null, { timeout: 15000 });
  assert.equal(await page.locator('[data-royal-action="undo"]').isDisabled(), false);
  await page.locator('[data-royal-action="undo"]').click();
  assert.equal(await page.locator('.royal-workspace').getAttribute('data-ply'), '1', 'undo goes back to your turn');
  assert.equal(await page.locator('.royal-workspace').getAttribute('data-turn'), 'b');
  await noOverflow(page);
  await page.screenshot({ path: join(output, `${name}-${kind}.png`) });
  // Changing mid-game asks; remembered after reload; hidden for two players.
  await page.locator(`.royal-cell[data-cell="${move.from}"]`).click();
  await page.locator(`.royal-cell[data-cell="${move.to}"]`).click();
  await page.waitForFunction(() => document.querySelector('.royal-workspace').dataset.ply === '3', null, { timeout: 15000 });
  let asked = 0;
  page.once('dialog', (dialog) => { asked++; dialog.dismiss(); });
  await first.selectOption('human');
  assert.equal(asked, 1);
  assert.equal(await first.inputValue(), 'bot', 'cancel keeps the current game');
  assert.equal(await page.locator('.royal-workspace').getAttribute('data-ply'), '3');
  await page.reload();
  await page.locator('.royal-workspace').waitFor();
  assert.equal(await first.inputValue(), 'bot');
  await page.waitForFunction(() => document.querySelector('.royal-workspace').dataset.ply === '1', null, { timeout: 15000 });
  page.once('dialog', (dialog) => dialog.accept()); // the computer already opened
  await page.locator('[data-royal-mode]').selectOption('local');
  assert.equal(await page.locator('[data-royal-first-wrap]').isVisible(), false);
  assert.equal(await page.locator('.royal-workspace').getAttribute('data-ply'), '0');
  assert.equal(await page.locator('.royal-workspace').getAttribute('data-turn'), starter);
  assert.match(await page.locator('[data-royal-player="bottom"]').textContent(), /Người chơi 1/);
  await page.locator('[data-royal-mode]').selectOption('bot');
  await page.waitForFunction(() => document.querySelector('.royal-workspace').dataset.ply === '1', null, { timeout: 15000 });
  page.once('dialog', (dialog) => dialog.accept());
  await first.selectOption('human');
  assert.equal(await page.locator('.royal-workspace').getAttribute('data-ply'), '0');
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const errors = [];
  try {
    for (const profile of [
      { name: 'desktop', viewport: { width: 1366, height: 768 } },
      { name: 'mobile', viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
    ]) {
      const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, hasTouch: profile.hasTouch, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`${profile.name}: ${error.message}`));
      page.on('console', (message) => message.type() === 'error' && errors.push(`${profile.name}: ${message.text()}`));
      await caro(page, profile.name);
      await royal(page, 'chess', profile.name);
      await royal(page, 'xiangqi', profile.name);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('First-move option checks passed for Caro, Chess and Xiangqi.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
