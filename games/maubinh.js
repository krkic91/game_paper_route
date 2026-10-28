(function(){
  'use strict';const S=window.ArcadeShared,L=window.ArcadeMaubinh,A=window.ArcadeVNCardUI,names=['Bạn','Máy 1','Máy 2','Máy 3'],rows=['Chi trên · 3 lá','Chi giữa · 5 lá','Chi dưới · 5 lá'];
  window.ArcadeGames.maubinh=function(host,options={}){
    const scope=S.createScope();let state=L.createGame(),selected=null,started=false,busy=false,history=[],lastSecond=-1;
    const ui=S.buildUI(host,{className:'family-workspace maubinh-workspace',toolbar:'<div class="family-heading"><small>MƯỜI BA LÁ · BA THẾ BÀI</small><strong>Mậu binh</strong></div>'+S.stat('ĐÃ XẾP','arranged','0 / 13')+S.stat('THỜI GIAN','time','0:00'),
      board:'<div class="binh-layout"><div class="binh-opponents">'+[1,2,3].map(p=>`<span><i>${p}</i>${names[p]} · 13 lá úp</span>`).join('')+'</div><p class="binh-instruction">Chọn lá → chạm ô trống để xếp · Chọn hai lá để đổi chỗ</p><div class="binh-rows">'+rows.map((title,i)=>`<section class="binh-row"><div><strong>${title}</strong><span data-binh-name="${i}"></span></div><div class="binh-slots" data-binh-row="${i}" role="group" aria-label="${title}"></div></section>`).join('')+'</div><div class="family-scoreline"><strong>Các lá chưa xếp</strong><span data-binh-selected>Chưa chọn lá</span></div><div class="vn-hand binh-bank" data-binh-bank role="group" aria-label="Các lá chưa xếp"></div><p class="binh-validation" data-binh-validation role="status"></p><div class="binh-results" data-binh-results hidden></div></div>',
      controls:'<button class="control-button primary" data-binh-submit>So bài</button><button class="control-button" data-binh-hint>Gợi ý xếp</button><button class="control-button" data-binh-return>Trả lá về khay</button><button class="control-button" data-binh-undo>Hoàn tác</button><button class="control-button" data-binh-clear>Xếp lại từ đầu</button><button class="control-button primary" data-binh-again hidden>Chia ván mới</button><details class="family-rules"><summary>Ba chi, mạnh dần từ trên xuống</summary><p>Mỗi người 13 lá: chi trên 3, giữa 5, dưới 5. Chi dưới phải mạnh bằng hoặc hơn chi giữa, chi giữa mạnh bằng hoặc hơn chi trên; sai là binh lủng. Bàn này chặn việc gửi bài lủng để bạn sửa lại, không có đồng hồ đếm ngược.</p><p>Thứ tự: mậu thầu, đôi, thú, sám cô, sảnh, thùng, cù lũ, tứ quý, thùng phá sảnh. Chi 3 lá chỉ xét mậu thầu, đôi, sám cô. A cao nhất; A2345 là sảnh thấp nhất, không QKA23. Không so chất. Cùng bộ so nhóm chính trước rồi các lá lẻ từ lớn xuống nhỏ.</p><p>So từng chi với từng đối thủ: thắng +1, thua −1, bằng 0. Thắng cả ba chi một người được +6, người kia −6. Cộng cả sáu cặp để xếp hạng; không xét tới trắng hoặc thưởng bộ đặc biệt. Đây là bàn gia đình, không cược. Gợi ý và máy chỉ dùng 13 lá của chính mình.</p></details>'});
    const $=q=>ui.workspace.querySelector(q),active=()=>started&&!busy&&state.phase==='arrange';
    function remember(){history.push(state.groups.map(g=>g.slice()));if(history.length>50)history.shift();}
    function card(c){const b=A.card(c,'data-binh-card');b.disabled=!active();b.classList.toggle('is-selected',c===selected);b.setAttribute('aria-pressed',String(c===selected));return b;}
    function render(){
      for(let i=0;i<3;i++){
        const group=state.groups[i],slots=$(`[data-binh-row="${i}"]`);slots.replaceChildren(...group.map(card));
        for(let n=group.length;n<L.SIZES[i];n++){const b=document.createElement('button');b.type='button';b.className='binh-empty';b.dataset.binhTo=i;b.textContent='+';b.setAttribute('aria-label',`Xếp lá đã chọn vào ${rows[i]}`);b.disabled=!active()||selected==null;slots.append(b);}
        const value=L.evaluate(group);$(`[data-binh-name="${i}"]`).textContent=value?L.NAMES[value[0]]:`${group.length}/${L.SIZES[i]}`;
      }
      const used=new Set(state.groups.flat());$('[data-binh-bank]').replaceChildren(...state.hand.filter(c=>!used.has(c)).map(card));
      $('[data-binh-selected]').textContent=selected==null?'Chưa chọn lá':window.ArcadeVNCards.name(selected);
      const valid=L.validate(state.hand,state.groups);$('[data-binh-validation]').textContent=busy?'Máy đang hoàn tất ba chi…':state.phase==='finished'?'Các chi đã được so công khai.':valid.ok?'Ba chi hợp lệ. Bạn đã sẵn sàng so bài.':valid.error;
      $('[data-binh-validation]').classList.toggle('is-valid',valid.ok);ui.setStat('arranged',`${used.size} / 13`);
      $('[data-binh-submit]').disabled=!active()||!valid.ok;$('[data-binh-hint]').disabled=!active();$('[data-binh-return]').disabled=!active()||selected==null||!used.has(selected);$('[data-binh-undo]').disabled=!active()||!history.length;$('[data-binh-clear]').disabled=!active()||!used.size;
      $('[data-binh-again]').hidden=state.phase!=='finished';ui.workspace.dataset.phase=state.phase;ui.message('Chọn hai lá để đổi vị trí, kể cả một lá đang ở khay. Gợi ý xếp giúp bạn tìm một bộ ba chi hợp lệ.');
    }
    function showResults(){
      const result=state.result,box=$('[data-binh-results]');box.hidden=false;box.replaceChildren();
      const title=document.createElement('h3');title.textContent=result.winners.map(p=>names[p]).join(' & ')+' dẫn đầu';box.append(title);
      const table=document.createElement('table');table.innerHTML='<caption>Kết quả của bạn với từng máy</caption><thead><tr><th>Đối thủ</th><th>Trên</th><th>Giữa</th><th>Dưới</th><th>Tổng</th></tr></thead><tbody></tbody>';
      for(const pair of result.pairs.filter(p=>p.a===0)){const tr=document.createElement('tr');tr.innerHTML=`<th>${names[pair.b]}</th>${pair.rows.map(v=>`<td>${v>0?'+1':v<0?'−1':'0'}</td>`).join('')}<td>${pair.total>0?'+':''}${pair.total}${pair.sweep?' × sập':''}</td>`;table.tBodies[0].append(tr);}box.append(table);
      const totals=document.createElement('p');totals.textContent='Tổng chi: '+result.points.map((p,i)=>`${names[i]} ${p>0?'+':''}${p}`).join(' · ');box.append(totals);
      for(const p of [1,2,3]){const detail=document.createElement('details');detail.className='binh-reveal';const summary=document.createElement('summary');summary.textContent=`Xem bài ${names[p]}`;detail.append(summary);result.layouts[p].forEach((group,i)=>{const row=document.createElement('div'),label=document.createElement('small');label.textContent=`${rows[i]} · ${L.NAMES[result.values[p][i][0]]}`;const cards=document.createElement('div');cards.className='binh-reveal-cards';cards.append(...group.map(c=>A.card(c)));row.append(label,cards);detail.append(row);});box.append(detail);}
      options.onScore?.(result.winners.includes(0)?100:0);title.tabIndex=-1;title.focus({preventScroll:true});
    }
    function restart(){scope.clearTimers();S.clearOverlays(ui);state=L.createGame();selected=null;history=[];started=true;busy=false;lastSecond=-1;$('[data-binh-results]').hidden=true;$('[data-binh-results]').replaceChildren();render();}
    scope.on($('.binh-layout'),'click',e=>{
      if(!active())return;const cardButton=e.target.closest('[data-binh-card]'),target=e.target.closest('[data-binh-to]');
      if(cardButton){const c=Number(cardButton.dataset.binhCard);if(selected===c)selected=null;else if(selected!=null){remember();if(!L.swap(state,selected,c))history.pop();selected=null;}else selected=c;render();}
      else if(target&&selected!=null){remember();if(!L.assign(state,selected,Number(target.dataset.binhTo)))history.pop();selected=null;render();}
    });
    scope.on($('[data-binh-return]'),'click',()=>{if(!active()||selected==null)return;remember();if(!L.assign(state,selected,-1))history.pop();selected=null;render();});
    scope.on($('[data-binh-hint]'),'click',()=>{if(!active())return;remember();L.hint(state);selected=null;render();});
    scope.on($('[data-binh-clear]'),'click',()=>{if(!active())return;remember();L.clear(state);selected=null;render();});
    scope.on($('[data-binh-undo]'),'click',()=>{if(!active()||!history.length)return;state.groups=history.pop();selected=null;render();});
    scope.on($('[data-binh-submit]'),'click',()=>{if(!active()||!L.validate(state.hand,state.groups).ok)return;busy=true;render();scope.after(.1,()=>{const result=L.submit(state);busy=false;selected=null;render();if(result.ok)showResults();else ui.message(result.error);});});
    scope.on($('[data-binh-again]'),'click',restart);scope.loop(dt=>{if(!started||state.phase!=='arrange'||busy)return;L.tick(state,dt);const t=Math.floor(state.seconds);if(t!==lastSecond){lastSecond=t;ui.setStat('time',`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`);}});
    render();S.intro(ui,scope,{title:'Xếp bài, đọc thế',symbol:'cards',detail:'Bạn và ba máy, mỗi người 13 lá. Tự chia thành ba chi hoặc dùng gợi ý, rồi so từng chi với cả bàn. Không giới hạn thời gian.',onStart(){started=true;render();}});
    return S.handle(scope,restart);
  };
})();
