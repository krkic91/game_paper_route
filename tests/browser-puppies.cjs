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
function watch(page, errors) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
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
  assert.ok(Number.isInteger(size) && size >= 5 && size <= 8);
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

async function desktop(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], page = await context.newPage();
  watch(page, errors);
  try {
    await open(page);
    assert.equal(await page.locator('.puppies-cell').count(), 25);
    const solution = solveRegions(await regions(page));
    const wrong = Array.from({ length: 25 }, (_, i) => i).find(i => !solution.includes(i));
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

    await action(page, 'hint').click();
    await value(page, solution[0], 'dog');
    await action(page, 'undo').click();
    await value(page, solution[0], 'empty');
    await page.locator('#pause-game').click();
    await page.keyboard.press('x');
    await page.locator('#resume-game').click();
    assert.equal(await page.locator('[data-puppies-mode="dog"]').getAttribute('aria-pressed'), 'true');

    await page.locator('#restart-game').click();
    await lives(page, 3);
    assert.equal(await page.locator('.puppies-cell[data-state="marked"]').count(), 0);
    for (let i = 0; i < 3; i++) await cell(page, wrong).click();
    await status(page, 'lost');
    await lives(page, 0);
    assert.equal(await action(page, 'hint').isDisabled(), true);
    await cell(page, solution[0]).click({ force: true });
    await value(page, solution[0], 'empty');
    await action(page, 'next').click();
    await status(page, 'playing');
    await lives(page, 3);

    // Solve all 24 boards using only their public colored grid, exercising win/next/last level.
    for (let number = 1; number <= 24; number++) {
      assert.equal(await page.locator('[data-puppies-level]').inputValue(), String(number));
      const answer = solveRegions(await regions(page));
      for (const index of answer) await cell(page, index).click();
      await status(page, 'won');
      assert.equal(await page.locator('.puppies-cell[data-state="dog"]').count(), answer.length);
      assert.match(await page.locator('[data-puppies-level] option:checked').textContent(), /✓/);
      if (number < 24) await action(page, 'next').click();
    }
    await page.reload();
    await page.locator('.puppies-cell').last().waitFor();
    await status(page, 'won');
    assert.equal(await page.locator('[data-puppies-level]').inputValue(), '24');
    await action(page, 'next').click();
    await status(page, 'playing');
    assert.equal(await page.locator('[data-puppies-level]').inputValue(), '24');
    await level(page, 19);
    checkGrid(await geometry(page), `${engine} desktop`);
    await noOverflow(page, `${engine} desktop`);
    await page.screenshot({ path: join(shots, `${engine}-desktop.png`) });
    await page.setViewportSize({ width: 800, height: 600 });
    await cell(page, 0).focus();
    for (let row = 1; row < 8; row++) await page.keyboard.press('ArrowDown');
    const visible = await cell(page, 56).evaluate(el => {
      const rect = el.getBoundingClientRect(), stage = el.closest('.stage-wrapper').getBoundingClientRect();
      return rect.top >= stage.top - 1 && rect.bottom <= Math.min(stage.bottom, innerHeight) + 1;
    });
    assert.equal(visible, true, 'arrow navigation scrolls the selected cell into view');
    // Bad saved data and unavailable storage should both fall back to a playable first board.
    await page.locator('#close-game').click();
    await page.evaluate(() => localStorage.setItem('tram-choi.puppies.v1', '{broken'));
    await open(page);
    assert.equal(await page.locator('.puppies-cell').count(), 25);
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
    await level(page, 19);
    assert.equal(await page.locator('.puppies-cell').count(), 64);
    const answer = solveRegions(await regions(page));
    await noOverflow(page, label);
    checkGrid(await geometry(page), label);
    const before = await geometry(page);
    await cell(page, answer[0]).tap();
    await value(page, answer[0], 'dog');
    await cell(page, answer[0]).tap();
    await value(page, answer[0], 'empty');
    await page.locator('[data-puppies-mode="mark"]').tap();
    await cell(page, 63).tap();
    await value(page, 63, 'marked');
    await action(page, 'colorblind').tap();
    assert.equal(await cell(page, 63).locator('.puppies-region-label').isVisible(), true);
    await page.locator('[data-puppies-mode="dog"]').tap();
    await cell(page, answer[0]).tap();
    const after = await geometry(page);
    checkGrid(after, label);
    before.forEach((rect, i) => assert.ok(Math.abs(rect.width - after[i].width) < 0.2 && Math.abs(rect.height - after[i].height) < 0.2, `${label}: moves do not change cell dimensions`));
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
      await desktop(browser, engine);
      report.runs.push({ engine, version: browser.version(), viewport: '1440x1000 and 800x600', checks: 'all 24 levels solved, lives, marks, undo, hint, keyboard, pause, replay, next level, persistence, corrupt/unavailable storage', passed: true });
      console.log(`${engine}: desktop interactions and all 24 levels passed`);
      for (const profile of profiles) {
        await mobile(browser, engine, profile);
        report.runs.push({ engine, version: browser.version(), ...profile, checks: '8x8 grid, touch, colorblind labels, stable cell dimensions, no horizontal overflow', passed: true });
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
