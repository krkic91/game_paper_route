// version v1.0
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const profiles = [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1366, height: 900 }];
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__expansionState)));
async function capture(page, api, options = {}, fixture) {
  await page.evaluate(({ api, options, source }) => {
    const original = window[api];
    const prepare = source ? (0, eval)(`(${source})`) : null;
    window.__fixture = 'opening';
    window[api] = { ...original, createGame(input = {}) {
      let seed = 217;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      const s = original.createGame({ ...input, ...options, random });
      if (prepare) prepare(s, window.__fixture, original);
      window.__expansionState = s;
      return s;
    } };
  }, { api, options, source: fixture ? fixture.toString() : null });
}
async function open(page, id) {
  await page.evaluate(id => { location.hash = `#play/${id}`; }, id);
  await page.locator(`.${id}-workspace`).waitFor();
  if (await page.locator('[data-start]').count()) await page.locator('[data-start]').click();
}
async function restart(page, fixture = 'opening') {
  await page.evaluate(fixture => { window.__fixture = fixture; }, fixture);
  await page.locator('#restart-game').click();
  if (await page.locator('[data-start]').count()) await page.locator('[data-start]').click();
}
async function noOverflow(page) {
  const boxes = await page.evaluate(() => [document.documentElement, document.querySelector('.stage-wrapper'), document.querySelector('.game-workspace')].filter(Boolean).map(el => ({ name: el.className || el.tagName, width: el.clientWidth, scroll: el.scrollWidth })));
  for (const box of boxes) assert.ok(box.scroll <= box.width + 1, `overflow ${JSON.stringify(box)}`);
}
async function reachable(locator, minimum = 38) {
  await locator.scrollIntoViewIfNeeded();
  const hit = await locator.evaluate(el => {
    const r = el.getBoundingClientRect(), target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { width: r.width, height: r.height, hit: target === el || el.contains(target), covering: target?.className, x: r.x, y: r.y };
  });
  assert.ok(hit.width >= minimum && hit.height >= minimum && hit.hit, `unreachable control: ${JSON.stringify(hit)}`);
}
async function press(page, selector, touch = false, minimum = 38) {
  const el = page.locator(selector).first();
  await reachable(el, minimum);
  await el[touch ? 'tap' : 'click']();
}
async function pauseAfter(page, action, delay = 950) {
  await page.evaluate(action);
  await page.locator('#pause-game').click();
  await page.locator('#pause-screen').waitFor();
  const before = await state(page);
  await page.waitForTimeout(delay);
  assert.deepEqual(await state(page), before, 'pause must freeze game state');
  await page.locator('#resume-game').click();
}
async function closed(page) {
  await page.evaluate(() => {
    window.__oldState = window.__expansionState; window.__oldJson = JSON.stringify(window.__oldState);
    document.querySelector('#close-game').click();
  });
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('#game-stage').innerHTML(), '');
  assert.equal(await page.evaluate(() => JSON.stringify(window.__oldState) === window.__oldJson), true, 'closed round must stop');
}
async function run(spec) {
  const folder = process.env.SCREENSHOTS || path.join(__dirname, `../test-results/expansion-${spec.id}`);
  fs.mkdirSync(folder, { recursive: true });
  const report = { game: spec.id, environment: 'Headless Windows, simulated viewport/DPR/touch; no VM or physical iOS.', versions: {}, runs: [] };
  const save = () => fs.writeFileSync(path.join(folder, 'results.json'), JSON.stringify(report, null, 2));
  const engines = (process.env.EXPANSION_BROWSERS || 'chromium,webkit').split(',');
  try {
    for (const engine of engines) {
      const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
      const executablePath = process.env.BROWSER_PATH || (fs.existsSync(edge) ? edge : undefined);
      const browser = await { chromium, webkit }[engine].launch({ headless: true, ...(engine === 'chromium' ? { executablePath } : {}) });
      report.versions[engine] = browser.version(); save();
      try {
        const scenarios = [];
        if (process.env.EXPANSION_RESPONSIVE_ONLY !== '1') scenarios.push({ width: 1366, height: 900, full: true });
        if (process.env.EXPANSION_FUNCTIONAL_ONLY !== '1') scenarios.push(...profiles.map(p => ({ ...p, full: false })));
        for (const scenario of scenarios) {
          const { width, height, full } = scenario, touch = width < 1000;
          const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1, reducedMotion: 'reduce' });
          const page = await context.newPage(), errors = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          page.on('dialog', dialog => dialog.accept());
          const label = `${engine}-${spec.id}-${width}x${height}-${full ? 'functional' : 'responsive'}`;
          try {
            await page.goto(base);
            await page.waitForFunction(({ api, id }) => window[api] && window.ArcadeGames[id], { api: spec.api, id: spec.id });
            if (spec.setup) await spec.setup(page);
            else await capture(page, spec.api);
            await open(page, spec.id);
            await noOverflow(page);
            await (full ? spec.functional : spec.responsive)(page, { engine, touch, width, height });
            await noOverflow(page);
            await page.screenshot({ path: path.join(folder, `${label}.png`) });
            await closed(page);
            assert.deepEqual(errors, [], label);
            report.runs.push({ engine, ...scenario, touch }); save();
            console.log(`PASS ${label}`);
          } catch (error) {
            await page.screenshot({ path: path.join(folder, `${label}-failure.png`) }).catch(() => {});
            throw error;
          } finally { await context.close(); }
        }
      } finally { await browser.close(); }
    }
    return report;
  } catch (error) { report.error = error.stack || String(error); save(); throw error; }
}
module.exports = { assert, base, profiles, state, capture, open, restart, noOverflow, reachable, press, pauseAfter, closed, run };
