'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const dir = path.resolve('test-results/monopoly-verification', process.env.MP_EVIDENCE_LABEL || 'browser');
fs.mkdirSync(dir, { recursive: true });
const report = { mode: 'Edge headless, file://, deterministic test-only fixtures; simulated touch at 390/320px', runs: [], errors: [] };
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__mpState)));
async function fixture(page) {
  await page.addInitScript(() => {
    let api;
    window.__mpScenario = 'investment';
    Object.defineProperty(window, 'ArcadeMonopoly', { configurable: true, get: () => api, set(original) {
      api = { ...original, createGame() {
        const queue = [], s = original.createGame({ random: () => queue.length ? queue.shift() : 0.1 });
        const cash = amount => { s.bank += s.players[0].cash - amount; s.players[0].cash = amount; };
        if (window.__mpScenario === 'investment') {
          cash(250); s.phase = 'buy'; s.pending = 2; s.players[0].position = 2;
          s.properties[1].owner = 0; s.properties[4].owner = 1; s.properties[5].owner = 2;
        } else if (window.__mpScenario === 'liquidation') {
          cash(20); s.properties[1].owner = s.properties[2].owner = 0; s.properties[2].level = 2;
          s.players[0].position = 15;
        } else if (window.__mpScenario === 'rent') {
          cash(10); s.properties[1].owner = 0;
          s.properties[22].owner = s.properties[23].owner = 1; s.properties[23].level = 2;
          s.players[0].position = 21;
        }
        queue.push(0, 0); // First actual roll is 1 + 1, after the shuffle consumes its RNG.
        window.__mpState = s; return s;
      } };
    } });
  });
}
async function models(page) {
  return page.evaluate(() => window.Arcade3D.editions.monopoly().read({ all: selector => [...document.querySelectorAll(selector)] }).filter(item => item.key.startsWith('owner-name-')).map(({ key, text }) => ({ key, text })));
}
async function selectTile(page, click, renderer, index) {
  if (renderer === '2d') { await click(`[data-monopoly-tile="${index}"]`); return; }
  await page.locator('.three-edition-mount canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(index => window.Arcade3D.diagnostics()[0]?.targets.some(t => t.key === `property-${index}`), index);
  const hit = await page.evaluate(index => window.Arcade3D.diagnostics()[0].targets.find(t => t.key === `property-${index}`), index);
  await page.mouse.click(hit.x, hit.y);
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  report.version = browser.version();
  try {
    for (const width of (process.env.MP_WIDTHS || '1280,390,320').split(',').map(Number)) for (const renderer of (process.env.MP_RENDERERS || '2d,3d').split(',')) {
      const context = await browser.newContext({ viewport: { width, height: width > 600 ? 960 : 844 }, hasTouch: width <= 600 });
      const page = await context.newPage(); page.setDefaultTimeout(12000);
      page.on('pageerror', error => report.errors.push({ width, renderer, text: error.message }));
      const click = async selector => { const el = page.locator(selector); await el.scrollIntoViewIfNeeded(); await el[width <= 600 ? 'tap' : 'click'](); };
      try {
        await fixture(page);
        await page.goto(pathToFileURL(path.resolve('index.html')).href + '#play/monopoly' + (renderer === '3d' ? '/3d' : ''));
        await click('[data-start]');
        assert.equal(await page.locator('.monopoly-live').isVisible(), true);
        assert.equal(await page.locator('[data-monopoly-round]').isVisible(), true);
        assert.equal(await page.locator('.monopoly-dice').isVisible(), true);
        assert.equal(await page.locator('.monopoly-live').evaluate(el => Boolean(el.closest('.three-accessible'))), false);
        const buyPreview = page.locator('[data-monopoly-buy-preview]');
        assert.match(await buyPreview.textContent(), /250 − 120 = 130 xu/);
        assert.match(await buyPreview.textContent(), /18 → 36 xu/);
        assert.match(await buyPreview.textContent(), /Đủ nhóm A/);
        assert.match(await buyPreview.textContent(), /dưới 160 xu/);
        assert.equal(await page.locator('[data-monopoly-buy]').isDisabled(), false);
        const before = await state(page);
        await selectTile(page, click, renderer, 4);
        assert.equal(await page.locator('[data-monopoly-inspect]').inputValue(), '4');
        assert.match(await buyPreview.textContent(), /250 − 120 = 130 xu/, 'inspection must not change the purchase offer');
        assert.deepEqual(await state(page), before);
        if (renderer === '3d') {
          assert.deepEqual(await models(page), [
            { key: 'owner-name-1', text: '1' }, { key: 'owner-name-4', text: '2' }, { key: 'owner-name-5', text: '3' },
          ]);
          assert.equal(await page.locator('.monopoly-owner-key').isVisible(), true);
          assert.match(await page.locator('.monopoly-owner-key').textContent(), /1Bạn2Máy 13Máy 24Máy 3/);
          await page.locator('.three-viewport').screenshot({ path: path.join(dir, `owners-${width}.png`) });
        }
        await page.locator('.monopoly-live').screenshot({ path: path.join(dir, `turn-${renderer}-${width}.png`) });
        await page.locator('.monopoly-turn-panel').screenshot({ path: path.join(dir, `purchase-${renderer}-${width}.png`) });
        await click('.monopoly-portfolio > summary');
        assert.match(await page.locator('[data-monopoly-portfolio-summary]').textContent(), /1\/14 ô/);
        assert.equal(await page.locator('.monopoly-group').count(), 7);
        assert.match(await page.locator('.monopoly-group').nth(0).textContent(), /1\/2 ô.*Bạn.*Ngân hàng/);
        assert.match(await page.locator('.monopoly-group').nth(1).textContent(), /Máy 1.*Máy 2/);
        await page.locator('.monopoly-group').first().screenshot({ path: path.join(dir, `group-${renderer}-${width}.png`) });
        await click('.monopoly-group [data-monopoly-open-tile="1"]');
        assert.equal(await page.locator('[data-monopoly-inspect]').inputValue(), '1');
        assert.deepEqual(await state(page), before);
        await click('#pause-game');
        await page.evaluate(() => document.querySelector('[data-monopoly-buy]').click());
        assert.deepEqual(await state(page), before);
        await click('#resume-game'); await click('[data-monopoly-buy]');
        assert.equal((await state(page)).players[0].cash, 130);
        assert.equal((await state(page)).properties[2].owner, 0);
        assert.match(await page.locator('[data-monopoly-finance]').textContent(), /120 xu.*mua Bến Sách/);
        assert.match(await page.locator('[data-monopoly-delta="0"]').textContent(), /−120 xu/);
        assert.match(await page.locator('[data-monopoly-portfolio-summary]').textContent(), /2\/14 ô · 2 ô có thể xây/);
        await click('.monopoly-upgrade-list [data-monopoly-open-tile="1"]');
        const bought = await state(page);
        assert.equal(bought.properties[1].level, 0, 'portfolio action inspects, never auto-builds');
        assert.match(await page.locator('[data-monopoly-upgrade-preview]').textContent(), /130 − 70 = 60 xu.*28 → 56 xu/);
        assert.equal(await page.locator('[data-monopoly-upgrade]').isDisabled(), false);
        await page.locator('.monopoly-detail').screenshot({ path: path.join(dir, `upgrade-${renderer}-${width}.png`) });
        await page.locator('[data-monopoly-upgrade]').focus(); await page.keyboard.press('Enter');
        assert.equal((await state(page)).players[0].cash, 60);
        assert.equal((await state(page)).properties[1].level, 1);
        assert.match(await page.locator('[data-monopoly-portfolio-summary]').textContent(), /0 ô có thể xây/);
        assert.equal(await page.locator('[data-monopoly-upgrade]').isDisabled(), true);
        if (renderer === '3d') assert.equal((await models(page)).find(m => m.key === 'owner-name-2').text, '1');
        const controls = await page.locator('[data-monopoly-upgrade]').boundingBox(); assert.ok(controls.height >= 44);
        await click('#restart-game');
        assert.equal((await state(page)).players[0].cash, 250);
        assert.equal(await page.locator('.monopoly-finance').isVisible(), false);
        assert.equal(await page.locator('.monopoly-sales').isVisible(), false);
        assert.equal(await page.locator('[data-monopoly-delta]:visible').count(), 0);
        await click('[data-monopoly-decline]');
        assert.equal((await state(page)).properties[2].owner, null);
        assert.equal((await state(page)).players[0].cash, 250);
        await click('[data-monopoly-end]');
        await page.waitForFunction(() => window.__mpState.current !== 0);
        await click('#pause-game'); const stopped = await state(page);
        await page.waitForTimeout(200); assert.deepEqual(await state(page), stopped);
        await click('#resume-game');

        await page.evaluate(() => { window.__mpScenario = 'liquidation'; }); await click('#restart-game');
        await click('[data-monopoly-roll]');
        await page.waitForFunction(() => window.__mpState.phase === 'end' && document.querySelector('.monopoly-workspace').dataset.busy === 'false');
        assert.equal((await state(page)).players[0].cash, 20);
        assert.equal((await state(page)).properties[1].owner, null);
        assert.equal((await state(page)).properties[2].level, 0);
        assert.equal(await page.locator('[data-monopoly-sales] li').count(), 3);
        assert.match(await page.locator('[data-monopoly-sales]').textContent(), /Bến Sách · \+35 xu.*Bến Sách · \+35 xu.*Phố Gốm · \+50 xu/);
        assert.match(await page.locator('[data-monopoly-finance]').textContent(), /trả 120 xu cho Phí dịch vụ/);
        assert.match(await page.locator('[data-monopoly-delta="0"]').textContent(), /\+120 \/ −120 xu/);
        assert.equal(await page.locator('[data-monopoly-dice-total]').textContent(), '1 + 1 = 2 ô');
        assert.match(await page.locator('[data-monopoly-portfolio-summary]').textContent(), /1\/14 ô · 0 ô có thể xây/);
        if (renderer === '3d') assert.deepEqual(await models(page), [{ key: 'owner-name-2', text: '1' }]);
        await click('#pause-game');
        await page.waitForTimeout(160);
        assert.equal(await page.locator('[data-monopoly-delta="0"]').getAttribute('hidden'), null, 'pause freezes the delta timer');
        await click('#resume-game');
        await page.locator('.monopoly-sales').screenshot({ path: path.join(dir, `sales-${renderer}-${width}.png`) });
        await page.waitForFunction(() => document.querySelector('[data-monopoly-delta="0"]').hidden);
        assert.equal(await page.locator('.monopoly-finance').isVisible(), true, 'receipt remains after the temporary badge expires');

        await page.evaluate(() => { window.__mpScenario = 'rent'; }); await click('#restart-game');
        await click('[data-monopoly-roll]'); await page.waitForFunction(() => window.__mpState.players[0].bankrupt);
        await click('#pause-game');
        assert.equal((await state(page)).players[1].cash, 1160);
        assert.match(await page.locator('[data-monopoly-finance]').textContent(), /trả 60 xu.*Máy 1.*còn thiếu 388 xu/);
        assert.match(await page.locator('[data-monopoly-delta="1"]').textContent(), /\+60 xu/);
        assert.match(await page.locator('[data-monopoly-portfolio-summary]').textContent(), /0\/14 ô/);
        const layout = await page.locator('.monopoly-workspace').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
        assert.ok(layout.scroll <= layout.width + 1, JSON.stringify(layout));
        await click('#resume-game'); await click('#close-game');
        await page.locator('#player-dialog').waitFor({ state: 'hidden' });
        const closed = await state(page); await page.waitForTimeout(250); assert.deepEqual(await state(page), closed);
        if (renderer === '3d') assert.equal(await page.evaluate(() => window.Arcade3D.diagnostics().length), 0);
        report.runs.push({ width, renderer, verdict: 'pass' }); console.log(JSON.stringify(report.runs.at(-1)));
      } catch (error) {
        report.runs.push({ width, renderer, verdict: 'fail', error: error.message });
        await page.screenshot({ path: path.join(dir, `failed-${renderer}-${width}.png`) }).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
    assert.deepEqual(report.errors, []);
  } finally { await browser.close(); fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(report, null, 2)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
