// version v1.0
/* Public-UI puppy puzzle checks. Requires Playwright and a running npm start server. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium, webkit } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const shots = process.env.SCREENSHOTS || join(__dirname, '../test-results/puppies');
const engines = { chromium, webkit };
const selected = (process.env.PUPPIES_BROWSERS || 'chromium,webkit').split(',').map((s) => s.trim()).filter(Boolean);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profiles = [
  { width: 320, height: 740, dpr: 2 },
  { width: 390, height: 844, dpr: 3 },
  { width: 744, height: 1133, dpr: 2 },
  { width: 1024, height: 1366, dpr: 2 },
  { width: 1180, height: 820, dpr: 2 },
  { width: 844, height: 390, dpr: 3 },
];
mkdirSync(shots, { recursive: true });
const report = { environment: 'Headless browsers on Windows; simulated viewport, DPR and touch, no physical iOS device', runs: [] };

function cell(page, index) { return page.locator(`.puppies-cell[data-cell="${index}"]`); }
function action(page, name) { return page.locator(`[data-puppies-action="${name}"]`); }
function acceptDialog(dialog) { return dialog.accept(); }
function watch(page, errors) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', acceptDialog);
}
async function open(page) {
  await page.goto(`${base}/#play/puppies`);
  await page.locator('.puppies-cell').last().waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function regions(page) {
  return page.locator('.puppies-cell').evaluateAll((cells) => cells.map((el) => Number(el.dataset.region)));
}

// Independently search row permutations from the colored cells displayed by the UI.
// No game logic, answer data, or saved state is used to solve a puzzle.
function solveRegions(map) {
  const size = Math.sqrt(map.length), solutions = [], placement = [], columns = new Set(), colors = new Set();
  assert.ok(Number.isInteger(size) && size >= 5 && size <= 10);
  assert.equal(new Set(map).size, size, 'there is one colored region per row');
  function search(row) {
    if (solutions.length >= 2) return;
    if (row === size) { solutions.push(placement.slice()); return; }
    for (let column = 0; column < size; column++) {
      const index = row * size + column, color = map[index];
      if (columns.has(column) || colors.has(color) || row && Math.abs(column - placement[row - 1] % size) <= 1) continue;
      columns.add(column); colors.add(color); placement.push(index);
      search(row + 1);
      columns.delete(column); colors.delete(color); placement.pop();
    }
  }
  search(0);
  assert.equal(solutions.length, 1, 'displayed regions must have exactly one solution');
  return solutions[0];
}
async function geometry(page) {
  return page.locator('.puppies-cell').evaluateAll((cells) => cells.map((el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
}
function checkGrid(cells, label) {
  const size = Math.sqrt(cells.length);
  const near = (a, b, text) => assert.ok(Math.abs(a - b) <= 0.2, `${label}: ${text} (${a} vs ${b})`);
  for (const [index, rect] of cells.entries()) {
    assert.ok(rect.width >= 24 && rect.height >= 24, `${label}: usable cell ${index}`);
    near(rect.width, rect.height, `square cell ${index}`);
    near(rect.x, cells[index % size].x, `column ${index}`);
    near(rect.y, cells[Math.floor(index / size) * size].y, `row ${index}`);
    near(rect.width, cells[0].width, `consistent width ${index}`);
    if (index % size) assert.ok(rect.x >= cells[index - 1].x + cells[index - 1].width - 0.2, `${label}: no cell overlap`);
  }
}
async function noOverflow(page, label) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no horizontal page overflow`);
  assert.ok(await page.locator('.stage-wrapper').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${label}: no horizontal stage overflow`);
}
async function status(page, expected) {
  assert.equal(await page.locator('.puppies-workspace').getAttribute('data-status'), expected);
}
async function lives(page, remaining) {
  assert.equal(await page.locator('.puppies-lives .is-used').count(), 3 - remaining);
}
async function value(page, index, expected) {
  assert.equal(await cell(page, index).getAttribute('data-state'), expected);
}
async function level(page, number) {
  await page.locator('[data-puppies-level]').selectOption(String(number));
}
function expectedSize(number) {
  return number <= 10 ? 7 : number <= 25 ? 8 : number <= 40 ? 9 : 10;
}
async function levelDetails(page, number) {
  const size = expectedSize(number);
  const name = number <= 10 ? 'Khó' : number <= 25 ? 'Rất khó' : number <= 40 ? 'Chuyên gia' : number <= 60 ? 'Bậc thầy' : number <= 80 ? 'Siêu khó' : 'Thử thách tối thượng';
  assert.equal(await page.locator('.puppies-cell').count(), size ** 2, `level ${number}: board size increases with the difficulty band`);
  const difficulty = page.locator('[data-puppies-difficulty]');
  assert.equal(await difficulty.isVisible(), true, `level ${number}: difficulty is visible`);
  assert.equal(await difficulty.textContent(), `${name} · ${size} × ${size}`, `level ${number}: difficulty describes the current board`);
  assert.equal(await page.locator('.puppies-board').getAttribute('data-size'), String(size));
}
async function completedLevels(page) {
  return page.locator('[data-puppies-level] option').evaluateAll(options => options.filter(option => option.textContent.includes('\u2713')).map(option => Number(option.value)));
}
async function paletteAndLabels(page, size, label) {
  const displayed = await page.locator('.puppies-cell').evaluateAll(cells => cells.map(el => ({
    region: Number(el.dataset.region),
    color: getComputedStyle(el).backgroundColor,
    label: el.querySelector('.puppies-region-label').textContent,
    visible: getComputedStyle(el.querySelector('.puppies-region-label')).display !== 'none',
  })));
  const colors = new Map();
  for (const entry of displayed) {
    assert.equal(entry.label, String.fromCharCode(65 + entry.region), `${label}: the region has its matching letter`);
    assert.equal(entry.visible, true, `${label}: colorblind labels remain visible`);
    assert.notEqual(entry.color, 'rgba(0, 0, 0, 0)', `${label}: regions have a rendered background`);
    if (colors.has(entry.region)) assert.equal(entry.color, colors.get(entry.region), `${label}: region color is consistent`);
    colors.set(entry.region, entry.color);
  }
  assert.equal(colors.size, size, `${label}: all regions are present`);
  assert.equal(new Set(colors.values()).size, size, `${label}: every region has a distinct computed color`);
  assert.deepEqual([...new Set(displayed.map(entry => entry.label))].sort(), Array.from({ length: size }, (_, index) => String.fromCharCode(65 + index)), `${label}: every colorblind letter is present`);
}

// Normalize color names so a mere palette change cannot pass a layout shuffle check.
function regionShape(map) {
  const labels = new Map();
  return map.map(color => {
    if (!labels.has(color)) labels.set(color, labels.size);
    return labels.get(color);
  });
}
function structuralKey(map) {
  const size = Math.sqrt(map.length);
  return Array.from({ length: 8 }, (_, transform) => {
    const moved = Array(map.length);
    map.forEach((color, index) => {
      let row = Math.floor(index / size), column = index % size;
      if (transform >= 4) column = size - column - 1;
      for (let turn = 0; turn < transform % 4; turn++) [row, column] = [column, size - row - 1];
      moved[row * size + column] = color;
    });
    return regionShape(moved).join(',');
  }).sort()[0];
}
async function boardSnapshot(page) {
  return {
    level: await page.locator('[data-puppies-level]').inputValue(),
    difficulty: await page.locator('[data-puppies-difficulty]').textContent(),
    regions: await regions(page),
    cells: await page.locator('.puppies-cell').evaluateAll(cells => cells.map(el => el.dataset.state)),
    usedLives: await page.locator('.puppies-lives .is-used').count(),
    autoMark: await page.locator('[data-puppies-auto-mark]').isChecked(),
    colorblind: await action(page, 'colorblind').getAttribute('aria-pressed'),
  };
}
async function assertRestartShuffles(page, trigger = () => page.locator('#restart-game').click()) {
  const before = await boardSnapshot(page);
  const previousAnswer = solveRegions(before.regions);
  await trigger();
  const after = await boardSnapshot(page);
  const answer = solveRegions(after.regions);
  assert.equal(after.level, before.level, 'a new round keeps the chosen level');
  assert.equal(after.regions.length, before.regions.length, 'a new round keeps the board size');
  assert.equal(after.difficulty, before.difficulty, 'a new round keeps the displayed difficulty');
  assert.notEqual(structuralKey(after.regions), structuralKey(before.regions), 'a new round uses a genuinely different structure, not a rotation, reflection or recoloring');
  assert.notDeepEqual(answer, previousAnswer, 'a new round changes the puppy positions');
  assert.ok(after.cells.every(value => value === 'empty'), 'a new round clears puppies and manual notes');
  assert.equal(after.usedLives, 0);
  assert.equal(after.autoMark, before.autoMark, 'a new round keeps automatic-mark preference');
  assert.equal(after.colorblind, before.colorblind, 'a new round keeps colorblind preference');
  await status(page, 'playing');
  return answer;
}
async function cancelChange(page, trigger) {
  const before = await boardSnapshot(page);
  let dismissed = false;
  const cancel = async dialog => {
    assert.equal(dialog.type(), 'confirm');
    dismissed = true;
    await dialog.dismiss();
  };
  page.off('dialog', acceptDialog);
  page.once('dialog', cancel);
  try { await trigger(); }
  finally {
    page.off('dialog', cancel);
    page.on('dialog', acceptDialog);
  }
  assert.equal(dismissed, true, 'changing a board with progress asks for confirmation');
  assert.deepEqual(await boardSnapshot(page), before, 'cancel keeps the exact board, progress and settings');
}
async function shuffledRounds(page) {
  await page.locator('[data-puppies-auto-mark]').uncheck();
  await action(page, 'colorblind').click();
  assert.equal(await action(page, 'colorblind').getAttribute('aria-pressed'), 'true');
  // Start a new level so its five-template deck begins here, then verify no repeat
  // across the entire first cycle, including a reload halfway through the deck.
  await level(page, 2);
  await level(page, 1);
  const seen = new Set([structuralKey(await regions(page))]);
  let answer;
  for (let round = 1; round < 5; round++) {
    if (round === 2) {
      const before = await boardSnapshot(page);
      await page.reload();
      await page.locator('.puppies-cell').last().waitFor();
      assert.deepEqual(await boardSnapshot(page), before, 'reload keeps the current template in its replay cycle');
    }
    answer = await assertRestartShuffles(page);
    const key = structuralKey(await regions(page));
    assert.equal(seen.has(key), false, 'five successive rounds provide five different puzzle structures');
    seen.add(key);
  }
  assert.equal(seen.size, 5);
  answer = await assertRestartShuffles(page);
  await cell(page, answer[0]).click();
  const note = Array.from({ length: answer.length ** 2 }, (_, i) => i).find(index => !answer.includes(index));
  await page.locator('[data-puppies-mode="mark"]').click();
  await cell(page, note).click();
  const beforeReload = await boardSnapshot(page);
  await page.reload();
  await page.locator('.puppies-cell').last().waitFor();
  assert.deepEqual(await boardSnapshot(page), beforeReload, 'reload preserves the exact shuffled board, puppy, note and settings');
  await cancelChange(page, () => page.locator('#restart-game').click());
  await cancelChange(page, () => level(page, 2));
  await assertRestartShuffles(page);
  await page.locator('[data-puppies-auto-mark]').check();
  await action(page, 'colorblind').click();
}

async function manualExclusions(page, solution) {
  const toggle = page.locator('[data-puppies-auto-mark]');
  assert.equal(await toggle.isChecked(), true);
  await cell(page, solution[0]).click();
  const excluded = Number(await page.locator('.puppies-cell[data-state="blocked"]').first().getAttribute('data-cell'));
  await toggle.uncheck();
  assert.equal(await page.locator('.puppies-cell[data-state="blocked"]').count(), 0);
  await value(page, solution[0], 'dog');
  await value(page, excluded, 'empty');
  await page.locator('[data-puppies-mode="mark"]').click();
  await cell(page, excluded).click();
  await value(page, excluded, 'marked');
  await action(page, 'undo').click();
  await value(page, excluded, 'empty');
  await cell(page, excluded).click();
  await toggle.check(); await value(page, excluded, 'blocked');
  await toggle.uncheck(); await value(page, excluded, 'marked');
  const beforeReload = await boardSnapshot(page);
  await page.reload();
  await page.locator('.puppies-cell').last().waitFor();
  assert.deepEqual(await boardSnapshot(page), beforeReload, 'manual-mode reload preserves the shuffled board and progress');
  assert.equal(await toggle.isChecked(), false);
  await value(page, solution[0], 'dog'); await value(page, excluded, 'marked');
  // In harder play, manually inferred exclusions are editable with keyboard too.
  await cell(page, excluded).focus(); await page.keyboard.press('Delete');
  await value(page, excluded, 'empty');
  await cell(page, excluded).click(); await lives(page, 2);
  await value(page, excluded, 'empty');
  await action(page, 'hint').click();
  assert.equal(await page.locator('.puppies-cell[data-state="dog"]').count(), 2);
  assert.equal(await page.locator('.puppies-cell[data-state="blocked"]').count(), 0);
  await assertRestartShuffles(page);
  assert.equal(await toggle.isChecked(), false);
  await level(page, 2); assert.equal(await toggle.isChecked(), false);
  await level(page, 1); await lives(page, 3);
  await toggle.check();
}

async function legacyMigration(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], page = await context.newPage();
  watch(page, errors);
  const fixtures = [
    [1, 5, '0000001400344243344433444', '41302'],
    [24, 8, '4440000041330023433333234433333344333333666353666666666666666667', '51630427'],
    [50, 10, '1330022244133200224433222222443322244444366622444466655444446666644444666667744466668888446666668899', '3061842579'],
  ];
  try {
    await open(page);
    for (const [number, size, regionText, answerText] of fixtures) {
      const solution = Array.from(answerText, (column, row) => row * size + Number(column));
      const state = { level: number, size, regions: Array.from(regionText, Number), solution,
        dogs: Array(size * size).fill(false), marks: Array(size * size).fill(false),
        lives: 2, hints: 1, mistakes: 1, status: 'playing' };
      state.dogs[solution[0]] = true;
      const note = state.regions.findIndex((_, index) => !solution.includes(index));
      state.marks[note] = true;
      // Dispose the current game before injecting a legacy save; otherwise its
      // pagehide/visibility autosave would correctly overwrite this test fixture.
      await page.locator('#close-game').click();
      await page.evaluate(saved => localStorage.setItem('tram-choi.puppies.v1', JSON.stringify(saved)), {
        state, completed: [1, 24, 50], colorblind: true, autoMark: false,
      });
      await open(page);
      await page.locator('.puppies-cell').last().waitFor();
      assert.deepEqual(await regions(page), state.regions, `legacy level ${number}: exact old layout is preserved`);
      assert.equal(await page.locator('[data-puppies-difficulty]').textContent(), `Ván cũ · ${size} × ${size}`);
      await value(page, solution[0], 'dog');
      await value(page, note, 'marked');
      await lives(page, 2);
      assert.equal(await page.locator('[data-puppies-auto-mark]').isChecked(), false);
      assert.deepEqual(await completedLevels(page), [], 'old achievements do not count as wins on harder upgraded puzzles');
      for (const completed of [1, 24, 50]) assert.match(await page.locator(`[data-puppies-level] option[value="${completed}"]`).textContent(), /◇/);
      await cancelChange(page, () => page.locator('#restart-game').click());
      const legacySnapshot = await boardSnapshot(page);
      await page.reload();
      await page.locator('.puppies-cell').last().waitFor();
      assert.deepEqual(await boardSnapshot(page), legacySnapshot, 'migrated wrapper still resumes the old in-progress board exactly');
      for (const completed of [1, 24, 50]) assert.match(await page.locator(`[data-puppies-level] option[value="${completed}"]`).textContent(), /◇/);
      await page.locator('#restart-game').click();
      await levelDetails(page, number);
      assert.notEqual(structuralKey(await regions(page)), structuralKey(state.regions), 'restarting an old save upgrades its puzzle structure');
      assert.equal(await page.locator('.puppies-cell[data-state="dog"]').count(), 0);
      assert.equal(await page.locator('[data-puppies-auto-mark]').isChecked(), false);
      assert.equal(await action(page, 'colorblind').getAttribute('aria-pressed'), 'true');
      await lives(page, 3);
      const answer = solveRegions(await regions(page));
      await page.evaluate(indices => indices.forEach(index => document.querySelector(`.puppies-cell[data-cell="${index}"]`).click()), answer);
      await status(page, 'won');
      assert.deepEqual(await completedLevels(page), [number]);
      await page.reload();
      await page.locator('.puppies-cell').last().waitFor();
      await status(page, 'won');
      assert.deepEqual(await completedLevels(page), [number], 'upgraded completion badges persist independently of legacy achievements');
      for (const completed of [1, 24, 50].filter(value => value !== number)) assert.match(await page.locator(`[data-puppies-level] option[value="${completed}"]`).textContent(), /◇/);
    }
    assert.deepEqual(errors, [], `${engine}: no browser exceptions during legacy-save migration`);
  } finally { await context.close(); }
}

async function desktop(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], page = await context.newPage();
  watch(page, errors);
  try {
    await open(page);
    assert.equal(await page.locator('.puppies-cell').count(), 49);
    assert.equal(await page.locator('[data-puppies-level] option').count(), 100, 'all 100 levels are available');
    assert.equal(await page.locator('[data-puppies-level]').evaluate(el => getComputedStyle(el).colorScheme), 'light', 'native level selector stays readable on the cream background');
    await manualExclusions(page, solveRegions(await regions(page)));
    await shuffledRounds(page);
    let solution = solveRegions(await regions(page));
    let wrong = Array.from({ length: solution.length ** 2 }, (_, i) => i).find(i => !solution.includes(i));
    await cell(page, wrong).click();
    await lives(page, 2);
    await value(page, wrong, 'empty');
    await cell(page, solution[0]).click();
    await value(page, solution[0], 'dog');
    const blocked = page.locator('.puppies-cell[data-state="blocked"]').first();
    assert.ok(await blocked.count());
    await blocked.click();
    await lives(page, 2);
    await action(page, 'undo').click();
    await value(page, solution[0], 'empty');
    await lives(page, 2);

    // Native button Enter must activate exactly once; arrow navigation uses roving focus.
    await cell(page, 0).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await cell(page, 1).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('x');
    await page.keyboard.press('Enter');
    await value(page, 1, 'marked');
    await action(page, 'undo').click();
    await value(page, 1, 'empty');
    await cell(page, 1).click();
    await value(page, 1, 'marked');
    await action(page, 'colorblind').click();
    assert.equal(await cell(page, 0).locator('.puppies-region-label').isVisible(), true);
    await page.reload();
    await page.locator('.puppies-cell').last().waitFor();
    await value(page, 1, 'marked');
    await lives(page, 2);
    assert.equal(await action(page, 'colorblind').getAttribute('aria-pressed'), 'true');

    const beforeHint = await cell(page, solution[0]).getAttribute('data-state');
    await action(page, 'hint').click();
    await value(page, solution[0], 'dog');
    await action(page, 'undo').click();
    await value(page, solution[0], beforeHint);
    await page.locator('#pause-game').click();
    await page.keyboard.press('x');
    await page.locator('#resume-game').click();
    assert.equal(await page.locator('[data-puppies-mode="dog"]').getAttribute('aria-pressed'), 'true');

    solution = await assertRestartShuffles(page);
    wrong = Array.from({ length: solution.length ** 2 }, (_, i) => i).find(i => !solution.includes(i));
    await lives(page, 3);
    assert.equal(await page.locator('.puppies-cell[data-state="marked"]').count(), 0);
    for (let i = 0; i < 3; i++) await cell(page, wrong).click();
    await status(page, 'lost');
    await lives(page, 0);
    assert.equal(await action(page, 'hint').isDisabled(), true);
    await cell(page, solution[0]).click({ force: true });
    await value(page, solution[0], 'empty');
    await assertRestartShuffles(page, () => action(page, 'next').click());
    await status(page, 'playing');
    await lives(page, 3);

    // Solve every board using only its public colored grid, exercising win/next/last level.
    for (let number = 1; number <= 100; number++) {
      assert.equal(await page.locator('[data-puppies-level]').inputValue(), String(number));
      await levelDetails(page, number);
      const answer = solveRegions(await regions(page));
      // Use public DOM clicks for the bulk progression check. Real mouse and touch
      // interactions are exercised above, at size boundaries and on every profile.
      const realMouse = [10, 11, 25, 26, 40, 41, 50, 51, 60, 61, 80, 81, 100].includes(number);
      await page.evaluate(indices => indices.forEach(index => document.querySelector(`.puppies-cell[data-cell="${index}"]`).click()), realMouse ? answer.slice(0, -1) : answer);
      if (realMouse) await cell(page, answer[answer.length - 1]).click();
      await status(page, 'won');
      assert.equal(await page.locator('.puppies-cell[data-state="dog"]').count(), answer.length);
      assert.match(await page.locator('[data-puppies-level] option:checked').textContent(), /✓/);
      if (number === 50) {
        const oldFinalBoard = await boardSnapshot(page);
        const previouslyCompleted = await completedLevels(page);
        assert.deepEqual(previouslyCompleted, Array.from({ length: 50 }, (_, index) => index + 1));
        await page.reload();
        await page.locator('.puppies-cell').last().waitFor();
        assert.deepEqual(await boardSnapshot(page), oldFinalBoard, 'the previous final level restores exactly after winning');
        await status(page, 'won');
        assert.deepEqual(await completedLevels(page), previouslyCompleted, 'existing completion badges survive reload');
        await action(page, 'next').click();
        assert.equal(await page.locator('[data-puppies-level]').inputValue(), '51', 'a restored win on level 50 advances to level 51');
        assert.deepEqual(await completedLevels(page), previouslyCompleted, 'entering the added levels preserves existing completion badges');
      } else if (number < 100) await action(page, 'next').evaluate(el => el.click());
      if (number % 10 === 0) console.log(`${engine}: solved ${number}/100 levels through the public UI`);
    }
    const completedBoard = await boardSnapshot(page);
    await page.reload();
    await page.locator('.puppies-cell').last().waitFor();
    assert.deepEqual(await boardSnapshot(page), completedBoard, 'reload preserves a completed shuffled board');
    await status(page, 'won');
    assert.equal(await page.locator('[data-puppies-level]').inputValue(), '100');
    assert.deepEqual(await completedLevels(page), Array.from({ length: 100 }, (_, index) => index + 1), 'all completion badges survive reload');
    await assertRestartShuffles(page, () => action(page, 'next').click());
    await status(page, 'playing');
    assert.equal(await page.locator('[data-puppies-level]').inputValue(), '100');
    await paletteAndLabels(page, 10, `${engine} desktop 10x10`);
    checkGrid(await geometry(page), `${engine} desktop`);
    await noOverflow(page, `${engine} desktop`);
    await page.screenshot({ path: join(shots, `${engine}-desktop.png`) });
    await page.setViewportSize({ width: 800, height: 600 });
    await cell(page, 0).focus();
    for (let row = 1; row < 10; row++) await page.keyboard.press('ArrowDown');
    const visible = await cell(page, 90).evaluate(el => {
      const rect = el.getBoundingClientRect(), stage = el.closest('.stage-wrapper').getBoundingClientRect();
      return rect.top >= stage.top - 1 && rect.bottom <= Math.min(stage.bottom, innerHeight) + 1;
    });
    assert.equal(visible, true, 'arrow navigation scrolls the selected cell into view');
    // Bad saved data and unavailable storage should both fall back to a playable first board.
    await page.locator('#close-game').click();
    await page.evaluate(() => localStorage.setItem('tram-choi.puppies.v1', '{broken'));
    await open(page);
    assert.equal(await page.locator('.puppies-cell').count(), 49);
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
      Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
    });
    await page.reload();
    await page.locator('.puppies-cell').last().waitFor();
    await action(page, 'hint').click();
    assert.equal(await page.locator('.puppies-cell[data-state="dog"]').count(), 1);
    assert.deepEqual(errors, [], `${engine}: no browser exceptions`);
  } finally { await context.close(); }
}

async function mobile(browser, engine, profile) {
  const label = `${engine} ${profile.width}x${profile.height} @${profile.dpr}x`;
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.dpr, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const errors = [], page = await context.newPage();
  watch(page, errors);
  try {
    await open(page);
    await level(page, 100);
    await levelDetails(page, 100);
    await page.locator('[data-puppies-auto-mark]').uncheck();
    const answer = solveRegions(await regions(page));
    await noOverflow(page, label);
    checkGrid(await geometry(page), label);
    const before = await geometry(page);
    await cell(page, answer[0]).tap();
    await value(page, answer[0], 'dog');
    assert.equal(await page.locator('.puppies-cell[data-state="blocked"]').count(), 0);
    await cell(page, answer[0]).tap();
    await value(page, answer[0], 'empty');
    await page.locator('[data-puppies-mode="mark"]').tap();
    await cell(page, 99).tap();
    await value(page, 99, 'marked');
    await action(page, 'colorblind').tap();
    assert.equal(await cell(page, 99).locator('.puppies-region-label').isVisible(), true);
    await paletteAndLabels(page, 10, label);
    await page.locator('[data-puppies-mode="dog"]').tap();
    await cell(page, answer[0]).tap();
    const after = await geometry(page);
    checkGrid(after, label);
    before.forEach((rect, i) => assert.ok(Math.abs(rect.width - after[i].width) < 0.2 && Math.abs(rect.height - after[i].height) < 0.2, `${label}: moves do not change cell dimensions`));
    const beforeReload = await boardSnapshot(page);
    await page.reload();
    await page.locator('.puppies-cell').last().waitFor();
    assert.deepEqual(await boardSnapshot(page), beforeReload, `${label}: a 10x10 board restores the exact arrangement, notes and preferences`);
    const replayAnswer = await assertRestartShuffles(page, () => page.locator('#restart-game').tap());
    await cell(page, replayAnswer[0]).tap();
    await value(page, replayAnswer[0], 'dog');
    assert.equal(await page.locator('.puppies-cell[data-state="blocked"]').count(), 0);
    checkGrid(await geometry(page), `${label} shuffled board`);
    await noOverflow(page, label);
    await page.locator('.puppies-workspace').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(shots, `${engine}-${profile.width}x${profile.height}.png`) });
    assert.deepEqual(errors, [], `${label}: no browser exceptions`);
  } finally { await context.close(); }
}

(async () => {
  for (const engine of selected) {
    assert.ok(engines[engine], `Unknown puppy puzzle browser engine: ${engine}`);
    const executablePath = engine === 'chromium' ? process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) : undefined;
    const browser = await engines[engine].launch({ headless: true, executablePath });
    try {
      await legacyMigration(browser, engine);
      report.runs.push({ engine, version: browser.version(), checks: 'old level 1/24/50 saves keep exact layouts, progress and settings; old achievements remain distinct; restarting upgrades the level; new achievements survive reload', passed: true });
      console.log(`${engine}: legacy saves and achievement migration passed`);
      await desktop(browser, engine);
      report.runs.push({ engine, version: browser.version(), viewport: '1440x1000 and 800x600', checks: 'all 100 levels solved through public DOM clicks with real mouse interaction at band boundaries; six difficulty labels, lives, marks, undo, hint, keyboard, pause, five different same-level structures before reuse, cancelled reset/level change, replay after loss/win, restored level 50 win advances to 51 with completion badges, final level 100 replay, exact board/progress/settings persistence, corrupt/unavailable storage', passed: true });
      console.log(`${engine}: desktop interactions, reshuffle/persistence and all 100 levels passed`);
      for (const profile of profiles) {
        await mobile(browser, engine, profile);
        report.runs.push({ engine, version: browser.version(), ...profile, checks: '10x10 grid with cells at least 24px, touch, same-level reshuffle, preserved difficulty preferences, 10 distinct region colors and visible A–J labels, stable cell dimensions, no horizontal overflow', passed: true });
        console.log(`${engine}: ${profile.width}x${profile.height} touch layout passed`);
      }
    } finally { await browser.close(); }
  }
  report.passed = true;
  writeFileSync(join(shots, 'results.json'), JSON.stringify(report, null, 2));
  console.log(`Puppy puzzle browser checks passed. Screenshots: ${shots}`);
})().catch((error) => {
  report.passed = false;
  report.error = error.stack;
  writeFileSync(join(shots, 'results.json'), JSON.stringify(report, null, 2));
  console.error(error); process.exitCode = 1;
});
