'use strict';

// Interactive inspection bridge: each action is chosen by the operator, not a test scenario.
// Append one JSON object per line to manual-commands.jsonl; use action "quit" to close.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { startServer, evidence, edge, chrome } = require('./helpers/caro-browser-server.cjs');

(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  const ledger = path.join(evidence, 'runs.json');
  const runs = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : [];
  const remaining = 1800000 - runs.reduce((sum, item) => sum + item.durationMs, 0);
  if (remaining < 30000) throw new Error('Insufficient approved budget for manual inspection');
  const label = process.env.CARO_MANUAL_LABEL || 'manual';
  if (!/^[a-z0-9-]+$/.test(label) || runs.some(item => item.label === label)) throw new Error('Use a fresh manual evidence label');
  const commands = path.join(evidence, `${label}-commands.jsonl`);
  const transcript = path.join(evidence, `${label}-transcript.jsonl`);
  const shots = path.join(evidence, label);
  fs.mkdirSync(shots, { recursive: true });
  fs.writeFileSync(commands, '');
  const started = Date.now(), browsers = [], contexts = {}, pages = {};
  const events = [];
  let server, quit = false, timedOut = false, count = 0, failed = false;
  const timer = setTimeout(() => { timedOut = true; quit = true; }, Math.min(remaining - 5000, 600000));
  const record = item => {
    const entry = { at: new Date().toISOString(), ...item };
    fs.appendFileSync(transcript, JSON.stringify(entry) + '\n');
    console.log(JSON.stringify(entry));
  };
  async function snapshot(id) {
    for (const [side, page] of Object.entries(pages)) {
      const image = path.join(shots, `${id}-${side}.png`);
      await page.screenshot({ path: image });
      const observed = await page.evaluate(() => {
        const state = window.CaroOnline?.getState();
        return { title: document.title, mode: document.querySelector('.game-mode select')?.value,
          message: document.querySelector('[data-online-message]')?.textContent,
          invite: document.querySelector('[data-online-link]')?.value,
          connection: state?.connection, pending: state?.pending, error: state?.error,
          room: state?.room && { code: state.room.code, status: state.room.status, version: state.room.version,
            moves: state.room.game.moves, turn: state.room.game.turn,
            cells: state.room.game.board.flatMap((mark, i) => mark ? [{ i, mark }] : []),
            players: state.room.players.map(player => player && ({ name: player.name, mark: player.mark, connected: player.connected, ready: player.ready, left: player.left })) } };
      });
      record({ id, side, image, observed });
    }
  }
  try {
    server = await startServer(label);
    for (const [side, executablePath] of [['A', edge], ['B', chrome]]) {
      const browser = await chromium.launch({ executablePath, headless: true });
      browsers.push(browser);
      const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, reducedMotion: 'reduce' });
      contexts[side] = context;
      const page = await context.newPage(); pages[side] = page;
      page.setDefaultTimeout(8000);
      page.on('pageerror', error => events.push({ side, message: error.message }));
      await page.goto(`${server.base}/#play/caro`);
      await page.locator('.caro-board').waitFor();
      record({ side, executablePath, version: browser.version() });
    }
    await snapshot('initial');
    record({ ready: true, commands });
    while (!quit) {
      const lines = fs.readFileSync(commands, 'utf8').split(/\r?\n/).filter(Boolean);
      while (count < lines.length && !quit) {
        const input = JSON.parse(lines[count++]);
        if (!/^[a-z0-9-]+$/.test(String(input.id))) throw new Error('Invalid action id');
        const page = pages[input.side || 'A'];
        record({ input });
        try {
          if (input.acceptDialog) page.once('dialog', dialog => dialog.accept());
          if (input.action === 'select') await page.locator(input.selector).selectOption(input.value);
          else if (input.action === 'fill') await page.locator(input.selector).fill(input.value);
          else if (input.action === 'click') await page.locator(input.selector).click();
          else if (input.action === 'reload') await page.reload();
          else if (input.action === 'offline') await contexts[input.side].setOffline(input.value);
          else if (input.action === 'quit') quit = true;
          else if (input.action !== 'snapshot') throw new Error('Unknown manual action');
          await new Promise(resolve => setTimeout(resolve, 300));
          await snapshot(input.id);
        } catch (error) { record({ id: input.id, error: error.message }); }
      }
      if (!quit) await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) { failed = true; record({ error: error.stack }); }
  finally {
    clearTimeout(timer);
    await Promise.allSettled(browsers.map(browser => browser.close()));
    if (server) await server.stop();
    record({ ended: true, timedOut, pageErrors: events });
    const run = { label, command: 'node tests/caro-manual.cjs (operator-directed actions)',
      startedAt: new Date(started).toISOString(), endedAt: new Date().toISOString(),
      durationMs: Date.now() - started, exitCode: failed || timedOut ? 1 : 0, timedOut,
      log: path.relative(path.resolve(__dirname, '..'), transcript) };
    runs.push(run); fs.writeFileSync(ledger, JSON.stringify(runs, null, 2) + '\n');
    console.log(JSON.stringify({ ...run, totalTestMs: runs.reduce((sum, item) => sum + item.durationMs, 0) }));
    process.exitCode = run.exitCode;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
