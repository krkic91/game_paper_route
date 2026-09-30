// version v1.0
/* Delivery Dash 3D uses the untouched original GameCore rules. */
(function () {
  'use strict';
  const A=window.Arcade3D,S=window.ArcadeShared,C=window.GameCore,{icon}=window.ArcadeArt;
  A.mountDelivery=function(host,options){
    const scope=S.createScope();
    const ui=S.canvasUI(host,900,550,{
      className:'delivery-three-workspace',renderer:'3d',label:'Delivery Dash 3D — giao báo bằng xe đạp',
      toolbar:S.stat('ĐÃ GIAO','delivered','0 / 24')+S.stat('ĐIỂM','score',0)+S.stat('TỜ BÁO','papers',36)+S.stat('MẠNG','hearts','♥ ♥ ♥')+S.stat('TIẾN ĐỘ','progress','0%'),
      controls:`<button class="control-button steering-button" data-hold="left" aria-label="Giữ để lái trái">${icon('arrow-left')}</button><button class="control-button" data-hold="pedal">${icon('bike')}Giữ đạp xe</button><button class="control-button throw-button" data-throw="auto">${icon('arrow-up-right')}Ném báo</button><button class="control-button steering-button" data-hold="right" aria-label="Giữ để lái phải">${icon('arrow-right')}</button>`,
    });
    let view;
    try{view=A.drivingScene(ui,scope,true);}catch(error){scope.destroy();throw error;}
    const input=S.heldInput(scope,ui,{left:['a','arrowleft'],right:['d','arrowright'],pedal:['w','arrowup'],brake:['s','arrowdown']});
    let state,started=false,ended=false,elapsed=0,pending='',gesture=null,steering=0,released=false;
    scope.on(ui.controls,'click',event=>{if(event.target.closest('[data-throw]')&&started&&!ended)pending='auto';});
    scope.on(window,'keydown',event=>{
      const key=S.gameKey(event);if(event.repeat||!started||ended||![' ','j','k'].includes(key))return;
      event.preventDefault();pending=key==='j'?'left':key==='k'?'right':'auto';
    });
    scope.on(ui.canvas,'pointerdown',event=>{
      if(event.button!==0||!started||ended)return;
      event.preventDefault();ui.canvas.setPointerCapture(event.pointerId);
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
    });
    scope.on(ui.canvas,'pointermove',event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const delta=event.clientX-gesture.x;gesture.moved ||= Math.hypot(delta,event.clientY-gesture.y)>9;
      steering=C.clamp(delta/80,-1,1);
    });
    const finishPointer=(event,cancel=false)=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      if(!cancel&&!gesture.moved)pending='auto';gesture=null;steering=0;released=true;
    };
    scope.on(ui.canvas,'pointerup',event=>finishPointer(event));
    scope.on(ui.canvas,'pointercancel',event=>finishPointer(event,true),true);
    scope.on(ui.canvas,'lostpointercapture',event=>finishPointer(event,true),true);
    scope.onPause(()=>{gesture=null;steering=0;pending='';released=true;});
    function stats(){
      ui.setStat('delivered',`${state.delivered} / ${state.mailboxes.length}`);ui.setStat('score',state.score);ui.setStat('papers',state.player.papersLeft);
      ui.setStat('hearts','♥ '.repeat(Math.max(0,state.player.hearts)).trim()||'—');ui.setStat('progress',`${Math.min(100,Math.floor(state.player.z/C.constants.LEVEL_END*100))}%`);
    }
    function draw(dt=0){
      const side=pending==='left'?-1:pending==='right'?1:0;
      view.draw(state,{time:elapsed,target:C.getTargetMailbox(state,side),preview:C.getAimPreview(state,side)},dt);stats();
    }
    function restart(){
      scope.clearTimers();S.clearOverlays(ui);input.clear();state=C.createGameState();view.reset();started=false;ended=false;elapsed=0;pending='';gesture=null;steering=0;released=true;
      ui.message('A / D để lái, W để đạp; Space ném, J trái / K phải. Cảm ứng: kéo để lái, chạm để ném.');
      S.intro(ui,scope,{title:'Chuyến giao báo, thêm một chiều',detail:'Cùng 24 hộp thư và luật chơi nguyên bản — nay trên con phố 3D. Nhìn vòng vàng, ném thật chuẩn và về đích an toàn.',symbol:'bike',onStart:()=>{started=true;}});
      draw();
    }
    scope.loop(dt=>{
      if(started&&!ended){
        const score=state.score,hearts=state.player.hearts,missed=state.missed;
        const keyboard=(input.active('right')?1:0)-(input.active('left')?1:0);
        C.updateGame(state,dt,{steering:keyboard||steering,throttle:input.active('brake')?-1:0,pedal:input.active('pedal'),stopSteering:released&&!keyboard,throwAuto:pending==='auto',throwLeft:pending==='left',throwRight:pending==='right'});
        pending='';released=false;elapsed+=dt;
        if(state.score>score){options.onScore(state.score);ui.message('Giao thành công! +100 điểm. Tìm hộp thư tiếp theo có vòng vàng.');}
        if(state.player.hearts<hearts)ui.message(`Va chạm! Còn ${state.player.hearts} mạng; bạn đang được bảo vệ tạm thời.`);
        else if(state.missed>missed)ui.message('Ném trượt. Chờ vòng vàng khóa vào hộp thư rồi thử lại.');
        if(state.state!=='playing'){
          ended=true;input.clear();
          S.result(ui,scope,{title:state.state==='won'?'Về đích an toàn!':'Úi, ngã xe rồi!',detail:`Đã giao ${state.delivered} / 24 hộp thư. ${state.state==='won'?'Một chuyến đi 3D thật trọn vẹn.':'Thử giảm tốc và né chướng ngại sớm hơn nhé.'}`,score:state.score,win:state.state==='won',onAgain:restart,onScore:options.onScore});
        }
      }
      draw(dt);
    });
    restart();return S.handle(scope,restart);
  };
})();
