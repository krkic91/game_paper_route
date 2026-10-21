// version v1.0
'use strict';
const K=require('./browser-expansion-kit.cjs');
K.run({
  id:'tower',api:'ArcadeTower',
  setup:page=>K.capture(page,'ArcadeTower',{},(s,name,L)=>{
    if(name==='win'){s.wave=11;s.money=1000;L.build(s,1,'arrow');L.upgrade(s,1);L.upgrade(s,1);L.startWave(s);s.queue=[];const pos=L.positionAt(L.MAPS[s.map],300);s.enemies=[{id:1000,kind:'boss',hp:1,maxHp:1760,speed:0,reward:100,damage:5,travelled:300,slow:0,...pos}];}
    if(name==='lose'){L.startWave(s);s.queue=[];s.lives=1;const distance=L.pathLength(L.MAPS[s.map])-2;s.enemies=[{id:1000,kind:'normal',hp:100,maxHp:100,speed:100,reward:10,damage:1,travelled:distance,slow:0,...L.positionAt(L.MAPS[s.map],distance)}];}
  }),
  async functional(page){
    K.assert.equal((await K.state(page)).money,240);
    await page.locator('[data-tower-pad-select]').selectOption('1');
    await K.press(page,'[data-tower-build="arrow"]');K.assert.equal((await K.state(page)).towers.length,1);K.assert.equal((await K.state(page)).money,170);
    await K.press(page,'[data-tower-upgrade]');K.assert.equal((await K.state(page)).towers[0].level,2);
    await K.press(page,'[data-tower-sell]');K.assert.equal((await K.state(page)).money,186);
    await K.press(page,'[data-tower-build="cannon"]');
    await K.press(page,'[data-tower-speed]');K.assert.equal(await page.locator('[data-tower-speed]').getAttribute('aria-pressed'),'true');
    await K.pauseAfter(page,()=>document.querySelector('[data-tower-start]').click());
    await page.waitForFunction(()=>window.__expansionState.enemies.length>0);
    K.assert.equal((await K.state(page)).wave,1);
    await K.restart(page,'win');await page.locator('.result-overlay').waitFor();K.assert.equal((await K.state(page)).phase,'won');
    await page.evaluate(()=>{window.__fixture='opening';});await page.locator('[data-again]').click();K.assert.equal((await K.state(page)).phase,'build');
    await K.restart(page,'lose');await page.locator('.result-overlay').waitFor();K.assert.equal((await K.state(page)).phase,'lost');
    await K.restart(page);await page.locator('[data-tower-map]').selectOption('2');K.assert.equal((await K.state(page)).map,2);K.assert.equal((await K.state(page)).wave,0);
    await K.press(page,'[data-tower-build="arrow"]');await K.press(page,'[data-tower-start]');
  },
  async responsive(page,{touch}){
    await K.reachable(page.locator('[data-tower-pad-select]'));
    await page.locator('[data-tower-pad-select]').selectOption('1');await K.press(page,'[data-tower-build="arrow"]',touch);K.assert.equal((await K.state(page)).towers.length,1);
    await K.press(page,'[data-tower-upgrade]',touch);await K.press(page,'[data-tower-start]',touch);await page.waitForFunction(()=>window.__expansionState.enemies.length>0);
    await K.press(page,'[data-tower-speed]',touch);await K.reachable(page.locator('[data-tower-map]'));
  },
}).catch(error=>{console.error(error);process.exitCode=1;});
