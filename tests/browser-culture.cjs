'use strict';
const assert=require('node:assert/strict');
const {existsSync,mkdirSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const folder=process.env.SCREENSHOTS||join(__dirname,'../test-results/culture');
const games={xiangqi:'XiangqiLogic',coganh:'ArcadeCoganh',piano:'ArcadePiano',jigsaw:'ArcadeJigsaw'};
const report={environment:'Headless Edge; simulated desktop/mobile touch and file://, not physical devices.',runs:[]};
mkdirSync(folder,{recursive:true});
const state=page=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__cultureState)));
async function press(page,selector,touch=false){const el=page.locator(selector).first();await el.scrollIntoViewIfNeeded();await el[touch?'tap':'click']();}
async function open(page,id,touch){
  await page.evaluate(async({id,api})=>{
    await window.ArcadeLoader.load({id},'2d');const L=window[api],method=id==='xiangqi'?'create':'createGame';
    if(!L.__captured){const original=L[method];L[method]=(...args)=>{window.__cultureState=original(...args);return window.__cultureState;};L.__captured=true;}
  },{id,api:games[id]});
  await press(page,`[data-game="${id}"] .cover-play`,touch);
  await page.locator(id==='xiangqi'?'.royal-xiangqi':`.${id}-workspace`).waitFor();
  if(id!=='xiangqi')await press(page,'[data-start]',touch);
}
async function pause(page){
  await press(page,'#pause-game');await page.locator('#pause-screen').waitFor();const before=await state(page);
  await page.keyboard.press('d');await page.waitForTimeout(200);assert.deepEqual(await state(page),before,'pause must freeze timers, AI and input');
  if(await page.locator('.piano-workspace').count())assert.ok(await page.evaluate(()=>window.__audio.every(a=>a.state!=='running')));
  await press(page,'#resume-game');
}
async function close(page){
  await page.evaluate(()=>{window.__oldState=window.__cultureState;document.querySelector('#close-game').click();window.__oldJSON=JSON.stringify(window.__oldState);});
  await page.waitForTimeout(180);assert.equal(await page.locator('#game-stage').innerHTML(),'');
  assert.ok(await page.evaluate(()=>JSON.stringify(window.__oldState)===window.__oldJSON));
  assert.equal(await page.locator('.jigsaw-drag-ghost').count(),0);
  assert.ok(await page.evaluate(()=>window.__audio.every(a=>a.state==='closed')));
}
async function bounds(page,id){
  const result=await page.evaluate(()=>{const w=document.querySelector('#game-stage .game-workspace'),nodes=[...w.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(e=>e.getClientRects().length&&!e.closest('details:not([open])'));
    return {viewport:innerWidth,doc:document.documentElement.scrollWidth,overflow:w.scrollWidth>w.clientWidth+1,small:nodes.filter(e=>{const r=e.getBoundingClientRect();return r.width<24||r.height<24;}).map(e=>e.outerHTML.slice(0,150))};});
  assert.ok(result.doc<=result.viewport+1,`${id} page overflow ${JSON.stringify(result)}`);assert.equal(result.overflow,false,`${id} workspace overflow`);assert.deepEqual(result.small,[],`${id} tiny targets`);
}
async function xiangqi(page,touch,full){
  await page.locator('[data-royal-mode]').selectOption('local');await page.locator('[data-royal-variant]').selectOption('hidden');
  assert.equal(await page.locator('.royal-covered').count(),30);assert.equal((await state(page)).covered.filter(Boolean).length,30);
  assert.equal(await page.locator('[data-piece="rU"]').count(),15);
  await press(page,'[data-cell="64"]',touch);await press(page,'[data-cell="1"]',touch);
  assert.equal((await state(page)).ply,1);assert.equal(await page.locator('.royal-covered').count(),28);
  assert.equal(await page.locator('.royal-captures > *').count(),1);const after=JSON.stringify(await state(page));
  await press(page,'[data-royal-action="undo"]',touch);assert.equal(await page.locator('.royal-covered').count(),30);
  await press(page,'[data-cell="64"]',touch);await press(page,'[data-cell="1"]',touch);assert.equal(JSON.stringify(await state(page)),after);
  await pause(page);await press(page,'[data-royal-action="undo"]',touch);
  if(full){
    await page.locator('[data-royal-mode]').selectOption('bot');await press(page,'[data-cell="54"]');await press(page,'[data-cell="45"]');await pause(page);
    await page.waitForFunction(()=>window.__cultureState.ply===2);await press(page,'[data-royal-action="undo"]');assert.equal((await state(page)).ply,0);
    await page.locator('[data-royal-first]').selectOption('bot');await page.waitForFunction(()=>window.__cultureState.ply===1);
    assert.ok(await page.locator('[data-royal-action="undo"]').isDisabled());
    await page.locator('[data-royal-variant]').selectOption('standard');await page.waitForFunction(()=>window.__cultureState.ply===1);
    assert.equal(await page.locator('.royal-covered').count(),0);await page.locator('[data-royal-first]').selectOption('human');await page.locator('[data-royal-variant]').selectOption('hidden');
  }
}
async function coganh(page,touch,full){
  assert.equal(await page.locator('[data-coganh-cell]').count(),25);await press(page,'[data-coganh-hint]',touch);
  const m=await page.evaluate(()=>window.ArcadeCoganh.chooseMove(window.__cultureState));
  assert.equal(await page.locator('.coganh-cell.is-hint').count(),2);await press(page,`[data-coganh-cell="${m.to}"]`,touch);
  await pause(page);await page.waitForFunction(()=>window.__cultureState.turn===2);await press(page,'[data-coganh-undo]',touch);assert.equal((await state(page)).turn,0);
  await page.locator('[data-coganh-mode]').selectOption('local');
  if(full){
    await page.evaluate(()=>{const s=window.__cultureState;s.board.fill(0);s.board[17]=1;s.board[11]=s.board[13]=-1;});
    await press(page,'[data-coganh-hint]');await press(page,'[data-coganh-cell="12"]');await page.locator('.result-overlay').waitFor();assert.equal((await state(page)).winner,1);
    await press(page,'[data-again]');await page.locator('[data-coganh-opening]').uncheck();assert.equal((await state(page)).opening,false);await page.locator('[data-coganh-opening]').check();
  }
}
async function piano(page,touch,full){
  assert.equal(await page.locator('[data-piano-lane]').count(),4);
  const lane=(await state(page)).notes[0].lane;
  await page.waitForFunction(()=>window.__cultureState.time>=1.96);
  if(touch)await page.locator(`[data-piano-lane="${lane}"]`).tap();else await page.keyboard.press(['d','f','j','k'][lane]);
  assert.equal((await state(page)).hits,1);assert.ok((await state(page)).score>=60);await pause(page);
  await press(page,'[data-piano-sound]',touch);assert.equal(await page.locator('[data-piano-sound]').getAttribute('aria-pressed'),'false');
  await page.locator('[data-piano-song]').selectOption('breeze');await page.locator('[data-piano-tempo]').selectOption('60');assert.equal((await state(page)).song,'breeze');assert.equal((await state(page)).bpm,60);
  if(full){
    // Advance chart time as a fixture, but hit each note through the real keyboard listener.
    await page.evaluate(()=>{const s=window.__cultureState;for(const n of s.notes){s.time=n.at;window.dispatchEvent(new KeyboardEvent('keydown',{key:['d','f','j','k'][n.lane],bubbles:true}));}});
    await page.locator('.result-overlay').waitFor();assert.equal((await state(page)).won,true);
    await press(page,'[data-again]');await page.evaluate(()=>{window.__cultureState.time=100;});await page.locator('.result-overlay').waitFor();assert.equal((await state(page)).won,false);await press(page,'[data-again]');
  }
}
async function jigsaw(page,touch,full){
  assert.equal(await page.locator('[data-jigsaw-piece]').count(),9);
  await press(page,'[data-jigsaw-piece="0"]',touch);await press(page,'[data-jigsaw-slot="1"]',touch);assert.equal((await state(page)).mistakes,1);
  await press(page,'[data-jigsaw-slot="0"]',touch);assert.equal((await state(page)).count,1);
  await press(page,'[data-jigsaw-hint]',touch);assert.equal((await state(page)).hints,1);await press(page,'[data-jigsaw-slot="1"]',touch);
  await press(page,'[data-jigsaw-preview]',touch);assert.equal(await page.locator('[data-jigsaw-preview]').getAttribute('aria-pressed'),'true');await pause(page);
  if(full){
    // Scroll both the tray and board into one desktop viewport before dragging.
    await page.locator('[data-jigsaw-piece="2"]').scrollIntoViewIfNeeded();
    const a=await page.locator('[data-jigsaw-piece="2"]').boundingBox(),b=await page.locator('[data-jigsaw-slot="2"]').boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});
    assert.equal(await page.locator('.jigsaw-drag-ghost').count(),1);await page.mouse.up();assert.equal((await state(page)).count,3);assert.equal(await page.locator('.jigsaw-drag-ghost').count(),0);
    for(let i=3;i<9;i++){await press(page,`[data-jigsaw-piece="${i}"]`);await press(page,`[data-jigsaw-slot="${i}"]`);}
    await page.locator('.result-overlay').waitFor();assert.equal((await state(page)).score,940);await press(page,'[data-again]');
    await page.locator('[data-jigsaw-scene]').selectOption('ocean');await page.locator('[data-jigsaw-size]').selectOption('5');assert.equal(await page.locator('[data-jigsaw-piece]').count(),25);
    await press(page,'[data-jigsaw-piece="12"]');await press(page,'[data-jigsaw-slot="12"]');assert.equal((await state(page)).count,1);
    // Cancel an active drag by pausing, then verify no stale ghost survives.
    await page.locator('[data-jigsaw-piece="3"]').scrollIntoViewIfNeeded();const c=await page.locator('[data-jigsaw-piece="3"]').boundingBox();
    await page.mouse.move(c.x+c.width/2,c.y+c.height/2);await page.mouse.down();await page.mouse.move(c.x+c.width/2+20,c.y+c.height/2-20);assert.equal(await page.locator('.jigsaw-drag-ghost').count(),1);
    await page.evaluate(()=>document.querySelector('#pause-game').click());assert.equal(await page.locator('.jigsaw-drag-ghost').count(),0);await page.mouse.up();await press(page,'#resume-game');
    await page.locator('[data-jigsaw-size]').selectOption('3');await press(page,'[data-jigsaw-preview]');
  }
}
(async()=>{
  const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||(existsSync(edge)?edge:undefined)});report.browser=browser.version();
  try{for(const [width,source] of [[1366,base],[390,base],[320,base],[390,pathToFileURL(join(__dirname,'../index.html')).href]]){
    const touch=width<1000,full=!touch,context=await browser.newContext({viewport:{width,height:full?1100:844},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
    await page.addInitScript(()=>{window.__audio=[];if(window.AudioContext){const Original=window.AudioContext;window.AudioContext=new Proxy(Original,{construct(Target,args){const a=new Target(...args);window.__audio.push(a);return a;}});}});
    try{
      await page.goto(source);assert.equal(await page.locator('.game-card').count(),41);
      for(const [query,id] of [['co up','xiangqi'],['co ganh','coganh'],['piano','piano'],['jigsaw','jigsaw']]){await page.locator('#search').fill(query);assert.ok(await page.locator(`[data-game="${id}"]`).count());}await page.locator('#search').fill('');
      for(const id of (process.env.CULTURE_GAMES||Object.keys(games).join(',')).split(',')){
        await open(page,id,touch);await ({xiangqi,coganh,piano,jigsaw})[id](page,touch,full);await bounds(page,id);
        await page.locator('.game-workspace').evaluate(el=>el.scrollIntoView({block:'start'}));
        await page.screenshot({path:join(folder,`${id}-${width}-${source.startsWith('file:')?'offline':'http'}.png`)});
        await press(page,'#restart-game',touch);await close(page);assert.deepEqual(errors,[]);
        report.runs.push({id,width,source:source.startsWith('file:')?'file':'http',status:'passed'});writeFileSync(join(folder,'results.json'),JSON.stringify(report,null,2));console.log(`PASS ${id} ${width} ${source.startsWith('file:')?'file':'http'}`);
      }
    }catch(error){await page.screenshot({path:join(folder,'failure.png')});throw error;}finally{await context.close();}
  }}finally{await browser.close();}
  console.log(`Culture games: ${report.runs.length} browser scenarios passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
