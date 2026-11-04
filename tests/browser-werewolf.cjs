'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const dir = path.resolve('test-results/werewolf-verification', process.env.WW_EVIDENCE_LABEL || 'browser');
fs.mkdirSync(dir, { recursive: true });
const report = { mode: 'Edge headless, file://, simulated touch; deterministic test-only game fixtures', runs: [], errors: [] };
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__wwState)));
async function fixture(page) {
  await page.addInitScript(() => {
    let api;
    Object.defineProperty(window, 'ArcadeWerewolf', { configurable: true, get: () => api, set(original) {
      api = { ...original, createGame() {
        let seed = 27;
        const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const s = original.createGame({ random });
        ['villager', 'wolf', 'wolf', 'seer', 'guard', 'villager', 'villager', 'villager'].forEach((role, id) => { s.players[id].role = role; });
        s.phase = 'day'; s.day = 2; s.players[7].alive = false;
        s.voteHistory = [{ day: 1, votes: s.players.map(p => ({ voter: p.id, target: [3, 4, 7].includes(p.id) ? 1 : 7 })), eliminated: 7, maximum: 5 }];
        s.lastVotes = s.voteHistory[0].votes.map(v => ({ ...v }));
        s.history = [{ day: 1, text: 'Máy 7 bị loại do nhận 5 phiếu. Vai trò được công khai: Dân làng.' }];
        window.__wwState = s; return s;
      } };
    } });
  });
}
async function models(page) {
  return page.evaluate(() => window.Arcade3D.editions.werewolf().read({ all: selector => [...document.querySelectorAll(selector)] }).filter(item => item.model === 'person').map(item => item.key));
}
async function choosePerson(page, renderer, id) {
  if (renderer === '2d') { await page.locator(`[data-ww-target="${id}"]`).click(); return; }
  await page.locator('.three-edition-mount canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(id => window.Arcade3D.diagnostics()[0]?.targets.some(t => t.key === `villager-${id}`), id);
  const hit = await page.evaluate(id => window.Arcade3D.diagnostics()[0].targets.find(t => t.key === `villager-${id}`), id);
  await page.mouse.click(hit.x, hit.y);
  assert.equal(await page.locator(`[data-ww-target="${id}"]`).getAttribute('aria-pressed'), 'true');
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  report.version = browser.version();
  try {
    for (const width of (process.env.WW_WIDTHS || '1280,390,320').split(',').map(Number)) for (const renderer of ['2d', '3d']) {
      const context = await browser.newContext({ viewport: { width, height: width > 600 ? 960 : 844 }, hasTouch: width <= 600 });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => report.errors.push({ width, renderer, text: error.message }));
      const click = async selector => { const el = page.locator(selector); await el.scrollIntoViewIfNeeded(); await el[width <= 600 ? 'tap' : 'click'](); };
      try {
        await fixture(page);
        await page.goto(pathToFileURL(path.resolve('index.html')).href + '#play/werewolf' + (renderer === '3d' ? '/3d' : ''));
        await click('[data-start]');
        assert.equal(await page.locator('[data-ww-vote-table] tbody tr').count(), 8);
        assert.equal(await page.locator('[data-ww-vote-day]').inputValue(), '1');
        for (let id = 1; id < 7; id++) assert.equal(await page.locator(`[data-ww-identity="${id}"]`).textContent(), 'Chưa rõ vai');
        if (renderer === '3d') { assert.equal((await models(page)).length, 7); assert.ok(!(await models(page)).includes('person-7')); }

        await page.locator('[data-ww-speech-target]').selectOption('1');
        await page.locator('[data-ww-speech-reason]').selectOption('vote-1');
        assert.match(await page.locator('[data-ww-speech-preview]').textContent(), /Ngày 1.*Máy 7/);
        await click('#pause-game'); const paused = await state(page);
        await page.evaluate(() => document.querySelector('[data-ww-speak]').click());
        await page.waitForTimeout(120); assert.deepEqual(await state(page), paused);
        await click('#resume-game'); await click('[data-ww-speak]');
        assert.equal((await state(page)).statements.length, 1);
        assert.equal((await state(page)).discussion.filter(item => item.kind === 'reply').length, 2);
        assert.equal((await state(page)).turn, 0, 'speech must not advance or cast a vote');

        await click('[data-ww-speech-kind="claim"]');
        await page.locator('[data-ww-claim-role]').selectOption('seer');
        await page.locator('[data-ww-report-target]').selectOption('2');
        await page.locator('[data-ww-report-verdict]').selectOption('wolf');
        await click('[data-ww-speak]');
        assert.equal((await state(page)).statements[1].role, 'seer');
        assert.match((await state(page)).statements[1].text, /chưa xác thực/);
        assert.equal(await page.locator('[data-ww-speak]').isDisabled(), true);
        assert.equal(await page.locator('[data-ww-identity="2"]').textContent(), 'Chưa rõ vai');
        if (width !== 320) await page.locator('[data-ww-speech]').screenshot({ path: path.join(dir, `speech-${renderer}-${width}.png`) });

        // Fix other voters only, while the user vote still goes through the visible UI.
        await page.evaluate(() => {
          for (const p of window.__wwState.players) if (p.id && p.alive) window.ArcadeWerewolf.act(window.__wwState, p.id, { type: 'vote', target: p.id === 1 ? 2 : 1 });
        });
        await choosePerson(page, renderer, 1);
        await click('[data-ww-confirm]');
        await page.waitForFunction(() => window.__wwState.phase === 'night');
        assert.equal((await state(page)).voteHistory.length, 2);
        assert.equal(await page.locator('[data-ww-vote-day]').inputValue(), '2');
        assert.equal(await page.locator('[data-ww-vote-table] tbody tr').count(), 7);
        assert.match(await page.locator('[data-ww-vote-summary]').textContent(), /Máy 1.*6 phiếu/);
        await page.locator('[data-ww-vote-day]').selectOption('1');
        assert.equal(await page.locator('[data-ww-vote-table] tbody tr').count(), 8);
        if (width !== 320) await page.locator('.werewolf-votes').screenshot({ path: path.join(dir, `votes-${renderer}-${width}.png`) });
        if (renderer === '3d') {
          assert.equal((await models(page)).length, 6);
          await page.locator('.three-edition-mount').screenshot({ path: path.join(dir, `scene-${width}.png`) });
        }
        await page.evaluate(() => {
          const s = window.__wwState, L = window.ArcadeWerewolf;
          L.act(s, 2, { type: 'kill', target: 6 }); L.act(s, 3, { type: 'inspect', target: 2 }); L.act(s, 4, { type: 'protect', target: 6 });
        });
        await click('[data-ww-next]'); await page.waitForFunction(() => window.__wwState.phase === 'day');
        assert.match(await page.locator('[data-ww-speech-left]').textContent(), /2\/2/);
        await click('[data-ww-speech-kind="defend"]');
        await page.locator('[data-ww-speech-target]').selectOption('3');
        await page.locator('[data-ww-speech-reason]').selectOption('vote-1');
        await click('[data-ww-speak]');
        assert.equal((await state(page)).statements.filter(item => item.speaker === 0 && item.day === 3)[0].kind, 'defend');

        const layout = await page.locator('.werewolf-workspace').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
        assert.ok(layout.scroll <= layout.width + 1, JSON.stringify(layout));
        await click('#restart-game');
        assert.equal((await state(page)).statements.length, 0);
        assert.equal((await state(page)).voteHistory.length, 1, 'restart restores only the test fixture');
        const closed = JSON.stringify(await state(page));
        await click('#close-game'); await page.locator('#player-dialog').waitFor({ state: 'hidden' });
        await page.waitForTimeout(120);
        assert.equal(JSON.stringify(await state(page)), closed);
        if (renderer === '3d') assert.equal(await page.evaluate(() => window.Arcade3D.diagnostics().length), 0);
        report.runs.push({ renderer, width, verdict: 'pass' }); console.log(JSON.stringify(report.runs.at(-1)));
      } catch (error) {
        await page.screenshot({ path: path.join(dir, `failed-${renderer}-${width}.png`) }).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
    assert.deepEqual(report.errors, []);
  } finally { await browser.close(); fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(report, null, 2)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
