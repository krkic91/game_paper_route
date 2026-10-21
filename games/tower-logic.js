// version v1.0
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeTower = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const STEP = 0.02, WAVES = 12;
  const MAPS = Object.freeze([
    { name: 'Thung lũng xanh', description: 'Đường uốn quanh hai hàng đồi.', color: '#d8e4c5', path: [[-30,90],[720,90],[720,250],[180,250],[180,420],[930,420]], pads: [[120,165],[300,165],[490,165],[640,165],[800,170],[280,335],[460,335],[640,335]] },
    { name: 'Ốc đảo', description: 'Hai khúc cua rộng giữa miền cát.', color: '#ecdfbb', path: [[-30,390],[180,390],[180,100],[490,100],[490,390],[750,390],[750,90],[930,90]], pads: [[90,260],[270,300],[270,175],[400,240],[580,175],[580,310],[670,240],[820,270]] },
    { name: 'Đèo sương', description: 'Con đường gấp khúc qua ba triền núi.', color: '#d8dfdf', path: [[-30,80],[200,80],[200,390],[440,390],[440,80],[690,80],[690,390],[930,390]], pads: [[100,170],[110,320],[295,170],[340,300],[535,170],[590,300],[790,180],[790,300]] },
  ].map(map => Object.freeze({ ...map, path: Object.freeze(map.path.map(Object.freeze)), pads: Object.freeze(map.pads.map(Object.freeze)) })));
  const TYPES = Object.freeze({
    arrow: Object.freeze({ name: 'Tháp tên', cost: 70, damage: 13, interval: 0.44, range: 165, speed: 470, color: '#5b8145', description: 'Bắn nhanh, hiệu quả với mục tiêu đơn.' }),
    frost: Object.freeze({ name: 'Tháp băng', cost: 90, damage: 10, interval: 0.8, range: 155, speed: 350, color: '#3989a5', description: 'Làm chậm 45% trong 1,6 giây.' }),
    cannon: Object.freeze({ name: 'Đại bác', cost: 110, damage: 37, interval: 1.3, range: 165, speed: 310, color: '#b57446', description: 'Gây sát thương lan trong bán kính 65.' }),
  });
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function pathLength(map) { return map.path.slice(1).reduce((total, p, i) => total + Math.hypot(p[0]-map.path[i][0],p[1]-map.path[i][1]),0); }
  function positionAt(map, travelled) {
    let left = Math.max(0, travelled);
    for (let i=1;i<map.path.length;i++) {
      const a=map.path[i-1], b=map.path[i], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if (left<=length) return { x:a[0]+(b[0]-a[0])*left/length, y:a[1]+(b[1]-a[1])*left/length };
      left-=length;
    }
    const end=map.path[map.path.length-1]; return {x:end[0],y:end[1]};
  }
  function createGame(options={}) {
    const map=Number.isInteger(options.map) && MAPS[options.map] ? options.map : 0;
    return {map, phase:'build', wave:0, money:240, lives:20, towers:[], enemies:[], projectiles:[], effects:[], queue:[], spawnIn:0, kills:0, leaked:0, time:0, steps:0, accumulator:0, nextId:1, earned:0, message:'Chọn một bệ để xây tháp, rồi bắt đầu đợt 1.'};
  }
  function stats(tower) {
    const type=TYPES[tower.type], level=tower.level;
    return {...type, damage:Math.round(type.damage*[1,1.7,2.65][level-1]), range:type.range+(level-1)*12, interval:type.interval*(1-(level-1)*0.08), radius:65+(level-1)*8};
  }
  function upgradeCost(tower) { return tower.level<3 ? Math.round(TYPES[tower.type].cost*(tower.level===1 ? 0.9 : 1.2)) : null; }
  function validAction(state) { return state.phase==='build' || state.phase==='wave'; }
  function build(state,pad,type) {
    if (!validAction(state) || !Number.isInteger(pad) || !MAPS[state.map].pads[pad] || !Object.hasOwn(TYPES,type) || state.towers.some(t=>t.pad===pad)) return false;
    if (state.money<TYPES[type].cost) return false;
    const [x,y]=MAPS[state.map].pads[pad]; state.money-=TYPES[type].cost;
    state.towers.push({pad,type,level:1,x,y,cooldown:0,spent:TYPES[type].cost,angle:0}); return true;
  }
  function upgrade(state,pad) {
    const tower=state.towers.find(t=>t.pad===pad);
    if (!validAction(state) || !tower) return false;
    const cost=upgradeCost(tower);
    if (cost===null || state.money<cost) return false;
    state.money-=cost; tower.spent+=cost; tower.level++; return true;
  }
  function sell(state,pad) {
    const index=state.towers.findIndex(t=>t.pad===pad);
    if (!validAction(state) || index<0) return false;
    state.money+=Math.floor(state.towers[index].spent*0.6); state.towers.splice(index,1); return true;
  }
  function waveEnemies(wave) {
    const enemies=[];
    for(let i=0;i<6+wave;i++) {
      const kind=wave>=3 && i%5===4 ? 'tank' : wave>=2 && i%3===1 ? 'runner' : 'normal';
      const base=32+wave*12;
      enemies.push({kind,hp:Math.round(base*(kind==='tank'?2.4:kind==='runner'?0.68:1)),speed:kind==='runner'?75:kind==='tank'?33:47,reward:kind==='tank'?16:10,damage:1});
    }
    if (wave===6 || wave===12) enemies.push({kind:'boss',hp:(32+wave*12)*10,speed:25,reward:100,damage:5});
    return enemies;
  }
  function startWave(state) {
    if(state.phase!=='build' || state.wave>=WAVES) return false;
    state.wave++; state.phase='wave'; state.queue=waveEnemies(state.wave); state.spawnIn=0;
    state.message=`Đợt ${state.wave}/${WAVES}${state.wave%6===0?' · Có thủ lĩnh!':''}`; return true;
  }
  function damageEnemy(state,enemy,damage,slow=false) {
    if(enemy.hp<=0) return;
    enemy.hp-=damage;
    if(slow) enemy.slow=Math.max(enemy.slow,1.6);
    if(enemy.hp<=0) { state.kills++; state.money+=enemy.reward; state.earned+=enemy.reward; state.effects.push({x:enemy.x,y:enemy.y,ttl:0.4,kind:'kill'}); }
  }
  function step(state) {
    state.steps++; state.time=state.steps*STEP;
    state.effects=state.effects.filter(effect=>(effect.ttl-=STEP)>0);
    state.spawnIn-=STEP;
    if(state.queue.length && state.spawnIn<=0) {
      const template=state.queue.shift(), pos=positionAt(MAPS[state.map],0);
      state.enemies.push({...template,...pos,id:state.nextId++,maxHp:template.hp,travelled:0,slow:0}); state.spawnIn+=0.78;
    }
    const length=pathLength(MAPS[state.map]);
    for(const enemy of state.enemies) {
      if(enemy.hp<=0) continue;
      const slowed=Math.min(STEP,enemy.slow);
      enemy.travelled+=enemy.speed*(STEP-slowed+slowed*0.55); enemy.slow=Math.max(0,enemy.slow-STEP);
      Object.assign(enemy,positionAt(MAPS[state.map],enemy.travelled));
      if(enemy.travelled>=length) { enemy.hp=0; state.lives=Math.max(0,state.lives-enemy.damage); state.leaked++; state.effects.push({x:870,y:enemy.y,ttl:0.5,kind:'leak'}); }
    }
    state.enemies=state.enemies.filter(e=>e.hp>0);
    if(state.lives===0) { state.phase='lost'; state.queue=[]; state.projectiles=[]; state.message='Thành trì đã thất thủ.'; return; }
    for(const tower of state.towers) {
      tower.cooldown=Math.max(0,tower.cooldown-STEP);
      if(tower.cooldown>1e-9) continue;
      const data=stats(tower);
      const target=state.enemies.filter(e=>distance(tower,e)<=data.range).sort((a,b)=>b.travelled-a.travelled || a.id-b.id)[0];
      if(!target) continue;
      tower.angle=Math.atan2(target.y-tower.y,target.x-tower.x); tower.cooldown=data.interval;
      state.projectiles.push({id:state.nextId++,x:tower.x,y:tower.y,target:target.id,type:tower.type,damage:data.damage,speed:data.speed,radius:data.radius});
    }
    const remaining=[];
    for(const shot of state.projectiles) {
      const target=state.enemies.find(e=>e.id===shot.target && e.hp>0);
      if(!target) continue;
      const dist=distance(shot,target), travel=shot.speed*STEP;
      if(dist<=travel) {
        if(shot.type==='cannon') {
          state.effects.push({x:target.x,y:target.y,ttl:0.3,kind:'blast',radius:shot.radius});
          for(const enemy of state.enemies) if(distance(enemy,target)<=shot.radius) damageEnemy(state,enemy,shot.damage);
        } else damageEnemy(state,target,shot.damage,shot.type==='frost');
      } else { shot.x+=(target.x-shot.x)*travel/dist; shot.y+=(target.y-shot.y)*travel/dist; remaining.push(shot); }
    }
    state.projectiles=remaining; state.enemies=state.enemies.filter(e=>e.hp>0);
    if(!state.queue.length && !state.enemies.length) {
      state.projectiles=[]; const bonus=35+state.wave*5; state.money+=bonus; state.earned+=bonus;
      state.phase=state.wave===WAVES?'won':'build'; state.message=state.phase==='won'?'Đã giữ vững thành trì qua 12 đợt!':`Đợt ${state.wave} hoàn thành! +${bonus} xu. Chuẩn bị đợt tiếp theo.`;
    }
  }
  function tick(state,dt) {
    if(state.phase!=='wave' || !Number.isFinite(dt) || dt<=0 || dt>60) return;
    state.accumulator+=dt;
    while(state.accumulator+1e-10>=STEP && state.phase==='wave') { state.accumulator=Math.max(0,state.accumulator-STEP); step(state); }
    if(state.phase!=='wave') state.accumulator=0;
  }
  function score(state) { return state.kills*10+state.wave*50+state.lives*30+(state.phase==='won'?1000:0); }
  return Object.freeze({MAPS,TYPES,STEP,WAVES,createGame,stats,upgradeCost,build,upgrade,sell,waveEnemies,startWave,tick,score,pathLength,positionAt});
});
