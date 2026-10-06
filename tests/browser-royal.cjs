// version v1.0
/* Real browser interactions; optional Playwright installation and npm start required. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium, webkit } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOTS || join(__dirname, '../test-results/royal');
const selected = (process.env.ROYAL_BROWSERS || 'chromium,webkit').split(',');
const profiles = [
  { width: 320, height: 740, dpr: 2 }, { width: 390, height: 844, dpr: 3 },
  { width: 744, height: 1133, dpr: 2 }, { width: 1024, height: 1366, dpr: 2 },
  { width: 1180, height: 820, dpr: 2 }, { width: 844, height: 390, dpr: 3 },
];
mkdirSync(output, { recursive: true });
const report = { environment: 'Windows headless browsers, simulated viewport/DPR/touch; no physical iOS devices', runs: [] };
const cell = (page, index) => page.locator(`.royal-cell[data-cell="${index}"]`);
const action = (page, name) => page.locator(`[data-royal-action="${name}"]`);
const state = (page, key) => page.locator('.royal-workspace').getAttribute(`data-${key}`);
async function open(page, kind) {
  await page.goto(`${base}/#play/${kind}`);
  await page.locator(`.royal-workspace[data-game="${kind}"]`).waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function piece(page, index, expected) { assert.equal(await cell(page, index).getAttribute('data-piece'), expected); }
async function play(page, from, to, touch = false) {
  await cell(page, from)[touch ? 'tap' : 'click']();
  assert.equal(await cell(page, to).getAttribute('data-legal'), 'true', `${from} -> ${to} must be legal`);
  await cell(page, to)[touch ? 'tap' : 'click']();
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.ok(await page.locator('.stage-wrapper').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
}
async function grid(page, columns) {
  const rects = await page.locator('.royal-cell').evaluateAll(elements => elements.map(el => {
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
  }));
  const near = (a, b) => assert.ok(Math.abs(a - b) <= 0.25, `misaligned grid: ${a} vs ${b}`);
  for (const [index, r] of rects.entries()) {
    assert.ok(r.width >= 26 && r.height >= 26);
    near(r.width, r.height); near(r.width, rects[0].width);
    near(r.x, rects[index % columns].x); near(r.y, rects[Math.floor(index / columns) * columns].y);
  }
  return rects;
}
function watch(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('dialog', dialog => dialog.accept());
  return errors;
}
async function restart(page) { await page.locator('#restart-game').click(); assert.equal(await state(page, 'ply'), '0'); }
async function desktop(browser, name) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = watch(page);
  try {
    await open(page, 'chess');
    assert.equal(await page.locator('.royal-cell').count(), 64);
    await page.locator('[data-royal-mode]').selectOption('local');
    await play(page, 52, 36); await play(page, 11, 27); await play(page, 36, 27);
    await piece(page, 27, 'wP');
    assert.equal(await page.locator('[data-royal-player="bottom"] .royal-captures > svg').count(), 1);
    assert.ok((await page.locator('.royal-captures > svg').first().boundingBox()).width <= 20);
    await action(page, 'undo').click(); await piece(page, 27, 'bP'); await piece(page, 36, 'wP');
    await restart(page);
    // Checkmate through a public, legal four-ply game. Undo reopens it.
    for (const move of [[53, 45], [12, 28], [54, 38], [3, 39]]) await play(page, ...move);
    assert.equal(await state(page, 'status'), 'won');
    assert.equal(await page.locator('[data-royal-result]').isVisible(), true);
    assert.equal(await cell(page, 60).evaluate(el => el.classList.contains('is-check')), true);
    await action(page, 'undo').click(); assert.equal(await state(page, 'status'), 'playing');
    await restart(page);
    // Castling by each side relocates both king and rook.
    for (const move of [[62, 45], [6, 21], [52, 36], [12, 28], [61, 52], [5, 12], [60, 62], [4, 6]]) await play(page, ...move);
    for (const [index, value] of [[62, 'wK'], [61, 'wR'], [6, 'bK'], [5, 'bR']]) await piece(page, index, value);
    await restart(page);
    for (const move of [[52, 36], [8, 16], [36, 28], [11, 27], [28, 19]]) await play(page, ...move);
    await piece(page, 19, 'wP'); await piece(page, 27, '');
    await action(page, 'undo').click(); await piece(page, 27, 'bP');
    await restart(page);
    // Reach promotion from the initial board without reading or replacing engine state.
    for (const move of [[48, 32], [15, 31], [32, 24], [31, 39], [24, 16], [39, 47], [16, 9], [47, 54], [9, 0]]) await play(page, ...move);
    assert.equal(await page.locator('[data-royal-promotion-panel]').isVisible(), true);
    assert.equal(await state(page, 'ply'), '8');
    assert.ok((await page.locator('[data-royal-promotion="N"] svg').boundingBox()).width <= 46);
    await action(page, 'cancel-promotion').click(); await piece(page, 9, 'wP');
    await cell(page, 0).click();
    await page.locator('[data-royal-promotion="N"]').click();
    await piece(page, 0, 'wN'); assert.equal(await state(page, 'ply'), '9');
    await action(page, 'undo').click(); await piece(page, 0, 'bR'); await piece(page, 9, 'wP');
    await restart(page);
    await cell(page, 48).focus(); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
    await piece(page, 40, 'wP'); assert.equal(await state(page, 'ply'), '1');

    for (const kind of ['chess', 'xiangqi']) {
      await open(page, kind);
      await page.locator('[data-royal-mode]').selectOption('bot');
      await restart(page);
      const [from, to] = kind === 'chess' ? [52, 36] : [58, 49];
      // Queue a real move and pause in the same browser task to avoid test timing races.
      await page.evaluate(([from, to]) => {
        document.querySelector(`[data-cell="${from}"]`).click();
        document.querySelector(`[data-cell="${to}"]`).click();
        document.querySelector('#pause-game').click();
      }, [from, to]);
      await page.waitForTimeout(550);
      assert.equal(await state(page, 'ply'), '1', 'paused AI must not move');
      await page.locator('#resume-game').click();
      await page.waitForFunction(() => document.querySelector('.royal-workspace').dataset.ply === '2');
      assert.equal(await state(page, 'thinking'), 'false');
      await action(page, 'undo').click(); assert.equal(await state(page, 'ply'), '0');
      await page.evaluate(([from, to]) => {
        document.querySelector(`[data-cell="${from}"]`).click();
        document.querySelector(`[data-cell="${to}"]`).click();
        document.querySelector('[data-royal-action="undo"]').click();
      }, [from, to]);
      await page.waitForTimeout(550); assert.equal(await state(page, 'ply'), '0', 'undo cancels a queued AI turn');
      await page.locator('[data-royal-mode]').selectOption('local');
      if (kind === 'xiangqi') {
        assert.equal(await page.locator('.royal-cell').count(), 90);
        await play(page, 64, 1); await piece(page, 1, 'rC');
        await play(page, 0, 1); await piece(page, 1, 'bR');
        assert.equal(await page.locator('.royal-captures > .royal-disc').count(), 2);
        await action(page, 'undo').click(); await piece(page, 1, 'rC');
        await restart(page);
        for (let repeat = 0; repeat < 2; repeat++) for (const move of [[82, 63], [1, 18], [63, 82], [18, 1]]) await play(page, ...move);
        assert.equal(await state(page, 'status'), 'draw');
        await action(page, 'undo').click(); assert.equal(await state(page, 'status'), 'playing');
        await restart(page);
      }
      await grid(page, kind === 'chess' ? 8 : 9); await noOverflow(page);
      await page.locator('.stage-wrapper').evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: join(output, `${name}-${kind}-desktop.png`) });
      // Closing with an AI turn pending must not affect the next game instance.
      await page.locator('[data-royal-mode]').selectOption('bot');
      await page.evaluate(([from, to]) => {
        document.querySelector(`[data-cell="${from}"]`).click();
        document.querySelector(`[data-cell="${to}"]`).click();
        document.querySelector('#close-game').click();
      }, [from, to]);
      await open(page, kind); await page.waitForTimeout(550);
      assert.equal(await state(page, 'ply'), '0');
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}
async function mobile(browser, name, profile) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: profile.dpr, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = watch(page);
  try {
    for (const kind of ['chess', 'xiangqi']) {
      await open(page, kind); await page.locator('[data-royal-mode]').selectOption('local');
      const columns = kind === 'chess' ? 8 : 9;
      const before = await grid(page, columns);
      await play(page, ...(kind === 'chess' ? [52, 36] : [58, 49]), true);
      assert.equal(await state(page, 'ply'), '1');
      const after = await grid(page, columns);
      before.forEach((r, i) => assert.ok(Math.abs(r.width - after[i].width) < 0.25 && Math.abs(r.height - after[i].height) < 0.25));
      await action(page, 'flip').tap();
      assert.ok((await cell(page, 0).boundingBox()).x > (await cell(page, columns - 1).boundingBox()).x);
      await grid(page, columns); await noOverflow(page);
      await action(page, 'undo').tap(); assert.equal(await state(page, 'ply'), '0');
      await action(page, 'flip').tap();
      await page.locator('.stage-wrapper').evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: join(output, `${name}-${kind}-${profile.width}x${profile.height}.png`) });
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}
(async () => {
  for (const name of selected) {
    const engine = { chromium, webkit }[name]; assert.ok(engine, `Unknown engine: ${name}`);
    const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await engine.launch({ headless: true, executablePath: name === 'chromium' ? process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) : undefined });
    try {
      await desktop(browser, name); report.runs.push({ engine: name, version: browser.version(), desktop: true, passed: true });
      console.log(`${name}: chess/xiangqi rules, promotion, captures, AI, pause, undo and cleanup passed`);
      for (const profile of profiles) {
        await mobile(browser, name, profile); report.runs.push({ engine: name, ...profile, bothGames: true, passed: true });
        console.log(`${name}: both games at ${profile.width}x${profile.height} passed`);
      }
    } finally { await browser.close(); }
  }
  report.passed = true;
  writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2));
  console.log(`Royal game browser checks passed. Screenshots: ${output}`);
})().catch(error => {
  report.passed = false; report.error = error.stack;
  writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2));
  console.error(error); process.exitCode = 1;
});
