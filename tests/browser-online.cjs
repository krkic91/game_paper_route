// version v1.0
/* Optional real-browser integration: install Playwright and run npm start first. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { chromium, webkit } = require('playwright');

const base = (process.env.TEST_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const engine = process.env.ONLINE_BROWSER || 'chromium';
const browserType = { chromium, webkit }[engine];
assert.ok(browserType, 'ONLINE_BROWSER must be chromium or webkit');
const width = Number(process.env.ONLINE_WIDTH || 744);
const height = Number(process.env.ONLINE_HEIGHT || 1133);
const shots = process.env.SCREENSHOTS || join(__dirname, '..', 'test-results', 'online', `${engine}-${width}`);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath = process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined);
mkdirSync(shots, { recursive: true });

async function state(page) {
  return page.evaluate(() => window.CaroOnline.getState());
}
async function waitForMoves(pages, moves) {
  await Promise.all(
    pages.map((page) =>
      page.waitForFunction((moves) => window.CaroOnline?.getState().room?.game.moves === moves, moves),
    ),
  );
  const snapshots = await Promise.all(pages.map(state));
  for (const snapshot of snapshots.slice(1)) {
    assert.deepEqual(snapshot.room.game, snapshots[0].room.game, 'both players see the same board');
    assert.equal(snapshot.room.roundId, snapshots[0].room.roundId, 'both players see the same round');
  }
  for (const page of pages)
    assert.equal(await page.locator('[data-stat="moves"]').textContent(), String(moves));
  return snapshots;
}
async function pressCell(page, index, touch = false) {
  const cell = page.locator(`[data-cell="${index}"]`);
  if (touch) await cell.tap();
  else await cell.click();
}
async function attemptBlockedCell(page, index) {
  const cell = page.locator(`[data-cell="${index}"]`);
  assert.equal(await cell.getAttribute('aria-disabled'), 'true', 'blocked move is exposed to assistive technology');
  // An aria-disabled gridcell remains focusable. Dispatch the DOM click too, so
  // this tests the controller guard rather than Playwright's enabled check.
  await cell.evaluate((button) => button.click());
}
async function openOnline(page, name, url = `${base}/#play/caro`) {
  await page.goto(url);
  await page.locator('.caro-board').waitFor();
  if ((await page.locator('.game-mode select').inputValue()) !== 'online')
    await page.locator('.game-mode select').selectOption('online');
  await page.locator('[data-online-name]').fill(name);
}

(async () => {
  const browser = await browserType.launch({ headless: true, ...(engine === 'chromium' ? { executablePath } : {}) });
  const errors = [];
  const watch = (page, label) => page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  try {
    // Separate contexts deliberately give each person independent cookies,
    // localStorage and sessionStorage, as on two different devices.
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    const tabletContext = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce',
    });
    const outsiderContext = await browser.newContext();
    const a = await desktopContext.newPage();
    const b = await tabletContext.newPage();
    const outsider = await outsiderContext.newPage();
    watch(a, 'desktop');
    watch(b, 'tablet');
    watch(outsider, 'third player');

    await openOnline(a, 'Desktop player');
    await a.locator('[data-online-create]').click();
    await a.waitForFunction(() => Boolean(window.CaroOnline.getState().room));
    const created = await state(a);
    const code = created.room.code;
    assert.match(code, /^[A-Z0-9]{6}$/, 'room uses a short invite code');
    assert.equal(created.room.status, 'waiting');
    assert.equal(created.you.mark, 1, 'creator starts with X');
    assert.ok((await a.locator('[data-online-room-code]').textContent()).includes(code));
    const invite = await a.locator('[data-online-link]').inputValue();
    assert.equal(new URL(invite).hash, `#play/caro?room=${code}`);
    await attemptBlockedCell(a, 112);

    // Following an invite in a tab where Caro is already open also enters the lobby.
    await b.goto(`${base}/#play/caro`);
    await b.locator('.caro-board').waitFor();
    await b.evaluate((hash) => { location.hash = hash; }, new URL(invite).hash);
    await b.waitForFunction(() => document.querySelector('.game-mode select')?.value === 'online');
    await b.locator('[data-online-name]').fill('Tablet player');
    assert.equal(await b.locator('[data-online-code]').inputValue(), code, 'invite prefills the room');
    await b.locator('[data-online-join]').click();
    await b.waitForFunction(() => Boolean(window.CaroOnline.getState().room));
    const joined = await state(b);
    assert.equal(joined.room.code, code);
    assert.equal(joined.you.mark, 2);
    assert.notEqual(joined.session.token, created.session.token, 'each device owns a separate seat token');
    await waitForMoves([a, b], 0);

    await openOnline(outsider, 'Third player', invite);
    await outsider.locator('[data-online-join]').click();
    await outsider.waitForFunction(() => Boolean(window.CaroOnline.getState().error));
    assert.equal((await state(outsider)).room, null, 'a third player cannot take an occupied seat');
    assert.ok((await outsider.locator('[data-online-message]').textContent()).trim(), 'join rejection is visible');

    await a.locator('[data-online-ready]').click();
    await a.waitForFunction(() => !window.CaroOnline.getState().pending);
    assert.equal((await state(a)).room.status, 'waiting', 'one ready player does not start the match');
    await attemptBlockedCell(a, 112);
    await b.locator('[data-online-ready]').tap();
    await Promise.all([a, b].map((page) => page.waitForFunction(() => window.CaroOnline.getState().room?.status === 'playing')));
    await waitForMoves([a, b], 0);

    await attemptBlockedCell(b, 112);
    await pressCell(a, 0);
    await waitForMoves([a, b], 1);
    assert.equal((await state(a)).room.game.board[112], 0, 'out-of-turn tap was not queued');
    await pressCell(b, 15, true);
    await waitForMoves([a, b], 2);
    assert.equal(await a.locator('[data-cell="0"]').getAttribute('class').then((s) => s.includes('mark-x')), true);
    assert.equal(await b.locator('[data-cell="15"]').getAttribute('class').then((s) => s.includes('mark-o')), true);

    const beforeReload = await state(b);
    await b.reload();
    await b.locator('.caro-board').waitFor();
    await b.waitForFunction(() => window.CaroOnline?.getState().connection === 'connected' && Boolean(window.CaroOnline.getState().room));
    const resumed = await state(b);
    assert.equal(resumed.session.token, beforeReload.session.token, 'reload preserves seat ownership');
    assert.deepEqual(resumed.you, beforeReload.you);
    assert.equal(await b.locator('.game-mode select').inputValue(), 'online');
    await waitForMoves([a, b], 2);

    await tabletContext.setOffline(true);
    await b.waitForFunction(() => window.CaroOnline.getState().connection !== 'connected');
    await a.waitForFunction(() => window.CaroOnline.getState().room.players.some((player) => player && !player.connected));
    await attemptBlockedCell(a, 112);
    await a.screenshot({ path: join(shots, 'desktop-opponent-disconnected.png') });
    await tabletContext.setOffline(false);
    await Promise.all([a, b].map((page) => page.waitForFunction(() => {
      const snapshot = window.CaroOnline.getState();
      return snapshot.connection === 'connected' && snapshot.room?.players.length === 2 && snapshot.room.players.every((player) => player?.connected);
    })));
    await waitForMoves([a, b], 2);
    assert.equal((await state(b)).session.token, beforeReload.session.token);
    assert.equal((await state(b)).room.game.board[112], 0, 'disconnected match did not accept moves');

    for (const [move, index] of [1, 16, 2, 17, 3, 18, 4].entries()) {
      const player = move % 2 ? b : a;
      await pressCell(player, index, player === b);
      await waitForMoves([a, b], move + 3);
    }
    const [winnerA, winnerB] = await waitForMoves([a, b], 9);
    assert.equal(winnerA.room.status, 'finished');
    assert.equal(winnerB.room.game.winner, 1);
    assert.equal(await a.locator('.winning-cell').count(), 5);
    assert.equal(await b.locator('.winning-cell').count(), 5);
    await a.screenshot({ path: join(shots, 'desktop-finished.png') });
    await b.screenshot({ path: join(shots, 'tablet-finished.png') });

    // The shell restart control requests a rematch; it must never reset only
    // the requesting client's board or bypass the other person's consent.
    await a.locator('#restart-game').click();
    await a.waitForFunction((version) => window.CaroOnline.getState().room.version > version, winnerA.room.version);
    const requested = await state(a);
    assert.equal(requested.room.roundId, winnerA.room.roundId);
    assert.equal(requested.room.status, 'finished');
    await waitForMoves([a, b], 9);
    await b.locator('[data-online-rematch]').tap();
    await Promise.all([a, b].map((page) => page.waitForFunction((roundId) => {
      const room = window.CaroOnline.getState().room;
      return room?.status === 'playing' && room.roundId !== roundId;
    }, winnerA.room.roundId)));
    const [rematchA, rematchB] = await waitForMoves([a, b], 0);
    assert.equal(rematchA.you.mark, 2, 'creator changes to O in the next round');
    assert.equal(rematchB.you.mark, 1, 'guest changes to X in the next round');

    await a.locator('.game-workspace').focus();
    await a.keyboard.press('p');
    assert.equal(await a.locator('#pause-screen').isVisible(), false, 'local pause cannot freeze an online match');
    await pressCell(b, 224, true);
    await waitForMoves([a, b], 1);
    assert.equal((await state(b)).room.game.board[224], 1, 'touching the last row works below the room panel');

    // Opt in where headless WebGL is available. The network session should
    // survive replacing the board renderer in either direction.
    if (process.env.ONLINE_TEST_3D === '1') {
      const beforeEdition = await state(a);
      await a.locator('[data-player-edition="3d"]').click();
      await a.locator('.caro-workspace canvas').waitFor();
      const in3D = await state(a);
      assert.equal(in3D.session.token, beforeEdition.session.token);
      assert.equal(in3D.room.roundId, beforeEdition.room.roundId);
      assert.deepEqual(in3D.room.game, beforeEdition.room.game);
      await a.screenshot({ path: join(shots, 'desktop-online-3d.png') });
      await a.locator('[data-player-edition="2d"]').click();
      await a.locator('.caro-board').waitFor({ state: 'visible' });
      await waitForMoves([a, b], 1);
    }
    await pressCell(a, 15);
    await waitForMoves([a, b], 2);
    // Dismissing the exit confirmation must preserve the seat and current game.
    a.once('dialog', (dialog) => dialog.dismiss());
    await a.locator('#close-game').click();
    assert.equal(await a.locator('#player-dialog').isVisible(), true);
    assert.equal((await state(a)).room.code, code);
    await waitForMoves([a, b], 2);
    await b.locator('.stage-wrapper').evaluate((pane) => { pane.scrollTop = pane.scrollHeight; });
    assert.equal(await b.locator('[data-cell="224"]').isVisible(), true, 'last board row remains reachable below the room panel');
    await b.screenshot({ path: join(shots, 'tablet-rematch.png') });
    assert.equal(await b.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'tablet viewport has no horizontal overflow');

    a.once('dialog', (dialog) => dialog.accept());
    await a.locator('[data-online-leave]').click();
    await a.waitForFunction(() => !window.CaroOnline.getState().room);
    await b.waitForFunction(() => window.CaroOnline.getState().room?.status === 'finished');
    assert.equal((await state(b)).room.game.winner, 1, 'leaving during play forfeits to the opponent');
    await b.locator('[data-online-leave]').tap();
    await b.waitForFunction(() => !window.CaroOnline.getState().room);

    assert.deepEqual(errors, [], 'no uncaught JavaScript errors');
    console.log('Online browser checks passed: independent desktop/tablet players, invite, full room, readiness, synchronized moves, turn guards, reload, offline recovery, win, consented rematch, switched marks, pause and forfeit.');
    console.log(`Screenshots: ${shots}`);
    console.log(`Engine: ${engine} ${browser.version()}; touch viewport: ${width}x${height}, DPR 2`);
    await Promise.all([desktopContext.close(), tabletContext.close(), outsiderContext.close()]);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
