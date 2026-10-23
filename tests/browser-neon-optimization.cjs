// version v1.0
'use strict';
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4185';
const folder = process.env.SCREENSHOTS || join(__dirname, '../test-results/neon-optimization');
const report = { environment: 'Headless Windows Chromium/WebKit; simulated tablet, not a physical iOS device.', runs: [] };
mkdirSync(folder, { recursive: true });
const save = () => writeFileSync(join(folder, 'results.json'), JSON.stringify(report, null, 2));
const snapshot = page => page.evaluate(() => ({ gold: meta.gold, shop: { ...meta.shop }, character: selChar, muted, quality }));
async function prepare(page, source) {
  await page.goto(source);
  await page.waitForFunction(() => typeof startRun === 'function');
  await page.evaluate(() => {
    for (const key of Object.keys(sfx)) sfx[key] = () => {};
    ac = () => null;
  });
}
async function persistence(page, source) {
  await prepare(page, source);
  await page.evaluate(() => { meta.gold = 200; saveProgress(); renderMenu(); });
  await page.locator('.char-card').nth(2).click();
  await page.locator('#menu-mute').click();
  await page.locator('#menu .quality-select').selectOption('low');
  await page.locator('#shop-grid .buy').first().click();
  const expected = { gold: 140, shop: { might: 1, vital: 0, swift: 0, greed: 0, magnet: 0 }, character: 2, muted: true, quality: 'low' };
  assert.deepEqual(await snapshot(page), expected, 'real shop purchase updates wallet and upgrade');
  await prepare(page, source);
  assert.deepEqual(await snapshot(page), expected, 'all persistent fields survive full reload');
  assert.equal(await page.locator('#menu .quality-select').inputValue(), 'low');
  assert.equal(await page.locator('.char-card.sel').count(), 1);
  assert.ok(await page.locator('#menu-mute').textContent().then(text => text.includes('Tắt')));
  await page.locator('#btn-start').click();
  assert.equal(await page.evaluate(() => P.dmgMul), 1.05 * 1.05, 'saved shop upgrade affects the next run');
  const collected = await page.evaluate(() => {
    P.weapons = {}; spawnT = eventT = 1000; enemies = []; gems = [];
    coins = [{ x:P.x, y:P.y, age:0 }, { x:P.x, y:P.y, age:0 }];
    update(STEP);
    return { gold:meta.gold, saved:JSON.parse(localStorage.getItem(SAVE_KEY)).gold };
  });
  assert.deepEqual(collected, { gold:142, saved:142 }, 'a batch of pickups is saved before update returns');
  await prepare(page, source);
  assert.equal(await page.evaluate(() => state), 'menu', 'a running battle is not restored');
  assert.equal((await snapshot(page)).gold, 142);
  await page.evaluate(() => localStorage.setItem('tramchoi.library.v1', JSON.stringify({ records: { neon: 99 } })));
  await page.locator('#btn-reset-progress').click();
  await page.locator('#btn-cancel-reset').click();
  assert.equal((await snapshot(page)).gold, 142, 'cancel reset preserves the save');
  await page.locator('#btn-reset-progress').click();
  await page.locator('#btn-confirm-reset').click();
  const empty = { gold:0, shop:{ might:0, vital:0, swift:0, greed:0, magnet:0 }, character:0, muted:false, quality:'auto' };
  assert.deepEqual(await snapshot(page), empty);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tramchoi.library.v1')).records.neon), 99, 'reset does not erase library records');
  await prepare(page, source);
  assert.deepEqual(await snapshot(page), empty, 'confirmed reset survives reload');
}
async function closeImmediately(page) {
  await page.goto(base);
  await page.locator('[data-game="neon"] .cover-play').click();
  let iframe = await (await page.locator('#game-stage iframe').elementHandle()).contentFrame();
  await iframe.waitForFunction(() => typeof startRun === 'function');
  await iframe.evaluate(() => { ac = () => null; for (const key of Object.keys(sfx)) sfx[key] = () => {}; startRun(); });
  await page.evaluate(() => {
    const child = document.querySelector('#game-stage iframe').contentWindow;
    child.eval('P.weapons = {}; spawnT = eventT = 1000; enemies = []; gems = []; coins = [{x:P.x,y:P.y,age:0}]; update(STEP);');
    document.querySelector('#close-game').click();
  });
  assert.equal(await page.locator('#game-stage iframe').count(), 0);
  await page.locator('[data-game="neon"] .cover-play').click();
  iframe = await (await page.locator('#game-stage iframe').elementHandle()).contentFrame();
  await iframe.waitForFunction(() => typeof meta !== 'undefined');
  assert.equal(await iframe.evaluate(() => meta.gold), 1, 'closing in the same task as collection cannot drop the coin');
}
async function invalidStorage(page, source) {
  await prepare(page, source);
  const cases = await page.evaluate(() => {
    const valid = { version:1, gold:80, shop:{ might:1, vital:1, swift:1, greed:1, magnet:1 }, character:1, muted:true, quality:'high' };
    const invalid = ['{', 'null', '[]', '{}', JSON.stringify({ ...valid, version:2 }), JSON.stringify({ ...valid, gold:-1 }), JSON.stringify({ ...valid, gold:1.5 }), JSON.stringify({ ...valid, gold:1000000001 }), JSON.stringify({ ...valid, shop:{ ...valid.shop, vital:6 } }), JSON.stringify({ ...valid, character:3 }), JSON.stringify({ ...valid, muted:'false' }), JSON.stringify({ ...valid, quality:'ultra' })];
    for (const raw of invalid) {
      meta = { gold:0, shop:Object.fromEntries(SHOP.map(s => [s.id,0])) }; selChar = 0; muted = false; quality = 'auto'; saveStatus = 'ready';
      localStorage.setItem(SAVE_KEY, raw); loadProgress();
      if (saveStatus !== 'invalid' || meta.gold !== 0 || selChar !== 0 || Object.values(meta.shop).some(Boolean)) throw new Error('Unsafe save was accepted: ' + raw);
    }
    syncSettings(); renderMenu();
    return invalid.length;
  });
  assert.equal(cases, 12);
  assert.ok(await page.locator('.save-status').first().textContent().then(text => text.includes('không hợp lệ')));
  await page.locator('.char-card').nth(1).click();
  await prepare(page, source);
  assert.equal(await page.evaluate(() => saveStatus), 'ready', 'a new valid save recovers from corrupted storage');
  assert.equal(await page.evaluate(() => selChar), 1);
  return { invalidSaveCases:cases };
}
async function blockedStorage(page, source) {
  await page.addInitScript(() => {
    for (const method of ['getItem','setItem']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (key, ...args) {
        if (key === 'tramchoi.neon.v1') throw new DOMException('Storage disabled for test', 'SecurityError');
        return original.call(this, key, ...args);
      };
    }
  });
  await prepare(page, source);
  assert.equal(await page.evaluate(() => saveStatus), 'unavailable');
  await page.locator('.char-card').nth(2).click();
  await page.locator('#btn-start').click();
  const result = await page.evaluate(() => {
    P.weapons = {}; spawnT = eventT = 1000;
    coins = [{ x:P.x, y:P.y, age:0 }]; update(STEP);
    quitToMenu();
    return { gold:meta.gold, state, character:selChar, saveStatus };
  });
  assert.deepEqual(result, { gold:1, state:'menu', character:2, saveStatus:'unavailable' }, 'blocked storage must not block gameplay');
  assert.ok(await page.locator('.save-status').first().textContent().then(text => text.includes('Không thể lưu')));
}
async function mechanics(page, source) {
  await prepare(page, source);
  return page.evaluate(() => {
    const check = (condition, description) => { if (!condition) throw new Error(description); };
    const same = (left, right, description) => check(JSON.stringify(left) === JSON.stringify(right), description);
    let seed = 271828;
    const random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
    startRun(); P.weapons = {}; spawnT = eventT = 10000; enemies = [];
    // Independent full scans, including negative grid coordinates, exact cell
    // edges, equal distances, mixed body radii and large-area fallbacks.
    for (let i=0; i<320; i++) enemies.push({ id:i, x:(random()-.5)*4096, y:(random()-.5)*4096, r:[10,13,24,46,78.2][i%5] });
    for (const x of [-256,-128,0,128,256]) for (const delta of [-.00001,0,.00001]) enemies.push({ id:enemies.length, x:x+delta, y:128, r:46 });
    enemies.push({ id:enemies.length, x:-10, y:0, r:13 }, { id:enemies.length+1, x:10, y:0, r:13 });
    gridDirty = true;
    let queries = 0;
    const queryPoints = [[0,0,10],[-128,128,0],[128,128,46],[0,0,100000]];
    for (let i=0; i<220; i++) queryPoints.push([(random()-.5)*4096,(random()-.5)*4096,[0,5,16,78,150,360,560,640][i%8]]);
    for (const [x,y,r] of queryPoints) {
      for (const body of [true,false]) {
        const overlaps = e => (e.x-x)**2+(e.y-y)**2 < (r+(body?e.r:0))**2;
        same(nearbyEnemies(x,y,r,body).filter(overlaps).map(e=>e.id),enemies.filter(overlaps).map(e=>e.id),'Grid differs from brute-force overlap/order');
        queries++;
      }
      let expected = null, best = r*r;
      for (const enemy of enemies) { const d=(enemy.x-x)**2+(enemy.y-y)**2; if(d<best){ expected=enemy; best=d; } }
      check(nearestEnemy(x,y,r) === expected,'Nearest target/tie differs from brute force');
      queries++;
    }
    // Positions and membership change between fixed updates; rebuilding must
    // include new spawns and exclude removed/moved bodies on the next query.
    enemies[0].x=0; enemies[0].y=0; enemies.splice(1,8); gridDirty=true;
    check(nearestEnemy(0,0,1)===enemies[0],'Moved target not reflected after rebuild');
    enemies=[]; gridDirty=true;
    check(nearbyEnemies(0,0,10).length===0 && nearestEnemy(0,0,10)===null,'Empty grid');

    const simulate = (hz, seconds) => {
      startRun(); P.weapons={}; P.invuln=1000; spawnT=eventT=10000; keys.d=true;
      pendingPulses=[{left:.22,weapon:{lvl:5}}];
      for(let i=0;i<hz*seconds;i++) advanceSimulation(1/hz);
      return { time:runTime, x:P.x, pulses:pendingPulses.length };
    };
    const reference=simulate(60,6);
    for(const hz of [120,30,20,10]) {
      const actual=simulate(hz,6);
      check(Math.abs(actual.time-reference.time)<1e-8 && Math.abs(actual.x-reference.x)<1e-6,'Gameplay speed differs at '+hz+' FPS');
      check(actual.pulses===0,'Delayed pulse did not run in simulation time');
    }
    startRun(); P.weapons={}; spawnT=eventT=10000; keys.d=true;
    advanceSimulation(10);
    check(runTime<=.2500001 && runTime>=.24999,'Stalled frame catch-up must be bounded to 250ms');
    pauseGame(); const pausedX=P.x, pausedTime=runTime; pendingPulses=[{left:.22,weapon:{lvl:5}}];
    advanceSimulation(20);
    check(runTime===pausedTime && P.x===pausedX && pendingPulses[0].left===.22,'Pause consumed time or delayed pulse');
    resumeGame(); check(lastTs===null && accumulator===0,'Resume must discard pre-pause time');
    hostPaused=true; advanceSimulation(20);
    check(runTime===pausedTime,'Host pause advanced simulation');
    hostPaused=false; resetClock();

    // Instrument existing functions only in this test context; no production hooks.
    const originalDraw=draw; let drawCount=0; draw=()=>{ drawCount++; originalDraw(); };
    let timestamp=1000; state='playing'; resetClock(); loop(timestamp);
    pauseGame(); loop(timestamp+=16); const pausedDraws=drawCount;
    for(let i=0;i<30;i++) loop(timestamp+=16);
    check(drawCount===pausedDraws,'Paused scene repainted continuously');
    resize(); loop(timestamp+=16); check(drawCount===pausedDraws+1,'Paused resize did not repaint');
    for(const scene of ['levelup','over','win']) {
      state=scene; renderDirty=true; loop(timestamp+=16); const before=drawCount;
      for(let i=0;i<20;i++) loop(timestamp+=16);
      check(drawCount===before,scene+' scene repainted continuously');
    }
    state='playing'; hostPaused=true; const beforeHost=drawCount;
    for(let i=0;i<20;i++) loop(timestamp+=16);
    check(drawCount===beforeHost,'Host pause rendered');
    hostPaused=false; draw=originalDraw;

    setQuality('high'); const highDPR=DPR;
    setQuality('low'); check(DPR===1,'Low quality must cap pixel ratio at 1');
    check(highDPR===Math.min(devicePixelRatio,2),'High quality DPR cap changed');
    setQuality('auto'); autoQuality='high'; qualitySlow=qualityFast=0;
    sampleQuality(10,10000); check(effectiveQuality()==='high','Single long stall downgraded quality');
    for(let i=0;i<32;i++) sampleQuality(.2,180);
    check(effectiveQuality()==='low','Sustained 5 FPS did not downgrade automatically');
    for(let i=0;i<730;i++) sampleQuality(1/60,2);
    check(effectiveQuality()==='high','Sustained fast rendering did not recover high quality');
    setQuality('high'); for(let i=0;i<100;i++) sampleQuality(.2,180);
    check(effectiveQuality()==='high','Explicit high quality was overridden');

    // Cached sprites are bounded and only visible entities incur drawImage work.
    startRun(); P.weapons={}; enemies=[]; gems=[]; projs=[]; coins=[]; parts=[]; rings=[]; bolts=[]; floats=[]; ebullets=[]; shake=0;
    setQuality('high'); spriteCache.clear(); draw(); const playerCache=spriteCache.size;
    const originalImage=ctx.drawImage.bind(ctx); let images=0;
    ctx.drawImage=(...args)=>{ images++; originalImage(...args); };
    draw(); const playerImages=images;
    for(let i=0;i<100;i++) { spawnEnemy('drone',100000+i,100000); gems.push({x:100000+i,y:100000,r:5,v:1,age:0}); }
    images=0; draw(); check(images===playerImages,'Offscreen actors still drawn');
    check(spriteCache.size===playerCache,'Offscreen actors still generated sprites');
    enemies=[]; gems=[]; spawnEnemy('brute',100,0);
    images=0; draw(); check(images>playerImages,'Visible enemy missing');
    const cached=spriteCache.size; draw(); check(spriteCache.size===cached,'Sprite cache grows on unchanged frames');
    ctx.drawImage=originalImage;
    const observer=new MutationObserver(()=>{});
    observer.observe(el('hud'),{subtree:true,attributes:true,childList:true,characterData:true});
    updateHUD(); observer.takeRecords(); for(let i=0;i<100;i++) updateHUD();
    check(observer.takeRecords().length===0,'Unchanged HUD still writes DOM'); observer.disconnect();
    return { broadphaseQueries:queries, fixedStepRates:[120,60,30,20,10], staticScenes:['paused','levelup','over','win','hostPause'] };
  });
}
(async () => {
  for (const engine of (process.env.NEON_BROWSERS || 'chromium,webkit').split(',')) {
    const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser=await { chromium, webkit }[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.BROWSER_PATH||(existsSync(edge)?edge:undefined)}:{})});
    try {
      const httpSource=`${base}/Neon%20Survivors.html`, fileSource=pathToFileURL(join(__dirname,'../Neon Survivors.html')).href;
      for(const [name,test,source] of [['persistence-http',persistence,httpSource],['persistence-file',persistence,fileSource],['immediate-close',closeImmediately,httpSource],['invalid-storage',invalidStorage,httpSource],['blocked-storage',blockedStorage,httpSource],['mechanics',mechanics,httpSource]]) {
        const context=await browser.newContext({viewport:{width:820,height:1180},deviceScaleFactor:2});
        const page=await context.newPage(), errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.addInitScript(()=>{ window.requestAnimationFrame=()=>0; });
        report.current=`${engine}-${name}`; save();
        try {
          const details=await test(page,source);
          assert.deepEqual(errors,[],'Browser runtime errors');
          report.runs.push({engine,version:browser.version(),scenario:name,...details}); save();
          console.log(`PASS ${report.current}`);
        } catch(error) {
          await page.screenshot({path:join(folder,`${report.current}-failure.png`)}).catch(()=>{}); throw error;
        } finally {await context.close();}
      }
    } finally {await browser.close();}
  }
  delete report.current; save(); console.log(`Neon optimization checks passed: ${report.runs.length} scenarios.`);
})().catch(error=>{ report.error=error.stack||String(error); save(); console.error(error); process.exitCode=1; });
