// version v1.0
/* Real UNO UI checks with deterministic engine fixtures and responsive random deals.
 * Requires a running scripts/serve.js server and installed Playwright browsers. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOTS || join(__dirname, '../test-results/uno-browser');
const selected = (process.env.UNO_BROWSERS || 'chromium,webkit').split(',').map(value => value.trim());
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profiles = [
  { width: 320, height: 740, dpr: 2 }, { width: 390, height: 844, dpr: 3 },
  { width: 768, height: 1024, dpr: 2 }, { width: 820, height: 1180, dpr: 2 },
  { width: 1024, height: 1366, dpr: 2 }, { width: 1366, height: 900, dpr: 1 },
  { width: 844, height: 390, dpr: 3 },
];
mkdirSync(output, { recursive: true });
const report = {
  environment: 'Headless Chromium and WebKit on Windows. Viewport, DPR and touch are simulated; no VM or physical iPhone/iPad.',
  coverage: 'Random real deals and real UI actions. Deterministic fixtures wrap the production createGame factory, retain all 108 unique cards and use the production rules/UI without production test hooks.',
  runs: [],
};
const save = () => writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2));
const hand = page => page.locator('.uno-hand [data-uno-card]');
const card = (page, id) => page.locator(`.uno-hand [data-uno-card="${id}"]`);
const action = (page, name) => page.locator(`[data-uno-${name}]`);

function watch(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('dialog', dialog => dialog.accept());
  return errors;
}

async function installFactoryCapture(page) {
  await page.goto(base);
  await page.waitForFunction(() => window.ArcadeUno && window.ArcadeGames.uno);
  await page.evaluate(() => {
    const original = window.ArcadeUno.createGame;
    // The public rules API is immutable; wrap it before mounting a game.
    window.ArcadeUno = { ...window.ArcadeUno };
    window.__unoStates = [];
    window.__unoFixture = null;
    window.ArcadeUno.createGame = function (...args) {
      const state = original.apply(this, args), spec = window.__unoFixture;
      if (spec) {
        const pool = [...state.hands.flat(), ...state.deck, ...state.discard];
        const take = ([color, value]) => {
          const index = pool.findIndex(c => c.color === color && c.value === String(value));
          if (index < 0) throw new Error(`Fixture card unavailable: ${color}/${value}`);
          return pool.splice(index, 1)[0];
        };
        const opening = take(spec.opening || ['red', '5']);
        const human = (spec.hand || [['red', '3'], ['blue', '7'], ['yellow', '8']]).map(take);
        const opponents = spec.opponents || [
          [['green', '1'], ['blue', '6'], ['red', '8']],
          [['green', '3'], ['yellow', '4'], ['red', '6']],
          [['green', '5'], ['blue', '8'], ['yellow', '7']],
        ];
        state.hands = [human, ...opponents.map(cards => cards.map(take))];
        const next = spec.drawTop ? take(spec.drawTop) : null;
        while (spec.humanCount && human.length < spec.humanCount) human.push(pool.shift());
        state.deck = next ? [...pool, next] : pool;
        state.discard = [opening];
        Object.assign(state, {
          color: spec.color || opening.color, current: 0, direction: 1,
          phase: 'play', drawnId: null, winner: null, score: 0, turn: 0,
          unoPending: null, unoCalled: [false, false, false, false], blockedTurns: 0,
        });
        const all = [...state.hands.flat(), ...state.deck, ...state.discard];
        if (all.length !== 108 || new Set(all.map(c => c.id)).size !== 108)
          throw new Error('Fixture must preserve all 108 unique cards');
      }
      window.__unoState = state;
      window.__unoStates.push(state);
      return state;
    };
  });
}

async function open(page, spec = null) {
  await page.evaluate(spec => { window.__unoFixture = spec; location.hash = '#play/uno'; }, spec);
  await page.locator('.uno-workspace').waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator('[data-start]').count()) await page.locator('[data-start]').click();
  await hand(page).first().waitFor();
}

async function restart(page, spec = null) {
  await page.evaluate(spec => { window.__unoFixture = spec; }, spec);
  await page.locator('#restart-game').click();
  if (await page.locator('[data-start]').count()) await page.locator('[data-start]').click();
  await page.waitForFunction(() => window.__unoState?.current === 0 && window.__unoState.turn === 0);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const s = window.__unoState;
    return {
      current: s.current, phase: s.phase, turn: s.turn, color: s.color,
      winner: s.winner, score: s.score, drawnId: s.drawnId,
      pending: s.unoPending, called: s.unoCalled.slice(),
      hands: s.hands.map(h => h.map(c => ({ ...c }))),
      discard: s.discard.map(c => ({ ...c })), deck: s.deck.map(c => c.id),
    };
  });
}

async function findCard(page, color, value) {
  const s = await snapshot(page), match = s.hands[0].find(c => c.color === color && c.value === value);
  assert.ok(match, `Human holds ${color}/${value}`);
  return match.id;
}

async function clickAndPause(page, selector) {
  // One browser task prevents an AI timer from racing the pause assertion.
  await page.evaluate(selector => {
    document.querySelector(selector).click();
    document.querySelector('#pause-game').click();
  }, selector);
  await page.locator('#pause-screen').waitFor();
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => [document.documentElement,
    document.querySelector('.stage-wrapper'), document.querySelector('.uno-workspace')].map(el => ({
    name: el.className || el.tagName, scroll: el.scrollWidth, width: el.clientWidth,
  })));
  for (const { name, scroll, width } of dimensions)
    assert.ok(scroll <= width + 1, `${label}: horizontal overflow in ${name}: ${scroll}/${width}`);
}

async function reachable(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const geometry = await locator.evaluate(el => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { width: r.width, height: r.height, reachable: Boolean(hit && (el === hit || el.contains(hit))) };
  });
  assert.ok(geometry.width >= 40 && geometry.height >= 39, `${label}: sufficiently large touch control`);
  assert.ok(geometry.reachable, `${label}: control is not clipped or covered after scrolling`);
}

async function desktop(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = watch(page), checks = [];
  try {
    await installFactoryCapture(page);
    assert.equal(await page.locator('.game-card').count(), 27);
    await page.locator('[data-filter="card"]').click();
    assert.equal(await page.locator('.game-card').count(), 3);
    assert.equal(await page.locator('[data-game="uno"] [data-edition="3d"]').count(), 0);
    await page.locator('#search').fill('uno');
    assert.equal(await page.locator('.game-card').count(), 1);
    checks.push('library count, card category, search and 2D-only edition');
    await open(page, {});
    assert.equal(await page.locator('.uno-opponent').count(), 3);
    assert.equal(await hand(page).count(), 3);
    let good = await findCard(page, 'red', '3'), bad = await findCard(page, 'blue', '7');
    assert.equal(await card(page, good).isEnabled(), true, 'matching colour is playable');
    assert.equal(await card(page, bad).isDisabled(), true, 'nonmatching card cannot be played');
    assert.ok(await card(page, good).getAttribute('aria-label'), 'cards have accessible names');
    await clickAndPause(page, `[data-uno-card="${good}"]`);
    let s = await snapshot(page);
    assert.equal(s.hands[0].length, 2); assert.equal(s.current, 1);
    assert.equal(s.discard.at(-1).id, good);
    await page.waitForTimeout(1100);
    assert.deepEqual(await snapshot(page), s, 'pause freezes the queued bot and input state');
    await page.locator('#resume-game').click();
    await page.waitForFunction(turn => window.__unoState.turn > turn, s.turn);
    checks.push('legal/illegal cards, play, AI response, pause/resume');

    const drawSpec = { hand: [['blue', '7'], ['yellow', '8'], ['green', '2']], drawTop: ['red', '9'] };
    await restart(page, drawSpec);
    assert.equal(await page.locator('.uno-hand [data-uno-card]:enabled').count(), 0);
    await action(page, 'draw').click();
    s = await snapshot(page);
    assert.equal(s.phase, 'drawn'); assert.equal(s.current, 0); assert.equal(s.hands[0].length, 4);
    assert.equal(await page.locator('.uno-hand [data-uno-card]:enabled').count(), 1, 'only the newly drawn card is eligible');
    assert.equal(await action(page, 'draw').isDisabled(), true, 'cannot draw twice in one turn');
    assert.equal(await action(page, 'pass').isEnabled(), true);
    await clickAndPause(page, '[data-uno-pass]');
    assert.equal((await snapshot(page)).current, 1);
    await page.locator('#resume-game').click();
    await restart(page, drawSpec);
    await action(page, 'draw').click();
    const drawn = (await snapshot(page)).drawnId;
    await card(page, drawn).focus();
    await page.keyboard.press('Enter');
    assert.equal((await snapshot(page)).discard.at(-1).id, drawn, 'native keyboard activation plays a drawn card');
    checks.push('draw, single draw restriction, pass, keyboard play of drawn card');

    await restart(page, { hand: [[null, 'wild'], ['blue', '7'], ['green', '2']] });
    const wild = await findCard(page, null, 'wild'), beforeWild = await snapshot(page);
    await card(page, wild).click();
    await page.locator('.uno-color-picker').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-uno-color]').count(), 4);
    await action(page, 'cancel').click();
    assert.deepEqual(await snapshot(page), beforeWild, 'cancelling the colour picker does not consume card/turn');
    await card(page, wild).click();
    await clickAndPause(page, '[data-uno-color="blue"]');
    s = await snapshot(page);
    assert.equal(s.color, 'blue'); assert.equal(s.discard.at(-1).value, 'wild');
    assert.equal(s.hands[0].length, 2);
    await page.locator('#resume-game').click();
    await restart(page, { hand: [['red', '3'], [null, 'wild4'], ['blue', '7']] });
    assert.equal(await card(page, await findCard(page, null, 'wild4')).isDisabled(), true, '+4 requires no card of the current colour');
    checks.push('wild colour selection/cancel and illegal +4 restriction');

    const unoSpec = { hand: [['red', '3'], ['blue', '7']] };
    await restart(page, unoSpec);
    await action(page, 'call').click();
    assert.equal(await action(page, 'call').getAttribute('aria-pressed'), 'true');
    good = await findCard(page, 'red', '3');
    await clickAndPause(page, `[data-uno-card="${good}"]`);
    s = await snapshot(page);
    assert.equal(s.hands[0].length, 1); assert.equal(s.pending, null); assert.equal(s.called[0], true);
    await page.locator('#resume-game').click();
    await restart(page, unoSpec);
    await card(page, await findCard(page, 'red', '3')).focus();
    await page.keyboard.press('Enter');
    assert.equal((await snapshot(page)).pending, 0);
    await page.keyboard.press('u');
    assert.equal((await snapshot(page)).pending, null, 'late UNO call is accepted before the bot catches it');
    await restart(page, unoSpec);
    await card(page, await findCard(page, 'red', '3')).click();
    await page.waitForFunction(() => window.__unoState.hands[0].length === 3, null, { timeout: 8000 });
    assert.equal((await snapshot(page)).pending, null, 'missed UNO is caught and draws two cards');
    checks.push('preannounced UNO, rescue call and missed UNO penalty');

    await restart(page, { hand: [['red', 'draw2']] });
    const oldNextCount = (await snapshot(page)).hands[1].length;
    await card(page, await findCard(page, 'red', 'draw2')).click();
    await page.locator('.result-overlay').waitFor();
    s = await snapshot(page);
    assert.equal(s.winner, 0); assert.equal(s.phase, 'finished');
    assert.equal(s.hands[1].length, oldNextCount + 2, 'final +2 penalty applies before scoring');
    assert.ok(s.score > 0);
    assert.ok(Number((await page.locator('#game-best').textContent()).replace(/\D/g, '')) > 0, 'win records score');
    await page.waitForTimeout(1000);
    assert.deepEqual(await snapshot(page), s, 'finished round cannot advance');
    await page.screenshot({ path: join(output, `${engine}-result.png`) });
    await page.evaluate(() => { window.__unoFixture = null; });
    await page.locator('[data-again]').click();
    assert.equal(await hand(page).count(), 7, 'play again deals a fresh seven-card hand');
    checks.push('final action penalty, winner/score and play again');

    await restart(page, {});
    good = await findCard(page, 'red', '3');
    await page.evaluate(id => {
      document.querySelector(`[data-uno-card="${id}"]`).click();
      window.__unoAbandoned = window.__unoState;
      document.querySelector('#restart-game').click();
    }, good);
    if (await page.locator('[data-start]').count()) await page.locator('[data-start]').click();
    const restarted = await snapshot(page);
    await page.waitForTimeout(1100);
    assert.deepEqual(await snapshot(page), restarted, 'restart cancels a queued AI timer');
    good = await findCard(page, 'red', '3');
    await page.evaluate(id => {
      document.querySelector(`[data-uno-card="${id}"]`).click();
      window.__unoAbandoned = window.__unoState;
      window.__unoAbandonedJson = JSON.stringify(window.__unoAbandoned);
      document.querySelector('#close-game').click();
    }, good);
    await page.locator('#player-dialog').waitFor({ state: 'hidden' });
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('#game-stage').innerHTML(), '');
    assert.equal(await page.evaluate(() => JSON.stringify(window.__unoAbandoned) === window.__unoAbandonedJson), true,
      'closing destroys the old round and pending AI callbacks');
    checks.push('restart and destroy cancel queued bot actions');

    await page.goto(`${base}/#play/uno/3d`);
    await page.waitForFunction(() => location.hash === '#play/uno');
    assert.equal(await page.locator('#game-stage').getAttribute('data-edition'), '2d');
    assert.equal(await page.locator('.player-edition-switch').isVisible(), false);
    assert.deepEqual(errors, [], `${engine}: no browser exceptions`);
    checks.push('unsupported 3D route normalizes to 2D');
    await page.goto(pathToFileURL(join(__dirname, '../index.html')).href + '#play/uno');
    await page.locator('[data-start]').click();
    assert.equal(await hand(page).count(), 7, 'UNO also opens without a server through file://');
    await noOverflow(page, `${engine} file://`);
    assert.deepEqual(errors, [], `${engine}: no browser exceptions including file://`);
    checks.push('file:// loads a complete seven-card game without a server');
    report.runs.push({ engine, type: 'functional', checks }); save();
    console.log(`PASS ${engine}: ${checks.join('; ')}`);
  } finally { await context.close(); }
}

async function responsive(browser, engine, profile) {
  const label = `${engine}-${profile.width}x${profile.height}-${profile.dpr}x`;
  const touch = profile.dpr > 1;
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: profile.dpr,
    isMobile: touch, hasTouch: touch, reducedMotion: 'reduce',
  });
  const page = await context.newPage(), errors = watch(page);
  try {
    await installFactoryCapture(page);
    await open(page);
    assert.equal(await hand(page).count(), 7);
    await noOverflow(page, label);
    await page.screenshot({ path: join(output, `${label}-deal.png`) });
    for (const [index, button] of (await hand(page).all()).entries()) await reachable(button, `${label}: card ${index + 1}`);
    await reachable(action(page, 'draw'), `${label}: draw pile`);
    await reachable(action(page, 'call'), `${label}: UNO button`);
    const playable = page.locator('.uno-hand [data-uno-card]:enabled').first();
    if (await playable.count()) await playable[touch ? 'tap' : 'click']();
    else await action(page, 'draw')[touch ? 'tap' : 'click']();
    if (await page.locator('.uno-color-picker:visible').count()) await page.locator('[data-uno-color="green"]')[touch ? 'tap' : 'click']();
    await noOverflow(page, `${label} after move`);

    await restart(page, { hand: [[null, 'wild'], ['red', '3'], ['blue', '7']], humanCount: 25 });
    assert.equal(await hand(page).count(), 25);
    await noOverflow(page, `${label} large hand`);
    await reachable(hand(page).last(), `${label}: last card of large hand`);
    await card(page, await findCard(page, null, 'wild'))[touch ? 'tap' : 'click']();
    for (const colour of ['red', 'yellow', 'green', 'blue']) await reachable(page.locator(`[data-uno-color="${colour}"]`), `${label}: ${colour} picker`);
    await reachable(action(page, 'cancel'), `${label}: cancel picker`);
    await noOverflow(page, `${label} colour picker`);
    await page.screenshot({ path: join(output, `${label}.png`) });
    await action(page, 'cancel')[touch ? 'tap' : 'click']();
    assert.deepEqual(errors, [], `${label}: no browser exceptions`);
    report.runs.push({ engine, type: 'responsive', ...profile, touch, checks: ['random deal', 'real play/draw', '25-card hand', 'colour picker', 'touch targets', 'no horizontal overflow'] }); save();
    console.log(`PASS ${label}: random deal, input, large hand, colour picker, controls, no overflow`);
  } finally { await context.close(); }
}

(async () => {
  save();
  for (const engine of selected) {
    assert.ok({ chromium, webkit }[engine], `Unsupported engine: ${engine}`);
    const browser = await { chromium, webkit }[engine].launch({
      headless: true,
      ...(engine === 'chromium' ? { executablePath: process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) } : {}),
    });
    report.versions ||= {}; report.versions[engine] = browser.version(); save();
    try {
      if (process.env.UNO_RESPONSIVE_ONLY !== '1') await desktop(browser, engine);
      if (process.env.UNO_FUNCTIONAL_ONLY !== '1') {
        for (const profile of profiles) await responsive(browser, engine, profile);
      }
    } finally { await browser.close(); }
  }
  console.log(`UNO browser checks passed: ${report.runs.length} runs. Report: ${join(output, 'results.json')}`);
})().catch(error => {
  report.error = error.stack || String(error); save();
  console.error(error); process.exitCode = 1;
});
