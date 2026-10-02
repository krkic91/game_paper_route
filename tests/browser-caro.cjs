// version v1.0
/* Requires Playwright, installed browsers, and a running npm start server. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { chromium, webkit } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const engines = { webkit, chromium };
const selected = (process.env.CARO_BROWSERS || 'webkit,chromium').split(',').map((s) => s.trim());
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profiles = [
  { width: 320, height: 568, dpr: 2 },
  { width: 375, height: 667, dpr: 2 },
  { width: 390, height: 844, dpr: 3 },
  { width: 768, height: 1024, dpr: 2 },
  { width: 1024, height: 1366, dpr: 2 },
  { width: 844, height: 390, dpr: 3 },
];
const tolerance = 0.1; // Allow subpixel track rounding, never a whole CSS pixel.
function near(actual, expected, label, allowed = tolerance) {
  assert.ok(Math.abs(actual - expected) <= allowed, `${label}: ${actual} vs ${expected}`);
}
async function geometry(page) {
  return page.locator('.caro-board').evaluate((board) => {
    const bounds = board.getBoundingClientRect();
    return {
      width: bounds.width,
      height: bounds.height,
      cells: [...board.querySelectorAll('.caro-cell')].map((cell) => {
        const rect = cell.getBoundingClientRect();
        const style = getComputedStyle(cell);
        const left = parseFloat(style.borderLeftWidth);
        const top = parseFloat(style.borderTopWidth);
        // Measure the playable face; a real cell border occupies the gridline.
        return {
          x: rect.x - bounds.x + left,
          y: rect.y - bounds.y + top,
          width: rect.width - left - parseFloat(style.borderRightWidth),
          height: rect.height - top - parseFloat(style.borderBottomWidth),
        };
      }),
    };
  });
}
function checkGrid(board, label) {
  assert.equal(board.cells.length, 225, `${label}: all cells present`);
  near(board.width, board.height, `${label}: square board`);
  board.cells.forEach((cell, index) => {
    assert.ok(cell.width > 0 && cell.height > 0, `${label}: cell ${index} visible`);
    near(cell.width, cell.height, `${label}: cell ${index} square`);
    near(cell.width, board.cells[0].width, `${label}: cell ${index} equal width`);
    near(cell.height, board.cells[0].height, `${label}: cell ${index} equal height`);
    near(cell.y, board.cells[Math.floor(index / 15) * 15].y, `${label}: row alignment`);
    near(cell.x, board.cells[index % 15].x, `${label}: column alignment`);
    if (index % 15) {
      const left = board.cells[index - 1];
      near(cell.x - left.x - left.width, 1, `${label}: vertical gridline ${index}`);
    }
    if (index >= 15) {
      const above = board.cells[index - 15];
      near(cell.y - above.y - above.height, 1, `${label}: horizontal gridline ${index}`);
    }
  });
  near(board.cells[0].x, 1, `${label}: left edge`);
  near(board.cells[0].y, 1, `${label}: top edge`);
  const last = board.cells[224];
  // WebKit can accumulate up to 15 layout-unit roundings at the final edge.
  near(last.x + last.width, board.width - 1, `${label}: right edge`, 0.25);
  near(last.y + last.height, board.height - 1, `${label}: bottom edge`, 0.25);
}
async function unchanged(page, before, label) {
  const after = await geometry(page);
  checkGrid(after, label);
  near(after.width, before.width, `${label}: board width stable`);
  near(after.height, before.height, `${label}: board height stable`);
  after.cells.forEach((cell, index) => {
    for (const key of ['x', 'y', 'width', 'height'])
      near(cell[key], before.cells[index][key], `${label}: cell ${index} ${key} stable`);
  });
}
async function checkProfile(browser, engine, profile) {
  const label = `${engine} ${profile.width}x${profile.height} @${profile.dpr}x`;
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.dpr,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/#play/caro`);
    await page.locator('.caro-board').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.game-mode select').selectOption('local');
    const initial = await geometry(page);
    checkGrid(initial, `${label} empty`);

    // Short landscape clips edge targets behind the header; still measure all cells.
    const moves =
      profile.height < 500 ? [112, 113, 127, 128, 97, 98] : [112, 113, 15, 16, 0, 224];
    for (const [move, index] of moves.entries()) {
      await page.locator(`[data-cell="${index}"]`).tap();
      assert.equal(await page.locator('[data-stat="moves"]').textContent(), String(move + 1));
      assert.equal(
        await page.locator(`[data-cell="${index}"]`).textContent(),
        move % 2 ? '\u25cb' : '\u00d7',
      );
      await unchanged(page, initial, `${label} tap ${index}`);
    }
    await page.locator('#restart-game').tap();
    assert.equal(await page.locator('.mark-x, .mark-o').count(), 0);
    await unchanged(page, initial, `${label} restart`);

    // A hardware keyboard on a tablet must retain navigation and visible focus.
    await page.keyboard.press('Tab');
    await page.locator('.caro-cell[tabindex="0"]').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    const keyboardIndex = String(moves[moves.length - 1] - 16);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.cell), keyboardIndex);
    assert.ok(
      await page.locator(`[data-cell="${keyboardIndex}"]`).evaluate((cell) => {
        const style = getComputedStyle(cell);
        return cell.matches(':focus-visible') && parseFloat(style.outlineWidth) > 0;
      }),
      `${label}: keyboard focus remains visible`,
    );
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(`[data-cell="${keyboardIndex}"]`).textContent(), '\u00d7');
    await unchanged(page, initial, `${label} keyboard move`);

    await page.locator('.game-mode select').selectOption('bot');
    await page.locator('[data-cell="112"]').tap();
    await page.waitForFunction(() => document.querySelectorAll('.mark-o').length === 1);
    assert.equal(await page.locator('[data-stat="moves"]').textContent(), '2');
    await unchanged(page, initial, `${label} bot reply`);
    assert.deepEqual(errors, [], `${label}: no browser errors`);
    console.log(`PASS ${label}: stable grid, touch, keyboard, restart, bot`);
  } finally {
    await context.close();
  }
}
(async () => {
  for (const engine of selected) {
    assert.ok(engines[engine], `Unknown CARO_BROWSERS engine: ${engine}`);
    const executablePath =
      engine === 'chromium'
        ? process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined)
        : undefined;
    const browser = await engines[engine].launch({ headless: true, executablePath });
    try {
      for (const profile of profiles) await checkProfile(browser, engine, profile);
    } finally {
      await browser.close();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
