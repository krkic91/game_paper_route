/* Real WebGL integration checks. Optional: requires Playwright and npm start. */
'use strict';
const assert=require('node:assert/strict');
const {existsSync,mkdirSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {tmpdir}=require('node:os');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const shots=process.env.SCREENSHOTS_3D||join(tmpdir(),'tram-choi-3d-screenshots');mkdirSync(shots,{recursive:true});
const ids=['caro','ludo','quan','2048','memory','pool','race','snake','breakout','delivery'];
const errors=[];
function watch(page){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
async function open(page,id){
  await page.evaluate(id=>{location.hash=`#play/${id}/3d`;},id);
  await page.waitForFunction(id=>{
    const error=document.querySelector('.three-unavailable');
    if(error)throw new Error(error.textContent);
    return document.querySelector('#game-stage')?.dataset.edition==='3d'&&window.Arcade3D?.diagnostics?.().some(scene=>scene.id===id&&scene.triangles>100);
  },id,{timeout:30000});
  await page.locator('.three-canvas').waitFor({state:'visible'});
}
async function close(page){
  await page.evaluate(()=>{window.__oldGL=document.querySelector('.three-canvas')?.getContext('webgl2');});
  await page.locator('#close-game').click();await page.locator('#player-dialog').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.Arcade3D.diagnostics?.().length||0),0,'GPU scene must be released on close');
  assert.ok(await page.evaluate(()=>!window.__oldGL||window.__oldGL.isContextLost()),'old GPU context must actually be released');
  await page.evaluate(()=>{delete window.__oldGL;});
}
async function pick(page,key){
  const target=await page.evaluate(key=>window.Arcade3D.diagnostics()[0].targets.find(t=>t.key===key),key);
  assert.ok(target,`${key} must be a legal raycast target`);await page.mouse.click(target.x,target.y);
}
async function preview(page,name){
  await page.addStyleTag({content:'.intro-overlay{visibility:hidden!important}'});
  await page.waitForTimeout(120);await page.screenshot({path:join(shots,`${name}.png`)});
  await page.locator('style').last().evaluate(el=>el.remove());
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||(existsSync(edge)?edge:undefined)});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:950},reducedMotion:'reduce'});
    const page=await context.newPage();watch(page);await page.goto(base);await page.locator('.game-card').first().waitFor();
    assert.equal(await page.evaluate(()=>typeof window.TramThree),'undefined','3D library is lazy, not loaded by 2D home');
    assert.equal(await page.locator('.card-editions [data-edition="3d"]').count(),10);
    await page.locator('.library-edition-row [data-library-edition="3d"]').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('library-is-3d')),true);
    await page.screenshot({path:join(shots,'library.png'),fullPage:true});
    for(const id of ids){await open(page,id);const info=await page.evaluate(()=>window.Arcade3D.diagnostics()[0]);console.log(`${id}: ${info.calls} draw calls, ${info.triangles} triangles, ${info.geometries} geometries`);await preview(page,`desktop-${id}`);await close(page);}

    await open(page,'caro');await pick(page,'cell-112');
    await page.waitForFunction(()=>document.querySelector('[data-stat="moves"]').textContent==='2');
    await page.locator('[data-camera="top"]').click();await page.locator('[data-camera="in"]').click();
    const free=await page.evaluate(()=>window.Arcade3D.diagnostics()[0].targets.find(t=>/^cell-11[0-9]$/.test(t.key)).key);await pick(page,free);
    await page.waitForFunction(()=>document.querySelector('[data-stat="moves"]').textContent==='4');
    await page.locator('.game-mode select').selectOption('local');await page.locator('[data-camera="reset"]').click();
    for(const i of [0,15,1,16,2,17,3,18,4])await pick(page,`cell-${i}`);
    await page.locator('.result-overlay').waitFor();assert.equal(await page.locator('#game-best').textContent(),'100');
    await page.locator('[data-player-edition="2d"]').click();await page.locator('.caro-board').waitFor({state:'visible'});
    assert.equal(await page.locator('#game-best').textContent(),'0','3D points do not overwrite 2D records');assert.equal(await page.evaluate(()=>window.Arcade3D.diagnostics().length),0);
    await page.locator('[data-player-edition="3d"]').click();await page.locator('.three-canvas').waitFor();assert.equal(await page.locator('#game-best').textContent(),'100');await close(page);

    await open(page,'ludo');await page.evaluate(()=>{window.__savedRandom=Math.random;Math.random=()=>.999;});
    await page.locator('[data-roll]').click();await pick(page,'horse-0-0');
    await page.waitForFunction(()=>document.querySelector('[data-owner="0"][data-token="0"]').getAttribute('aria-label').includes('bước 1'));
    await page.evaluate(()=>{Math.random=window.__savedRandom;});await close(page);
    await open(page,'quan');await pick(page,'pit-7');await page.locator('[data-sow="right"]').click();
    await page.waitForFunction(()=>document.querySelector('.game-status').textContent.includes('Lượt Bạn.'));await close(page);
    await open(page,'2048');await page.locator('.three-canvas').focus();
    for(const key of['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'])await page.keyboard.press(key);
    assert.ok(Number(await page.locator('[data-stat="moves"]').textContent())>0);await close(page);
    await open(page,'memory');const cards=await page.locator('.card-front').allTextContents();
    for(const symbol of new Set(cards)){for(const i of cards.flatMap((c,i)=>c===symbol?[i]:[]))await pick(page,`card-${i}`);}
    await page.locator('.result-overlay').waitFor();assert.equal(await page.locator('[data-stat="pairs"]').textContent(),'8 / 8');await close(page);
    await open(page,'pool');await page.locator('[data-shoot]').click();assert.equal(await page.locator('[data-stat="shots"]').textContent(),'1');
    await page.locator('#pause-game').click();const frames=await page.evaluate(()=>window.Arcade3D.diagnostics()[0].frames);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.Arcade3D.diagnostics()[0].frames),frames);await page.locator('#resume-game').click();
    await page.waitForFunction(()=>!document.querySelector('[data-shoot]').disabled,null,{timeout:30000});await close(page);
    await open(page,'race');await page.locator('[data-start]').click();await page.keyboard.down(' ');await page.waitForTimeout(600);await page.keyboard.up(' ');assert.ok(Number(await page.locator('[data-stat="distance"]').textContent())>0);await close(page);
    await open(page,'snake');await page.locator('[data-start]').click();await page.locator('.result-overlay').waitFor({timeout:15000});await page.locator('#restart-game').click();await page.locator('[data-start]').waitFor();await close(page);
    await open(page,'breakout');await page.locator('[data-start]').click();await page.waitForTimeout(300);assert.equal(await page.locator('[data-launch]').isDisabled(),true);await close(page);
    await open(page,'delivery');await page.locator('[data-start]').click();await page.keyboard.press('Space');
    await page.waitForFunction(()=>Number(document.querySelector('[data-stat="score"]').textContent)>=100,null,{timeout:15000});
    assert.equal(await page.locator('[data-stat="papers"]').textContent(),'35');await close(page);

    await open(page,'2048');await page.locator('.three-canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.locator('.three-unavailable').waitFor();assert.equal(await page.evaluate(()=>window.Arcade3D.diagnostics().length),0);await page.locator('[data-retry-3d]').click();await page.locator('.three-canvas[data-rendered="true"]').waitFor();await close(page);
    await context.close();

    const delayedContext=await browser.newContext();const delayed=await delayedContext.newPage();watch(delayed);
    await delayed.route('**/vendor/three-r180.min.js',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue();});
    await delayed.goto(base);await delayed.evaluate(()=>{location.hash='#play/caro/3d';});await delayed.locator('.three-loading').waitFor();await close(delayed);
    await delayed.waitForTimeout(1200);assert.equal(await delayed.locator('.three-canvas').count(),0);assert.equal(await delayed.locator('#player-dialog').isVisible(),false);
    await open(delayed,'caro');await close(delayed);await delayedContext.close();

    const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
    const mobile=await mobileContext.newPage();watch(mobile);await mobile.goto(base);
    for(const id of ids){await open(mobile,id);assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await mobile.locator('.stage-wrapper').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await preview(mobile,`mobile-${id}`);await close(mobile);}
    await open(mobile,'2048');const touch=await mobileContext.newCDPSession(mobile),rect=await mobile.locator('.three-canvas').boundingBox();
    for(const direction of[-1,1]){const x=rect.x+rect.width/2-direction*55,y=rect.y+rect.height/2;await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+direction*110,y}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    assert.ok(Number(await mobile.locator('[data-stat="moves"]').textContent())>0);await touch.detach();await close(mobile);
    for(const viewport of[{width:320,height:740},{width:844,height:390},{width:1280,height:720}]){
      await mobile.setViewportSize(viewport);
      for(const id of['ludo','pool','delivery']){await open(mobile,id);assert.ok(await mobile.locator('.stage-wrapper').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.ok(await mobile.locator('.three-camera-bar').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await close(mobile);}
    }
    await mobileContext.close();

    const unavailable=await browser.newContext();await unavailable.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});
    const blocked=await unavailable.newPage();watch(blocked);await blocked.goto(`${base}/#play/caro/3d`);await blocked.locator('.three-unavailable').waitFor();await blocked.locator('.three-unavailable [data-edition="2d"]').click();await blocked.locator('.caro-board').waitFor();await blocked.locator('[data-cell="112"]').click();await blocked.waitForFunction(()=>document.querySelector('[data-stat="moves"]').textContent==='2');await unavailable.close();
    const offline=await browser.newPage({viewport:{width:1100,height:800},reducedMotion:'reduce'});watch(offline);await offline.goto(pathToFileURL(resolve(__dirname,'../index.html')).href);await open(offline,'memory');await pick(offline,'card-0');assert.equal(await offline.locator('.memory-card.is-open').count(),1);await close(offline);await offline.close();
    assert.deepEqual(errors,[],'No browser/GL shader errors');
    console.log(`3D integration passed: 10 WebGL games, raycasting, shared gameplay, separate records, GPU cleanup, context recovery, mobile swipes, unsupported GPU fallback, and file://. Screenshots: ${shots}`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
