// version v1.0
'use strict';
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const games = ['battleship', 'minesweeper', 'tower', 'onet', 'blocks', 'reversi', 'jungle'];
const folder = join(process.env.SCREENSHOTS || join(__dirname, '../test-results/expansion'), 'library');
const report = { environment: 'Headless Windows, simulated desktop/mobile, no physical iOS or VM.', runs: [] };
mkdirSync(folder, { recursive: true });
const save = () => writeFileSync(join(folder, 'results.json'), JSON.stringify(report, null, 2));
async function check(page, source, engine, width) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(source);
  await page.waitForFunction(() => document.querySelectorAll('.game-card').length === 28);
  const ids = await page.locator('.game-card').evaluateAll(cards => cards.map(card => card.dataset.game));
  assert.equal(new Set(ids).size, 28);
  for (const id of games) {
    assert.ok(ids.includes(id));
    assert.equal(await page.locator(`[data-game="${id}"] .cover-play > svg`).count(), 1);
    assert.equal(await page.locator(`[data-game="${id}"] [data-edition="3d"]`).count(), 0);
    assert.equal(await page.evaluate(id => typeof window.ArcadeGames?.[id], id), 'undefined');
  }
  for (const [category, count] of [['board', 10], ['card', 3], ['puzzle', 6], ['strategy', 1], ['social', 1], ['arcade', 5], ['sport', 2]]) {
    await page.locator(`[data-filter="${category}"]`).click();
    assert.equal(await page.locator('.game-card').count(), count, category);
  }
  await page.locator('[data-filter="all"]').click();
  for (const [query, id] of [['hai chien', 'battleship'], ['do min', 'minesweeper'], ['thu thanh', 'tower'], ['noi thu', 'onet'], ['xep gach roi', 'blocks'], ['co lat', 'reversi'], ['co thu', 'jungle']]) {
    await page.locator('#search').fill(query);
    assert.ok(await page.locator(`[data-game="${id}"]`).count(), query);
  }
  await page.locator('#search').fill('');
  for (const id of games) {
    await page.locator(`[data-game="${id}"] .cover-play`).click();
    await page.locator(`.${id}-workspace`).waitFor();
    assert.equal(await page.evaluate(id => typeof window.ArcadeGames[id], id), 'function');
    if (await page.locator('[data-start]').count()) await page.locator('[data-start]').click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('#close-game').click();
  }
  assert.deepEqual(errors, []);
  await page.screenshot({ path: join(folder, `${engine}-${source.startsWith('file:') ? 'offline' : 'http'}-${width}.png`) });
  report.runs.push({ engine, source: source.startsWith('file:') ? 'file' : 'http', width, count: 28 }); save();
}
(async () => {
  for (const engine of (process.env.EXPANSION_BROWSERS || 'chromium,webkit').split(',')) {
    const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await { chromium, webkit }[engine].launch({ headless: true, ...(engine === 'chromium' ? { executablePath: process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) } : {}) });
    try {
      for (const width of [390, 1366]) for (const source of [process.env.TEST_URL || 'http://127.0.0.1:4173', pathToFileURL(join(__dirname, '../index.html')).href]) {
        const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, hasTouch: width < 1000, reducedMotion: 'reduce' });
        try { await check(page, source, engine, width); }
        finally { await page.close(); }
      }
    } finally { await browser.close(); }
  }
  console.log(`Expansion library checks passed: ${report.runs.length} runs.`);
})().catch(error => { report.error = error.stack || String(error); save(); console.error(error); process.exitCode = 1; });
