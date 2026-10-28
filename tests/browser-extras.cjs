'use strict';
const assert=require('node:assert/strict'),{existsSync,mkdirSync,writeFileSync,readFileSync}=require('node:fs'),{join}=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=process.env.TEST_URL||pathToFileURL(join(__dirname,'../index.html')).href,folder=process.env.SCREENSHOTS||join(__dirname,'../test-results/extras');
const games={riddles:'ArcadeRiddles',coloring:'ArcadeColoring',samloc:'ArcadeSamloc',maubinh:'ArcadeMaubinh'};
const report={environment:'Headless Edge, file://, simulated desktop/mobile touch; no physical-device testing. No server required.',runs:[]};mkdirSync(folder,{recursive:true});
const state=page=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__extraState)));
async function press(page,selector,touch=false){const el=page.locator(selector).first();await el.scrollIntoViewIfNeeded();await el[touch?'tap':'click']();}
async function open(page,id,touch){
  await page.evaluate(async({id,api})=>{
    await window.ArcadeLoader.load({id},'2d');const L=window[api];
    if(!L.__captured){const original=L.createGame;L.createGame=(...args)=>{if(id==='samloc'||id==='maubinh'){let seed=21;args[0]={...args[0],random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)};}window.__extraState=original(...args);return window.__extraState;};L.__captured=true;}
  },{id,api:games[id]});
  await press(page,`[data-game="${id}"] .cover-play`,touch);await page.locator(`.${id}-workspace`).waitFor();await press(page,'[data-start]',touch);
}
async function pause(page){await press(page,'#pause-game');await page.locator('#pause-screen').waitFor();const before=await state(page);await page.evaluate(()=>document.querySelector('#game-stage [data-riddle-next],#game-stage [data-color-undo],#game-stage [data-sam-play],#game-stage [data-binh-hint]')?.click());await page.waitForTimeout(200);assert.deepEqual(await state(page),before);await press(page,'#resume-game');}
async function close(page){await page.evaluate(()=>{window.__oldExtra=window.__extraState;document.querySelector('#close-game').click();window.__oldExtraJSON=JSON.stringify(window.__oldExtra);});await page.waitForTimeout(180);assert.equal(await page.locator('#game-stage').innerHTML(),'');assert.ok(await page.evaluate(()=>JSON.stringify(window.__oldExtra)===window.__oldExtraJSON));}
async function bounds(page,id){const r=await page.evaluate(()=>{const w=document.querySelector('.game-workspace'),nodes=[...w.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(e=>e.getClientRects().length&&!e.closest('details:not([open])'));return {doc:document.documentElement.scrollWidth,viewport:innerWidth,overflow:w.scrollWidth>w.clientWidth+1,small:nodes.filter(e=>{const b=e.getBoundingClientRect();return b.width<24||b.height<24;}).map(e=>e.outerHTML.slice(0,150))};});assert.ok(r.doc<=r.viewport+1,`${id} document overflow ${JSON.stringify(r)}`);assert.equal(r.overflow,false,`${id} workspace overflow`);assert.deepEqual(r.small,[],`${id} tiny controls`);}
async function riddles(page,touch,full){
  assert.ok(await page.locator('.riddle-picture').count()>=2);await page.locator('#riddle-answer').fill('zzzz');await press(page,'.riddles-form button',touch);assert.equal((await state(page)).mistakes,1);
  await press(page,'[data-riddle-hint]',touch);await press(page,'[data-riddle-hint]',touch);assert.equal((await state(page)).hints,2);assert.ok(await page.locator('[data-riddle-hint]').isDisabled());
  const answer=await page.evaluate(()=>window.ArcadeRiddles.normalize(window.ArcadeRiddles.current(window.__extraState).answer));await page.locator('#riddle-answer').fill(answer);await page.locator('#riddle-answer').press('Enter');assert.equal((await state(page)).score,50);await pause(page);
  await press(page,'[data-riddle-next]',touch);await press(page,'[data-riddle-skip]',touch);assert.equal((await state(page)).skipped,1);await press(page,'[data-riddle-next]',touch);
  if(full){
    const firstSolved=(await state(page)).solved[0];
    while((await state(page)).phase!=='finished'){const s=await state(page);if(s.phase==='question'){const text=await page.evaluate(()=>window.ArcadeRiddles.current(window.__extraState).answer);await page.locator('#riddle-answer').fill(text);await press(page,'.riddles-form button');}await press(page,'[data-riddle-next]');}
    await page.locator('.result-overlay').waitFor();assert.equal((await state(page)).correct,9);await press(page,'[data-again]');assert.ok(!(await state(page)).order.includes(firstSolved));
    await close(page);await open(page,'riddles',false);assert.ok(!(await state(page)).order.includes(firstSolved));
  }
  await page.locator('[data-riddle-category]').selectOption('idiom');assert.ok((await state(page)).order.every(id=>id.startsWith('idiom-')));
}
async function coloring(page,touch,full){
  assert.equal(await page.locator('[data-color-region]').count(),34);await press(page,'[data-color="#71b8b9"]',touch);await press(page,'[data-color-region="r2"]',touch);assert.equal((await state(page)).colors.r2,'#71b8b9');
  await press(page,'[data-color-undo]',touch);assert.equal((await state(page)).colors.r2,undefined);await press(page,'[data-color-redo]',touch);assert.equal((await state(page)).colors.r2,'#71b8b9');
  await page.locator('[data-color-custom]').fill('#123456');await page.locator('[data-color-region="r3"]').focus();await page.keyboard.press('Enter');assert.equal((await state(page)).colors.r3,'#123456');
  await press(page,'[data-color-erase]',touch);await press(page,'[data-color-region="r2"]',touch);assert.equal((await state(page)).colors.r2,undefined);await press(page,'[data-color-undo]',touch);await pause(page);
  await page.locator('[data-color-scene]').selectOption('ocean');assert.equal(Object.keys((await state(page)).colors).length,0);await page.locator('[data-color-scene]').selectOption('garden');assert.equal((await state(page)).colors.r3,'#123456');
  if(full){
    const download=page.waitForEvent('download');await press(page,'[data-color-download]');const file=await download;await file.saveAs(join(folder,'coloring-export.png'));const bytes=readFileSync(join(folder,'coloring-export.png'));assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),1200);
    await close(page);await open(page,'coloring',false);assert.equal((await state(page)).colors.r3,'#123456');
    await press(page,'[data-color-clear]');assert.equal(Object.keys((await state(page)).colors).length,0);await press(page,'[data-color-undo]');assert.equal((await state(page)).colors.r3,'#123456');
    // Every region is keyboard reachable, including small decorative details.
    await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-color-region]'))el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});
    assert.equal(Object.keys((await state(page)).colors).length,34);assert.equal(await page.locator('#game-best').textContent(),'100');
  }
}
async function samloc(page,touch,full){
  assert.equal(await page.locator('[data-sam-card]').count(),10);assert.equal((await state(page)).phase,'declare');await pause(page);await press(page,'[data-sam-normal]',touch);
  await page.waitForFunction(()=>window.__extraState.phase==='finished'||(window.__extraState.phase==='play'&&window.__extraState.current===0));
  if((await state(page)).phase!=='finished'){
    await press(page,'[data-sam-hint]',touch);const move=await page.evaluate(()=>window.ArcadeSamloc.chooseMove(window.__extraState));
    await press(page,move.type==='pass'?'[data-sam-pass]':'[data-sam-play]',touch);await pause(page);
  }
  if(full){
    for(let n=0;n<40&&(await state(page)).phase!=='finished';n++){
      await page.waitForFunction(()=>window.__extraState.phase==='finished'||window.__extraState.current===0);if((await state(page)).phase==='finished')break;
      await press(page,'[data-sam-hint]');await press(page,await page.locator('[data-sam-play]').isEnabled()?'[data-sam-play]':'[data-sam-pass]');
    }
    await page.locator('.result-overlay').waitFor();await press(page,'[data-again]');assert.equal((await state(page)).phase,'declare');
    await press(page,'[data-sam-call]');await page.waitForFunction(()=>window.__extraState.phase==='play'&&window.__extraState.current===0);assert.equal((await state(page)).caller,0);
    await press(page,'[data-sam-hint]');await press(page,'[data-sam-play]');await pause(page);
  }
}
async function maubinh(page,touch,full){
  assert.equal(await page.locator('[data-binh-card]').count(),13);assert.ok(await page.locator('[data-binh-submit]').isDisabled());const s=await state(page),a=s.hand[0],b=s.hand[1];
  await press(page,`[data-binh-card="${a}"]`,touch);await press(page,'[data-binh-to="0"]',touch);assert.deepEqual((await state(page)).groups[0],[a]);
  await press(page,`[data-binh-card="${a}"]`,touch);await press(page,`[data-binh-card="${b}"]`,touch);assert.deepEqual((await state(page)).groups[0],[b]);
  await press(page,'[data-binh-undo]',touch);assert.deepEqual((await state(page)).groups[0],[a]);await press(page,`[data-binh-card="${a}"]`,touch);await press(page,'[data-binh-return]',touch);assert.deepEqual((await state(page)).groups[0],[]);
  await press(page,'[data-binh-hint]',touch);assert.ok(await page.locator('[data-binh-submit]').isEnabled());assert.equal(await page.locator('[data-binh-bank] [data-binh-card]').count(),0);await pause(page);
  if(full){
    // Swap a valid front/back layout into an invalid fixture, then use a real
    // selection event to refresh the preview and verify submission is blocked.
    await page.evaluate(()=>{const s=window.__extraState;[s.groups[1],s.groups[2]]=[s.groups[2],s.groups[1]];});
    await press(page,`[data-binh-card="${a}"]`);const valid=await page.evaluate(()=>window.ArcadeMaubinh.validate(window.__extraState.hand,window.__extraState.groups).ok);assert.equal(await page.locator('[data-binh-submit]').isEnabled(),valid);
    await press(page,'[data-binh-hint]');await press(page,'[data-binh-submit]');await page.locator('[data-binh-results]').waitFor();assert.equal((await state(page)).phase,'finished');assert.equal(await page.locator('.binh-reveal').count(),3);
    assert.equal((await state(page)).result.points.reduce((a,b)=>a+b,0),0);await press(page,'.binh-reveal summary');assert.equal(await page.locator('.binh-reveal').first().locator('.vn-card').count(),13);
    await page.screenshot({path:join(folder,'maubinh-result.png')});await press(page,'[data-binh-again]');assert.equal((await state(page)).groups.flat().length,0);await press(page,'[data-binh-hint]');
  }
}
(async()=>{
  const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||(existsSync(edge)?edge:undefined)});report.browser=browser.version();
  try{for(const width of [1366,390,320]){
    const touch=width<1000,full=!touch,context=await browser.newContext({viewport:{width,height:full?1100:844},hasTouch:touch,isMobile:touch,reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
    try{
      await page.goto(source);assert.equal(await page.locator('.game-card').count(),41);
      for(const [category,count] of [['card',6],['puzzle',11]]){await press(page,`[data-filter="${category}"]`);assert.equal(await page.locator('.game-card').count(),count);}await press(page,'[data-filter="all"]');
      for(const [query,id] of [['duoi hinh','riddles'],['to mau','coloring'],['sam loc','samloc'],['mau binh','maubinh']]){await page.locator('#search').fill(query);assert.ok(await page.locator(`[data-game="${id}"]`).count());}await page.locator('#search').fill('');
      for(const id of (process.env.EXTRA_GAMES||Object.keys(games).join(',')).split(',')){
        await open(page,id,touch);await ({riddles,coloring,samloc,maubinh})[id](page,touch,full);await bounds(page,id);await page.locator('.game-workspace').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:join(folder,`${id}-${width}.png`)});
        await press(page,'#restart-game',touch);await close(page);assert.deepEqual(errors,[]);report.runs.push({id,width,source:source.startsWith('file:')?'file':'http',status:'passed'});writeFileSync(join(folder,'results.json'),JSON.stringify(report,null,2));console.log(`PASS ${id} ${width}`);
      }
    }catch(error){await page.screenshot({path:join(folder,'failure.png')});throw error;}finally{await context.close();}
  }
    const page=await browser.newPage({viewport:{width:390,height:844}});await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('Storage unavailable');};});await page.goto(source);await open(page,'coloring',false);await press(page,'[data-color-region="r2"]');assert.equal(Object.keys((await state(page)).colors).length,1);assert.ok((await page.locator('[data-color-save]').textContent()).includes('PNG'));await close(page);await page.close();report.storageFallback=true;
    writeFileSync(join(folder,'results.json'),JSON.stringify(report,null,2));
  }finally{await browser.close();}
  console.log(`Extras: ${report.runs.length} browser scenarios and storage fallback passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
