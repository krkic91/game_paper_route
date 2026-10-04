// version v1.0
/* Public-UI Sudoku checks. Requires Playwright browsers and a running npm start server. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { chromium, webkit } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const shots = process.env.SCREENSHOTS || join(__dirname, '../test-results/sudoku');
const engines = { chromium, webkit };
const selected = (process.env.SUDOKU_BROWSERS || process.env.SUDOKU_BROWSER || 'chromium,webkit')
  .split(',').map((value) => value.trim()).filter(Boolean);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profiles = [
  { width: 320, height: 740, dpr: 2 },
  { width: 390, height: 844, dpr: 3 },
  { width: 744, height: 1133, dpr: 2 },
  { width: 1024, height: 1366, dpr: 2 },
];
mkdirSync(shots, { recursive: true });
const dismissNextDialog = new WeakSet();

function cell(page, index) { return page.locator(`.sudoku-cell[data-cell="${index}"]`); }
function action(page, name) { return page.locator(`[data-sudoku-action="${name}"]`); }
async function board(page) {
  return page.locator('.sudoku-cell').evaluateAll((cells) => cells.map((el) => ({
    value: Number(el.dataset.value), given: el.getAttribute('aria-readonly') === 'true',
  })));
}

// Independent constraint search reads only displayed clues. The game solution is never accessed.
function solveClues(clues) {
  const values = clues.slice(), solutions = [];
  function candidates(index) {
    const row = Math.floor(index / 9), column = index % 9;
    const used = new Set();
    for (let k = 0; k < 9; k++) {
      used.add(values[row * 9 + k]);
      used.add(values[k * 9 + column]);
      used.add(values[(Math.floor(row / 3) * 3 + Math.floor(k / 3)) * 9 +
        Math.floor(column / 3) * 3 + k % 3]);
    }
    return Array.from({ length: 9 }, (_, k) => k + 1).filter((value) => !used.has(value));
  }
  function search() {
    if (solutions.length >= 2) return;
    let index = -1, options;
    for (let k = 0; k < 81; k++) {
      if (values[k]) continue;
      const available = candidates(k);
      if (!available.length) return;
      if (!options || available.length < options.length) {
        index = k; options = available;
        if (options.length === 1) break;
      }
    }
    if (index < 0) { solutions.push(values.slice()); return; }
    for (const value of options) {
      values[index] = value;
      search();
      if (solutions.length >= 2) break;
    }
    values[index] = 0;
  }
  search();
  assert.equal(solutions.length, 1, 'displayed clues must have exactly one solution');
  return solutions[0];
}

function watch(page, errors) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dismissNextDialog.delete(page) ? dialog.dismiss() : dialog.accept());
}
async function open(page) {
  await page.goto(`${base}/#play/sudoku`);
  await page.locator('.sudoku-cell').last().waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.sudoku-cell').count(), 81);
}
async function value(page, index) { return Number(await cell(page, index).getAttribute('data-value')); }
async function typeValue(page, index, digit) {
  await cell(page, index).click();
  await page.keyboard.press(String(digit));
}
async function gridGeometry(page) {
  return page.locator('.sudoku-cell').evaluateAll((cells) => cells.map((el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return {
      x: r.x, y: r.y, width: r.width, height: r.height,
      right: Number.parseFloat(s.borderRightWidth), bottom: Number.parseFloat(s.borderBottomWidth),
    };
  }));
}
function checkGrid(cells, label) {
  assert.equal(cells.length, 81, `${label}: all cells`);
  const near = (a, b, description) => assert.ok(Math.abs(a - b) <= 0.15,
    `${label}: ${description} (${a} vs ${b})`);
  for (const [index, rect] of cells.entries()) {
    assert.ok(rect.width > 20 && rect.height > 20, `${label}: visible cell ${index}`);
    near(rect.width, rect.height, `square cell ${index}`);
    near(rect.x, cells[index % 9].x, `column ${index}`);
    near(rect.y, cells[Math.floor(index / 9) * 9].y, `row ${index}`);
    if (index % 9) near(cells[index - 1].x + cells[index - 1].width, rect.x, `no gap ${index}`);
    if (index >= 9) near(cells[index - 9].y + cells[index - 9].height, rect.y, `no row gap ${index}`);
  }
  assert.ok(cells[2].right > cells[1].right, `${label}: first vertical 3x3 divider`);
  assert.ok(cells[5].right > cells[4].right, `${label}: second vertical 3x3 divider`);
  assert.ok(cells[18].bottom > cells[9].bottom, `${label}: first horizontal 3x3 divider`);
  assert.ok(cells[45].bottom > cells[36].bottom, `${label}: second horizontal 3x3 divider`);
}
async function noOverflow(page, label) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    `${label}: no horizontal page overflow`);
  assert.ok(await page.locator('.stage-wrapper').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    `${label}: no horizontal stage overflow`);
}

async function desktop(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], page = await context.newPage();
  watch(page, errors);
  try {
    await open(page);
    await page.locator('[data-sudoku-difficulty]').selectOption('easy');
    let initial = await board(page), solution = solveClues(initial.map((c) => c.given ? c.value : 0));
    const given = initial.findIndex((c) => c.given), empty = initial.findIndex((c) => !c.given);
    assert.ok(given >= 0 && empty >= 0);
    await typeValue(page, given, initial[given].value % 9 + 1);
    await page.locator('[data-number="1"]').click();
    assert.equal(await value(page, given), initial[given].value, 'given cannot be overwritten');

    await typeValue(page, empty, solution[empty]);
    assert.equal(await value(page, empty), solution[empty], 'hardware keyboard enters a number');
    await action(page, 'undo').click();
    assert.equal(await value(page, empty), 0, 'undo restores the empty cell');
    await cell(page, empty).click();
    await page.keyboard.press('n');
    assert.equal(await action(page, 'notes').getAttribute('aria-pressed'), 'true');
    await page.locator(`[data-number="${solution[empty]}"]`).click();
    assert.equal(await value(page, empty), 0, 'pencil marks do not become a value');
    assert.ok((await cell(page, empty).textContent()).includes(String(solution[empty])), 'note is visible');
    await action(page, 'erase').click();
    assert.equal((await cell(page, empty).textContent()).trim(), '', 'erase clears notes');
    await action(page, 'undo').click();
    assert.ok((await cell(page, empty).textContent()).includes(String(solution[empty])), 'undo restores notes');
    await cell(page, empty).click();
    await page.keyboard.press('n');
    assert.equal(await action(page, 'notes').getAttribute('aria-pressed'), 'false');
    await page.keyboard.press('Delete');
    assert.equal((await cell(page, empty).textContent()).trim(), '', 'Delete clears notes');

    await typeValue(page, empty, solution[empty] % 9 + 1);
    await action(page, 'check').click();
    assert.equal(await cell(page, empty).getAttribute('aria-invalid'), 'true', 'check marks the incorrect entry');
    await action(page, 'undo').click();
    assert.equal(await value(page, empty), 0);
    await cell(page, empty).click();
    await action(page, 'hint').click();
    assert.equal(await value(page, empty), solution[empty], 'hint fills the selected cell correctly');
    assert.equal(Number(await page.locator('[data-stat="hints"]').textContent()), 1);
    const saved = await board(page);
    await page.reload();
    await page.locator('.sudoku-cell').last().waitFor();
    assert.deepEqual(await board(page), saved, 'reload restores the in-progress puzzle');

    const timer = page.locator('[data-stat="time"]');
    const tick = await timer.textContent();
    await page.waitForFunction((previous) => document.querySelector('[data-stat="time"]').textContent !== previous, tick);
    await page.locator('#pause-game').click();
    const paused = await timer.textContent(), pausedBoard = await board(page);
    await page.keyboard.press('9');
    await page.waitForTimeout(1200);
    assert.equal(await timer.textContent(), paused, 'pause freezes elapsed game time');
    assert.deepEqual(await board(page), pausedBoard, 'paused game ignores number input');
    dismissNextDialog.add(page);
    await page.keyboard.press('r');
    assert.equal(await page.locator('#pause-screen').isVisible(), true, 'cancelling a new puzzle preserves pause');
    assert.deepEqual(await board(page), pausedBoard, 'cancelling a new puzzle preserves progress');
    await page.locator('#resume-game').click();
    await page.waitForFunction((previous) => document.querySelector('[data-stat="time"]').textContent !== previous, paused);
    await page.screenshot({ path: join(shots, `${engine}-desktop.png`) });

    const givens = {};
    for (const difficulty of ['easy', 'medium', 'hard']) {
      await page.locator('[data-sudoku-difficulty]').selectOption(difficulty);
      initial = await board(page);
      solution = solveClues(initial.map((c) => c.given ? c.value : 0));
      givens[difficulty] = initial.filter((c) => c.given).length;
      assert.ok(givens[difficulty] >= 17 && givens[difficulty] < 81);
      const puzzle = initial.map((c) => c.value);
      await page.locator('#restart-game').click();
      assert.equal(await page.locator('[data-sudoku-difficulty]').inputValue(), difficulty, 'restart retains chosen difficulty');
      initial = await board(page);
      assert.notDeepEqual(initial.map((c) => c.value), puzzle, 'restart generates another puzzle');
      solution = solveClues(initial.map((c) => c.given ? c.value : 0));
      assert.equal(await timer.textContent(), '00:00', 'restart resets elapsed time');
    }
    assert.ok(givens.easy > givens.medium && givens.medium > givens.hard,
      'higher difficulty exposes fewer clues');
    const editable = initial.flatMap((entry, index) => entry.given ? [] : [index]);
    const last = editable.pop();
    for (const index of editable) await typeValue(page, index, solution[index]);
    await cell(page, last).click();
    const immediateScore = await page.evaluate(({ index, digit }) => {
      const target = document.querySelector(`.sudoku-cell[data-cell="${index}"]`);
      target.dispatchEvent(new KeyboardEvent('keydown', { key: String(digit), bubbles: true }));
      const score = Number(document.querySelector('#game-best').textContent.replace(/\D/g, ''));
      // Leave in the same task, before the deferred completion animation can run.
      document.querySelector('#close-game').click();
      return score;
    }, { index: last, digit: solution[last] });
    assert.ok(immediateScore > 0, 'the final move credits the score before leaving');
    await page.locator('#player-dialog').waitFor({ state: 'hidden' });
    await open(page);
    await page.locator('.result-overlay').waitFor();
    assert.deepEqual((await board(page)).map((c) => c.value), solution, 'all cells match the independently solved puzzle');
    assert.ok(Number((await page.locator('#game-best').textContent()).replace(/\D/g, '')) > 0, 'completion records a best score');
    await page.screenshot({ path: join(shots, `${engine}-completed.png`) });
    await page.locator('[data-again]').click();
    assert.equal(await page.locator('.result-overlay').count(), 0);
    assert.ok((await board(page)).some((c) => !c.value), 'play again starts an unfinished puzzle');

    await page.goto(base);
    await page.locator('.edition-switch [data-library-edition="3d"]').click();
    const card = page.locator('.game-card[data-game="sudoku"]');
    assert.equal(await card.locator('[data-edition="3d"]').count(), 0, 'Sudoku offers only its supported 2D edition');
    await card.locator('.cover-play').click();
    await page.locator('.sudoku-cell').last().waitFor();
    assert.equal(await page.locator('#game-stage').getAttribute('data-edition'), '2d', 'library 3D preference still opens Sudoku in 2D');
    assert.equal(await page.locator('.player-edition-switch').isVisible(), false, 'Sudoku has no unsupported player edition switch');
    await page.goto(`${base}/#play/sudoku/3d`);
    await page.waitForFunction(() => location.hash === '#play/sudoku');
    assert.equal(await page.locator('.sudoku-cell').count(), 81, 'unsupported 3D deep link normalizes to working Sudoku');
    assert.deepEqual(errors, [], `${engine}: no browser exceptions`);
    console.log(`PASS ${engine} desktop: unique puzzles at three levels, givens, keyboard, notes, undo, check, hint, reload, pause, restart, completion, edition routing`);
  } finally { await context.close(); }
}

async function mobile(browser, engine, profile) {
  const label = `${engine} ${profile.width}x${profile.height} @${profile.dpr}x`;
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: profile.dpr,
    isMobile: true, hasTouch: true, reducedMotion: 'no-preference',
  });
  const errors = [], page = await context.newPage();
  watch(page, errors);
  try {
    await open(page);
    await noOverflow(page, label);
    const initial = await board(page), solution = solveClues(initial.map((c) => c.given ? c.value : 0));
    const before = await gridGeometry(page);
    checkGrid(before, label);
    const empty = initial.findIndex((c) => !c.given);
    await cell(page, empty).tap();
    await page.locator(`[data-number="${solution[empty]}"]`).tap();
    assert.equal(await value(page, empty), solution[empty], `${label}: touch number input`);
    await cell(page, 80).tap();
    assert.equal(await cell(page, 80).getAttribute('aria-selected'), 'true', `${label}: last cell is reachable`);
    const after = await gridGeometry(page);
    checkGrid(after, `${label} selected`);
    after.forEach((rect, index) => {
      for (const key of ['width', 'height', 'right', 'bottom'])
        assert.equal(rect[key], before[index][key], `${label}: selection preserves cell ${index} ${key}`);
    });
    await noOverflow(page, label);
    await page.screenshot({ path: join(shots, `${engine}-${profile.width}x${profile.height}.png`) });
    assert.deepEqual(errors, [], `${label}: no browser exceptions`);
    console.log(`PASS ${label}: 81 aligned cells, 3x3 dividers, touch entry, last cell, stable borders, no overflow`);
  } finally { await context.close(); }
}

(async () => {
  for (const engine of selected) {
    assert.ok(engines[engine], `Unknown Sudoku browser engine: ${engine}`);
    const executablePath = engine === 'chromium'
      ? process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) : undefined;
    const browser = await engines[engine].launch({ headless: true, executablePath });
    try {
      await desktop(browser, engine);
      for (const profile of profiles) await mobile(browser, engine, profile);
    } finally { await browser.close(); }
  }
  console.log(`Sudoku browser checks passed. Screenshots: ${shots}`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
