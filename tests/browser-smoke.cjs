// version v1.0
/* Optional end-to-end checks. Requires Playwright and a running npm start server. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { tmpdir } = require('node:os');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const shots = process.env.SCREENSHOTS || join(tmpdir(), 'tram-choi-screenshots');
mkdirSync(shots, { recursive: true });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath = process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined);
const errors = [];
function watch(page) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
}
async function open(page, id) {
  await page.evaluate((id) => {
    location.hash = `#play/${id}`;
  }, id);
  await page.locator('#player-dialog').waitFor({ state: 'visible' });
  await page.waitForFunction(
    (id) =>
      location.hash === `#play/${id}` &&
      (id === 'delivery'
        ? document.querySelector('#game-stage iframe')
        : document.querySelector('#game-stage .game-workspace')),
    id,
  );
  await page.waitForTimeout(80);
}
async function close(page) {
  await page.locator('#close-game').click();
  await page.locator('#player-dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#game-stage').innerHTML(), '');
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    'page must not scroll horizontally',
  );
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    watch(page);
    await page.goto(base);
    await page.locator('.game-card').first().waitFor();
    assert.equal(await page.locator('.game-card').count(), 12);
    await noOverflow(page);
    await page.screenshot({ path: join(shots, 'desktop-home.png'), fullPage: true });
    await page.locator('[data-filter="board"]').click();
    assert.equal(await page.locator('.game-card').count(), 3);
    await page.locator('#search').fill('o an quan');
    assert.equal(await page.locator('.game-card').count(), 1);
    assert.equal(await page.locator('.game-card').getAttribute('data-game'), 'quan');
    await page.locator('#search').fill('khong-co-tro-nay');
    assert.equal(await page.locator('#empty-state').isVisible(), true);
    await page.locator('#clear-filters').click();
    assert.equal(await page.locator('.game-card').count(), 12);
    await page.locator('[data-favorite="pool"]').click();
    await page.locator('[data-view="favorites"]').click();
    assert.equal(await page.locator('.game-card').count(), 1);
    await page.reload();
    await page.locator('.game-card').first().waitFor();
    assert.equal(await page.locator('#favorite-count').textContent(), '1');
    await page.locator('[data-view="recent"]').click();
    assert.equal(await page.locator('.game-card').count(), 0);
    await page.locator('[data-view="all"]').click();
    await page.locator('.topbar-random').click();
    await page.locator('#player-dialog').waitFor({ state: 'visible' });
    await close(page);
    await page.locator('[data-view="favorites"]').click();
    await page.locator('.brand').click();
    assert.equal(await page.locator('.game-card').count(), 12);

    await open(page, 'caro');
    assert.equal(await page.locator('.caro-cell').count(), 225);
    await page.locator('[data-cell="112"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.mark-o').length === 1);
    assert.equal(await page.locator('[data-stat="moves"]').textContent(), '2');
    await page.locator('.game-mode select').selectOption('local');
    for (const cell of [0, 15, 1, 16, 2, 17, 3, 18, 4])
      await page.locator(`[data-cell="${cell}"]`).click();
    await page.locator('.result-overlay').waitFor();
    assert.equal(await page.locator('.winning-cell').count(), 5);
    assert.equal(await page.locator('#game-best').textContent(), '100');
    await page.locator('#restart-game').click();
    assert.equal(await page.locator('[data-stat="moves"]').textContent(), '0');
    assert.equal(await page.locator('.game-mode select').inputValue(), 'local');
    await page.screenshot({ path: join(shots, 'desktop-caro.png') });
    await close(page);

    await open(page, 'ludo');
    await page.evaluate(() => {
      window.__random = Math.random;
      Math.random = () => 0.999;
    });
    await page.locator('[data-roll]').click();
    await page.locator('[data-owner="0"][data-token="0"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-roll]').disabled);
    assert.match(
      await page.locator('[data-owner="0"][data-token="0"]').getAttribute('aria-label'),
      /bước 1/,
    );
    await page.evaluate(() => {
      Math.random = () => 0;
    });
    await page.locator('#restart-game').click();
    await page.locator('[data-roll]').click();
    await page.waitForFunction(() =>
      document.querySelector('[data-stat="turn"]').textContent.includes('Máy'),
    );
    await page.waitForFunction(
      () => !document.querySelector('[data-roll]').disabled,
      {},
      { timeout: 10000 },
    );
    assert.match(await page.locator('[data-stat="turn"]').textContent(), /Bạn/);
    await page.evaluate(() => {
      Math.random = window.__random;
      delete window.__random;
    });
    await close(page);

    await open(page, 'quan');
    await page.locator('[data-pit="7"]').click();
    await page.locator('[data-sow="right"]').click();
    await page.waitForFunction(() =>
      document.querySelector('.game-status').textContent.includes('Lượt Bạn.'),
    );
    await page.locator('.game-mode select').selectOption('local');
    await page.locator('[data-pit="7"]').click();
    await page.locator('[data-sow="left"]').click();
    assert.ok((await page.locator('.quan-pit.own-pit:not(:disabled)').count()) > 0);
    assert.match(await page.locator('.top-player').textContent(), /Đến lượt/);
    await page.screenshot({ path: join(shots, 'desktop-quan.png') });
    await close(page);

    await open(page, '2048');
    assert.equal(await page.locator('.number-tile').count(), 16);
    await page.locator('.game-workspace').focus();
    for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'])
      await page.keyboard.press(key);
    assert.ok(Number(await page.locator('[data-stat="moves"]').textContent()) > 0);
    assert.equal(
      await page
        .locator('.tile-0')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgb(166, 163, 137)',
    );
    await close(page);

    await open(page, 'sudoku');
    assert.equal(await page.locator('.sudoku-cell').count(), 81);
    await page.locator('.sudoku-cell[aria-readonly="false"]').first().click();
    await page.locator('[data-number="1"]').click();
    assert.equal(await page.locator('.sudoku-cell[aria-selected="true"]').getAttribute('data-value'), '1');
    await close(page);

    await open(page, 'puppies');
    assert.equal(await page.locator('.puppies-cell').count(), 25);
    await close(page);

    await open(page, 'memory');
    let cards = await page.locator('.card-front').allTextContents();
    const mismatch = cards.findIndex((value) => value !== cards[0]);
    await page.locator('[data-card="0"]').click();
    await page.locator(`[data-card="${mismatch}"]`).click();
    await page.locator('#pause-game').click();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.memory-card.is-open').count(), 2);
    await page.locator('#resume-game').click();
    await page.waitForFunction(
      () => document.querySelectorAll('.memory-card.is-open').length === 0,
    );
    await page.locator('#restart-game').click();
    cards = await page.locator('.card-front').allTextContents();
    for (const symbol of new Set(cards)) {
      const pair = cards.flatMap((value, i) => (value === symbol ? [i] : []));
      for (const i of pair) await page.locator(`[data-card="${i}"]`).click();
    }
    await page.locator('.result-overlay').waitFor();
    assert.equal(await page.locator('[data-stat="pairs"]').textContent(), '8 / 8');
    await close(page);

    await open(page, 'pool');
    await page.screenshot({ path: join(shots, 'desktop-pool.png') });
    await page.locator('[data-shoot]').click();
    assert.equal(await page.locator('[data-stat="shots"]').textContent(), '1');
    assert.equal(await page.locator('[data-shoot]').isDisabled(), true);
    await page.locator('#pause-game').click();
    const frozen = await page.locator('canvas').evaluate((el) => el.toDataURL());
    await page.waitForTimeout(300);
    assert.equal(await page.locator('canvas').evaluate((el) => el.toDataURL()), frozen);
    await page.locator('#resume-game').click();
    await page.waitForFunction(
      () => !document.querySelector('[data-shoot]').disabled,
      {},
      { timeout: 20000 },
    );
    await close(page);

    await open(page, 'race');
    await page.locator('[data-start]').click();
    await page.keyboard.down(' ');
    await page.waitForTimeout(700);
    await page.keyboard.up(' ');
    assert.ok(Number(await page.locator('[data-stat="distance"]').textContent()) > 0);
    await page.locator('#pause-game').click();
    const distance = await page.locator('[data-stat="distance"]').textContent();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[data-stat="distance"]').textContent(), distance);
    await page.locator('#restart-game').click();
    assert.equal(await page.locator('.intro-overlay').isVisible(), true);
    await close(page);

    await open(page, 'snake');
    await page.locator('[data-start]').click();
    await page.locator('.result-overlay').waitFor({ timeout: 5000 });
    await close(page);
    await open(page, 'breakout');
    await page.locator('[data-start]').click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('[data-launch]').isDisabled(), true);
    await page.locator('#restart-game').click();
    assert.equal(await page.locator('.intro-overlay').isVisible(), true);
    await close(page);

    await open(page, 'delivery');
    const delivery = await page.locator('#game-stage iframe').elementHandle();
    const frame = await delivery.contentFrame();
    await frame.waitForFunction(
      () => typeof game !== 'undefined' && game.player && game.player.z > 0,
    );
    await page.locator('#pause-game').click();
    await frame.waitForFunction(() => arcadePaused);
    const z = await frame.evaluate(() => game.player.z);
    await page.waitForTimeout(300);
    assert.equal(await frame.evaluate(() => game.player.z), z);
    await page.locator('#resume-game').click();
    await page.waitForTimeout(200);
    assert.ok((await frame.evaluate(() => game.player.z)) > z);
    await page.locator('#game-stage iframe').focus();
    await page.keyboard.press('p');
    await page.locator('#pause-screen').waitFor({ state: 'visible' });
    await page.locator('#resume-game').click();
    await page.locator('#game-stage iframe').focus();
    await page.keyboard.press('Escape');
    await page.locator('#player-dialog').waitFor({ state: 'hidden' });
    await page.locator('[data-view="recent"]').click();
    assert.equal(await page.locator('.game-card').count(), 10);

    await page.goto(`${base}/#play/caro`);
    await page.locator('.caro-board').waitFor();
    assert.equal(await page.locator('#game-best').textContent(), '100');
    await close(page);
    await context.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const mobile = await mobileContext.newPage();
    watch(mobile);
    await mobile.goto(base);
    await mobile.locator('.game-card').first().waitFor();
    await noOverflow(mobile);
    await mobile.screenshot({ path: join(shots, 'mobile-home.png'), fullPage: true });
    for (const id of [
      'caro',
      'ludo',
      'quan',
      '2048',
      'sudoku',
      'puppies',
      'memory',
      'pool',
      'race',
      'snake',
      'breakout',
      'delivery',
    ]) {
      await open(mobile, id);
      await noOverflow(mobile);
      if (['ludo', 'quan', '2048', 'sudoku', 'puppies', 'race'].includes(id))
        await mobile.screenshot({ path: join(shots, `mobile-${id}.png`) });
      assert.equal(await mobile.locator('#game-help').isVisible(), false);
      await mobile.locator('#help-game').click();
      assert.equal(await mobile.locator('#game-help').isVisible(), true);
      await mobile.locator('#help-game').click();
      assert.equal(await mobile.locator('#game-help').isVisible(), false);
      await close(mobile);
    }
    await open(mobile, '2048');
    const touch = await mobileContext.newCDPSession(mobile),
      board = await mobile.locator('.board-2048').boundingBox();
    for (const direction of [-1, 1]) {
      const x = board.x + board.width / 2 - direction * 60,
        y = board.y + board.height / 2;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + direction * 120, y }],
      });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    assert.ok(
      Number(await mobile.locator('[data-stat="moves"]').textContent()) > 0,
      'touch swipes should move 2048',
    );
    await close(mobile);
    await touch.detach();
    for (const viewport of [
      { width: 320, height: 740 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
      { width: 844, height: 390 },
    ]) {
      await mobile.setViewportSize(viewport);
      await noOverflow(mobile);
      for (const id of ['caro', 'ludo', 'quan', 'sudoku', 'puppies', 'pool', 'race']) {
        await open(mobile, id);
        await noOverflow(mobile);
        assert.ok(
          await mobile
            .locator('.stage-wrapper')
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          `${id}: stage overflows at ${viewport.width}px`,
        );
        await close(mobile);
      }
    }
    await mobileContext.close();

    const offline = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    watch(offline);
    await offline.goto(pathToFileURL(resolve(__dirname, '../index.html')).href);
    await offline.locator('.game-card').first().waitFor();
    assert.equal(await offline.locator('.game-card').count(), 12);
    await open(offline, '2048');
    assert.equal(await offline.locator('.number-tile').count(), 16);
    await close(offline);
    await open(offline, 'sudoku');
    assert.equal(await offline.locator('.sudoku-cell').count(), 81);
    await close(offline);
    await open(offline, 'puppies');
    assert.equal(await offline.locator('.puppies-cell').count(), 25);
    await close(offline);
    await open(offline, 'delivery');
    const offlineFrame = await (
      await offline.locator('#game-stage iframe').elementHandle()
    ).contentFrame();
    await offlineFrame.waitForFunction(
      () => typeof game !== 'undefined' && game.player && game.player.z > 0,
    );
    await offline.locator('#pause-game').click();
    await offlineFrame.waitForFunction(() => arcadePaused);
    const frozenZ = await offlineFrame.evaluate(() => game.player.z);
    await offline.waitForTimeout(200);
    assert.equal(await offlineFrame.evaluate(() => game.player.z), frozenZ);
    await offline.locator('#resume-game').click();
    await offlineFrame.evaluate(() => {
      game.obstacles = [];
      game.player.z = 0;
      window.GameCore.spawnThrow(game, -1);
    });
    await offline.waitForFunction(
      () => Number(document.querySelector('#game-best').textContent) >= 100,
    );
    await offline.locator('#game-stage iframe').focus();
    await offline.keyboard.press('Escape');
    await offline.locator('#player-dialog').waitFor({ state: 'hidden' });
    await offline.close();

    const restricted = await browser.newContext();
    await restricted.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Storage blocked', 'SecurityError');
        },
      });
    });
    const restrictedPage = await restricted.newPage();
    watch(restrictedPage);
    await restrictedPage.goto(base);
    await restrictedPage.locator('.game-card').first().waitFor();
    await restrictedPage.locator('[data-favorite="caro"]').click();
    assert.equal(await restrictedPage.locator('#favorite-count').textContent(), '1');
    await open(restrictedPage, '2048');
    assert.equal(await restrictedPage.locator('.number-tile').count(), 16);
    await restricted.close();
    assert.deepEqual(errors, [], 'no browser errors');
    console.log(
      'Browser checks passed: all 12 games, game rules, AI turns, pause/restart, favorites, search, persistence, mobile, and file://.',
    );
    console.log(`Screenshots: ${shots}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
