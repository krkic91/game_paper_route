'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const folder = process.env.SCREENSHOTS || join(__dirname, '../test-results/family');
const games = { draughts: 'ArcadeDraughts', match3: 'ArcadeMatch3', phom: 'ArcadePhom', penalty: 'ArcadePenalty', wordchain: 'ArcadeWordchain', fishing: 'ArcadeFishing' };
const report = { environment: 'Headless Edge, simulated desktop/mobile and touch; no physical-device testing.', runs: [] };
mkdirSync(folder, { recursive: true });
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__familyState)));
async function press(page, selector, touch = false) {
  const el = page.locator(selector).first(); await el.scrollIntoViewIfNeeded();
  await el[touch ? 'tap' : 'click']();
}
async function open(page, id, touch) {
  await page.evaluate(async ({ id, api }) => {
    await window.ArcadeLoader.load({ id }, '2d');
    const logic = window[api];
    if (!logic.__captured) {
      const original = logic.createGame;
      logic.createGame = (...args) => { window.__familyState = original(...args); return window.__familyState; };
      logic.__captured = true;
    }
  }, { id, api: games[id] });
  await press(page, `[data-game="${id}"] .cover-play`, touch);
  await page.locator(`.${id}-workspace`).waitFor();
  await press(page, '[data-start]', touch);
}
async function pause(page) {
  await press(page, '#pause-game'); await page.locator('#pause-screen').waitFor();
  const before = await state(page); await page.waitForTimeout(260);
  assert.deepEqual(await state(page), before, 'paused game must freeze');
  await press(page, '#resume-game');
}
async function close(page) {
  await page.evaluate(() => { window.__oldState = window.__familyState; document.querySelector('#close-game').click(); window.__closedState = JSON.stringify(window.__oldState); });
  await page.waitForTimeout(160);
  assert.equal(await page.locator('#game-stage').innerHTML(), '');
  assert.equal(await page.evaluate(() => JSON.stringify(window.__oldState) === window.__closedState), true, 'closing destroys timers and loop');
}
async function bounds(page, id) {
  const result = await page.evaluate(() => {
    const stage = document.querySelector('#game-stage'), w = stage.querySelector('.game-workspace');
    const nodes = [...w.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(el => el.getClientRects().length && !el.closest('details:not([open])'));
    return { viewport: innerWidth, doc: document.documentElement.scrollWidth, workspace: w.getBoundingClientRect().width,
      stage: stage.clientWidth, overflowing: w.scrollWidth > w.clientWidth + 1,
      small: nodes.filter(el => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map(el => el.outerHTML.slice(0,160)) };
  });
  assert.ok(result.doc <= result.viewport + 1, `${id} page overflow: ${JSON.stringify(result)}`);
  assert.equal(result.overflowing, false, `${id} workspace overflow: ${JSON.stringify(result)}`);
  assert.deepEqual(result.small, [], `${id} tiny touch targets`);
}
async function play(page, id, touch, full) {
  if (id === 'draughts') {
    assert.equal(await page.locator('[data-draughts-cell]').count(), 64);
    await press(page, '[data-draughts-hint]', touch); assert.ok(await page.locator('.draughts-cell.is-hint').count() >= 2);
    await press(page, '[data-draughts-cell="40"]', touch); await press(page, '[data-draughts-cell="33"]', touch);
    await pause(page); await page.waitForFunction(() => window.__familyState.turn === 2);
    await press(page, '[data-draughts-undo]', touch); assert.equal((await state(page)).turn, 0);
    if (full) {
      await page.locator('[data-draughts-mode]').selectOption('local');
      await page.evaluate(() => { const s = window.__familyState; s.board.fill(0); s.board[42] = 1; s.board[33] = s.board[17] = -1; });
      await press(page, '[data-draughts-hint]');
      await press(page, '[data-draughts-cell="42"]'); await press(page, '[data-draughts-cell="24"]');
      assert.equal((await state(page)).turn, 0); await press(page, '[data-draughts-cell="10"]');
      await page.locator('.result-overlay').waitFor(); assert.equal((await state(page)).winner, 1);
      await press(page, '[data-again]');
    }
  }
  if (id === 'match3') {
    assert.equal(await page.locator('[data-match3-cell]').count(), 64);
    await press(page, '[data-match3-hint]', touch);
    const cells = await page.locator('.match3-cell.is-hint').evaluateAll(nodes => nodes.map(el => el.dataset.match3Cell));
    assert.equal(cells.length, 2);
    if (full) await page.evaluate(() => { window.__familyState.movesLeft = 1; });
    await press(page, `[data-match3-cell="${cells[0]}"]`, touch); await press(page, `[data-match3-cell="${cells[1]}"]`, touch);
    await pause(page); await page.waitForFunction(() => window.__familyState.phase !== 'cascade');
    assert.ok((await state(page)).score >= 30);
    if (full) { await page.locator('.result-overlay').waitFor(); await press(page, '[data-again]'); assert.equal((await state(page)).movesLeft, 30); }
  }
  if (id === 'phom') {
    assert.equal(await page.locator('[data-phom-card]').count(), 10);
    await press(page, '[data-phom-hint]', touch); await press(page, '[data-phom-discard]', touch);
    await pause(page); await page.waitForFunction(() => window.__familyState.current === 0 || window.__familyState.phase === 'finished');
    if (full) {
      let steps = 0;
      while ((await state(page)).phase !== 'finished' && steps++ < 12) {
        const s = await state(page);
        if (s.current !== 0) { await page.waitForTimeout(100); continue; }
        if (s.phase === 'draw') await press(page, await page.locator('[data-phom-take]').isEnabled() ? '[data-phom-take]' : '[data-phom-draw]');
        if ((await state(page)).phase === 'discard') { await press(page, '[data-phom-hint]'); await press(page, '[data-phom-discard]'); }
        await page.waitForFunction(() => window.__familyState.current === 0 || window.__familyState.phase === 'finished');
      }
      await page.locator('.result-overlay').waitFor(); await press(page, '[data-again]'); assert.equal((await state(page)).turn, 0);
    }
  }
  if (id === 'penalty') {
    await press(page, '[data-penalty-zone="0"]', touch); await pause(page);
    await page.waitForFunction(() => document.querySelector('.penalty-workspace').dataset.stage === 'result');
    assert.equal((await state(page)).kicks[0].length, 1);
    await press(page, '[data-penalty-next]', touch); assert.match(await page.locator('[data-penalty-prompt]').innerText(), /bắt gôn/);
    await page.locator('[data-penalty-mode]').selectOption('local');
    await press(page, '[data-penalty-next]', touch); await press(page, '[data-penalty-zone="1"]', touch);
    assert.equal(await page.locator('.penalty-workspace').getAttribute('data-stage'), 'handoff-shot');
    assert.equal(await page.locator('[data-penalty-zone]:enabled').count(), 0);
    assert.equal(await page.locator('.penalty-zones .is-selected').count(), 0);
    await press(page, '[data-penalty-next]', touch); await press(page, '[data-penalty-zone="0"]', touch);
    await page.waitForFunction(() => document.querySelector('.penalty-workspace').dataset.stage === 'result');
    assert.deepEqual((await state(page)).scores, [1,0]);
  }
  if (id === 'wordchain') {
    await press(page, '[data-wordchain-hint]', touch);
    const word = await page.locator('#wordchain-input').inputValue(); assert.ok(word);
    await page.locator('#wordchain-input').press('Enter'); assert.equal((await state(page)).turns, 1);
    if ((await state(page)).phase === 'play') {
      await page.locator('#wordchain-input').fill('<script>'); await page.locator('#wordchain-input').press('Enter');
      assert.match(await page.locator('[data-wordchain-feedback]').innerText(), /chưa có/);
      await pause(page);
      if (full) { await page.evaluate(() => { window.__familyState.seconds = 0.01; }); await page.locator('.result-overlay').waitFor(); await press(page, '[data-again]'); }
    } else await press(page, '[data-again]', touch);
  }
  if (id === 'fishing') {
    await press(page, '[data-fishing-action]', touch); assert.equal((await state(page)).phase, 'aim');
    await press(page, '[data-fishing-action]', touch); await pause(page);
    await page.waitForFunction(() => window.__familyState.phase === 'bite');
    await press(page, '[data-fishing-action]', touch); assert.equal((await state(page)).phase, 'reeling');
    const reel = page.locator('[data-hold="reel"]'); await reel.scrollIntoViewIfNeeded();
    const rect = await reel.boundingBox(); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down(); const initial = (await state(page)).tension; await page.waitForTimeout(200); assert.ok((await state(page)).tension > initial);
    await page.mouse.up();
    if (full) {
      // Keep the real input handler in charge of tension until a real catch.
      for (let i = 0; i < 150 && (await state(page)).phase === 'reeling'; i++) {
        const s = await state(page); if (s.tension < 0.42) await page.mouse.down(); if (s.tension > 0.60) await page.mouse.up();
        await page.waitForTimeout(70);
      }
      await page.mouse.up(); assert.equal((await state(page)).phase, 'caught'); assert.equal((await state(page)).catches, 1);
      assert.equal(await page.locator('.fishing-species.is-caught').count(), 1);
      await press(page, '#restart-game'); assert.equal((await state(page)).catches, 0); assert.equal(await page.locator('.fishing-species.is-caught').count(), 1);
      await close(page); await open(page, 'fishing', false);
      assert.equal(await page.locator('.fishing-species.is-caught').count(), 1, 'a new instance restores the saved collection');
    }
  }
}
(async () => {
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) });
  report.browser = browser.version();
  try {
    for (const [width, source] of [[1366,base],[390,base],[320,base],[390,pathToFileURL(join(__dirname,'../index.html')).href]]) {
      const touch = width < 1000, full = width === 1366, context = await browser.newContext({ viewport: { width, height: full ? 960 : 844 }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('dialog', d => d.accept());
      try {
        await page.goto(source); assert.equal(await page.locator('.game-card').count(), 34);
        for (const [query, id] of [['co dam','draughts'],['ghep 3','match3'],['phom','phom'],['luan luu','penalty'],['noi chu','wordchain'],['cau ca','fishing']]) {
          await page.locator('#search').fill(query); assert.ok(await page.locator(`[data-game="${id}"]`).count());
        }
        await page.locator('#search').fill('');
        for (const id of (process.env.FAMILY_GAMES || Object.keys(games).join(',')).split(',')) {
          await open(page, id, touch); await play(page, id, touch, full); await bounds(page, id);
          await page.screenshot({ path: join(folder, `${id}-${width}-${source.startsWith('file:') ? 'offline' : 'http'}.png`) });
          await press(page, '#restart-game', touch); await close(page);
          report.runs.push({ id, width, source: source.startsWith('file:') ? 'file' : 'http', status: 'passed' });
          writeFileSync(join(folder, 'results.json'), JSON.stringify(report, null, 2)); console.log(`PASS ${id} ${width} ${source.startsWith('file:') ? 'file' : 'http'}`);
        }
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(`Family games: ${report.runs.length} browser scenarios passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
