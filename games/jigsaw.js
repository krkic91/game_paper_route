(function(){
  'use strict';const S=window.ArcadeShared,L=window.ArcadeJigsaw;let serial=0;
  window.ArcadeGames.jigsaw=function(host,options={}){
    const scope=S.createScope(),prefix=`jigsaw-${++serial}`;let settings={size:3,scene:'lotus'},state=L.createGame(settings),started=false,selected=null,hint=null,preview=false,drag=null,ghost=null,suppressClick=false,finished=false,lastSecond=-1;
    const ui=S.buildUI(host,{className:'family-workspace jigsaw-workspace',
      toolbar:'<div class="family-heading"><small>TỪNG MẢNH NHỎ · MỘT BỨC TRANH</small><strong>Ghép một chiều yên</strong></div>'+S.stat('ĐÃ GHÉP','pieces','0 / 9')+S.stat('THỜI GIAN','time','0:00'),
      board:'<div class="jigsaw-layout"><div class="jigsaw-settings"><label class="family-option">Bức tranh<select data-jigsaw-scene>'+L.SCENES.map(s=>`<option value="${s.id}">${s.title}</option>`).join('')+'</select></label><label class="family-option">Số mảnh<select data-jigsaw-size><option value="3">9 mảnh</option><option value="4">16 mảnh</option><option value="5">25 mảnh</option></select></label></div><div class="jigsaw-board" role="group" aria-label="Khung ghép hình"><svg class="jigsaw-reference" viewBox="0 0 600 600" aria-hidden="true"></svg><div class="jigsaw-slots"></div></div><p class="family-caption">Chọn mảnh rồi chạm vị trí · Hoặc kéo mảnh vào khung</p><div class="jigsaw-tray-heading"><strong>Những mảnh còn lại</strong><span data-jigsaw-selection>Chọn một mảnh</span></div><div class="jigsaw-tray" role="group" aria-label="Các mảnh ghép"></div></div>',
      controls:'<button class="control-button" data-jigsaw-preview aria-pressed="false">Xem ảnh mẫu</button><button class="control-button" data-jigsaw-hint>Gợi ý vị trí</button><details class="family-rules"><summary>Chơi thong thả</summary><p>Chọn một mảnh bên dưới, rồi chạm đúng ô trên khung; cũng có thể kéo bằng chuột hoặc ngón tay. Mảnh đúng tự khớp và khóa tại chỗ, mảnh sai trở lại khay. Không xoay mảnh, không giới hạn thời gian.</p><p>Ba tranh vẽ riêng, mỗi tranh có 9, 16 hoặc 25 mảnh. Xem ảnh mẫu không trừ điểm; mỗi gợi ý −50, mỗi lần đặt sai −10, tối thiểu 100 điểm khi hoàn thành. Đổi tranh/số mảnh bắt đầu lượt mới.</p></details>'});
    const $=sel=>ui.workspace.querySelector(sel);let slots=[],pieces=[];
    function pieceArt(id,kind){
      const clip=`${prefix}-${kind}-${id}`,path=L.path(state.size,id),x=id%state.size,y=Math.floor(id/state.size);
      return `<svg viewBox="-24 -24 148 148" width="148" height="148" aria-hidden="true"><defs><clipPath id="${clip}"><path d="${path}"/></clipPath></defs><g clip-path="url(#${clip})"><g transform="translate(${-x*100} ${-y*100}) scale(${state.size/6})">${window.ArcadeJigsawArt.scene(state.scene)}</g></g><path d="${path}" fill="none" stroke="#456557" stroke-width=".8" stroke-linejoin="round"/></svg>`;
    }
    function cancelDrag(){
      const previous=drag;drag=null;if(previous){try{previous.button.releasePointerCapture(previous.pointer);}catch{}}ghost?.remove();ghost=null;
    }
    function build(){
      cancelDrag();$('.jigsaw-reference').innerHTML=window.ArcadeJigsawArt.scene(state.scene);
      $('.jigsaw-slots').style.setProperty('--pieces',state.size);$('.jigsaw-slots').replaceChildren();$('.jigsaw-tray').replaceChildren();
      slots=Array.from({length:state.placed.length},(_,i)=>{const b=document.createElement('button');b.type='button';b.className='jigsaw-slot';b.dataset.jigsawSlot=i;b.setAttribute('aria-label',`Vị trí hàng ${Math.floor(i/state.size)+1}, cột ${i%state.size+1}`);$('.jigsaw-slots').append(b);return b;});
      pieces=state.order.map(id=>{const b=document.createElement('button');b.type='button';b.className='jigsaw-piece';b.dataset.jigsawPiece=id;b.setAttribute('aria-label',`Chọn mảnh ${id+1}`);b.innerHTML=pieceArt(id,'tray');$('.jigsaw-tray').append(b);return b;});
    }
    function render(){
      pieces.forEach(b=>{const id=Number(b.dataset.jigsawPiece);b.hidden=state.placed[id];b.disabled=!started||finished;b.classList.toggle('is-selected',id===selected);b.setAttribute('aria-pressed',String(id===selected));});
      slots.forEach((b,i)=>{b.disabled=!started||finished||state.placed[i]||selected==null;b.classList.toggle('is-filled',state.placed[i]);b.classList.toggle('is-hint',hint===i);if(state.placed[i]&&!b.firstChild)b.innerHTML=pieceArt(i,'board');});
      $('.jigsaw-board').classList.toggle('is-preview',preview);$('[data-jigsaw-preview]').setAttribute('aria-pressed',String(preview));
      $('[data-jigsaw-preview]').textContent=preview?'Ẩn ảnh mẫu':'Xem ảnh mẫu';$('[data-jigsaw-hint]').disabled=!started||finished;
      $('[data-jigsaw-selection]').textContent=selected==null?'Chọn một mảnh':`Đã chọn mảnh ${selected+1}`;
      ui.setStat('pieces',`${state.count} / ${state.placed.length}`);ui.workspace.dataset.phase=state.phase;ui.workspace.dataset.placed=state.count;
    }
    function place(id,slot){
      if(!started||finished)return;const result=L.place(state,id,slot);
      if(result.ok){selected=hint=null;ui.message('Khớp rồi! Tìm tiếp một mảnh nhé.');}
      else if(result.mismatch)ui.message('Mảnh này chưa khớp ở đây. Thử vị trí khác nhé.');
      render();
      if(state.phase==='finished'&&!finished){finished=true;render();S.result(ui,scope,{title:'Bức tranh đã trọn vẹn!',detail:`${L.SCENES.find(s=>s.id===state.scene).title} · ${state.placed.length} mảnh · ${state.mistakes} lần đặt sai · ${state.hints} gợi ý.`,score:state.score,onScore:options.onScore,onAgain:restart});}
    }
    function restart(){scope.clearTimers();S.clearOverlays(ui);cancelDrag();state=L.createGame(settings);started=true;finished=false;selected=hint=null;preview=false;lastSecond=-1;suppressClick=false;build();render();ui.message('Một mảnh nhỏ, thêm một chút bình yên.');}
    scope.on($('.jigsaw-tray'),'click',e=>{if(suppressClick){suppressClick=false;return;}const b=e.target.closest('[data-jigsaw-piece]');if(!b||b.disabled||!started||finished)return;selected=Number(b.dataset.jigsawPiece);hint=null;render();});
    scope.on($('.jigsaw-slots'),'click',e=>{const b=e.target.closest('[data-jigsaw-slot]');if(b&&!b.disabled&&selected!=null)place(selected,Number(b.dataset.jigsawSlot));});
    scope.on($('.jigsaw-tray'),'pointerdown',e=>{
      const b=e.target.closest('[data-jigsaw-piece]');if(!b||b.disabled||e.button!==0)return;
      cancelDrag();suppressClick=false;drag={id:Number(b.dataset.jigsawPiece),button:b,pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture(e.pointerId);
    });
    scope.on($('.jigsaw-tray'),'pointermove',e=>{
      if(!drag||e.pointerId!==drag.pointer)return;
      if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){drag.moved=true;selected=drag.id;hint=null;ghost=document.createElement('div');ghost.className='jigsaw-drag-ghost';ghost.innerHTML=pieceArt(drag.id,'drag');document.body.append(ghost);render();}
      if(ghost){ghost.style.left=`${e.clientX-45}px`;ghost.style.top=`${e.clientY-45}px`;}
    });
    scope.on($('.jigsaw-tray'),'pointerup',e=>{
      if(!drag||e.pointerId!==drag.pointer)return;
      const current=drag,slot=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-jigsaw-slot]');
      cancelDrag();if(current.moved){suppressClick=true;if(slot&&ui.workspace.contains(slot))place(current.id,Number(slot.dataset.jigsawSlot));}
    });
    for(const name of ['pointercancel','lostpointercapture'])scope.on($('.jigsaw-tray'),name,()=>{if(drag)cancelDrag();},true);
    scope.on(window,'blur',cancelDrag,true);scope.onPause(cancelDrag);scope.cleanup(cancelDrag);
    scope.on($('[data-jigsaw-preview]'),'click',()=>{preview=!preview;render();});
    scope.on($('[data-jigsaw-hint]'),'click',()=>{if(!started||finished)return;const id=L.hint(state);if(id!=null){selected=hint=id;render();ui.message('Mảnh được chọn khớp ô viền vàng. Gợi ý trừ 50 điểm.');}});
    for(const k of ['scene','size'])scope.on($(`[data-jigsaw-${k}]`),'change',e=>{settings[k]=k==='size'?Number(e.target.value):e.target.value;restart();});
    scope.loop(dt=>{if(!started||finished)return;L.tick(state,dt);const sec=Math.floor(state.seconds);if(sec!==lastSecond){lastSecond=sec;ui.setStat('time',`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`);}});
    build();render();S.intro(ui,scope,{title:'Ghép một chiều yên',symbol:'puzzle',detail:'Hồ sen, phố đèn lồng hay lòng đại dương? Chọn từng mảnh để hoàn thành tranh với 9, 16 hoặc 25 mảnh. Kéo thả hoặc chạm đều được.',onStart(){started=true;render();}});
    return S.handle(scope,restart);
  };
})();
