(function(){
  'use strict';const S=window.ArcadeShared,L=window.ArcadeRiddles,key='tram-choi.riddles.solved.v1';
  window.ArcadeGames.riddles=function(host,options={}){
    const scope=S.createScope(),known=new Set(L.QUESTIONS.map(q=>q.id));let solved=[];
    try{const stored=JSON.parse(localStorage.getItem(key));if(Array.isArray(stored))solved=[...new Set(stored.filter(id=>known.has(id)))];}catch{}
    let category='all',state=L.createGame({solved}),started=false,finished=false;
    const ui=S.buildUI(host,{className:'family-workspace riddles-workspace',toolbar:'<div class="family-heading"><small>NHÌN HÌNH · NGHĨ CHỮ · BẬT CƯỜI</small><strong>Đuổi hình bắt chữ</strong></div>'+S.stat('ĐIỂM','score',0)+S.stat('CÂU','round','1 / 10'),
      board:'<div class="riddles-paper"><div class="riddles-top"><label class="family-option">Chủ đề<select data-riddle-category>'+Object.entries(L.CATEGORIES).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')+'</select></label><span data-riddle-progress></span></div><p class="riddles-eyebrow">GHÉP Ý TỪ NHỮNG HÌNH SAU</p><div class="riddles-pictures" aria-label="Các hình gợi ý"></div><p class="riddles-length" data-riddle-length></p><p class="riddles-hint" data-riddle-clue role="status"></p><form class="riddles-form"><label class="sr-only" for="riddle-answer">Đáp án của bạn</label><input id="riddle-answer" maxlength="130" autocomplete="off" spellcheck="false" placeholder="Bạn đoán là gì?" enterkeyhint="send"><button class="control-button primary" type="submit">Trả lời</button></form><div class="riddles-feedback" data-riddle-feedback role="status"></div><button class="control-button primary" data-riddle-next hidden>Câu tiếp theo →</button></div>',
      controls:'<button class="control-button" data-riddle-hint>Gợi ý · 2 lần</button><button class="control-button" data-riddle-skip>Xem đáp án</button><details class="family-rules"><summary>Mỗi hình là một gợi ý</summary><p>Ghép tên, ý nghĩa hoặc âm đọc từ các biểu tượng. Có cả từ ghép, đồ vật và thành ngữ. Chấp nhận có dấu hoặc không dấu, không phân biệt viết hoa và khoảng trắng.</p><p>Mỗi lượt 10 câu trong kho 150 câu. Ưu tiên câu bạn chưa giải, không giới hạn thời gian. Đúng được 100 điểm, mỗi lần đoán sai −10 và gợi ý −20, tối thiểu 10 điểm. Xem đáp án không có điểm. Tiến độ câu đã giải được lưu trên máy.</p></details>'});
    const $=q=>ui.workspace.querySelector(q),input=$('#riddle-answer');
    function save(){try{localStorage.setItem(key,JSON.stringify(solved));}catch{}}
    function render(){
      const q=L.current(state),answer=state.phase!=='question';
      $('.riddles-pictures').replaceChildren(...q.pictures.map((picture,i)=>{const el=document.createElement('span');el.className='riddle-picture';el.textContent=picture;el.setAttribute('role','img');el.setAttribute('aria-label',`Hình ${i+1}: ${picture}`);return el;}));
      $('[data-riddle-length]').textContent=`${q.answer.split(' ').length} tiếng · ${L.CATEGORIES[q.category]}`;
      $('[data-riddle-progress]').textContent=`Đã khám phá ${solved.length} / ${L.QUESTIONS.length}`;
      ui.setStat('score',state.score);ui.setStat('round',`${state.index+1} / ${state.order.length}`);
      input.disabled=!started||answer;$('.riddles-form button').disabled=!started||answer;
      $('[data-riddle-next]').hidden=!answer||finished;$('[data-riddle-next]').textContent=state.index===9?'Xem kết quả →':'Câu tiếp theo →';
      $('[data-riddle-hint]').disabled=!started||answer||state.hints>=2;$('[data-riddle-hint]').textContent=`Gợi ý · ${2-state.hints} lần`;$('[data-riddle-skip]').disabled=!started||answer;
      if(answer){const feedback=$('[data-riddle-feedback]');feedback.replaceChildren();const title=document.createElement('strong');title.textContent=q.answer;const detail=document.createElement('p');detail.textContent=q.explanation;const points=document.createElement('small');points.textContent=state.last.correct?`Đúng rồi! +${state.last.points} điểm`:'Đã xem đáp án · 0 điểm';feedback.append(title,detail,points);}
      ui.workspace.dataset.phase=state.phase;ui.workspace.dataset.index=state.index;ui.message('Không cần gõ dấu. Thử đọc từng hình rồi ghép lại thành một từ hoặc một câu.');
    }
    function clean(){input.value='';$('[data-riddle-clue]').textContent='';$('[data-riddle-feedback]').textContent='';}
    function restart(){scope.clearTimers();S.clearOverlays(ui);state=L.createGame({category,solved});started=true;finished=false;clean();render();input.focus({preventScroll:true});}
    scope.on($('.riddles-form'),'submit',e=>{e.preventDefault();if(!started||finished)return;const result=L.submit(state,input.value);if(result.ok){solved=[...new Set([...solved,...state.solved])];save();render();$('[data-riddle-next]').focus({preventScroll:true});}else{if(state.phase==='question')$('[data-riddle-feedback]').textContent=result.empty?'Nhập một đáp án trước nhé.':'Chưa khớp, thử nhìn lại các hình nhé. Mỗi lần đoán sai trừ 10 điểm câu này.';input.select();}});
    scope.on($('[data-riddle-hint]'),'click',()=>{const clue=L.hint(state);if(clue){$('[data-riddle-clue]').textContent=clue;render();input.focus({preventScroll:true});}});
    scope.on($('[data-riddle-skip]'),'click',()=>{if(L.skip(state)){render();$('[data-riddle-next]').focus({preventScroll:true});}});
    scope.on($('[data-riddle-next]'),'click',()=>{if(!L.next(state))return;clean();if(state.phase==='finished'){finished=true;S.result(ui,scope,{title:'Thêm một kho từ thú vị!',detail:`Bạn giải đúng ${state.correct}/10 câu, xem đáp án ${state.skipped} câu. Lượt sau ưu tiên những câu chưa giải.`,score:state.score,onScore:options.onScore,onAgain:restart});}render();if(!finished)input.focus({preventScroll:true});});
    scope.on($('[data-riddle-category]'),'change',e=>{category=e.target.value;restart();});
    render();S.intro(ui,scope,{title:'Hình quen, chữ bất ngờ',symbol:'puzzle',detail:'150 câu về thiên nhiên, đời sống và thành ngữ. Mỗi lượt 10 câu, có gợi ý và lời giải. Cứ thong thả đoán nhé!',onStart(){started=true;render();scope.after(.05,()=>input.focus({preventScroll:true}));}});
    return S.handle(scope,restart);
  };
})();
