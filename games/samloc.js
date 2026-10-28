(function(){
  'use strict';const S=window.ArcadeShared,L=window.ArcadeSamloc,C=window.ArcadeVNCards,A=window.ArcadeVNCardUI,names=['Bạn','Máy 1','Máy 2','Máy 3'];
  window.ArcadeGames.samloc=function(host,options={}){
    const scope=S.createScope();let state=L.createGame(),started=false,finished=false,selection=new Set(),history=[];
    const ui=S.buildUI(host,{className:'family-workspace samloc-workspace',toolbar:'<div class="family-heading"><small>MƯỜI LÁ · MỘT BÀN QUEN</small><strong>Sâm lốc</strong></div>'+S.stat('VÒNG','round',1),
      board:'<div class="vn-table-layout"><div class="vn-table"><div class="vn-seats">'+[1,2,3].map(p=>`<div class="vn-seat" data-sam-player="${p}"><i>${p}</i><strong>${names[p]}</strong><span data-count>10 lá</span><small data-status></small></div>`).join('')+'</div><p class="vn-turn" data-sam-turn></p><div class="vn-trick" data-sam-trick></div><p class="vn-note" data-sam-note></p></div><div class="sam-declare" data-sam-declare><strong>Bạn có muốn báo sâm?</strong><p>Giành quyền đi trước; phải đánh hết bài mà không ai chặn được, kể cả bộ cuối.</p><div><button class="control-button primary" data-sam-call>Báo sâm</button><button class="control-button" data-sam-normal>Chơi thường</button></div></div><div class="family-scoreline"><strong>Bài của bạn</strong><span data-sam-count></span></div><div class="vn-hand" data-sam-hand role="group" aria-label="Bài của bạn"></div><p class="vn-selection" data-sam-selection></p></div>',
      controls:'<button class="control-button primary" data-sam-play>Đánh bài</button><button class="control-button" data-sam-pass>Bỏ lượt</button><button class="control-button" data-sam-hint>Gợi ý</button><button class="control-button" data-sam-unselect>Bỏ chọn</button><details class="family-rules"><summary>Diễn biến ván</summary><ol data-sam-history></ol></details><details class="family-rules"><summary>Luật Sâm của bàn này</summary><p>Bạn đấu 3 máy, mỗi người 10 lá, 12 lá dư không dùng. Lẻ/đôi/sám/tứ quý theo 3…K, A, 2; không so chất. Sảnh từ 3 lá, A23 nhỏ nhất, 234 tiếp theo; QKA lớn nhất, không KA2. Tứ quý chặt một lá 2 hoặc tứ quý nhỏ hơn; không có đôi thông.</p><p>Người có số nhỏ nhất mở ván đầu (hòa ưu tiên ghế Bạn → Máy 3); ván sau người thắng mở. Các bộ ăn trắng theo thứ tự: sảnh 10 lá, tứ quý 2, cùng màu, 3 sám cô, 5 đôi. Hòa loại ăn trắng ưu tiên thứ tự ghế.</p><p>Quyền báo sâm xét theo lượt Bạn → Máy 3; ai báo đầu tiên được đi trước. Chỉ cần bị chặn một lần là thua sâm, người chặn thắng. Bộ cuối của người báo vẫn phải đợi cả ba đối thủ bỏ lượt.</p><p>Bỏ lượt thì đợi vòng mới. Còn 1 lá được tự báo; người ngồi ngay trước khi đánh lẻ phải đánh lá lớn nhất. Về bằng lẻ/đôi/sám/tứ quý 2 là thua thối 2; sảnh chứa 2 được về. Không tính cược, cóng, đền cửa hoặc phạt tiền. Thắng thường 100, báo sâm thành công 200 điểm.</p></details>'});
    const $=q=>ui.workspace.querySelector(q),canAct=()=>started&&!finished&&state.phase==='play'&&state.current===0;
    function chosen(){return [...selection].sort((a,b)=>a-b);}
    function legal(){const key=chosen().join(',');return L.legalMoves(state,0).some(m=>m.cards.slice().sort((a,b)=>a-b).join(',')===key);}
    function render(){
      const v=L.view(state),cards=v.hand.slice().sort(L.order);
      $('[data-sam-hand]').replaceChildren(...cards.map(c=>{const b=A.card(c,'data-sam-card');b.classList.toggle('is-selected',selection.has(c));b.setAttribute('aria-pressed',String(selection.has(c)));b.disabled=!canAct();return b;}));
      for(const p of [1,2,3]){const el=$(`[data-sam-player="${p}"]`);el.classList.toggle('is-active',started&&!finished&&v.current===p);el.querySelector('[data-count]').textContent=v.counts[p]+' lá';el.querySelector('[data-status]').textContent=v.counts[p]===1?'BÁO 1 LÁ':v.phase==='declare'?v.declarations[p]==null?'Đang xem bài':v.declarations[p]?'Báo sâm':'Chơi thường':v.caller===p?'Đã báo sâm':v.passed[p]?'Bỏ lượt':'Máy';}
      $('[data-sam-count]').textContent=cards.length===1?'BÁO 1 LÁ':`${cards.length} lá`;
      $('[data-sam-turn]').textContent=finished?'Ván đã kết thúc':!started?'Sẵn sàng chia bài':v.phase==='declare'?`${names[v.current]} đang chọn báo sâm`:`Lượt ${names[v.current]}`;
      $('[data-sam-trick]').replaceChildren(...(v.trick?v.trick.cards.map(c=>A.card(c)):[]));
      $('[data-sam-note]').textContent=v.trick?`${names[v.trick.player]} · ${L.comboName(v.trick.combo)}`:v.phase==='declare'?'Xem bài rồi chọn báo sâm hoặc chơi thường.':`${names[v.current]} mở vòng mới`;
      $('[data-sam-declare]').hidden=!started||finished||v.phase!=='declare'||v.current!==0;
      $('[data-sam-selection]').textContent=selection.size?`${L.comboName(L.classify(chosen()))} · ${legal()?'Có thể đánh':'Chưa hợp lệ cho lượt này'}`:canAct()?'Chọn một hoặc nhiều lá để đánh.':'Chờ đến lượt của bạn.';
      $('[data-sam-play]').disabled=!canAct()||!legal();$('[data-sam-pass]').disabled=!canAct()||!v.trick;$('[data-sam-hint]').disabled=!canAct();$('[data-sam-unselect]').disabled=!selection.size;
      $('[data-sam-history]').replaceChildren(...history.slice(-10).map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
      ui.setStat('round',v.round);ui.workspace.dataset.phase=v.phase;ui.workspace.dataset.turn=v.turn;ui.workspace.dataset.current=v.current;
      ui.message(v.caller!=null?`${names[v.caller]} đã báo sâm. Một lần bị chặn là kết thúc ván.`:'Chỉ so số, không so chất. Tứ quý chặt được một lá 2.');
    }
    function finish(){
      if(state.phase!=='finished'||finished)return false;finished=true;scope.clearTimers();render();
      const white=['','5 đôi','3 sám cô','10 lá cùng màu','tứ quý 2','sảnh 10 lá'][state.white];
      const detail=state.reason==='white'?`${names[state.winner]} ăn trắng với ${white}.`:state.reason==='sam-blocked'?`${names[state.loser]} bị chặn; ${names[state.winner]} thắng ván.`:state.reason==='last-two'?`${names[state.loser]} về bằng bộ 2 và thua thối 2.`:state.reason==='sam'?`${names[state.winner]} đánh hết bài mà không ai chặn được.`:`${names[state.winner]} hết 10 lá trước.`;
      const win=state.winner===0||(state.reason==='last-two'&&state.loser!==0),score=win?(state.reason==='sam'?200:100):0;
      S.result(ui,scope,{title:state.winner==null?'Ván kết thúc: thối 2':`${names[state.winner]} thắng!`,detail,score,win,onScore:options.onScore,onAgain:restart});return true;
    }
    function schedule(){scope.clearTimers();if(!started||finished||state.current===0)return;scope.after(.55,()=>act(L.chooseMove(state)));}
    function act(m){if(!started||finished||!m)return;const p=state.current;const ok=m.type==='declare'?L.declare(state,p,m.call):m.type==='pass'?L.pass(state,p):L.play(state,p,m.cards);if(!ok)return;history.push(`${names[p]} ${m.type==='declare'?(m.call?'báo sâm':'chơi thường'):m.type==='pass'?'bỏ lượt':'đánh '+m.cards.map(C.name).join(', ')}.`);selection.clear();render();if(!finish())schedule();}
    function restart(){const first=state.winner;scope.clearTimers();S.clearOverlays(ui);state=L.createGame({first});selection.clear();history=[];started=true;finished=false;render();if(!finish())schedule();}
    scope.on($('[data-sam-hand]'),'click',e=>{const b=e.target.closest('[data-sam-card]');if(!b||b.disabled||!canAct())return;const c=Number(b.dataset.samCard);selection.has(c)?selection.delete(c):selection.add(c);render();});
    scope.on($('[data-sam-play]'),'click',()=>{if(canAct())act({type:'play',cards:chosen()});});scope.on($('[data-sam-pass]'),'click',()=>{if(canAct())act({type:'pass'});});
    scope.on($('[data-sam-hint]'),'click',()=>{if(!canAct())return;const m=L.chooseMove(state);selection=new Set(m.cards||[]);render();if(m.type==='pass')ui.message('Chưa có bộ chặn hợp lệ. Bạn có thể bỏ lượt.');});
    scope.on($('[data-sam-unselect]'),'click',()=>{selection.clear();render();});scope.on($('[data-sam-call]'),'click',()=>act({type:'declare',call:true}));scope.on($('[data-sam-normal]'),'click',()=>act({type:'declare',call:false}));
    render();S.intro(ui,scope,{title:'Mời bạn vào bàn Sâm',symbol:'cards',detail:'Mỗi người 10 lá, ai hết trước thắng. Chỉ so số, không so chất. Tự tin vào bài của mình? Thử báo sâm để giành quyền đi trước!',onStart(){started=true;render();if(!finish())schedule();}});
    return S.handle(scope,restart);
  };
})();
