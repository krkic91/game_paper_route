// version v1.0
/* Production UI integration: real actions, deterministic rule fixtures, responsive layout. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOTS || join(__dirname, '../test-results/table-games');
const engines = (process.env.TABLE_BROWSERS || 'chromium,webkit').split(',');
const games = (process.env.TABLE_GAMES || 'domino,monopoly,tienlen,xidach,werewolf').split(',');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profiles = [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1366, height: 900 }];
const apis = { domino: 'ArcadeDomino', monopoly: 'ArcadeMonopoly', tienlen: 'ArcadeTienLen', xidach: 'ArcadeXiDach', werewolf: 'ArcadeWerewolf' };
mkdirSync(output, { recursive: true });
const report = { environment: 'Headless Windows Chromium/WebKit, simulated viewport and touch. No virtual machine or physical iOS device.', runs: [] };
const save = () => writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2));
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__tableState)));

function watch(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('dialog', dialog => dialog.accept());
  return errors;
}
async function noOverflow(page, label) {
  const boxes = await page.evaluate(() => [document.documentElement, document.querySelector('.stage-wrapper'), document.querySelector('.game-workspace')].map(el => ({ name: el.className || el.tagName, width: el.clientWidth, scroll: el.scrollWidth })));
  for (const box of boxes) assert.ok(box.scroll <= box.width + 1, `${label}: overflow ${box.name}: ${box.scroll}/${box.width}`);
}
async function reachable(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const info = await locator.evaluate(el => {
    const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { width: r.width, height: r.height, x: r.x, y: r.y, hit: hit === el || el.contains(hit), covering: hit?.className };
  });
  assert.ok(info.width >= 38 && info.height >= 38, `${label}: touch target ${info.width}x${info.height}`);
  assert.ok(info.hit, `${label}: control is reachable: ${JSON.stringify(info)}`);
}
async function install(page, id) {
  await page.goto(base);
  await page.waitForFunction(({ api, id }) => window[api] && window.ArcadeGames[id], { api: apis[id], id });
  await page.evaluate(({ api, id }) => {
    const original = window[api];
    window.__fixture = 'opening';
    window[api] = { ...original, createGame(options = {}) {
      let seed = 217;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      const s = original.createGame({ ...options, random: id === 'monopoly' ? () => 0 : random });
      const fixture = window.__fixture;
      if ((id === 'domino' || id === 'tienlen') && fixture === 'opening') {
        [s.hands[0], s.hands[s.current]] = [s.hands[s.current], s.hands[0]];
        s.current = 0;
      }
      if (id === 'domino' && ['choice', 'win'].includes(fixture)) {
        const pool = original.createTiles();
        const take = key => pool.splice(pool.findIndex(tile => tile.id === key), 1)[0];
        s.chain = [[1, 1], [1, 0], [0, 2]].map(([left, right]) => {
          const tile = take([left, right].sort().join('-'));
          return { id: tile.id, left, right, player: 1 };
        });
        s.hands = [[take('1-2'), ...(fixture === 'choice' ? [take('3-4')] : [])], [], [], []];
        pool.forEach((tile, i) => s.hands[1 + i % 3].push(tile));
        s.current = 0; s.turn = 8;
      }
      if (id === 'tienlen' && fixture === 'win') {
        const pool = original.createDeck();
        s.hands = [[], [], [], []];
        for (const key of ['tl-0-0', 'tl-1-0', 'tl-2-0']) s.hands[0].push(pool.splice(pool.findIndex(card => card.id === key), 1)[0]);
        pool.splice(0, 39).forEach((card, i) => s.hands[1 + i % 3].push(card));
        s.played = pool; s.current = 0; s.opening = false;
      }
      if (id === 'monopoly' && fixture === 'upgrade') {
        s.properties[1].owner = 0; s.properties[2].owner = 0;
      }
      if (id === 'monopoly' && fixture === 'win') {
        s.round = 30; s.current = 0; s.phase = 'end';
        for (let i = 1; i < 4; i++) { s.players[i].bankrupt = true; s.players[i].cash = 0; }
      }
      if (id === 'xidach') {
        const pool = original.createDeck();
        const take = ([suit, rank]) => pool.splice(pool.findIndex(card => card.suit === suit && card.rank === rank), 1)[0];
        const win = fixture === 'win', five = fixture === 'five';
        s.hands.player = (five ? [['spades', 2], ['clubs', 2], ['diamonds', 2], ['hearts', 2]] : win ? [['spades', 10], ['clubs', 8]] : [['spades', 7], ['clubs', 5]]).map(take);
        s.hands.dealer = (five ? [['spades', 10], ['clubs', 6]] : win ? [['diamonds', 10], ['hearts', 6]] : [['diamonds', 9], ['hearts', 7]]).map(take);
        const draws = (five ? [['spades', 3], ['clubs', 3]] : win ? [['spades', 9]] : [['spades', 4], ['diamonds', 5]]).map(take);
        s.deck = pool.concat(draws.reverse()); s.phase = 'player'; s.outcome = null; s.reason = ''; s.score = 0;
      }
      if (id === 'werewolf') {
        const roles = ['seer', 'wolf', 'wolf', 'guard', 'villager', 'villager', 'villager', 'villager'];
        s.players.forEach((player, index) => { player.role = roles[index]; });
        s.actions = { 1: { type: 'kill', target: 0 }, 2: { type: 'kill', target: 0 }, 3: { type: 'protect', target: 0 } };
        if (fixture === 'win') {
          s.phase = 'day'; s.players[2].alive = false; s.actions = {};
          for (const player of s.players) if (player.id && player.alive) s.actions[player.id] = { type: 'vote', target: player.id === 1 ? 0 : 1 };
        }
        if (fixture === 'guard') {
          s.players[0].role = 'guard'; s.players[3].role = 'seer'; s.guardLast = 0;
          s.actions = { 1: { type: 'kill', target: 4 }, 2: { type: 'kill', target: 4 }, 3: { type: 'inspect', target: 1 } };
        }
        if (fixture === 'spectator') { s.players[0].alive = false; }
      }
      window.__tableState = s;
      return s;
    } };
  }, { api: apis[id], id });
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
async function pauseAction(page, selector) {
  await page.evaluate(selector => {
    document.querySelector(selector).click();
    document.querySelector('#pause-game').click();
  }, selector);
  await page.locator('#pause-screen').waitFor();
  const before = await state(page);
  await page.waitForTimeout(950);
  assert.deepEqual(await state(page), before, 'pause freezes the pending action');
  await page.locator('#resume-game').click();
  return before;
}

async function functional(page, id) {
  if (id === 'domino') {
    assert.equal(await page.locator('[data-domino-tile]').count(), 7);
    assert.equal(await page.locator('[data-domino-pass]').isDisabled(), true);
    await pauseAction(page, '[data-domino-tile="6-6"]');
    await page.waitForFunction(() => window.__tableState.turn > 1);
    await restart(page, 'choice');
    await page.locator('[data-domino-tile="1-2"]').click();
    assert.equal(await page.locator('[data-domino-end="left"]').isEnabled(), true);
    assert.equal(await page.locator('[data-domino-end="right"]').isEnabled(), true);
    const before = await state(page);
    await page.locator('[data-domino-cancel]').click();
    assert.deepEqual(await state(page), before);
    await restart(page, 'win');
    await page.locator('[data-domino-tile="1-2"]').click();
    await page.locator('[data-domino-end="right"]').click();
    assert.equal((await state(page)).winner, 0);
  } else if (id === 'tienlen') {
    assert.equal(await page.locator('[data-tl-card]').count(), 13);
    assert.equal(await page.locator('[data-tl-play]').isDisabled(), true);
    assert.equal(await page.locator('[data-tl-pass]').isDisabled(), true);
    await page.locator('[data-tl-card="tl-0-0"]').click();
    await pauseAction(page, '[data-tl-play]');
    await page.waitForFunction(() => window.__tableState.turn > 1);
    await restart(page, 'win');
    await page.locator('[data-tl-hint]').click();
    assert.equal(await page.locator('[data-tl-card][aria-pressed="true"]').count(), 3);
    await page.locator('[data-tl-play]').focus();
    await page.keyboard.press('Enter');
    assert.equal((await state(page)).winner, 0);
  } else if (id === 'monopoly') {
    assert.equal(await page.locator('[data-monopoly-tile]').count(), 24);
    await pauseAction(page, '[data-monopoly-roll]');
    await page.waitForFunction(() => window.__tableState.phase === 'buy');
    assert.equal((await state(page)).players[0].position, 2);
    await page.locator('[data-monopoly-buy]').click();
    assert.equal((await state(page)).properties[2].owner, 0);
    assert.equal((await state(page)).players[0].cash, 980);
    await pauseAction(page, '[data-monopoly-end]');
    await page.waitForFunction(() => window.__tableState.players[1].position !== 0);
    await restart(page, 'upgrade');
    await page.locator('[data-monopoly-inspect]').selectOption('1');
    await page.locator('[data-monopoly-upgrade]').click();
    assert.equal((await state(page)).properties[1].level, 1);
    assert.equal((await state(page)).players[0].cash, 1030);
    await restart(page, 'win');
    await page.locator('[data-monopoly-end]').click();
    assert.equal((await state(page)).winner, 0);
  } else if (id === 'xidach') {
    assert.equal(await page.locator('[data-xidach-stand]').isDisabled(), true);
    assert.equal(await page.locator('.xidach-card-back').count(), 1);
    assert.equal(await page.locator('[data-xidach-hand="dealer"] [aria-label="7 cơ"]').count(), 0, 'hole card is absent from the DOM');
    await page.locator('[data-xidach-hit]').click();
    assert.equal((await state(page)).hands.player.length, 3);
    assert.equal(await page.locator('[data-xidach-stand]').isEnabled(), true);
    await pauseAction(page, '[data-xidach-stand]');
    await page.waitForFunction(() => window.__tableState.phase === 'done');
    assert.equal((await state(page)).outcome, 'loss');
    assert.equal(await page.locator('.xidach-card-back').count(), 0);
    await restart(page, 'win');
    await page.locator('[data-xidach-stand]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__tableState.phase === 'done');
    assert.equal((await state(page)).outcome, 'win');
  } else if (id === 'werewolf') {
    assert.equal(await page.locator('[data-ww-role]').textContent(), 'Tiên tri');
    for (let i = 1; i < 8; i++) assert.equal(await page.locator(`[data-ww-identity="${i}"]`).textContent(), 'Chưa rõ vai');
    assert.equal(await page.locator('[data-ww-confirm]').isDisabled(), true);
    await page.locator('[data-ww-target="1"]').click();
    await pauseAction(page, '[data-ww-confirm]');
    await page.waitForFunction(() => window.__tableState.phase === 'day');
    assert.equal((await state(page)).knowledge[0][1], true);
    assert.match(await page.locator('[data-ww-knowledge]').textContent(), /Máy 1: là sói/);
    assert.equal(await page.locator('[data-ww-identity="1"]').textContent(), 'Chưa rõ vai', 'inspection stays in private notebook');
    assert.equal(await page.locator('[data-ww-discussion] li').count(), 7);
    await restart(page, 'guard');
    assert.equal(await page.locator('[data-ww-target="0"]').isDisabled(), true, 'cannot repeat guard target');
    await page.locator('[data-ww-target="4"]').click();
    await page.locator('[data-ww-confirm]').click();
    await page.waitForFunction(() => window.__tableState.phase === 'day');
    assert.equal((await state(page)).players[4].alive, true);
    await restart(page, 'spectator');
    await page.waitForFunction(() => window.__tableState.turn >= 2, null, { timeout: 10000 });
    await restart(page, 'win');
    await page.locator('[data-ww-target="1"]').click();
    await page.locator('[data-ww-confirm]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__tableState.phase === 'over');
    assert.equal((await state(page)).winner, 'village');
  } else throw new Error(`Unknown game: ${id}`);
  await page.locator(id === 'xidach' ? '[data-xidach-result]' : '.result-overlay').waitFor();
  await page.evaluate(() => { window.__fixture = 'opening'; });
  await page.locator(id === 'xidach' ? '[data-xidach-next]' : '[data-again]').click();
  await page.locator('.result-overlay').waitFor({ state: 'hidden' });
  await page.screenshot({ path: join(output, `${page.__engine}-${id}-desktop.png`) });
}

async function responsiveAction(page, id, touch) {
  const press = async selector => {
    const button = page.locator(selector).first();
    await reachable(button, `${id} ${selector}`);
    await button[touch ? 'tap' : 'click']();
  };
  if (id === 'domino') {
    await press('[data-domino-tile="6-6"]');
    await page.waitForFunction(() => window.__tableState.chain.length > 1);
  } else if (id === 'tienlen') {
    await press('[data-tl-hint]');
    await press('[data-tl-play]');
    await page.waitForFunction(() => window.__tableState.turn > 1);
  } else if (id === 'monopoly') {
    await press('[data-monopoly-roll]');
    await page.waitForFunction(() => window.__tableState.phase === 'buy');
    await press('[data-monopoly-decline]');
    await page.locator('[data-monopoly-inspect]').selectOption('23');
    assert.match(await page.locator('[data-monopoly-detail]').textContent(), /Quảng Trường/);
    await press('.monopoly-speed');
    assert.equal(await page.locator('[data-monopoly-fast]').isChecked(), true);
    await press('.monopoly-rules summary');
    assert.equal(await page.locator('.monopoly-rules').getAttribute('open'), '');
  } else if (id === 'xidach') {
    await press('[data-xidach-hit]');
    await press('[data-xidach-stand]');
    await page.waitForFunction(() => window.__tableState.phase === 'done');
    await reachable(page.locator('[data-xidach-next]'), 'xidach next round');
    await restart(page, 'five');
    await press('[data-xidach-hit]');
    await page.waitForFunction(() => window.__tableState.phase === 'done');
    assert.equal((await state(page)).outcome, 'win');
    assert.equal(await page.locator('[data-xidach-hand="player"] .xidach-card').count(), 5);
    const handBox = await page.locator('[data-xidach-hand="player"]').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    assert.ok(handBox.scroll <= handBox.width + 1, 'five cards fit the hand');
    await reachable(page.locator('[data-xidach-next]'), 'xidach five-card next round');
  } else if (id === 'werewolf') {
    await press('[data-ww-target="1"]');
    await press('[data-ww-confirm]');
    await page.waitForFunction(() => window.__tableState.phase === 'day');
    assert.match(await page.locator('[data-ww-knowledge]').textContent(), /Máy 1: là sói/);
  } else throw new Error(`Unknown game: ${id}`);
}

async function run(browser, engine, id, profile, full) {
  const touch = profile.width < 1000;
  const context = await browser.newContext({ viewport: profile, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = watch(page);
  page.__engine = engine;
  const label = `${engine}-${id}-${profile.width}x${profile.height}`;
  try {
    await install(page, id);
    assert.equal(await page.locator('.game-card').count(), 20);
    assert.ok(await page.locator(`[data-game="${id}"] .game-cover svg`).count());
    await open(page, id);
    await noOverflow(page, label);
    if (full) await functional(page, id);
    else await responsiveAction(page, id, touch);
    await noOverflow(page, label + ' after actions');
    await page.screenshot({ path: join(output, label + '.png') });
    await restart(page);
    // Retain the old state to prove closing cannot run any queued bot callbacks.
    await page.evaluate(id => {
      const click = selector => document.querySelector(selector).click();
      if (id === 'domino') click('[data-domino-tile="6-6"]');
      if (id === 'tienlen') { click('[data-tl-hint]'); click('[data-tl-play]'); }
      if (id === 'monopoly') click('[data-monopoly-roll]');
      if (id === 'xidach') { click('[data-xidach-hit]'); click('[data-xidach-stand]'); }
      if (id === 'werewolf') { click('[data-ww-target="1"]'); click('[data-ww-confirm]'); }
      window.__closedRound = window.__tableState; window.__closedJson = JSON.stringify(window.__closedRound);
      click('#close-game');
    }, id);
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('#game-stage').innerHTML(), '');
    assert.equal(await page.evaluate(() => JSON.stringify(window.__closedRound) === window.__closedJson), true);
    assert.deepEqual(errors, [], label);
    report.runs.push({ engine, id, ...profile, touch, full }); save();
    console.log(`PASS ${label}${full ? ' functional' : ' responsive'}`);
  } catch (error) {
    await page.screenshot({ path: join(output, label + '-failure.png') }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}
async function offline(browser, engine) {
  const page = await browser.newPage(), errors = watch(page);
  try {
    await page.goto(pathToFileURL(join(__dirname, '../index.html')).href);
    await page.waitForFunction(() => document.querySelectorAll('.game-card').length === 20);
    for (const id of games) {
      await open(page, id);
      await page.locator('#close-game').click();
    }
    await page.locator('[data-filter="social"]').click();
    assert.equal(await page.locator('.game-card').count(), 1);
    assert.equal(await page.locator('.game-card').getAttribute('data-game'), 'werewolf');
    await page.locator('[data-filter="card"]').click();
    assert.equal(await page.locator('.game-card').count(), 3);
    await page.locator('#search').fill('tien len');
    assert.equal(await page.locator('.game-card').count(), 1);
    assert.equal(await page.locator('.game-card').getAttribute('data-game'), 'tienlen');
    assert.deepEqual(errors, []);
    report.runs.push({ engine, offline: true, games }); save();
    console.log(`PASS ${engine} offline and library filters`);
  } finally { await page.close(); }
}
(async () => {
  save();
  for (const engine of engines) {
    const browser = await { chromium, webkit }[engine].launch({ headless: true, ...(engine === 'chromium' && existsSync(edge) ? { executablePath: process.env.BROWSER_PATH || edge } : {}) });
    report.versions ||= {}; report.versions[engine] = browser.version(); save();
    try {
      if (process.env.TABLE_RESPONSIVE_ONLY !== '1') await offline(browser, engine);
      for (const id of games) {
        if (process.env.TABLE_RESPONSIVE_ONLY !== '1') await run(browser, engine, id, { width: 1366, height: 900 }, true);
        if (process.env.TABLE_FUNCTIONAL_ONLY !== '1') for (const profile of profiles) await run(browser, engine, id, profile, false);
      }
    } finally { await browser.close(); }
  }
  console.log(`Table game checks passed: ${report.runs.length} runs. ${join(output, 'results.json')}`);
})().catch(error => { report.error = error.stack || String(error); save(); console.error(error); process.exitCode = 1; });
