// version v1.0
(function () {
  'use strict';
  const S=window.ArcadeShared;
  window.ArcadeGames.tower=function(host,options={}) {
    const L=window.ArcadeTower, scope=S.createScope();
    let state=L.createGame(), selected=0, started=false, finished=false, speed=1, rendered='', frame=0;
    const ui=S.buildUI(host,{
      className:'tower-workspace',
      toolbar:`<div class="tower-heading"><small>GIỮ VỮNG THÀNH TRÌ</small><strong>Thủ thành<span>.</span></strong></div><div class="tower-stats">${S.stat('Đợt','wave','0 / 12')}${S.stat('Sinh lực','lives',20)}${S.stat('Xu','money',240)}</div>`,
      board:`<div class="tower-layout"><div class="tower-map-column"><div class="tower-map"><canvas width="900" height="500" role="img" aria-label="Bản đồ đường tiến quân, vị trí tháp và quái. Chọn bệ bằng các nút hoặc danh sách bên dưới."></canvas><div class="tower-pads"></div><span class="tower-map-name"></span></div><div class="tower-wave-info"><span data-tower-wave-info>Chưa có quái xuất hiện.</span><strong data-tower-kills>0 hạ gục</strong></div></div><section class="tower-panel" aria-label="Xây và nâng cấp tháp"><label for="tower-pad-select">CHỌN VỊ TRÍ</label><select id="tower-pad-select" data-tower-pad-select></select><div class="tower-detail" data-tower-detail></div><div class="tower-build">${Object.entries(L.TYPES).map(([key,type])=>`<button type="button" data-tower-build="${key}"><i style="--tower-color:${type.color}" aria-hidden="true">${key==='arrow'?'↟':key==='frost'?'❄':'●'}</i><span><strong>${type.name}</strong><small>${type.description}</small></span><b>${type.cost}<small>xu</small></b></button>`).join('')}</div><div class="tower-management"><button type="button" class="control-button" data-tower-upgrade>Nâng cấp</button><button type="button" class="control-button" data-tower-sell>Bán tháp</button></div><button type="button" class="control-button tower-start" data-tower-start>Bắt đầu đợt 1</button><p class="tower-tip">Tháp ưu tiên quái gần cổng nhất trong tầm bắn. Xây và nâng cấp được cả khi đang giao chiến.</p></section></div>`,
      controls:`<label class="tower-map-choice">Bản đồ<select data-tower-map aria-label="Chọn bản đồ; bắt đầu ván mới">${L.MAPS.map((map,index)=>`<option value="${index}">${map.name}</option>`).join('')}</select></label><button type="button" class="control-button" data-tower-speed aria-pressed="false">Tốc độ ×1</button><details class="tower-rules"><summary>Cách chơi & thông số</summary><p>Giữ 20 sinh lực qua 12 đợt. Chọn bệ trống, xây tháp và chủ động bắt đầu từng đợt. Đợt 6 và 12 có thủ lĩnh: lọt cổng mất 5 sinh lực; quái thường mất 1. Hạ quái nhận xu, hết đợt nhận thêm xu.</p><p>Tháp tên bắn nhanh; tháp băng làm chậm 45% trong 1,6 giây; đại bác gây sát thương lan. Mỗi tháp có 3 cấp. Bán hoàn 60% tổng tiền xây và nâng cấp. Quái nhanh có máu thấp, quái giáp có nhiều máu. Thủ lĩnh đi chậm nhưng rất bền.</p><p>Chọn bản đồ sẽ bắt đầu ván mới. Có thể dùng danh sách vị trí thay cho chạm bệ trên bản đồ. Tạm dừng bằng nút ở thanh trên.</p></details>`,
      status:state.message,
    });
    const $=selector=>ui.workspace.querySelector(selector), canvas=$('canvas'), ctx=canvas.getContext('2d');
    const dpr=Math.min(window.devicePixelRatio||1,2); canvas.width=900*dpr; canvas.height=500*dpr; ctx.scale(dpr,dpr);
    function pads() {
      $('.tower-pads').innerHTML=L.MAPS[state.map].pads.map(([x,y],index)=>`<button type="button" data-tower-pad="${index}" style="left:${x/9}%;top:${y/5}%" aria-label="Bệ ${index+1}">${index+1}</button>`).join('');
      $('[data-tower-pad-select]').innerHTML=L.MAPS[state.map].pads.map((_,i)=>`<option value="${i}">Bệ ${i+1} · Trống</option>`).join('');
      $('.tower-map-name').textContent=L.MAPS[state.map].name;
    }
    function render() {
      ui.workspace.dataset.phase=state.phase; ui.workspace.dataset.wave=state.wave;
      ui.setStat('wave',`${state.wave} / ${L.WAVES}`); ui.setStat('lives',state.lives); ui.setStat('money',state.money);
      $('[data-tower-kills]').textContent=`${state.kills} hạ gục`;
      $('[data-tower-wave-info]').textContent=state.phase==='wave'?`${state.enemies.length} đang tiến quân · ${state.queue.length} sắp tới`:'Chuẩn bị đội hình giữa các đợt';
      ui.message(state.message);
      const tower=state.towers.find(t=>t.pad===selected), active=started&&!finished;
      for(const button of ui.workspace.querySelectorAll('[data-tower-pad]')) {
        const pad=Number(button.dataset.towerPad), built=state.towers.find(t=>t.pad===pad);
        button.setAttribute('aria-pressed',String(pad===selected));
        button.setAttribute('aria-label',`Bệ ${pad+1}${built?` · ${L.TYPES[built.type].name} cấp ${built.level}`:' · Trống'}`);
        button.classList.toggle('has-tower',Boolean(built));
        button.style.setProperty('--pad-color',built?L.TYPES[built.type].color:'#425442');
        $('[data-tower-pad-select]').options[pad].textContent=`Bệ ${pad+1} · ${built?`${L.TYPES[built.type].name} ${built.level}/3`:'Trống'}`;
      }
      $('[data-tower-pad-select]').value=selected;
      const key=[selected,state.money,started,finished,tower?.type,tower?.level].join('|');
      if(key!==rendered) {
        rendered=key;
        if(tower) { const stats=L.stats(tower); $('[data-tower-detail]').innerHTML=`<strong>${stats.name} <span>Cấp ${tower.level}/3</span></strong><p>${stats.description}</p><dl><div><dt>Sát thương</dt><dd>${stats.damage}</dd></div><div><dt>Chu kỳ bắn</dt><dd>${stats.interval.toFixed(2)} giây</dd></div><div><dt>Tầm bắn</dt><dd>${stats.range}</dd></div></dl>`; }
        else $('[data-tower-detail]').innerHTML=`<strong>Bệ ${selected+1} đang trống</strong><p>Chọn loại tháp bên dưới. Phối hợp băng với đại bác để giữ quái trong vùng sát thương.</p>`;
        $('.tower-build').hidden=Boolean(tower); $('.tower-management').hidden=!tower;
        for(const button of ui.workspace.querySelectorAll('[data-tower-build]')) button.disabled=!active||state.money<L.TYPES[button.dataset.towerBuild].cost;
        const cost=tower?L.upgradeCost(tower):null;
        $('[data-tower-upgrade]').disabled=!active||cost===null||state.money<cost;
        $('[data-tower-upgrade]').textContent=cost===null?'Đã đạt cấp tối đa':`Nâng cấp ${tower.level+1} · ${cost} xu`;
        $('[data-tower-sell]').disabled=!active||!tower;
        $('[data-tower-sell]').textContent=`Bán · ${tower?Math.floor(tower.spent*0.6):0} xu`;
      }
      $('[data-tower-start]').disabled=!active||state.phase!=='build';
      $('[data-tower-start]').textContent=state.phase==='wave'?`Đợt ${state.wave} đang diễn ra`:`Bắt đầu đợt ${Math.min(12,state.wave+1)}`;
    }
    function circle(x,y,r,fill,stroke) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=fill; ctx.fill(); if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();} }
    function draw() {
      const map=L.MAPS[state.map]; ctx.clearRect(0,0,900,500); ctx.fillStyle=map.color; ctx.fillRect(0,0,900,500);
      // Stable, code-native scenery keeps the route readable at every viewport.
      for(let i=0;i<26;i++) { const x=(i*137+43)%900,y=(i*83+33)%500; circle(x,y,4+(i%3)*2,'#506c4219'); }
      const line=(width,color)=>{ctx.beginPath();map.path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();};
      line(58,'#acb69b'); line(47,'#f6ecd0'); line(2,'#d4c49d');
      const start=map.path[0],end=map.path[map.path.length-1];
      ctx.fillStyle='#5e7853'; ctx.fillRect(4,start[1]-24,6,48); S.text(ctx,'›',24,start[1]+8,30,'#526b43');
      ctx.fillStyle='#7b796b'; ctx.fillRect(866,end[1]-25,31,50); ctx.fillStyle='#575b50';ctx.fillRect(877,end[1]-4,12,29);
      for(let i=0;i<3;i++)ctx.fillRect(866+i*12,end[1]-32,7,10);
      const chosen=state.towers.find(t=>t.pad===selected);
      if(chosen) { circle(chosen.x,chosen.y,L.stats(chosen).range,'#4b735011','#496b4f33'); }
      for(const [x,y] of map.pads) { circle(x,y,26,'#b1bc9c','#85936d'); circle(x,y,20,'#dde4c9'); }
      for(const tower of state.towers) {
        const type=L.TYPES[tower.type]; circle(tower.x,tower.y+3,23,'#0002'); circle(tower.x,tower.y,23,type.color,'#fff9');
        ctx.save();ctx.translate(tower.x,tower.y);ctx.rotate(tower.angle);ctx.fillStyle='#324535';ctx.fillRect(-3,-7,33,14);ctx.restore();
        circle(tower.x,tower.y,12,type.color); S.text(ctx,tower.level,tower.x,tower.y+5,14,'white');
      }
      for(const enemy of state.enemies) {
        const radius=enemy.kind==='boss'?23:enemy.kind==='tank'?17:12;
        circle(enemy.x,enemy.y+3,radius,'#0002'); circle(enemy.x,enemy.y,radius,enemy.kind==='boss'?'#73436f':enemy.kind==='tank'?'#79533b':enemy.kind==='runner'?'#c4823e':'#ad5c55',enemy.slow>0?'#b9efff':'#fff9');
        S.text(ctx,enemy.kind==='boss'?'♛':enemy.kind==='tank'?'◆':enemy.kind==='runner'?'›':'•',enemy.x,enemy.y+5,enemy.kind==='boss'?22:17,'#fff6e6');
        ctx.fillStyle='#33412e';ctx.fillRect(enemy.x-radius,enemy.y-radius-9,radius*2,5);ctx.fillStyle=enemy.slow>0?'#62c2dc':'#87bc57';ctx.fillRect(enemy.x-radius,enemy.y-radius-9,radius*2*Math.max(0,enemy.hp/enemy.maxHp),5);
      }
      for(const shot of state.projectiles)circle(shot.x,shot.y,shot.type==='cannon'?6:4,L.TYPES[shot.type].color,'#fff');
      for(const effect of state.effects) { ctx.globalAlpha=Math.min(1,effect.ttl*3);circle(effect.x,effect.y,effect.kind==='blast'?effect.radius*(1-effect.ttl/0.4):12,'#f4c66e55',effect.kind==='leak'?'#ad4d4d':'#f5d576');ctx.globalAlpha=1; }
    }
    function result() {
      if(finished || !['won','lost'].includes(state.phase)) return;
      finished=true; render();
      S.result(ui,scope,{title:state.phase==='won'?'Thành trì vẫn vững vàng!':'Hẹn gặp lại, người chỉ huy!',detail:`${L.MAPS[state.map].name} · ${state.wave}/12 đợt · ${state.kills} quái bị hạ · ${state.lives} sinh lực còn lại.`,score:L.score(state),win:state.phase==='won',onScore:options.onScore,onAgain:restart});
    }
    function restart() { const map=Number($('[data-tower-map]').value);scope.clearTimers();S.clearOverlays(ui);state=L.createGame({map});selected=0;started=true;finished=false;rendered='';pads();render();draw(); }
    scope.on(ui.workspace,'click',event=>{
      const pad=event.target.closest('[data-tower-pad]');
      if(pad){selected=Number(pad.dataset.towerPad);render();draw();return;}
      if(!started||finished)return;
      const button=event.target.closest('button');if(!button||button.disabled)return;
      if(button.hasAttribute('data-tower-build')) L.build(state,selected,button.dataset.towerBuild);
      else if(button.hasAttribute('data-tower-upgrade'))L.upgrade(state,selected);
      else if(button.hasAttribute('data-tower-sell'))L.sell(state,selected);
      else if(button.hasAttribute('data-tower-start'))L.startWave(state);
      else if(button.hasAttribute('data-tower-speed')){speed=speed===1?2:1;button.textContent=`Tốc độ ×${speed}`;button.setAttribute('aria-pressed',String(speed===2));}
      render();draw();
    });
    scope.on($('[data-tower-pad-select]'),'change',event=>{selected=Number(event.target.value);render();draw();});
    scope.on($('[data-tower-map]'),'change',restart);
    scope.loop(dt=>{if(!started||finished)return;L.tick(state,dt*speed);draw();frame++;if(frame%6===0)render();result();});
    pads();render();draw();
    S.intro(ui,scope,{title:'Bạn là người giữ cổng',symbol:'flag',detail:'Xây tháp trên các bệ, phối hợp tên, băng và đại bác để giữ 20 sinh lực qua 12 đợt. Có 3 bản đồ; đợt 6 và 12 xuất hiện thủ lĩnh. Bắt đầu mỗi đợt khi bạn đã sẵn sàng.',onStart:()=>{started=true;render();}});
    return S.handle(scope,restart);
  };
})();
