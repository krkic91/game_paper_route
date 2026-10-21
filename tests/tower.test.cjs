// version v1.0
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const L=require('../games/tower-logic.js');
function enemy(state,travelled=250,overrides={}) {
  const e={id:state.nextId++,kind:'normal',hp:100,maxHp:100,speed:0,reward:10,damage:1,travelled,slow:0,...L.positionAt(L.MAPS[state.map],travelled),...overrides};
  state.enemies.push(e);return e;
}
function active(){const s=L.createGame();s.phase='wave';s.wave=1;return s;}
function generator(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function prepare(s,random=null){
  const plan=[[1,'arrow'],[2,'arrow'],[3,'arrow'],[0,'frost'],[5,'cannon'],[6,'cannon'],[4,'frost'],[7,'arrow']];
  if(random)for(let i=plan.length-1;i>2;i--){const j=3+Math.floor(random()*(i-2));[plan[i],plan[j]]=[plan[j],plan[i]];}
  for(const [pad,type] of plan)if(!s.towers.some(t=>t.pad===pad))L.build(s,pad,type);
  for(let level=1;level<3;level++)for(const tower of s.towers)if(tower.level===level)L.upgrade(s,tower.pad);
}
function finish(map,random=null){
  const s=L.createGame({map});let elapsed=0;
  while(!['won','lost'].includes(s.phase)&&elapsed<1200){
    if(s.phase==='build'){prepare(s,random);assert.equal(L.startWave(s),true);}
    const dt=random?0.2+random()*1.3:1;L.tick(s,dt);elapsed+=dt;
    assert.ok(Number.isInteger(s.money)&&s.money>=0);assert.ok(s.lives>=0&&s.lives<=20);
    assert.equal(new Set(s.enemies.map(e=>e.id)).size,s.enemies.length);
  }
  assert.ok(['won','lost'].includes(s.phase));return s;
}
test('three distinct maps have connected, bounded paths and eight valid build pads',()=>{
  assert.equal(L.MAPS.length,3);assert.equal(new Set(L.MAPS.map(m=>JSON.stringify(m.path))).size,3);
  for(const map of L.MAPS){assert.ok(L.pathLength(map)>1400);assert.equal(map.pads.length,8);assert.deepEqual(L.positionAt(map,0),{x:map.path[0][0],y:map.path[0][1]});const last=map.path.at(-1);assert.deepEqual(L.positionAt(map,100000),{x:last[0],y:last[1]});}
  assert.equal(L.createGame({map:99}).map,0);
});
test('building validates money, pad, type and occupancy without mutating on invalid action',()=>{
  const s=L.createGame();assert.equal(L.build(s,1,'arrow'),true);assert.equal(s.money,170);
  const before=structuredClone(s);
  for(const [pad,type]of [[1,'frost'],[-1,'arrow'],[8,'cannon'],[1.5,'arrow'],[2,'unknown'],[2,'__proto__']])assert.equal(L.build(s,pad,type),false);
  assert.deepEqual(s,before);assert.equal(L.build(s,2,'cannon'),true);assert.equal(L.build(s,3,'arrow'),false);assert.equal(s.money,60);
});
test('upgrades increase damage/range, enforce cap and refund 60% of invested money exactly',()=>{
  const s=L.createGame();L.build(s,0,'arrow');const tower=s.towers[0], first=L.stats(tower);
  assert.equal(L.upgrade(s,0),true);assert.equal(s.money,107);assert.ok(L.stats(tower).damage>first.damage);assert.ok(L.stats(tower).range>first.range);
  assert.equal(L.upgrade(s,0),true);assert.equal(s.money,23);assert.equal(L.upgrade(s,0),false);assert.equal(L.upgradeCost(tower),null);
  assert.equal(L.sell(s,0),true);assert.equal(s.money,23+Math.floor((70+63+84)*0.6));assert.equal(s.towers.length,0);assert.equal(L.sell(s,0),false);
});
test('wave starts only explicitly, composition escalates and bosses appear at 6/12',()=>{
  const s=L.createGame();L.tick(s,5);assert.equal(s.time,0);assert.equal(s.wave,0);
  assert.equal(L.startWave(s),true);assert.equal(s.wave,1);assert.equal(s.queue.length,7);assert.equal(L.startWave(s),false);
  assert.equal(L.waveEnemies(1).every(e=>e.kind==='normal'),true);assert.ok(L.waveEnemies(3).some(e=>e.kind==='tank'));
  assert.equal(L.waveEnemies(6).at(-1).kind,'boss');assert.equal(L.waveEnemies(12).at(-1).kind,'boss');assert.ok(L.waveEnemies(12)[0].hp>L.waveEnemies(1)[0].hp);
});
test('fixed steps produce identical outcome for different dt partitioning',()=>{
  const a=L.createGame(),b=L.createGame();for(const s of[a,b]){L.build(s,0,'frost');L.build(s,1,'cannon');L.startWave(s);}
  L.tick(a,5);for(let i=0;i<500;i++)L.tick(b,0.01);
  a.accumulator=0;b.accumulator=0;assert.deepEqual(a,b);assert.equal(a.steps,250);
});
test('negative, infinite, huge dt and finished-state ticks cannot change the round',()=>{
  const s=active(),before=structuredClone(s);for(const dt of[-1,NaN,Infinity,61,0])L.tick(s,dt);assert.deepEqual(s,before);
  s.phase='lost';const ended=structuredClone(s);L.tick(s,1);assert.deepEqual(s,ended);assert.equal(L.build(s,0,'arrow'),false);assert.equal(L.startWave(s),false);
});
test('towers target the most advanced in-range enemy and ignore out-of-range enemies',()=>{
  const s=active();L.build(s,1,'arrow');const early=enemy(s,270),late=enemy(s,380),far=enemy(s,1100);
  L.tick(s,0.02);assert.equal(s.projectiles.length,1);assert.equal(s.projectiles[0].target,late.id);assert.notEqual(s.projectiles[0].target,early.id);assert.notEqual(s.projectiles[0].target,far.id);
});
test('projectile kill rewards exactly once even when multiple projectiles reach the same target',()=>{
  const s=active(),e=enemy(s,200,{hp:5});s.projectiles=[1,2].map(id=>({id,x:e.x,y:e.y,target:e.id,type:'arrow',damage:10,speed:100,radius:0}));
  L.tick(s,0.02);assert.equal(s.kills,1);assert.equal(s.money,240+10+40);assert.equal(s.earned,50);assert.equal(s.phase,'build');assert.equal(s.enemies.length,0);L.tick(s,10);assert.equal(s.money,290);
});
test('cannon damages every living enemy in its blast radius and frost has finite slowdown',()=>{
  const s=active(),a=enemy(s,200),b=enemy(s,240),c=enemy(s,400);
  s.projectiles.push({id:500,x:a.x,y:a.y,target:a.id,type:'cannon',damage:37,speed:100,radius:65});L.tick(s,0.02);
  assert.equal(a.hp,63);assert.equal(b.hp,63);assert.equal(c.hp,100);
  s.projectiles.push({id:501,x:c.x,y:c.y,target:c.id,type:'frost',damage:10,speed:100,radius:0});L.tick(s,0.02);assert.equal(c.hp,90);assert.equal(c.slow,1.6);
  c.speed=100;const travelled=c.travelled;L.tick(s,1);assert.ok(Math.abs(c.travelled-travelled-55)<1e-7);L.tick(s,1);assert.equal(c.slow,0);assert.ok(Math.abs(c.travelled-travelled-128)<1e-7);
});
test('path movement traverses corners and leaked enemies never earn a reward',()=>{
  const s=active(),length=L.pathLength(L.MAPS[0]);enemy(s,length-0.1,{speed:100,damage:5,kind:'boss'});L.tick(s,0.02);
  assert.equal(s.lives,15);assert.equal(s.leaked,1);assert.equal(s.kills,0);assert.equal(s.money,280);assert.equal(s.phase,'build');
});
test('zero lives ends immediately without granting a completion bonus',()=>{
  const s=active();s.lives=1;enemy(s,L.pathLength(L.MAPS[0])-0.1,{speed:100});L.tick(s,0.02);
  assert.equal(s.phase,'lost');assert.equal(s.lives,0);assert.equal(s.money,240);assert.equal(s.queue.length,0);
});
test('final victory waits for the final enemy, grants bonus once and locks spending',()=>{
  const s=active();s.wave=12;const e=enemy(s,200,{hp:1});L.tick(s,0.02);assert.equal(s.phase,'wave');
  s.projectiles.push({id:500,x:e.x,y:e.y,target:e.id,type:'arrow',damage:1,speed:100});L.tick(s,0.02);
  assert.equal(s.phase,'won');assert.equal(s.money,345);const before=structuredClone(s);L.tick(s,10);assert.deepEqual(s,before);assert.equal(L.sell(s,0),false);assert.ok(L.score(s)>1000);
});
test('a sensible mixed build strategy wins all three maps without synthetic resources',()=>{
  for(let map=0;map<3;map++){const s=finish(map);assert.equal(s.phase,'won');assert.equal(s.wave,12);assert.equal(s.kills+s.leaked,152);assert.equal(s.lives,20);}
});
test('24 seeded build-order / dt-partition matches finish with conserved enemy totals',()=>{
  for(let seed=1;seed<=24;seed++){const s=finish(seed%3,generator(seed));assert.equal(s.phase,'won');assert.equal(s.kills+s.leaked,152);}
});
test('neglecting defenses naturally loses before completing all waves',()=>{
  const s=L.createGame();for(let i=0;i<500&&s.phase!=='lost';i++){if(s.phase==='build')L.startWave(s);L.tick(s,1);}assert.equal(s.phase,'lost');assert.ok(s.wave<12);assert.equal(s.kills,0);
});
