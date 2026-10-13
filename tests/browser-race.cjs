// version v1.0
/* Optional Playwright integration checks. Start the local server before running. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOTS || join(__dirname, '../test-results/race');
const selected = (process.env.RACE_BROWSERS || 'chromium,webkit').split(',');
const renderers = (process.env.RACE_RENDERERS || '2d,3d').split(',');
const profiles = [
  { width: 320, height: 740, dpr: 2 }, { width: 390, height: 844, dpr: 3 },
  { width: 744, height: 1133, dpr: 2 }, { width: 1024, height: 1366, dpr: 2 },
  { width: 1180, height: 820, dpr: 2 }, { width: 844, height: 390, dpr: 3 },
].filter(profile => !process.env.RACE_PROFILE || process.env.RACE_PROFILE === `${profile.width}x${profile.height}`);
mkdirSync(output, { recursive: true });
const report = {
  environment: 'Windows headless browsers; simulated viewport, DPR and touch. No physical iPhone/iPad or virtual machine.',
  inputCoverage: {
    chromium: 'Real keyboard, mouse, taps and CDP simultaneous touch holds/touchCancel.',
    webkit: 'Real keyboard, mouse holds and taps in touch contexts. Simultaneous keyboard+pointer; synthetic pointercancel on an actual captured pointer. No native multi-touch hold API in Playwright WebKit.',
  },
  runs: [],
};
const workspace = page => page.locator('.race-workspace');
const control = (page, key) => page.locator(`[data-hold="${key}"]`);
function save() { writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2)); }
function watch(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('dialog', dialog => dialog.accept());
  return errors;
}
async function snapshot(page) {
  const data = await workspace(page).evaluate(el => ({ ...el.dataset }));
  for (const key of ['time', 'speed', 'distance', 'energy', 'x']) {
    assert.ok(data[key] !== undefined && Number.isFinite(Number(data[key])), `Missing finite data-${key}`);
    data[key] = Number(data[key]);
  }
  return data;
}
async function mode(page, expected) {
  await page.waitForFunction(expected => document.querySelector('.race-workspace')?.dataset.mode === expected, expected, { timeout: 5000 });
}
async function open(page, renderer) {
  await page.goto(`${base}/#play/race${renderer === '3d' ? '/3d' : ''}`);
  await page.waitForFunction(() => document.querySelector('.race-workspace') || document.querySelector('.three-unavailable'));
  if (await page.locator('.three-unavailable').count()) {
    const error = new Error(`3D unavailable: ${await page.locator('.three-unavailable').innerText()}`);
    error.unsupported = true;
    throw error;
  }
  await page.locator('[data-start]').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  assert.equal((await snapshot(page)).status, 'intro');
  if (renderer === '3d') {
    await page.waitForFunction(() => window.Arcade3D?.diagnostics?.().some(scene => scene.id === 'race' && scene.frames > 0 && scene.triangles > 100));
    assert.equal(await page.locator('.three-canvas').count(), 1);
  }
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page horizontal overflow');
  assert.ok(await page.locator('.stage-wrapper').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'game stage horizontal overflow');
  assert.ok(await workspace(page).evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'race workspace horizontal overflow');
  for (const key of ['left', 'right', 'coast', 'brake', 'sprint']) {
    const box = await control(page, key).boundingBox();
    assert.ok(box && box.width >= 40 && box.height >= 40, `${key} touch target should be at least 40px`);
  }
}
async function begin(page, touch = false) {
  await page.locator('[data-start]')[touch ? 'tap' : 'click']();
  await workspace(page).focus();
  await mode(page, 'pedal');
}
async function keyboardHold(page, key, milliseconds, expected) {
  await workspace(page).focus();
  await page.keyboard.down(key);
  try {
    if (expected) await mode(page, expected);
    await page.waitForTimeout(milliseconds);
    return await snapshot(page);
  } finally { await page.keyboard.up(key); }
}
async function center(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box, 'Control must have a visible box');
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const size = page.viewportSize();
  assert.ok(point.x >= 0 && point.x < size.width && point.y >= 0 && point.y < size.height, 'Control center must be within viewport');
  return point;
}
async function pointerHold(page, key, milliseconds, expected) {
  const point = await center(page, control(page, key));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  try {
    if (expected) await mode(page, expected);
    const controlStart = await snapshot(page);
    // Software-rendered WebKit may deliver fewer frames per wall-clock second.
    // Measure the held action in simulation time, from its actual activation.
    await page.waitForFunction(target => Number(document.querySelector('.race-workspace')?.dataset.time) >= target,
      controlStart.time + milliseconds / 1000, { timeout: 15000 });
    return { ...await snapshot(page), controlStart };
  } finally { await page.mouse.up(); }
}
async function preferences(page, renderer, touch = false) {
  const expected = {};
  for (const key of ['sound', 'motion']) {
    const button = page.locator(`[data-race-${key}]`);
    const previous = await button.getAttribute('aria-pressed');
    assert.ok(previous === 'true' || previous === 'false', `${key} setting must expose its state`);
    await button[touch ? 'tap' : 'click']();
    expected[key] = previous === 'true' ? 'false' : 'true';
    assert.equal(await button.getAttribute('aria-pressed'), expected[key]);
  }
  await open(page, renderer);
  for (const key of ['sound', 'motion']) assert.equal(await page.locator(`[data-race-${key}]`).getAttribute('aria-pressed'), expected[key], `${key} should survive reload`);
  // Leave audio enabled to exercise initialization, pause/resume and cleanup.
  if (expected.sound === 'false') await page.locator('[data-race-sound]')[touch ? 'tap' : 'click']();
}
async function close(page, renderer) {
  if (renderer === '3d') await page.evaluate(() => { window.__raceOldGL = document.querySelector('.three-canvas').getContext('webgl2'); });
  await page.locator('#close-game').click();
  await page.locator('#player-dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#game-stage').innerHTML(), '');
  if (renderer === '3d') {
    assert.equal(await page.evaluate(() => window.Arcade3D.diagnostics().length), 0, 'closing releases GPU scene');
    assert.ok(await page.evaluate(() => window.__raceOldGL.isContextLost()), 'closing releases WebGL context');
  }
}
async function screenshot(page, name) {
  await page.locator('.stage-wrapper').evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: join(output, `${name}.png`) });
}
async function desktop(browser, name, renderer) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = watch(page), measurements = {};
  try {
    await open(page, renderer);
    const intro = await snapshot(page);
    await page.waitForTimeout(250);
    assert.equal((await snapshot(page)).distance, intro.distance, 'intro must not run simulation');
    await preferences(page, renderer);
    await noOverflow(page);
    await begin(page);
    const start = await snapshot(page);
    await page.waitForTimeout(1300);
    const pedaling = await snapshot(page);
    assert.ok(pedaling.distance > start.distance && pedaling.speed > start.speed, 'automatic pedaling accelerates the bike');
    const coastStart = await snapshot(page);
    const coast = await keyboardHold(page, 'c', 700, 'coast');
    assert.ok(coast.distance > coastStart.distance && coast.speed > 0, 'coasting preserves forward momentum');
    // A downhill section may legitimately accelerate a coasting rider. The
    // important distinction from the old handling is gradual momentum change.
    assert.ok(Math.abs(coast.speed - coastStart.speed) < 1, 'coasting changes speed gradually, including on downhill sections');
    await mode(page, 'pedal');
    await page.waitForTimeout(1000);
    const brakeStart = await snapshot(page);
    const brake = await keyboardHold(page, 's', 700, 'brake');
    assert.ok(brake.speed < brakeStart.speed, 'braking reduces speed');
    assert.ok(brakeStart.speed - brake.speed > coastStart.speed - coast.speed, 'braking decelerates more strongly than coasting');
    measurements.coastSpeedLoss = coastStart.speed - coast.speed;
    measurements.brakeSpeedLoss = brakeStart.speed - brake.speed;
    await mode(page, 'pedal');
    const energy = (await snapshot(page)).energy;
    const sprint = await keyboardHold(page, 'Space', 1000, 'sprint');
    assert.ok(sprint.energy < energy, 'sprinting consumes energy');
    await mode(page, 'pedal');
    const beforeSteer = await snapshot(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(90);
    const earlySteer = await snapshot(page);
    assert.ok(earlySteer.x >= beforeSteer.x && earlySteer.x - beforeSteer.x < 0.6, 'steering must be gradual');
    await page.waitForTimeout(370);
    const lateSteer = await snapshot(page);
    await page.keyboard.up('ArrowRight');
    assert.ok(lateSteer.x > earlySteer.x + 0.02, 'holding steering continues turning');
    measurements.steering = { before: beforeSteer.x, early: earlySteer.x, late: lateSteer.x };

    // Pause while inputs are physically held; releasing them during pause must not stick.
    await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Space');
    await mode(page, 'sprint');
    await page.keyboard.press('p');
    await page.locator('#resume-game').waitFor({ state: 'visible' });
    await mode(page, 'paused');
    const paused = await snapshot(page);
    const frames = renderer === '3d' ? await page.evaluate(() => window.Arcade3D.diagnostics()[0].frames) : null;
    await page.waitForTimeout(300);
    const frozen = await snapshot(page);
    assert.equal(frozen.distance, paused.distance); assert.equal(frozen.speed, paused.speed);
    if (renderer === '3d') assert.equal(await page.evaluate(() => window.Arcade3D.diagnostics()[0].frames), frames, 'paused scene must not render');
    await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Space');
    await page.locator('#resume-game').click();
    await mode(page, 'pedal');
    assert.equal(await page.locator('[data-hold].held').count(), 0);
    await screenshot(page, `${name}-${renderer}-desktop`);

    // Restart and reopen while sprint was held; neither may carry input into a new race.
    await workspace(page).focus(); await page.keyboard.down('Space'); await mode(page, 'sprint');
    await page.locator('#restart-game').click(); await page.keyboard.up('Space');
    await page.locator('[data-start]').waitFor();
    assert.equal((await snapshot(page)).distance, 0);
    await begin(page); await mode(page, 'pedal');
    await page.keyboard.down('Space'); await mode(page, 'sprint');
    await close(page, renderer); await page.keyboard.up('Space');
    await open(page, renderer); await begin(page); await mode(page, 'pedal');
    assert.ok((await snapshot(page)).energy > 99, 'a fresh race must restore stamina');
    await close(page, renderer);
    assert.deepEqual(errors, [], 'no JavaScript or WebGL errors');
    return measurements;
  } finally { await context.close(); }
}
async function simultaneousInput(page, context, name) {
  const sprintButton = control(page, 'sprint'), rightButton = control(page, 'right');
  await sprintButton.scrollIntoViewIfNeeded(); await rightButton.scrollIntoViewIfNeeded();
  // Both controls must be measured after the final scroll; a second scroll can
  // invalidate the first point on small or landscape screens.
  await center(page, sprintButton); await center(page, rightButton);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const [sprintBox, rightBox] = await Promise.all([sprintButton.boundingBox(), rightButton.boundingBox()]);
  const sprintPoint = { x: sprintBox.x + sprintBox.width / 2, y: sprintBox.y + sprintBox.height / 2 };
  const rightPoint = { x: rightBox.x + rightBox.width / 2, y: rightBox.y + rightBox.height / 2 };
  const before = await snapshot(page);
  if (name === 'chromium') {
    const session = await context.newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...rightPoint, id: 1 }, { ...sprintPoint, id: 2 }] });
      await mode(page, 'sprint');
      await page.waitForTimeout(450);
      const held = await snapshot(page);
      assert.ok(held.x > before.x && held.energy < before.energy, `two simultaneous fingers must steer and sprint: ${JSON.stringify({ before, held, sprintPoint, rightPoint })}`);
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    } finally { await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {}); await session.detach(); }
  } else {
    // A real captured pointer supplies a valid ID; only cancellation itself is synthetic.
    await sprintButton.evaluate(el => el.addEventListener('pointerdown', event => { el.dataset.testPointer = String(event.pointerId); }, { once: true }));
    await workspace(page).focus(); await page.keyboard.down('ArrowRight');
    await page.mouse.move(sprintPoint.x, sprintPoint.y); await page.mouse.down();
    try {
      await mode(page, 'sprint'); await page.waitForTimeout(450);
      const held = await snapshot(page);
      assert.ok(held.x > before.x && held.energy < before.energy, 'pointer sprint and keyboard steering must work together');
      const pointerId = Number(await sprintButton.getAttribute('data-test-pointer'));
      await sprintButton.dispatchEvent('pointercancel', { pointerId, pointerType: 'mouse', bubbles: true });
      await page.keyboard.up('ArrowRight');
      await mode(page, 'pedal');
    } finally { await page.mouse.up(); await page.keyboard.up('ArrowRight'); }
  }
  await mode(page, 'pedal');
  assert.equal(await page.locator('[data-hold].held').count(), 0, 'cancel releases every held control');
}
async function mobile(browser, name, renderer, profile) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: profile.dpr, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = watch(page);
  try {
    await open(page, renderer); await noOverflow(page); await begin(page, true);
    await page.waitForFunction(() => Number(document.querySelector('.race-workspace')?.dataset.speed) >= 4);
    await simultaneousInput(page, context, name);
    await pointerHold(page, 'coast', 300, 'coast'); await mode(page, 'pedal');
    const braking = await pointerHold(page, 'brake', 350, 'brake');
    const beforeBrake = braking.controlStart;
    assert.ok(braking.speed < beforeBrake.speed, `touch layout brake remains functional: ${JSON.stringify({ beforeBrake, braking })}`);
    await mode(page, 'pedal');
    await page.locator('[data-race-motion]').tap();
    await page.locator('[data-race-sound]').tap();
    await noOverflow(page);
    await screenshot(page, `${name}-${renderer}-${profile.width}x${profile.height}`);
    await page.locator('#pause-game').tap(); await mode(page, 'paused');
    const distance = (await snapshot(page)).distance;
    await page.waitForTimeout(200); assert.equal((await snapshot(page)).distance, distance);
    await page.locator('#resume-game').tap(); await mode(page, 'pedal');
    await page.locator('#restart-game').tap(); await page.locator('[data-start]').waitFor();
    assert.equal((await snapshot(page)).distance, 0);
    await close(page, renderer);
    assert.deepEqual(errors, [], 'no JavaScript or WebGL errors');
  } finally { await context.close(); }
}
async function runCase(info, task) {
  try {
    const measurements = await task();
    report.runs.push({ ...info, passed: true, ...(measurements ? { measurements } : {}) });
    console.log(`${info.engine} ${info.renderer} ${info.desktop ? 'desktop' : `${info.width}x${info.height}`}: passed`);
  } catch (error) {
    report.runs.push({ ...info, passed: false, unsupported: Boolean(error.unsupported), error: error.stack });
    console.error(`${info.engine} ${info.renderer}: ${error.message}`);
  }
  save();
}
(async () => {
  for (const name of selected) {
    const engine = { chromium, webkit }[name]; assert.ok(engine, `Unknown browser: ${name}`);
    const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await engine.launch({ headless: true, executablePath: name === 'chromium' ? process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) : undefined });
    try {
      for (const renderer of renderers) {
        assert.ok(['2d', '3d'].includes(renderer), `Unknown renderer: ${renderer}`);
        const info = { engine: name, version: browser.version(), renderer };
        if (process.env.RACE_SKIP_DESKTOP !== '1') await runCase({ ...info, desktop: true }, () => desktop(browser, name, renderer));
        if (process.env.RACE_SKIP_MOBILE !== '1') for (const profile of profiles) await runCase({ ...info, ...profile }, () => mobile(browser, name, renderer, profile));
      }
    } finally { await browser.close(); }
  }
  report.passed = report.runs.length > 0 && report.runs.every(run => run.passed);
  save();
  if (!report.passed) process.exitCode = 1;
  console.log(`Race browser checks: ${report.runs.filter(run => run.passed).length}/${report.runs.length} passed. Report: ${join(output, 'results.json')}`);
})().catch(error => { report.passed = false; report.error = error.stack; save(); console.error(error); process.exitCode = 1; });
