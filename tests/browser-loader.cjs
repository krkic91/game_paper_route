// version v1.0
'use strict';
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = join(__dirname, '..');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const offline = pathToFileURL(join(root, 'index.html')).href;
const output = process.env.SCREENSHOTS || join(root, 'test-results/loader');
const report = { environment: 'Headless Windows Chromium/WebKit; simulated viewports, not physical iOS.', runs: [] };
mkdirSync(output, { recursive: true });
function save() { writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2)); }
async function route(page, id, edition = '2d') {
  // Remove the old board first so a rapid route change cannot satisfy the
  // readiness check with the previous game's workspace.
  if (await page.locator('#player-dialog').isVisible()) await page.locator('#close-game').click();
  await page.evaluate(({ id, edition }) => { location.hash = `#play/${id}${edition === '3d' ? '/3d' : ''}`; }, { id, edition });
  await page.locator('#player-dialog').waitFor();
  await page.waitForFunction(() => {
    const stage = document.querySelector('#game-stage');
    return stage.querySelector('.game-workspace, iframe, .three-unavailable');
  });
  assert.equal(await page.locator('.three-unavailable').count(), 0, `must open ${id}/${edition}`);
}
async function library(page, source) {
  const requested = [];
  page.on('request', request => { if (['script', 'stylesheet'].includes(request.resourceType())) requested.push(new URL(request.url()).pathname); });
  await page.goto(source);
  await page.locator('.game-card').first().waitFor();
  const initial = await page.evaluate(() => ({
    scripts: [...document.scripts].map(s => s.getAttribute('src')).filter(Boolean),
    styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(s => s.getAttribute('href')),
    hasGames: Boolean(window.ArcadeGames), hasOnline: Boolean(window.CaroOnline),
  }));
  assert.deepEqual(initial.scripts, ['art.js', 'games/loader.js', 'arcade.js']);
  assert.deepEqual(initial.styles, ['styles.css', 'games/3d/three.css']);
  assert.equal(initial.hasGames, false);
  assert.equal(initial.hasOnline, false);
  await page.keyboard.press('/');
  assert.equal(await page.locator('#search').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Escape');
  const ids = await page.locator('.game-card').evaluateAll(cards => cards.map(card => card.dataset.game));
  assert.equal(ids.length, 41);
  for (const id of ids) {
    await route(page, id);
    assert.equal(await page.locator('#pause-game').isEnabled(), true);
    assert.equal(await page.locator('#restart-game').isEnabled(), true);
    if (!['neon', 'delivery'].includes(id)) {
      await page.locator('#pause-game').click();
      assert.equal(await page.locator('#pause-screen').isVisible(), true);
      await page.locator('#resume-game').click();
    }
    await page.locator('#close-game').click();
    assert.equal(await page.locator('#game-stage').innerHTML(), '');
  }
  const unique = new Set(requested.filter(url => !url.endsWith('/core.js')));
  assert.equal(unique.size, requested.filter(url => !url.endsWith('/core.js')).length, 'shared scripts and CSS must be requested once');
  return { games: ids.length, initialScripts: initial.scripts.length, initialStyles: initial.styles.length };
}
async function retry(page, extension) {
  const failed = extension === 'js' ? '**/games/uno-logic.js' : '**/games/uno.css';
  await page.goto(base);
  await page.route(failed, request => request.abort());
  await page.evaluate(() => { location.hash = '#play/uno'; });
  await page.locator('[data-retry-game]').waitFor();
  assert.equal(await page.locator('#pause-game').isDisabled(), true);
  assert.equal(await page.locator('#restart-game').isEnabled(), true);
  await page.unroute(failed);
  await page.locator('[data-retry-game]').click();
  await page.locator('.uno-workspace').waitFor();
  assert.equal(await page.locator('#pause-game').isEnabled(), true);
  assert.equal(await page.locator(`script[src$="uno-logic.js"]`).count(), 1);
  assert.equal(await page.locator(`link[href$="uno.css"]`).count(), 1);
}
async function delayedSwitch(page, closeOnly) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/games/shared.js', async request => { await gate; await request.continue(); });
  await page.goto(base);
  await page.evaluate(() => { location.hash = '#play/uno'; });
  await page.locator('.three-loading').waitFor();
  assert.equal(await page.locator('#pause-game').isDisabled(), true);
  assert.equal(await page.locator('#restart-game').isDisabled(), true);
  await page.keyboard.press('r');
  if (closeOnly) await page.locator('#close-game').click();
  else await page.evaluate(() => { location.hash = '#play/sudoku'; });
  release();
  await page.waitForFunction(() => typeof window.ArcadeGames?.uno === 'function');
  if (closeOnly) {
    assert.equal(await page.locator('#player-dialog').isVisible(), false);
    assert.equal(await page.locator('#game-stage').innerHTML(), '');
    await route(page, 'uno');
  } else {
    await page.locator('.sudoku-workspace').waitFor();
    assert.equal(await page.locator('.uno-workspace').count(), 0);
    assert.equal(await page.locator('#game-stage').evaluate(el => el.inert), false);
  }
  assert.equal(await page.locator('script[src$="shared.js"]').count(), 1);
}
async function invitation(page) {
  await page.goto(`${base}/#play/caro?room=ABC123`);
  await page.locator('.caro-board').waitFor();
  assert.equal(await page.locator('.game-mode select').inputValue(), 'online');
  assert.equal(await page.locator('[data-online-code]').inputValue(), 'ABC123');
  assert.equal(await page.locator('#pause-game').isDisabled(), true);
  await page.evaluate(() => { location.hash = '#play/caro?room=DEF456'; });
  await page.waitForFunction(() => document.querySelector('[data-online-code]')?.value === 'DEF456');
}
async function retry3d(page) {
  await page.route('**/games/3d/board-views.js', request => request.abort());
  await page.goto(`${base}/#play/caro/3d`);
  await page.locator('[data-retry-3d]').waitFor();
  assert.equal(await page.locator('#pause-game').isDisabled(), true);
  await page.unroute('**/games/3d/board-views.js');
  await page.locator('[data-retry-3d]').click();
  await page.locator('.three-caro .three-canvas').waitFor();
  assert.equal(await page.locator('script[src$="board-views.js"]').count(), 1);
}
async function threeD(page, source) {
  await page.goto(`${source.replace(/\/$/, '')}/#play/race/3d`.replace('index.html/', 'index.html'));
  await page.locator('.three-canvas').waitFor();
  const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(n => n.src));
  assert.equal(scripts.some(url => url.endsWith('/games/3d/action-views.js')), false);
  assert.equal(scripts.some(url => url.endsWith('/games/3d/board-views.js')), false);
  for (const id of ['caro', 'ludo', 'quan', '2048', 'memory', 'snake', 'pool', 'breakout', 'delivery']) {
    await route(page, id, '3d');
    assert.equal(await page.locator('.three-canvas').count(), 1, id);
    await page.locator('[data-player-edition="2d"]').click();
    await page.waitForFunction(() => document.querySelector('#game-stage').dataset.edition === '2d' && !document.querySelector('.three-loading'));
    assert.equal(await page.locator('.three-canvas').count(), 0);
    await page.locator('#close-game').click();
  }
  return { games3d: 10 };
}
(async () => {
  for (const engine of (process.env.LOADER_BROWSERS || 'chromium,webkit').split(',')) {
    const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await { chromium, webkit }[engine].launch({ headless: true, ...(engine === 'chromium' ? { executablePath: process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) } : {}) });
    async function run(name, fn) {
      if (process.env.LOADER_CASES && !process.env.LOADER_CASES.split(',').includes(name)) return;
      const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      try {
        const details = await fn(page);
        assert.deepEqual(errors, []);
        report.runs.push({ engine, name, passed: true, ...details }); save();
        console.log(`PASS ${engine}: ${name}`);
      } finally { await page.close(); }
    }
    try {
      await run('all-games-http', page => library(page, base));
      await run('all-games-file', page => library(page, offline));
      await run('retry-script', page => retry(page, 'js'));
      await run('retry-css', page => retry(page, 'css'));
      await run('close-during-load', page => delayedSwitch(page, true));
      await run('switch-during-load', page => delayedSwitch(page, false));
      await run('caro-invitation-route', invitation);
      if (engine === 'chromium') {
        await run('all-3d-http', page => threeD(page, base));
        await run('all-3d-file', page => threeD(page, offline));
        await run('retry-3d-script', retry3d);
      }
    } finally { await browser.close(); }
  }
  console.log(`Loader checks passed: ${report.runs.length} runs.`);
})().catch(error => { report.error = error.stack || String(error); save(); console.error(error); process.exitCode = 1; });
