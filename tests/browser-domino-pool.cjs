'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const dir = path.resolve('test-results/domino-pool-verification', process.env.DP_EVIDENCE_LABEL || 'browser');
fs.mkdirSync(dir, { recursive: true });
const report = { mode: 'Edge headless, file://, deterministic fixtures; simulated touch on 390/320px', runs: [], errors: [] };
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__dpState)));
const angle = page => page.locator('[data-pool-angle]').textContent();
async function fixture(page) {
  await page.addInitScript(() => {
    let domino, logic, three;
    Object.defineProperty(window, 'ArcadeDomino', { configurable: true, get: () => domino, set(api) {
      domino = { ...api, createGame() {
        const s = api.createGame();
        const ids = ['2-6', '2-4', '4-6', '1-6', '3-5', '0-0', '5-5'];
        const tiles = api.createTiles(), rest = tiles.filter(t => !ids.includes(t.id) && t.id !== '2-2');
        s.hands = [ids.map(id => tiles.find(t => t.id === id)), rest.slice(0, 7), rest.slice(7, 14), rest.slice(14)];
        s.chain = [{ id: '2-2', left: 2, right: 2, player: 3 }]; s.current = 0;
        window.__dpState = s; return s;
      } };
    } });
    Object.defineProperty(window, 'ArcadeLogic', { configurable: true, get: () => logic, set(api) {
      logic = { ...api, createPool() {
        const s = api.createPool();
        s.balls[1].x = 400;
        for (const b of s.balls.slice(2)) { b.x = 160 + (b.id % 7) * 80; b.y = b.id < 9 ? 355 : 400; }
        window.__dpState = s; return s;
      }, poolAim(s, a) { const g = api.poolAim(s, a); window.__dpGuide = g; return g; } };
    } });
    Object.defineProperty(window, 'Arcade3D', { configurable: true, get: () => three, set(api) {
      three = { ...api, createView(...args) {
        const view = api.createView.apply(this, args); window.__dpView = view;
        const draw = view.draw; view.draw = (s, meta, dt) => { window.__dpMeta = meta; return draw(s, meta, dt); };
        return view;
      } };
    } });
  });
}
async function tablePoint(page, renderer, x, y) {
  return page.locator('.pool-workspace canvas').evaluate((canvas, p) => {
    const rect = canvas.getBoundingClientRect();
    const local = p.renderer === '3d' ? window.__dpView.engine.project((p.x - 450) / 50, .39, (p.y - 250) / 50) : { x: p.x / 900 * rect.width, y: p.y / 500 * rect.height };
    return { x: rect.left + local.x, y: rect.top + local.y };
  }, { renderer, x, y });
}
async function dominoChecks(page, click, renderer, width) {
  await click('[data-start]');
  const hint = page.locator('[data-domino-hint-panel]');
  assert.equal(await hint.isVisible(), false);
  assert.equal(await page.locator('[data-domino-hint-text]').textContent(), '');
  assert.equal(await page.locator('.is-hint').count(), 0);
  assert.equal(await page.locator('[data-domino-left]').isVisible(), true);
  for (let n = 1; n <= 3; n++) assert.equal(await page.locator(`[data-domino-count="${n}"]`).isVisible(), true);
  const hand = await page.locator('[data-domino-tile="2-6"]').boundingBox(); assert.ok(hand.width >= 44 && hand.height >= 44);
  if (renderer === '3d') assert.equal(await page.locator('.domino-hand').isVisible(), true);
  const before = await state(page);
  await click('[data-domino-hint]');
  assert.equal(await hint.isVisible(), true);
  assert.match(await page.locator('[data-domino-hint-text]').textContent(), /2 – 6.*trái.*giảm 8 chấm/);
  assert.deepEqual(await state(page), before, 'asking must not play a tile');
  await click('[data-domino-hint-dismiss]');
  assert.equal(await hint.isVisible(), false);
  await click('[data-domino-hint]');
  await click('[data-domino-tile="2-4"]');
  assert.equal(await hint.isVisible(), false, 'manual selection clears the hint');
  assert.equal(await page.locator('.domino-choice').isVisible(), true);
  assert.deepEqual(await state(page), before);
  await click('[data-domino-cancel]');
  await click('[data-domino-hint]');
  await page.locator('.domino-hint-panel').screenshot({ path: path.join(dir, `hint-${renderer}-${width}.png`) });
  await page.locator('.domino-playfield').screenshot({ path: path.join(dir, `domino-${renderer}-${width}.png`) });
  await click('#pause-game');
  await page.evaluate(() => document.querySelector('[data-domino-hint-apply]').click());
  assert.deepEqual(await state(page), before);
  await click('#resume-game'); await click('[data-domino-hint-apply]');
  await page.waitForFunction(() => window.__dpState.turn >= 4 && window.__dpState.current === 0);
  assert.equal((await state(page)).hands[0].some(t => t.id === '2-6'), false);
  assert.equal(await hint.isVisible(), false, 'hint must not reappear next turn');
  assert.equal(await page.locator('.is-hint').count(), 0);
  await click('[data-domino-hint]');
  await click('#restart-game');
  assert.equal(await hint.isVisible(), false);
  assert.equal((await state(page)).hands[0].length, 7);
  // The 3D mesh still routes to the same manual end picker as the large hand buttons.
  if (renderer === '3d') {
    await page.locator('.three-edition-mount canvas').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.Arcade3D.diagnostics()[0]?.targets.some(t => t.key === 'hand-1'));
    const hit = await page.evaluate(() => window.Arcade3D.diagnostics()[0].targets.find(t => t.key === 'hand-1'));
    await page.mouse.click(hit.x, hit.y);
    assert.equal(await page.locator('.domino-choice').isVisible(), true);
    assert.equal(await hint.isVisible(), false);
  }
}
async function poolChecks(page, click, renderer, width) {
  const canvas = page.locator('.pool-workspace canvas');
  await page.waitForFunction(() => window.__dpGuide?.target?.id === 1);
  assert.equal(await angle(page), '0,00°');
  const before = await state(page);
  await click('[data-pool-aim="1"]');
  await page.waitForFunction(() => document.querySelector('[data-pool-angle]').value === '0,25°');
  await click('[data-pool-aim="-1"]');
  await page.waitForFunction(() => document.querySelector('[data-pool-angle]').value === '0,00°');
  await page.locator('[data-pool-aim="1"]').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-pool-angle]').value === '0,25°');
  await page.locator('.pool-workspace').focus(); await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('[data-pool-angle]').value === '0,00°');
  assert.deepEqual(await state(page), before);
  await click('[data-pool-guide]');
  assert.equal(await page.locator('[data-pool-guide]').getAttribute('aria-pressed'), 'false');
  if (renderer === '3d') await page.waitForFunction(() => window.__dpMeta.showTarget === false);
  await click('[data-pool-guide]');
  await canvas.scrollIntoViewIfNeeded();
  const point = await tablePoint(page, renderer, 400, 300);
  const origin = await tablePoint(page, renderer, 260, 250);
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => parseFloat(document.querySelector('[data-pool-angle]').value.replace(',', '.')) > 10);
  const aimed = parseFloat((await angle(page)).replace(',', '.'));
  // Browser pointer coordinates are quantized to CSS pixels. Use a two-pixel
  // angular bound, rather than a fixed degree threshold on a 280px-wide table.
  const tolerance = Math.atan2(2, Math.hypot(point.x - origin.x, point.y - origin.y)) * 180 / Math.PI + 0.01;
  assert.ok(Math.abs(aimed - Math.atan2(50, 140) * 180 / Math.PI) < tolerance, `projected aim ${aimed}, tolerance ${tolerance}`);
  await click('[data-pool-lock]'); const locked = await angle(page);
  assert.equal(await page.locator('[data-pool-lock]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-pool-aim="1"]').isDisabled(), true);
  await canvas.scrollIntoViewIfNeeded(); const other = await tablePoint(page, renderer, 400, 200);
  await page.mouse.click(other.x, other.y);
  await page.locator('.pool-workspace').focus(); await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(80); assert.equal(await angle(page), locked);
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('.power-control input').inputValue(), '70');
  await click('[data-pool-lock]');
  await click('#restart-game');
  assert.equal(await angle(page), '0,00°');
  const aimButton = page.locator('[data-pool-aim="1"]');
  await aimButton.scrollIntoViewIfNeeded(); const rect = await aimButton.boundingBox();
  assert.ok(rect.width >= 44 && rect.height >= 44);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => parseFloat(document.querySelector('[data-pool-angle]').value.replace(',', '.')) > 1);
  await aimButton.dispatchEvent('pointercancel', { pointerId: 1 });
  const cancelled = await angle(page); await page.waitForTimeout(180);
  assert.equal(await angle(page), cancelled, 'pointercancel stops hold');
  await page.mouse.up();
  await page.mouse.down();
  await page.waitForFunction(old => document.querySelector('[data-pool-angle]').value !== old, cancelled);
  // Pause while the real pointer is held; release during pause and ensure no drift on resume.
  await page.evaluate(() => document.querySelector('#pause-game').click());
  await page.mouse.up(); const paused = await angle(page);
  await click('#resume-game'); await page.waitForTimeout(180);
  assert.equal(await angle(page), paused);
  await click('#restart-game');
  await page.locator('.pool-workspace').screenshot({ path: path.join(dir, `pool-${renderer}-${width}.png`) });
  const bounds = await page.locator('.game-board-area').boundingBox();
  if (renderer === '3d' && width <= 390) assert.ok(bounds.height < 350, `mobile board height ${bounds.height}`);
  await click('[data-pool-lock]'); await click('[data-shoot]');
  assert.equal((await state(page)).shots, 1);
  assert.equal(await page.locator('[data-pool-lock]').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('[data-pool-aim="1"]').isDisabled(), true);
  await click('#pause-game'); const frozen = await state(page);
  await page.waitForTimeout(160); assert.deepEqual(await state(page), frozen);
  await click('#resume-game');
  await click('#restart-game');
  assert.equal((await state(page)).shots, 0);
  assert.equal(await angle(page), '0,00°');
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  report.version = browser.version();
  try {
    for (const game of (process.env.DP_GAMES || 'domino,pool').split(',')) for (const width of (process.env.DP_WIDTHS || '1280,390,320').split(',').map(Number)) for (const renderer of (process.env.DP_RENDERERS || '2d,3d').split(',')) {
      const context = await browser.newContext({ viewport: { width, height: width > 600 ? 960 : 844 }, hasTouch: width <= 600 });
      const page = await context.newPage(); page.setDefaultTimeout(12000);
      page.on('pageerror', error => report.errors.push({ game, width, renderer, text: error.message }));
      const click = async selector => { const el = page.locator(selector); await el.scrollIntoViewIfNeeded(); await el[width <= 600 ? 'tap' : 'click'](); };
      try {
        await fixture(page);
        await page.goto(pathToFileURL(path.resolve('index.html')).href + `#play/${game}` + (renderer === '3d' ? '/3d' : ''));
        await page.locator(`.${game}-workspace`).waitFor();
        if (game === 'domino') await dominoChecks(page, click, renderer, width);
        else await poolChecks(page, click, renderer, width);
        const layout = await page.locator(`.${game}-workspace`).evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
        assert.ok(layout.scroll <= layout.width + 1, JSON.stringify(layout));
        const closed = await state(page);
        await click('#close-game'); await page.locator('#player-dialog').waitFor({ state: 'hidden' });
        await page.waitForTimeout(120); assert.deepEqual(await state(page), closed);
        if (renderer === '3d') assert.equal(await page.evaluate(() => window.Arcade3D.diagnostics().length), 0);
        report.runs.push({ game, width, renderer, verdict: 'pass' }); console.log(JSON.stringify(report.runs.at(-1)));
      } catch (error) {
        report.runs.push({ game, width, renderer, verdict: 'fail', error: error.message });
        await page.screenshot({ path: path.join(dir, `failed-${game}-${renderer}-${width}.png`) }).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
    assert.deepEqual(report.errors, []);
  } finally { await browser.close(); fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(report, null, 2)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
