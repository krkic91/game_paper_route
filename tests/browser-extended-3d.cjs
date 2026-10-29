'use strict';
const assert=require('node:assert/strict');
const {mkdirSync,writeFileSync,existsSync}=require('node:fs');
const {resolve,join}=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=resolve(__dirname,'..'),output=process.env.OUTPUT_3D||join(root,'test-results/extended-3d');mkdirSync(output,{recursive:true});
const ids=(process.env.GAMES_3D||'chess,xiangqi,draughts,coganh,reversi,jungle,sudoku,puppies,minesweeper,onet,match3,battleship,monopoly,samloc,phom,tienlen,uno,xidach,maubinh,domino,werewolf,coloring,jigsaw,riddles,wordchain,blocks,tower,piano,penalty,fishing,neon').split(',');
const widths=(process.env.WIDTHS_3D||'1366,390,320').split(',').map(Number),results=[],errors=[];
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
async function ready(page,id){
  await page.evaluate(id=>{location.hash=`#play/${id}/3d`;},id);
  if(id==='neon'){
    const frame=page.frameLocator('#game-stage iframe');await frame.locator('#game[data-rendered="true"]').waitFor();return frame;
  }
  await page.waitForFunction(id=>{
    const error=document.querySelector('.three-unavailable');if(error)throw Error(error.textContent);
    return window.Arcade3D?.diagnostics?.().some(s=>s.id===id&&s.triangles>100);
  },id,{timeout:20000});return page;
}
async function info(page,id){return id==='neon'?page.frames()[1].evaluate(()=>window.__neon3D.diagnostics()):page.evaluate(()=>window.Arcade3D.diagnostics()[0]);}
async function close(page){await page.evaluate(()=>{window.__oldGL=document.querySelector('.three-canvas')?.getContext('webgl2');});await page.locator('#close-game').click();await page.locator('#player-dialog').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>window.Arcade3D?.diagnostics?.().length||0),0);assert.ok(await page.evaluate(()=>!window.__oldGL||window.__oldGL.isContextLost()),'GPU context released');await page.evaluate(()=>{delete window.__oldGL;});}
async function pick(page,key){await page.locator('.three-canvas').scrollIntoViewIfNeeded();await page.waitForFunction(key=>window.Arcade3D.diagnostics()[0].targets.some(t=>t.key===key),key);const p=await page.evaluate(key=>window.Arcade3D.diagnostics()[0].targets.find(t=>t.key===key),key);assert.ok(p,`missing target ${key}`);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
async function start(page,id,frame){
  if(id==='neon'){await frame.locator('#btn-start').click();return;}
  const button=page.locator('[data-start]');if(await button.count())await button.click();
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:existsSync(edge)?edge:undefined});
  try{
    for(const width of widths){
      const context=await browser.newContext({viewport:{width,height:width>600?1050:844},hasTouch:width<600,isMobile:width<600,deviceScaleFactor:1,reducedMotion:'reduce'});
      await context.addInitScript(()=>{let seed=2034;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
      const page=await context.newPage();page.setDefaultTimeout(12000);
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('WebGLRenderer: Error creating WebGL context'))errors.push(m.text());});
      await page.goto(process.env.TEST_URL||pathToFileURL(join(root,'index.html')).href);
      assert.equal(await page.locator('.card-editions [data-edition="3d"]').count(),41);
      assert.equal(await page.evaluate(()=>typeof window.TramThree),'undefined');
      for(const id of ids){
        const frame=await ready(page,id);await start(page,id,frame);await page.waitForTimeout(150);
        const before=await info(page,id);assert.ok(before.triangles>100,`${id} real geometry`);
        assert.ok(await page.locator('.stage-wrapper').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${id}/${width}: overflow`);
        if(id!=='neon'){
          await page.locator('[data-camera="top"]').click();await page.locator('[data-camera="angle"]').click();
          await page.locator('[data-quality]').click();
        }
        // Exercise real raycasting, not clicks on the hidden accessible original.
        if(id==='chess'){await pick(page,'cell-52');await pick(page,'cell-36');await page.waitForFunction(()=>Number(document.querySelector('.royal-workspace').dataset.ply)>=1);}
        if(id==='xiangqi'){await page.locator('[data-royal-variant]').selectOption('hidden');assert.equal(await page.locator('.royal-cell[data-piece$="U"]').count(),30);await pick(page,'cell-54');await pick(page,'cell-45');await page.waitForFunction(()=>Number(document.querySelector('.royal-workspace').dataset.ply)>=1);assert.notEqual(await page.locator('[data-cell="45"]').getAttribute('data-piece'),'rU');}
        if(id==='draughts'||id==='coganh'){await page.locator(`[data-${id}-mode]`).selectOption('local');await page.locator(`[data-${id}-hint]`).click();if(id==='draughts'){const path=await page.locator('.draughts-cell.is-hint').evaluateAll(els=>els.map(el=>el.dataset.draughtsCell));for(const i of path.reverse())await pick(page,`cell-${i}`);}else{const target=await page.locator('.coganh-cell.is-target').first().getAttribute('data-coganh-cell');await pick(page,`cell-${target}`);}await page.waitForFunction(id=>Number(document.querySelector(`.${id}-workspace`).dataset.turn)>0,id);}
        if(id==='reversi'){const index=await page.locator('.reversi-cell.is-legal').first().getAttribute('data-reversi-cell');await pick(page,`cell-${index}`);await page.waitForFunction(()=>Number(document.querySelector('.reversi-workspace').dataset.turn)>0);}
        if(id==='jungle'){await page.locator('[data-jungle-hint]').click();const index=await page.locator('.jungle-cell.is-hint').getAttribute('data-jungle-cell');await pick(page,`cell-${index}`);await page.waitForFunction(()=>Number(document.querySelector('.jungle-workspace').dataset.ply)>0);}
        if(id==='sudoku'){const index=await page.locator('.sudoku-cell:not(.is-given)').first().getAttribute('data-cell');await pick(page,`cell-${index}`);await page.keyboard.press('1');assert.equal(await page.locator(`.sudoku-cell[data-cell="${index}"]`).getAttribute('data-value'),'1');}
        if(id==='puppies'){await page.locator('[data-puppies-mode="mark"]').click();await pick(page,'cell-0');assert.equal(await page.locator('.puppies-cell[data-cell="0"]').getAttribute('data-state'),'marked');}
        if(id==='minesweeper'){await pick(page,'cell-27');await page.waitForFunction(()=>document.querySelectorAll('.ms-cell.is-open').length>0);}
        if(id==='onet'){const before=await page.locator('[data-onet-cell]').count();await page.locator('[data-onet-hint]').click();const pair=await page.locator('.onet-cell.is-hint').evaluateAll(els=>els.map(el=>el.dataset.onetCell));for(const i of pair)await pick(page,`cell-${i}`);await page.waitForFunction(before=>document.querySelectorAll('[data-onet-cell]').length<before,before);}
        if(id==='battleship'){await page.locator('[data-bs-random]').click();await page.locator('[data-bs-launch]').click();assert.equal(await page.locator('[data-bs-board="target"] .bs-ship').count(),0);await pick(page,'target-0');await page.waitForFunction(()=>!document.querySelector('[data-bs-target="0"]').classList.contains('bs-unknown'));}
        if(id==='monopoly'){await pick(page,'property-1');assert.equal(await page.locator('[data-monopoly-inspect]').inputValue(),'1');await page.locator('[data-monopoly-roll]').click();}
        if(id==='match3'){await page.locator('[data-match3-hint]').click();const cells=await page.locator('.match3-cell.is-hint').evaluateAll(els=>els.map(e=>e.dataset.match3Cell));for(const c of cells)await pick(page,`cell-${c}`);await page.waitForFunction(()=>Number(document.querySelector('[data-stat="moves"]').textContent)<30);}
        if(id==='coloring'){await pick(page,'paint-r2');await page.waitForFunction(()=>Number(document.querySelector('.coloring-workspace').dataset.painted)>0);await page.locator('[data-color-undo]').click();}
        if(id==='maubinh'){await pick(page,'bank-0');await pick(page,'row-0-0');await page.waitForFunction(()=>document.querySelector('[data-stat="arranged"]').textContent==='1 / 13');await page.locator('[data-binh-hint]').click();await page.locator('[data-binh-submit]').click();await page.locator('[data-binh-results]').waitFor();}
        if(id==='tower'){await pick(page,'pad-1');await page.locator('[data-tower-build="arrow"]').click();await page.locator('[data-tower-start]').click();}
        if(id==='penalty'){await pick(page,'zone-0');await page.waitForFunction(()=>document.querySelector('.penalty-workspace').dataset.stage==='result');}
        if(id==='blocks'){await page.locator('.three-canvas').focus();await page.keyboard.press('Space');assert.ok(Number(await page.locator('.blocks-workspace').getAttribute('data-pieces'))>0);}
        if(id==='fishing'){await page.locator('[data-fishing-action]').click();assert.equal(await page.locator('.fishing-workspace').getAttribute('data-phase'),'aim');}
        if(id==='wordchain'){await page.locator('[data-wordchain-hint]').click();await page.locator('.wordchain-form button').click();assert.equal(await page.locator('[data-stat="score"]').textContent(),'10');}
        if(id==='riddles'){await page.locator('[data-riddle-hint]').click();await page.locator('[data-riddle-skip]').click();await page.locator('[data-riddle-next]').click();assert.equal(await page.locator('.riddles-workspace').getAttribute('data-index'),'1');}
        if(id==='piano'){await page.locator('#restart-game').click();await page.locator('.three-canvas').focus();await page.waitForFunction(()=>[...document.querySelectorAll('.piano-tile')].some(el=>!el.hidden&&parseFloat(el.style.top)>78&&parseFloat(el.style.top)<84));const lane=await page.evaluate(()=>[...document.querySelectorAll('.piano-tile')].find(el=>!el.hidden&&parseFloat(el.style.top)>78&&parseFloat(el.style.top)<87)?.parentElement.dataset.pianoLane);assert.notEqual(lane,undefined);await page.keyboard.press(['d','f','j','k'][Number(lane)]);assert.ok(Number(await page.locator('[data-stat="score"]').textContent())>0);}
        if(id==='neon'){
          const child=page.frames()[1],x=await child.evaluate(()=>P.x);await frame.locator('#game').focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');assert.ok(await child.evaluate(x=>P.x>x,x));
          await child.evaluate(()=>{
            P.invuln=1000;
            for(let i=0;i<120;i++)spawnEnemy(['drone','speeder','brute','spitter','goblin','boss'][i%6],P.x+Math.cos(i)*180,P.y+Math.sin(i)*180,false);
            for(const id of Object.keys(WEAPONS))P.weapons[id]={lvl:5,cd:0};
            fireWeapons(.05);updateOrbit(.05);draw();
          });
          assert.ok((await info(page,id)).triangles>4000,'all enemy and weapon meshes draw');
          await page.waitForTimeout(400);assert.ok((await info(page,id)).geometries<30,'instanced renderer keeps geometry bounded');
          await page.screenshot({path:join(output,`neon-stress-${width}.png`)});
        }
        if(id==='jigsaw'){const key=await page.evaluate(()=>window.Arcade3D.diagnostics()[0].targets.find(t=>t.key.startsWith('loose-')).key);await pick(page,key);await pick(page,`slot-${key.slice(6)}`);await page.waitForFunction(()=>Number(document.querySelector('.jigsaw-workspace').dataset.placed)===1);}
        await page.locator('#pause-game').click();await page.waitForTimeout(80);const paused=(await info(page,id)).frames;await page.waitForTimeout(150);assert.equal((await info(page,id)).frames,paused,`${id} must stop drawing while paused`);await page.locator('#resume-game').click();
        await page.screenshot({path:join(output,`${id}-${width}.png`)});
        await page.locator('#restart-game').click();await page.waitForTimeout(60);
        if(id!=='neon'){assert.equal(await page.evaluate(()=>window.Arcade3D.diagnostics().length),1);assert.ok((await info(page,id)).geometries<600);}
        results.push({id,width,...await info(page,id),targets:undefined});writeFileSync(join(output,'results.json'),JSON.stringify(results,null,2));console.log(`PASS ${id} ${width}: ${before.triangles} triangles`);await close(page);
      }
      await context.close();
    }
    // Context recovery and 2D fallback never need a listening HTTP server.
    const extra=await browser.newContext(),page=await extra.newPage();await page.goto(pathToFileURL(join(root,'index.html')).href);
    await ready(page,'coloring');await start(page,'coloring');
    await page.evaluate(()=>document.querySelectorAll('[data-color-region]').forEach(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true}))));
    assert.equal(await page.locator('#game-best').textContent(),'100');
    await page.locator('[data-player-edition="2d"]').click();await page.locator('.coloring-canvas').waitFor();assert.equal(await page.locator('#game-best').textContent(),'0');assert.equal(await page.evaluate(()=>window.Arcade3D.diagnostics().length),0);
    await page.locator('[data-player-edition="3d"]').click();await page.locator('.three-canvas').waitFor();assert.equal(await page.locator('#game-best').textContent(),'100');
    await page.locator('.three-canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await page.locator('.three-unavailable').waitFor();assert.equal(await page.evaluate(()=>window.Arcade3D.diagnostics().length),0);await page.locator('[data-retry-3d]').click();await page.locator('.three-canvas[data-rendered="true"]').waitFor();await close(page);await extra.close();
    const blocked=await browser.newContext();await blocked.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args);};});
    const unsupported=await blocked.newPage();await unsupported.goto(pathToFileURL(join(root,'index.html')).href);
    for(const id of ['chess','neon']){await unsupported.evaluate(id=>{location.hash=`#play/${id}/3d`;},id);await unsupported.locator('.three-unavailable').waitFor();await unsupported.locator('.three-unavailable [data-edition="2d"]').click();await unsupported.waitForFunction(()=>document.querySelector('#game-stage').dataset.edition==='2d'&&!document.querySelector('.three-loading'));await close(unsupported);}await blocked.close();
    assert.deepEqual(errors,[]);writeFileSync(join(output,'results.json'),JSON.stringify(results,null,2));console.log(`Passed ${results.length} offline 3D scenarios.`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
