// version v1.0
'use strict';
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4185';
const folder = process.env.SCREENSHOTS || join(__dirname, '../test-results/neon');
const report = { environment: 'Headless Windows with simulated viewport/touch; no VM or physical iOS device.', versions: {}, runs: [] };
mkdirSync(folder, { recursive: true });
const save = () => writeFileSync(join(folder, 'results.json'), JSON.stringify(report, null, 2));
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('tramchoi.library.v1') || '{}'));
async function getFrame(page) {
  const locator = page.locator('#game-stage iframe');
  await locator.waitFor();
  assert.equal(await locator.getAttribute('src'), 'Neon Survivors.html');
  const frame = await (await locator.elementHandle()).contentFrame();
  await frame.waitForFunction(() => typeof hostPaused === 'boolean' && document.querySelectorAll('.char-card').length === 3);
  return frame;
}
async function open(page) {
  await page.locator('[data-game="neon"] .cover-play').click();
  return getFrame(page);
}
async function start(frame, touch = false) {
  await frame.locator('.char-card').nth(1)[touch ? 'tap' : 'click']();
  await frame.locator('#btn-start')[touch ? 'tap' : 'click']();
  await frame.waitForFunction(() => state === 'playing' && runTime > 0);
  await frame.evaluate(() => { P.invuln = 10000; });
  assert.equal(await frame.evaluate(() => selChar), 1);
}
async function layout(page, frame) {
  // The iframe receives resize asynchronously, including when returning to portrait.
  await frame.waitForFunction(() => {
    const box = canvas.getBoundingClientRect();
    return box.width === innerWidth && box.height === innerHeight;
  });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'host horizontal overflow');
  const dimensions = await frame.evaluate(() => {
    const b = canvas.getBoundingClientRect();
    return { width: b.width, height: b.height, vw: innerWidth, vh: innerHeight, canvasW: canvas.width, canvasH: canvas.height, dpr: DPR, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  assert.equal(dimensions.width, dimensions.vw);
  assert.equal(dimensions.height, dimensions.vh);
  assert.ok(Math.abs(dimensions.canvasW - dimensions.vw * dimensions.dpr) <= 1);
  assert.ok(Math.abs(dimensions.canvasH - dimensions.vh * dimensions.dpr) <= 1);
  assert.equal(dimensions.overflow, false);
}
async function hostPause(page, frame, expected) {
  await page.locator('#pause-game').click();
  await page.locator('#pause-screen').waitFor();
  await frame.waitForFunction(() => hostPaused);
  assert.equal(await frame.evaluate(() => state), expected);
  if (expected === 'levelup') {
    const choices = await frame.evaluate(() => pendingLevels);
    await frame.evaluate(() => pickLevelUp(0));
    assert.equal(await frame.evaluate(() => pendingLevels), choices, 'upgrade cannot be consumed behind host pause');
  }
  const before = await frame.evaluate(() => ({ runTime, x: P?.x, y: P?.y, keys: Object.keys(keys), pulses: pendingPulses.length }));
  assert.deepEqual(before.keys, []);
  await page.waitForTimeout(350);
  assert.deepEqual(await frame.evaluate(() => ({ runTime, x: P?.x, y: P?.y, keys: Object.keys(keys), pulses: pendingPulses.length })), before);
  await page.locator('#resume-game').click();
  await frame.waitForFunction(() => !hostPaused);
  assert.equal(await frame.evaluate(() => state), expected);
}
async function close(page, frame) {
  await page.locator('#close-game').click();
  assert.equal(await page.locator('#game-stage iframe').count(), 0);
  assert.equal(frame.isDetached(), true);
}
async function library(page) {
  await page.waitForFunction(() => document.querySelectorAll('.game-card').length === 28);
  assert.equal(await page.locator('[data-game="neon"] .cover-play > svg').count(), 1);
  assert.equal(await page.locator('[data-game="neon"] [data-edition="3d"]').count(), 0);
  await page.locator('[data-filter="arcade"]').click();
  assert.equal(await page.locator('.game-card').count(), 5);
  await page.locator('[data-filter="all"]').click();
  await page.locator('#search').fill('neon');
  assert.equal(await page.locator('.game-card').count(), 1);
  await page.locator('#search').fill('');
  await page.locator('[data-favorite="neon"]').click();
  await page.locator('[data-view="favorites"]').click();
  assert.equal(await page.locator('[data-game="neon"]').count(), 1);
  await page.locator('[data-view="all"]').click();
}
async function functional(page) {
  await library(page);
  let frame = await open(page);
  await hostPause(page, frame, 'menu');
  await start(frame);
  await layout(page, frame);
  // Real keyboard input, followed by blur and host pause, must never remain held.
  await frame.locator('#game').click({ position: { x: 120, y: 160 } });
  const x = await frame.evaluate(() => P.x);
  await page.keyboard.down('ArrowRight');
  await frame.waitForFunction(x => P.x > x + 10, x);
  await frame.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.deepEqual(await frame.evaluate(() => Object.keys(keys)), []);
  await page.keyboard.up('ArrowRight');
  await hostPause(page, frame, 'playing');
  await frame.locator('#btn-pause').click();
  await frame.waitForFunction(() => state === 'paused');
  await hostPause(page, frame, 'paused');
  assert.equal(await frame.locator('#pause.on').count(), 1);
  await frame.locator('#btn-resume').click();
  // Parent messages from an unrelated window or a wrong origin are ignored.
  await page.evaluate(() => {
    window.postMessage({ type: 'tramchoi:score', score: 999999 }, '*');
    window.postMessage({ type: 'tramchoi:shortcut', action: 'close' }, '*');
    window.dispatchEvent(new MessageEvent('message', { source: document.querySelector('#game-stage iframe').contentWindow, origin: 'https://invalid.example', data: { type: 'tramchoi:score', score: 999999 } }));
  });
  await frame.evaluate(() => {
    window.postMessage({ type: 'tramchoi:control', action: 'pause', value: true }, '*');
    window.dispatchEvent(new MessageEvent('message', { source: parent, origin: 'https://invalid.example', data: { type: 'tramchoi:control', action: 'pause', value: true } }));
  });
  await page.waitForTimeout(120);
  assert.equal(await frame.evaluate(() => hostPaused), false);
  assert.notEqual((await stored(page)).records?.neon, 999999);
  assert.equal(frame.isDetached(), false);
  // Upgrades stay pending across host pause; restart deliberately starts a clean run.
  await frame.evaluate(() => { pendingLevels = 1; openLevelUp(); });
  await hostPause(page, frame, 'levelup');
  assert.equal(await frame.locator('#levelup.on').count(), 1);
  await frame.locator('.lv-card').first().click();
  await frame.waitForFunction(() => state === 'playing');
  await frame.evaluate(() => { pendingLevels = 1; openLevelUp(); meta.gold = 300; meta.shop.vital = 1; });
  await page.locator('#restart-game').click();
  await frame.waitForFunction(() => state === 'playing' && pendingLevels === 0 && runTime < 1);
  assert.equal(await frame.locator('.overlay.on').count(), 0);
  assert.deepEqual(await frame.evaluate(() => [selChar, meta.gold, meta.shop.vital, P.maxHp === CHARACTERS[selChar].hp + 12]), [1, 300, 1, true]);
  // P/R/Escape inside the iframe operate the host controls.
  await frame.locator('#game').click({ position: { x: 100, y: 160 } });
  await page.keyboard.press('p');
  await page.locator('#pause-screen').waitFor();
  await frame.waitForFunction(() => hostPaused);
  await page.locator('#resume-game').click();
  await frame.waitForFunction(() => !hostPaused);
  await frame.evaluate(() => { runTime = 45; });
  await frame.locator('#game').click({ position: { x: 100, y: 160 } });
  await page.keyboard.press('r');
  await frame.waitForFunction(() => runTime < 2);
  await frame.evaluate(() => { kills = 42; P.hp = 1; P.invuln = 0; hurtPlayer(10000); });
  await frame.locator('#gameover.on').waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('tramchoi.library.v1')).records.neon === 42);
  await frame.locator('#btn-retry').click();
  await frame.evaluate(() => {
    // The boss dies to a projectile this tick; a lethal enemy is already touching P.
    // Victory must end processing before enemy contact can overwrite it with defeat.
    kills = 49; P.hp = 1; P.regen = 0; P.invuln = 0; P.x = 0; P.y = 0; P.weapons = {};
    enemies = []; projs = []; ebullets = []; spawnT = 1000; eventT = 1000;
    bossRef = spawnEnemy('boss', 100, 0); bossRef.hp = 1; bossSpawned = true;
    const touching = spawnEnemy('drone', 0, 0); touching.dmg = 10000;
    projs.push({ kind: 'bullet', x: 100, y: 0, vx: 0, vy: 0, r: 4, life: 1, dmg: 100, pierce: 0, color: '#fff' });
    update(0.016);
  });
  assert.deepEqual(await frame.evaluate(() => [state, P.hp, kills]), ['win', 1, 50]);
  await frame.locator('#victory.on').waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('tramchoi.library.v1')).records.neon === 50);
  await frame.evaluate(() => { P.invuln = 10000; });
  await frame.locator('#btn-endless').click();
  assert.equal(await frame.evaluate(() => endless && ['playing', 'levelup'].includes(state)), true);
  // Boss XP can immediately open an upgrade in endless mode. Escape must work
  // from the focused iframe even when that overlay covers the canvas.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#game-stage iframe'));
  assert.equal(frame.isDetached(), true);
  assert.ok((await stored(page)).recent.includes('neon'));
  await page.locator('[data-view="recent"]').click();
  assert.equal(await page.locator('[data-game="neon"]').count(), 1);
  await page.locator('[data-view="all"]').click();
  frame = await open(page);
  assert.ok(await frame.evaluate(() => meta.gold >= 300), 'earned gold survives closing the iframe');
  assert.deepEqual(await frame.evaluate(() => [selChar, meta.shop.vital]), [1, 1], 'character and upgrades survive closing the iframe');
  assert.equal((await stored(page)).records.neon, 50);
  await close(page, frame);
}
async function nativeMenuScroll(page, frame, engine) {
  assert.deepEqual(await frame.evaluate(() => [getComputedStyle(document.body).touchAction, getComputedStyle(document.querySelector('#menu')).touchAction, getComputedStyle(document.querySelector('#menu .panel')).touchAction]), ['auto', 'pan-y', 'pan-y']);
  if (engine !== 'chromium') return;
  const bounds = await frame.locator('#menu .panel').boundingBox();
  const initial = await frame.locator('#menu .panel').evaluate(el => el.scrollTop);
  const session = await page.context().newCDPSession(page);
  const x = Math.round(bounds.x + bounds.width * 0.6), bottom = Math.round(bounds.y + bounds.height * 0.8), top = Math.round(bounds.y + bounds.height * 0.25);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: bottom }] });
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(bottom + (top - bottom) * step / 6) }] });
      await page.waitForTimeout(35);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await frame.waitForFunction(initial => document.querySelector('#menu .panel').scrollTop > initial + 20, initial);
  } finally { await session.detach(); }
}
async function responsive(page, touch, engine) {
  const frame = await open(page);
  if (touch && page.viewportSize().width === 390) await nativeMenuScroll(page, frame, engine);
  await start(frame, touch);
  await layout(page, frame);
  if (touch) {
    // Touch coordinates exercise the canvas joystick logic in both browser engines.
    await frame.evaluate(() => {
      const emit = (type, x, y) => {
        const e = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(e, 'changedTouches', { value: [{ identifier: 7, clientX: x, clientY: y }] });
        canvas.dispatchEvent(e);
      };
      emit('touchstart', 100, 250); emit('touchmove', 140, 250);
    });
    await frame.waitForFunction(() => P.x > 10);
    assert.equal(await frame.evaluate(() => joyId), 7);
    await hostPause(page, frame, 'playing');
    assert.deepEqual(await frame.evaluate(() => [joyId, joyDX, joyDY]), [null, 0, 0]);
    await frame.locator('#btn-pause').tap();
    await frame.locator('#btn-resume').tap();
  }
  await frame.evaluate(() => { pendingLevels = 1; openLevelUp(); });
  await frame.locator('.lv-card').last()[touch ? 'tap' : 'click']();
  await frame.waitForFunction(() => state === 'playing');
  const original = page.viewportSize();
  await page.setViewportSize({ width: original.height, height: original.width });
  await frame.waitForFunction(() => canvas.getBoundingClientRect().width === innerWidth);
  await layout(page, frame);
  await page.setViewportSize(original);
  await layout(page, frame);
  await page.screenshot({ path: join(folder, `${report.current}-playing.png`) });
  await close(page, frame);
}
async function standalone(page) {
  await page.waitForFunction(() => typeof state !== 'undefined');
  await start(page);
  await layout(page, page);
  await page.locator('#game').click({ position: { x: 100, y: 160 } });
  await page.keyboard.press('p');
  await page.waitForFunction(() => state === 'paused');
  const time = await page.evaluate(() => runTime);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => runTime), time);
  await page.keyboard.press('p');
  await page.waitForFunction(() => state === 'playing');
  await page.locator('#btn-pause').click();
  await page.locator('#btn-quit').click();
  await page.waitForFunction(() => state === 'menu');
}
(async () => {
  for (const engine of (process.env.NEON_BROWSERS || 'chromium,webkit').split(',')) {
    const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await { chromium, webkit }[engine].launch({ headless: true, ...(engine === 'chromium' ? { executablePath: process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) } : {}) });
    report.versions[engine] = browser.version(); save();
    try {
      const scenarios = [
        { name: 'functional', width: 1366, height: 900, source: base, test: functional },
        { name: 'mobile', width: 390, height: 844, source: base, touch: true, test: responsive },
        { name: 'tablet', width: 820, height: 1180, source: base, touch: true, test: responsive },
        { name: 'offline-library', width: 1366, height: 900, source: pathToFileURL(join(__dirname, '../index.html')).href, test: functional },
        { name: 'offline-standalone', width: 390, height: 844, source: pathToFileURL(join(__dirname, '../Neon Survivors.html')).href, test: standalone },
      ];
      for (const scenario of scenarios) {
        const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height }, hasTouch: !!scenario.touch, isMobile: !!scenario.touch, deviceScaleFactor: scenario.touch ? 2 : 1 });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('dialog', d => d.accept());
        report.current = `${engine}-${scenario.name}`;
        try {
          await page.goto(scenario.source);
          await scenario.test(page, !!scenario.touch, engine);
          assert.deepEqual(errors, [], 'browser console errors');
          await page.screenshot({ path: join(folder, `${report.current}.png`) });
          report.runs.push({ engine, scenario: scenario.name, width: scenario.width, height: scenario.height, touch: !!scenario.touch }); save();
          console.log(`PASS ${report.current}`);
        } catch (error) {
          await page.screenshot({ path: join(folder, `${report.current}-failure.png`) }).catch(() => {});
          throw error;
        } finally { await context.close(); }
      }
    } finally { await browser.close(); }
  }
  delete report.current; save();
  console.log(`Neon integration checks passed: ${report.runs.length} runs.`);
})().catch(error => { report.error = error.stack || String(error); save(); console.error(error); process.exitCode = 1; });
