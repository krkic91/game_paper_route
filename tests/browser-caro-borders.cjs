// version v1.0
/* Requires Playwright, pngjs, installed browsers, and a running npm start server. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const { PNG } = require('pngjs');

const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = path.resolve(process.env.CARO_BORDER_OUTPUT || 'test-results/caro-borders');
const engines = { webkit, chromium };
const selected = (process.env.CARO_BROWSERS || 'webkit,chromium').split(',').map((s) => s.trim());
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sizes = [
  [744, 1133],
  [768, 1024],
  [810, 1080],
  [820, 1180],
  [834, 1194],
  [1024, 1366],
];
const profiles = sizes.flatMap(([width, height]) =>
  ([744, 834, 1024].includes(width) ? [true, false] : [true]).map((isMobile) => ({
    width,
    height,
    isMobile,
    dpr: 2,
  })),
);
const ipadAgent =
  'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const desktopAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

async function geometry(page) {
  return page.locator('.caro-board').evaluate((board) => {
    const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const rect = board.getBoundingClientRect();
    const left = Math.floor(rect.left + scrollX);
    const top = Math.floor(rect.top + scrollY);
    return {
      clip: {
        x: left,
        y: top,
        width: Math.ceil(rect.right + scrollX) - left,
        height: Math.ceil(rect.bottom + scrollY) - top,
      },
      gapColor: rgb(getComputedStyle(board).backgroundColor),
      cells: [...board.querySelectorAll('.caro-cell')].map((cell) => {
        const bounds = cell.getBoundingClientRect();
        const style = getComputedStyle(cell);
        return {
          x: bounds.left + scrollX - left,
          y: bounds.top + scrollY - top,
          width: bounds.width,
          height: bounds.height,
          right: parseFloat(style.borderRightWidth),
          bottom: parseFloat(style.borderBottomWidth),
          rightColor: rgb(style.borderRightColor),
          bottomColor: rgb(style.borderBottomColor),
        };
      }),
    };
  });
}

function missingSegments(png, grid) {
  const scaleX = png.width / grid.clip.width;
  const scaleY = png.height / grid.clip.height;
  const missing = [];
  // At DPR 2, a 1 CSS px line has at least one almost fully covered device pixel.
  // Search across its width to tolerate fractional grid positions/antialiasing;
  // never search along the line, which would hide an actual missing segment.
  const containsLine = (x, y, vertical, color) => {
    const px = x * scaleX;
    const py = y * scaleY;
    const center = vertical ? px : py;
    const radius = 0.8 * (vertical ? scaleX : scaleY);
    for (let cross = Math.floor(center - radius); cross <= Math.ceil(center + radius); cross++) {
      const sx = vertical ? cross : Math.floor(px);
      const sy = vertical ? Math.floor(py) : cross;
      if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) continue;
      const offset = (sy * png.width + sx) * 4;
      const distance = Math.hypot(...color.map((channel, i) => png.data[offset + i] - channel));
      if (distance <= 22 && png.data[offset + 3] === 255) return true;
    }
    return false;
  };
  grid.cells.forEach((cell, index) => {
    const row = Math.floor(index / 15);
    const column = index % 15;
    for (const vertical of [true, false]) {
      if ((vertical && column === 14) || (!vertical && row === 14)) continue;
      const next = grid.cells[index + (vertical ? 1 : 15)];
      const border = vertical ? cell.right : cell.bottom;
      const end = vertical ? cell.x + cell.width : cell.y + cell.height;
      const nextStart = vertical ? next.x : next.y;
      const boundary = border ? end - border / 2 : (end + nextStart) / 2;
      const color = border ? (vertical ? cell.rightColor : cell.bottomColor) : grid.gapColor;
      // Five points in each cell segment avoid glyphs, intersections, and rounded corners.
      for (const portion of [0.18, 0.34, 0.5, 0.66, 0.82]) {
        const x = vertical ? boundary : cell.x + cell.width * portion;
        const y = vertical ? cell.y + cell.height * portion : boundary;
        if (!containsLine(x, y, vertical, color))
          missing.push(`${vertical ? 'vertical' : 'horizontal'} row=${row} col=${column} at=${portion}`);
      }
    }
  });
  return missing;
}

function verifySampler() {
  const png = new PNG({ width: 301, height: 301 });
  const line = [174, 191, 148];
  const fill = [228, 232, 201];
  const paint = (x, y, color) => {
    const offset = (y * png.width + x) * 4;
    png.data.set([...color, 255], offset);
  };
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) paint(x, y, x % 20 === 0 || y % 20 === 0 ? line : fill);
  const grid = {
    clip: { width: 301, height: 301 },
    gapColor: line,
    cells: Array.from({ length: 225 }, (_, index) => ({
      x: 1 + (index % 15) * 20,
      y: 1 + Math.floor(index / 15) * 20,
      width: 20,
      height: 20,
      right: 1,
      bottom: 1,
      rightColor: line,
      bottomColor: line,
    })),
  };
  assert.deepEqual(missingSegments(png, grid), [], 'Sampler accepts intact fractional-band borders');
  for (let y = 145; y < 157; y++) paint(160, y, fill);
  assert.ok(missingSegments(png, grid).length >= 3, 'Sampler must detect a removed border segment');
}

async function capture(page, directory, stage, snapshots) {
  const grid = await geometry(page);
  assert.equal(grid.cells.length, 225, `${stage}: all cells exist`);
  const filename = `${stage}.png`;
  // Page screenshots avoid locator stability waits, allowing capture during transitions.
  const bytes = await page.screenshot({
    path: path.join(directory, filename),
    clip: grid.clip,
    animations: 'allow',
    scale: 'device',
  });
  const png = PNG.sync.read(bytes);
  const missing = missingSegments(png, grid);
  snapshots.push({ stage, filename, width: png.width, height: png.height, missing });
  writeFileSync(path.join(directory, 'snapshots.json'), JSON.stringify(snapshots, null, 2));
  assert.equal(missing.length, 0, `${stage}: ${missing.length} missing line samples: ${missing.slice(0, 12).join('; ')}`);
}

async function checkProfile(browser, engine, profile) {
  const name = `${engine}-${profile.width}x${profile.height}-${profile.isMobile ? 'mobile' : 'desktop'}`;
  const directory = path.join(output, name);
  mkdirSync(directory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.dpr,
    isMobile: profile.isMobile,
    hasTouch: true,
    reducedMotion: 'no-preference',
    userAgent: profile.isMobile ? ipadAgent : desktopAgent,
  });
  try {
    if (process.env.CARO_CSS_FILE) {
      const body = readFileSync(process.env.CARO_CSS_FILE, 'utf8');
      await context.route('**/games/games.css*', (route) =>
        route.fulfill({ contentType: 'text/css', body }),
      );
    }
    const page = await context.newPage();
    const errors = [];
    const snapshots = [];
    const shot = (stage) => capture(page, directory, stage, snapshots);
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/#play/caro`);
    await page.locator('.caro-board').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.game-mode select').selectOption('local');
    await page.locator('.caro-board').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), false);
    await shot('00-empty');
    for (const [number, index] of [112, 113, 127, 128].entries()) {
      await page.locator(`[data-cell="${index}"]`).tap();
      assert.equal(await page.locator('[data-stat="moves"]').textContent(), String(number + 1));
      await shot(`0${number + 1}-tap-${index}`);
    }
    await page.waitForTimeout(220);
    await shot('05-touch-settled');
    await page.locator('[data-cell="97"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.dataset.cell), '97');
    await shot('06-pointer-focus');
    // Rotate this existing session with its moves still present, then interact again.
    await page.setViewportSize({ width: profile.height, height: profile.width });
    await page.locator('.caro-board').scrollIntoViewIfNeeded();
    await shot('07-rotated');
    await page.locator('[data-cell="98"]').tap();
    assert.equal(await page.locator('[data-stat="moves"]').textContent(), '6');
    await shot('08-rotated-tap');
    await page.locator('.game-mode select').selectOption('bot');
    await page.locator('[data-cell="112"]').tap();
    await page.waitForFunction(() => document.querySelectorAll('.mark-o').length === 1);
    await shot('09-bot-reply');
    assert.deepEqual(errors, [], `${name}: no JavaScript errors`);
    console.log(`PASS ${name}: ${snapshots.length} pixel checks, touch, pointer focus, rotation, bot`);
    return { name, status: 'passed', screenshots: snapshots.length };
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    return { name, status: 'failed', error: error.message };
  } finally {
    await context.close();
  }
}

(async () => {
  verifySampler();
  mkdirSync(output, { recursive: true });
  const results = [];
  const widths = process.env.CARO_WIDTHS?.split(',').map(Number);
  for (const engine of selected) {
    assert.ok(engines[engine], `Unknown CARO_BROWSERS engine: ${engine}`);
    const executablePath =
      engine === 'chromium'
        ? process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined)
        : undefined;
    const browser = await engines[engine].launch({ headless: true, executablePath });
    try {
      const queue = profiles.filter((profile) => !widths || widths.includes(profile.width));
      const worker = async () => {
        while (queue.length) results.push(await checkProfile(browser, engine, queue.shift()));
      };
      await Promise.all([worker(), worker()]);
    } finally {
      await browser.close();
    }
  }
  writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((result) => result.status === 'failed');
  console.log(`${results.length - failed.length}/${results.length} border profiles passed. Artifacts: ${output}`);
  assert.ok(results.length > 0, 'At least one profile must run');
  assert.equal(failed.length, 0, 'All border profiles must pass');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
