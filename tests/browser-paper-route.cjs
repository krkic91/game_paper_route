'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'test-results/paper-route-verification', process.env.PAPER_EVIDENCE_LABEL || 'browser');
fs.mkdirSync(dir, { recursive: true });
const rows = [], errors = [];
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
async function fixtures(page) {
  await page.addInitScript(() => {
    let core, race;
    Object.defineProperty(window, 'GameCore', { configurable: true, get: () => core, set(value) {
      core = value; const create = core.createGameState, reset = core.resetGameState;
      const prepare = state => {
        state.obstacles = [];
        state.mailboxes = [{ x: -6, z: 20, side: -1, hit: false, pulse: 0 }, { x: 6, z: 20, side: 1, hit: false, pulse: 0 }];
        window.__deliveryState = state; return state;
      };
      core.createGameState = (...args) => {
        return prepare(create(...args));
      };
      core.resetGameState = (...args) => prepare(reset(...args));
    } });
    Object.defineProperty(window, 'RaceLogic', { configurable: true, get: () => race, set(value) {
      race = value; const create = race.createRace;
      race.createRace = () => {
        const state = create(() => 0); state.obstacles = [];
        Object.assign(state, { distance: 174, speed: 10, x: 1.5, energy: 50 });
        state.rivals.forEach((r, i) => Object.assign(r, { distance: i ? 170 - i * 3 : 180, speed: 10, x: 1.5, preferredX: 1.5, targetX: 1.5 }));
        window.__raceState = state; return state;
      };
    } });
  });
}
async function assertLayout(page, selector) {
  const layout = await page.locator(selector).evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
  assert.ok(layout.scroll <= layout.width + 1, `Overflow ${selector}: ${JSON.stringify(layout)}`);
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  try {
    const widths = (process.env.PAPER_WIDTHS || '1280,390,320').split(',').map(Number);
    const renderers = (process.env.PAPER_RENDERERS || '2d,3d').split(',');
    const games = (process.env.PAPER_GAMES || 'race,delivery').split(',');
    for (const width of widths) for (const renderer of renderers) for (const game of games) {
      const context = await browser.newContext({ viewport: { width, height: width > 700 ? 960 : 844 }, hasTouch: width < 700, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      page.setDefaultTimeout(12000); await fixtures(page);
      try {
        await page.goto(pathToFileURL(path.join(root, 'index.html')).href + `#play/${game}${renderer === '3d' ? '/3d' : ''}`);
        await page.locator('#player-dialog').waitFor();
        if (game === 'race') {
          await page.locator('[data-start]').click();
          await page.waitForFunction(() => document.querySelector('[data-draft-indicator]')?.classList.contains('is-active'));
          assert.match(await page.locator('[data-gap-ahead]').textContent(), /Trước bạn: #1/);
          assert.equal(await page.locator('[data-pack]').count(), 4);
          const markers = await page.locator('[data-pack]').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
          for (let i = 0; i < markers.length; i++) for (let j = i + 1; j < markers.length; j++) {
            const a = markers[i], b = markers[j];
            assert.ok(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, 'rider markers stay distinct when riders bunch together');
          }
          await page.evaluate(() => { window.__raceState.distance = 174; window.__raceState.time += 1; });
          await page.waitForFunction(() => document.querySelector('[data-road-ahead]')?.textContent.includes('Đường trơn'));
          await page.locator('#pause-game').click();
          const paused = await page.locator('.race-workspace').getAttribute('data-distance');
          await page.waitForTimeout(200);
          assert.equal(await page.locator('.race-workspace').getAttribute('data-distance'), paused);
          assert.equal(await page.locator('[data-draft-indicator]').evaluate(el => el.classList.contains('is-active')), false);
          await page.locator('#resume-game').click();
          await assertLayout(page, '.race-tactics');
        } else {
          let target = page;
          if (renderer === '3d') await page.locator('[data-start]').click();
          else { const handle = await page.locator('#game-stage iframe').elementHandle(); target = await handle.contentFrame(); }
          await target.waitForFunction(() => !!window.__deliveryState);
          await target.evaluate(() => {
            const s = window.__deliveryState; s.obstacles = []; s.player.speed = 0;
            s.mailboxes = [{ x: -6, z: s.player.z + 20, side: -1, hit: false, pulse: 0 }, { x: 6, z: s.player.z + 20, side: 1, hit: false, pulse: 0 }];
          });
          const button = side => target.locator(`[data-throw="${side}"]`);
          if (renderer === '2d') {
            const canvas = target.locator('#game'), box = await canvas.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await canvas.dispatchEvent('pointercancel', { pointerId: 1, clientX: box.width / 2, clientY: box.height / 2 });
            await page.mouse.up();
            await page.waitForTimeout(150);
            assert.equal(await target.evaluate(() => window.__deliveryState.player.papersLeft), 36, 'cancelled touch must not throw');
          }
          await target.evaluate(() => { const s = window.__deliveryState; s.mailboxes.find(m => m.side === -1).z = s.player.z + 20; });
          await button('left').click();
          await target.waitForFunction(() => window.__deliveryState.mailboxes.find(m => m.side === -1).hit);
          assert.equal(await target.evaluate(() => window.__deliveryState.delivered), 1);
          await target.evaluate(() => { const s = window.__deliveryState; s.mailboxes.find(m => m.side === 1).z = s.player.z + 12; });
          await button('right').click();
          await target.waitForFunction(() => window.__deliveryState.delivered === 2);
          assert.equal(await target.evaluate(() => window.__deliveryState.player.papersLeft), 34);
          await target.evaluate(() => { window.__deliveryState.player.papersLeft = 0; });
          await button('left').waitFor();
          await target.waitForFunction(() => document.querySelector('[data-throw="left"]').disabled);
          assert.match(await button('left').textContent(), /Hết báo/);
          await target.evaluate(() => { const s = window.__deliveryState; s.player.papersLeft = 34; s.mailboxes.forEach(m => { m.hit = false; m.z = s.player.z + 15; }); });
          await assertLayout(target, '.delivery-throws');
        }
        await assertLayout(page, '.stage-wrapper');
        if (width !== 320) {
          await page.locator('.stage-wrapper').evaluate(el => { el.scrollTop = 0; });
          await page.screenshot({ path: path.join(dir, `${game}-${renderer}-${width}.png`) });
        }
        await page.locator('#restart-game').click();
        if (game === 'race' || renderer === '3d') await page.locator('[data-start]').waitFor();
        await page.locator('#close-game').click();
        await page.locator('#player-dialog').waitFor({ state: 'hidden' });
        if (renderer === '3d') assert.equal(await page.evaluate(() => window.Arcade3D.diagnostics().length), 0);
        rows.push({ game, renderer, width, verdict: 'pass' });
        console.log(JSON.stringify(rows.at(-1)));
      } catch (error) {
        await page.screenshot({ path: path.join(dir, `failed-${game}-${renderer}-${width}.png`) }).catch(() => {});
        console.error(JSON.stringify({ game, renderer, width, diagnostics: await Promise.all(page.frames().map(frame => frame.evaluate(() => ({ race: window.__raceState, delivery: window.__deliveryState, status: document.querySelector('.game-status')?.textContent, drafting: document.querySelector('[data-draft-indicator]')?.textContent })).catch(() => null))) }));
        throw error;
      } finally { await context.close(); }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ engine: 'Edge / Chromium', mode: 'headless, file://, simulated touch, test-only fixtures', rows, errors }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
