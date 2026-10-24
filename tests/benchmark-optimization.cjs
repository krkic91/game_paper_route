// version v1.0
'use strict';
// Synthetic repeatable comparison, not a measurement on physical iOS hardware.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'test-results/optimization');
const phase = process.argv[2] || 'after';
assert.ok(['before', 'after'].includes(phase));
fs.mkdirSync(folder, { recursive: true });
const snapshots = { 'index.html': 'index-before.html', 'arcade.js': 'arcade-before.js', 'art.js': 'art-before.js', 'games/royal.js': 'royal-before.js', 'Neon Survivors.html': 'neon-before.html' };
const report = {
  phase,
  environment: 'Windows headless browsers; local HTTP, simulated tablet 820x1180 DPR 2. No physical iOS device.',
  method: 'Three fresh contexts for library startup. Fixed seeded synthetic scene; CPU update timing and Canvas draw plus forced 1px readback. Readback costs are included; these are not gameplay FPS.',
  runs: [],
};
const save = () => fs.writeFileSync(path.join(folder, `benchmark-${phase}${process.env.BENCHMARK_SUFFIX || ''}.json`), JSON.stringify(report, null, 2));
const source = name => phase === 'before' && snapshots[name] ? path.join(folder, snapshots[name]) : path.join(root, name);
const initialHtml = fs.readFileSync(source('index.html'), 'utf8');
const assets = [...initialHtml.matchAll(/<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)="([^"]+\.(?:js|css))"/g)].map(m => m[1]);
report.initialAssets = { count: assets.length, bytes: assets.reduce((sum, name) => sum + fs.statSync(source(name)).size, 0), files: assets };
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
  const filename = source(name);
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = fs.readFileSync(filename);
    const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(name)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
const stats = values => {
  values.sort((a, b) => a - b);
  return { medianMs: values[Math.floor(values.length / 2)], p95Ms: values[Math.min(values.length - 1, Math.floor(values.length * .95))], samples: values.length };
};
async function startup(browser, base) {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 });
    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        const observer = new MutationObserver(() => {
          if (document.querySelectorAll('.game-card').length === 28) {
            window.libraryReadyMs = performance.now(); observer.disconnect();
          }
        });
        observer.observe(document, { childList: true, subtree: true });
      });
      await page.goto(base);
      await page.waitForFunction(() => window.libraryReadyMs > 0);
      const library = await page.evaluate(() => ({ readyMs: window.libraryReadyMs, resources: performance.getEntriesByType('resource').filter(r => ['script', 'link'].includes(r.initiatorType)).length, heapBytes: performance.memory?.usedJSHeapSize ?? null }));
      await page.evaluate(() => { window.openStarted = performance.now(); });
      await page.locator('[data-game="neon"] .cover-play').click();
      await page.waitForFunction(() => document.querySelector('#game-stage iframe')?.contentDocument?.querySelectorAll('.char-card').length === 3);
      const openMs = await page.evaluate(() => performance.now() - window.openStarted);
      samples.push({ ...library, neonOpenViaAutomationMs: openMs });
    } finally { await context.close(); }
  }
  return { samples, library: stats(samples.map(s => s.readyMs)), neonOpenViaAutomation: stats(samples.map(s => s.neonOpenViaAutomationMs)) };
}
async function scene(browser, base) {
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.goto(`${base}/Neon%20Survivors.html`);
    await page.waitForFunction(() => typeof startRun === 'function');
    return await page.evaluate(() => {
      // Same scene on both revisions. No level-ups, sound, director events or enemy deaths.
      let seed = 5721;
      Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (const key of Object.keys(sfx)) sfx[key] = () => {};
      muted = true;
      if (typeof setQuality === 'function') setQuality('high');
      startRun();
      P.invuln = 1e9; P.weapons = {}; P.magnetR = 0;
      runTime = 300; spawnT = 1e9; eventT = 1e9;
      for (let i = 0; i < 220; i++) {
        const angle = i * 2.399963, radius = 260 + (i * 47) % 900;
        const e = spawnEnemy(i % 3 === 0 ? 'brute' : 'drone', Math.cos(angle) * radius, Math.sin(angle) * radius);
        e.hp = e.maxHp = 1e9; e.speed = 0;
      }
      for (let i = 0; i < 100; i++) {
        const angle = i * 2.399963, radius = 90 + i * 4;
        projs.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, vx: 0, vy: 0, dmg: 0, r: 5, pierce: 1e9, color: '#22d3ee', kind: 'bolt', life: 1e9 });
      }
      for (let i = 0; i < 300; i++) {
        const a = i * 2.399963, r = 110 + i * 3;
        dropGem(Math.cos(a) * r, Math.sin(a) * r, i % 3 === 0 ? 5 : 1);
      }
      for (let i = 0; i < 100; i++) dropCoin(130 + i * 8, -400 + i * 9);
      const initialCounts = { enemies: enemies.length, projectiles: projs.length, gems: gems.length, coins: coins.length };
      for (let i = 0; i < 12; i++) update(1 / 60);
      const updateTimes = [], drawTimes = [], submissionTimes = [];
      for (let i = 0; i < 80; i++) { const at = performance.now(); update(1 / 60); updateTimes.push(performance.now() - at); }
      draw(); ctx.getImageData(0, 0, 1, 1);
      for (let i = 0; i < 40; i++) {
        const at = performance.now(); draw(); submissionTimes.push(performance.now() - at);
        ctx.getImageData(0, 0, 1, 1); drawTimes.push(performance.now() - at);
      }
      updateHUD();
      const observer = new MutationObserver(() => {});
      observer.observe(document.querySelector('#hud'), { childList: true, subtree: true, attributes: true, characterData: true });
      for (let i = 0; i < 120; i++) updateHUD();
      const unchangedHudMutations = observer.takeRecords().length; observer.disconnect();
      let pausedDraws = 0;
      const originalDraw = draw;
      draw = function () { pausedDraws++; return originalDraw(); };
      pauseGame();
      // Prime the transition; then count redundant static rendering.
      loop(1000); pausedDraws = 0;
      for (let i = 1; i <= 120; i++) loop(1000 + i * (1000 / 60));
      draw = originalDraw;
      const summarize = values => {
        values.sort((a, b) => a - b);
        return { medianMs: values[Math.floor(values.length / 2)], p95Ms: values[Math.floor(values.length * .95)], samples: values.length };
      };
      return { initialCounts, viewport: [VW, VH], dpr: DPR, quality: typeof effectiveQuality === 'function' ? effectiveQuality() : 'original', update: summarize(updateTimes), drawSubmission: summarize(submissionTimes), renderAndReadback: summarize(drawTimes), unchangedHudMutations, staticPauseDrawCalls: pausedDraws };
    });
  } finally { await context.close(); }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const engine of (process.env.BENCHMARK_BROWSERS || 'chromium,webkit').split(',')) {
      const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
      const browser = await { chromium, webkit }[engine].launch({ headless: true, ...(engine === 'chromium' ? { executablePath: process.env.BROWSER_PATH || (fs.existsSync(edge) ? edge : undefined) } : {}) });
      try {
        const run = { engine, version: browser.version(), ...(process.env.BENCHMARK_SCENE_ONLY === '1' ? {} : { startup: await startup(browser, base) }) };
        report.runs.push(run); save(); console.log(`${phase} ${engine}: startup recorded`);
        run.scene = await scene(browser, base); save(); console.log(`${phase} ${engine}: scene recorded`);
      } finally { await browser.close(); }
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { report.error = error.stack; save(); console.error(error); process.exitCode = 1; });
