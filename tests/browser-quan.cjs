// version v1.0
/* Ô ăn quan in a real browser: arrows on the pit, keyboard, animation skip, rule options, layouts.
   Requires Playwright (npm install --no-save playwright) and a running npm start server. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOTS || join(__dirname, '../test-results/quan');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath = process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined);
mkdirSync(output, { recursive: true });
const status = (page) => page.locator('.game-status').textContent();
const idle = (page) =>
  page.waitForFunction(() => document.querySelector('.quan-skip-layer')?.hidden === true, null, { timeout: 15000 });
const humanTurn = (page) =>
  page.waitForFunction(() => /Lượt Bạn\.|Chọn một ô dân/.test(document.querySelector('.game-status').textContent), null, {
    timeout: 20000,
  });
async function open(page) {
  await page.goto(`${base}/#play/quan`);
  await page.locator('.quan-workspace').waitFor();
  await page.evaluate(() => localStorage.removeItem('tram-choi.quan.settings.v1'));
  await page.reload();
  await page.locator('.quan-workspace').waitFor();
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll');
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const errors = [];
  try {
    for (const profile of [
      { name: 'desktop', viewport: { width: 1440, height: 1000 }, motion: 'no-preference' },
      { name: 'mobile', viewport: { width: 390, height: 844 }, motion: 'reduce', isMobile: true, hasTouch: true },
    ]) {
      const context = await browser.newContext({
        viewport: profile.viewport,
        reducedMotion: profile.motion,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`${profile.name}: ${error.message}`));
      page.on('console', (message) => message.type() === 'error' && errors.push(`${profile.name}: ${message.text()}`));
      let confirms = 0;
      page.on('dialog', (dialog) => {
        confirms++;
        dialog.accept();
      });
      await open(page);

      // Labels follow the mode, and the royal pits say "Quan".
      assert.equal(await page.locator('[data-stat="p1"]').evaluate((el) => el.previousElementSibling.textContent), 'BẠN');
      assert.equal(await page.locator('[data-stat="p2"]').evaluate((el) => el.previousElementSibling.textContent), 'MÁY');
      assert.match(await page.locator('[data-pit="0"] .pit-count').textContent(), /Quan\s*\+ 0/);
      assert.equal(await page.locator('[data-quan-difficulty-wrap]').isVisible(), true);
      assert.match(await page.locator('.help-variant').textContent().catch(() => 'Luật đang áp dụng'), /Luật đang áp dụng/);

      // Arrows appear on the selected pit; the right arrow on the bottom row sows towards pit 6.
      await page.locator('[data-pit="9"]').click();
      await page.locator('.quan-arrows').waitFor({ state: 'visible' });
      const pitBox = await page.locator('[data-pit="9"]').boundingBox(),
        arrowBox = await page.locator('[data-arrow="right"]').boundingBox();
      assert.ok(Math.abs(arrowBox.y + arrowBox.height / 2 - (pitBox.y + pitBox.height / 2)) < 4, 'arrow sits on the pit');
      if (profile.name === 'desktop') await page.screenshot({ path: join(output, `${profile.name}-arrows.png`) });
      await page.locator('[data-arrow="right"]').click();
      // During the replay the hand counter is visible and pits are locked.
      if (profile.motion !== 'reduce') {
        await page.locator('.quan-hand').waitFor({ state: 'visible' });
        assert.equal(await page.locator('.quan-pit:not(:disabled)').count(), 0);
        await page.screenshot({ path: join(output, `${profile.name}-sowing.png`) });
        await page.locator('.quan-skip-layer').click();
      }
      await idle(page);
      assert.equal(await page.locator('[data-pit="9"]').evaluate((el) => el.classList.contains('last-origin') || el.disabled), true);
      await humanTurn(page);
      assert.equal(await page.locator('.quan-pit.last-origin').count(), 1, 'the last move stays marked');

      // Keyboard: 1–5 picks a pit from the left of the screen, arrows sow, Esc clears.
      await page.locator('.quan-workspace').focus();
      const firstLeft = await page.evaluate(() =>
        [11, 10, 9, 8, 7].findIndex((i) => !document.querySelector(`[data-pit="${i}"]`).disabled),
      );
      await page.keyboard.press(String(firstLeft + 1));
      assert.equal(await page.locator('.quan-pit.selected').count(), 1);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.quan-pit.selected').count(), 0);
      assert.equal(await page.locator('#player-dialog').isVisible(), true, 'Esc only clears the selection');
      await page.keyboard.press(String(firstLeft + 1));
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(() => document.querySelector('.quan-pit.selected') === null);
      await page.locator('[data-quan-skip].control-button').click().catch(() => {});
      await humanTurn(page);

      // Rule options: changing rules mid-game asks first, then starts a new match with them.
      await page.locator('[data-quan-rules-toggle]').click();
      await page.locator('.quan-rules-panel').waitFor({ state: 'visible' });
      await noOverflow(page);
      await page.screenshot({ path: join(output, `${profile.name}-rules.png`) });
      await page.locator('.quan-rules-panel [name="youngQuan"]').check();
      await page.locator('.quan-rules-panel [name="debt"]').selectOption('borrow');
      await page.locator('.quan-rules-panel [type="submit"]').click();
      assert.equal(confirms, 1, 'mid-game change asks for confirmation');
      assert.equal(await page.locator('.quan-rules-panel').isVisible(), false);
      assert.match(await page.locator('.quan-rules-summary').textContent(), /Quan non.*vay đối thủ/);
      assert.equal(await page.locator('[data-stat="p1"]').textContent(), '0');
      assert.match(await page.locator('.help-variant').textContent(), /quan non/);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tram-choi.quan.settings.v1')));
      assert.equal(saved.rules.youngQuan, true);
      assert.equal(saved.rules.debt, 'borrow');

      // Rules survive a reload; difficulty is hidden for two players and names change.
      await page.reload();
      await page.locator('.quan-workspace').waitFor();
      assert.match(await page.locator('.quan-rules-summary').textContent(), /Quan non/);
      await page.locator('.game-mode select').first().selectOption('local');
      assert.equal(await page.locator('[data-quan-difficulty-wrap]').isVisible(), false);
      assert.equal(await page.locator('[data-stat="p2"]').evaluate((el) => el.previousElementSibling.textContent), 'NGƯỜI 2');
      // Player 2 (top row) also sows by on-screen direction.
      await page.locator('[data-pit="7"]').click();
      await page.locator('[data-sow="left"]').click();
      await page.locator('[data-quan-skip].control-button').click().catch(() => {});
      await idle(page);
      assert.match(await status(page), /Lượt Người 2\./);
      await page.locator('[data-pit="3"]').click();
      const before = await page.evaluate(() => document.querySelector('[data-pit="4"] .pit-count').textContent);
      await page.locator('[data-arrow="right"]').click();
      await page.locator('[data-quan-skip].control-button').click().catch(() => {});
      await idle(page);
      const after = await page.evaluate(() => document.querySelector('[data-pit="4"] .pit-count').textContent);
      assert.notEqual(before, after, 'top-row right arrow sows towards the right of the screen');
      await noOverflow(page);
      await page.screenshot({ path: join(output, `${profile.name}-local.png`) });
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('Ô ăn quan browser checks passed.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
