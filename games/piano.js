(function () {
  'use strict'; const S = window.ArcadeShared, L = window.ArcadePiano;
  window.ArcadeGames.piano = function (host, options = {}) {
    const scope = S.createScope(); let settings = { song: 'joy', bpm: 90 }, state = L.createGame(settings), started = false, finished = false;
    let audio = null, muted = false, audioUnavailable = false; const voices = new Set();
    const ui = S.buildUI(host,{ className:'family-workspace piano-workspace',
      toolbar:'<div class="family-heading"><small>BỐN PHÍM ĐÀN · MỘT GIAI ĐIỆU</small><strong>Phím đàn vui</strong></div>'+S.stat('ĐIỂM','score',0)+S.stat('CHUỖI','combo',0)+S.stat('CƠ HỘI','hearts','♥ ♥ ♥'),
      board:'<div class="piano-layout"><div class="piano-settings"><label class="family-option">Giai điệu<select data-piano-song>'+L.SONGS.map(song=>`<option value="${song.id}">${song.title}</option>`).join('')+'</select></label><label class="family-option">Nhịp độ<select data-piano-tempo><option value="60">Chậm · 60 BPM</option><option value="90" selected>Vừa · 90 BPM</option><option value="120">Nhanh · 120 BPM</option></select></label></div><p class="piano-credit" data-piano-credit></p><div class="piano-keyboard" role="group" aria-label="Bốn phím đàn D F J K">'+['D','F','J','K'].map((k,i)=>`<button type="button" class="piano-lane" data-piano-lane="${i}" aria-label="Phím ${k}"><span class="piano-key-label">${k}</span></button>`).join('')+'<div class="piano-hitline" aria-hidden="true"></div><div class="piano-judgment" data-piano-judgment aria-live="off"></div></div><progress class="piano-progress" max="1" value="0" aria-label="Tiến độ bản nhạc"></progress><p class="family-caption">Chạm đúng cột khi tâm nốt chạm vạch vàng · D F J K</p></div>',
      controls:'<button class="control-button" data-piano-sound aria-pressed="true">Âm thanh: bật</button><details class="family-rules"><summary>Chạm theo nhịp</summary><p>Các nốt rơi xuống bốn cột. Bấm D, F, J, K hoặc chạm cột khi tâm nốt tới vạch vàng. Nhịp rất chuẩn +100, đúng nhịp +60. Cứ 10 nốt liên tiếp tăng hệ số, tối đa ×4.</p><p>Chạm sai hoặc bỏ lỡ mất một trong 3 cơ hội. Hoàn thành bản nhạc trước khi hết cơ hội. Có hai giây chuẩn bị; đổi bài hoặc nhịp độ bắt đầu lượt mới. Có thể tắt âm thanh và vẫn chơi bằng hình ảnh.</p><p>Âm đàn được tổng hợp tại chỗ. Hai giai điệu cổ điển và một giai điệu viết riêng, không dùng bản thu hay lời bài hát.</p></details>' });
    const $=sel=>ui.workspace.querySelector(sel), lanes=[...ui.workspace.querySelectorAll('[data-piano-lane]')]; let tiles=[];
    function stopVoices(){for(const v of voices){try{v.stop();}catch{}}voices.clear();}
    function enableAudio(){
      if(muted||audioUnavailable)return;
      try { const Audio=window.AudioContext||window.webkitAudioContext; if(!Audio)throw Error('audio'); if(!audio)audio=new Audio(); audio.resume().catch(()=>{audioUnavailable=true;renderSound();}); }
      catch {audioUnavailable=true;renderSound();}
    }
    function renderSound(){const b=$('[data-piano-sound]');b.textContent=audioUnavailable?'Không có âm thanh':`Âm thanh: ${muted?'tắt':'bật'}`;b.setAttribute('aria-pressed',String(!muted&&!audioUnavailable));b.disabled=audioUnavailable;}
    function tone(pitch){
      if(muted||!audio||audio.state!=='running')return;
      const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
      osc.type='triangle';osc.frequency.value=440*Math.pow(2,(pitch-69)/12);
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.18,t+.012);gain.gain.exponentialRampToValueAtTime(.001,t+.45);
      osc.connect(gain);gain.connect(audio.destination);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(t);osc.stop(t+.47);
    }
    function buildNotes(){
      tiles.forEach(el=>el.remove());
      tiles=state.notes.map(n=>{const el=document.createElement('span');el.className='piano-tile';el.setAttribute('aria-hidden','true');el.textContent='♪';lanes[n.lane].append(el);return el;});
      $('[data-piano-credit]').textContent=L.SONGS.find(s=>s.id===state.song).credit;
    }
    function render(){
      state.notes.forEach((n,i)=>{const y=(.82-(n.at-state.time)/2.4)*100,el=tiles[i];el.hidden=n.status!=='pending'||y < -15||y>115;el.style.top=`${y}%`;});
      ui.setStat('score',state.score);ui.setStat('combo',state.combo);ui.setStat('hearts','♥ '.repeat(Math.max(0,state.hearts)).trim()||'—');
      lanes.forEach(b=>{b.disabled=!started||finished;});
      $('[data-piano-judgment]').textContent=state.time<1.7?String(Math.ceil(2-state.time)):state.feedbackUntil>state.time?state.judgment:'';
      $('.piano-progress').value=state.notes.filter(n=>n.status!=='pending').length/state.notes.length;
      ui.workspace.dataset.phase=state.phase;ui.workspace.dataset.hits=state.hits;
    }
    function finish(){if(finished||state.phase!=='finished')return;finished=true;stopVoices();render();S.result(ui,scope,{title:state.won?'Trọn một giai điệu!':'Thử lại một nhịp nhé!',detail:`Đúng ${state.hits}/${state.notes.length} nốt · Chuỗi cao nhất ${state.bestCombo}. Chọn nhịp chậm để làm quen với giai điệu.`,score:state.score,win:state.won,onScore:options.onScore,onAgain:restart});}
    function hit(lane){if(!started||finished)return;enableAudio();const result=L.hit(state,lane);if(result.ok)tone(result.pitch);lanes[lane].classList.add('is-pressed');scope.after(.12,()=>lanes[lane].classList.remove('is-pressed'));render();finish();}
    function restart(){scope.clearTimers();S.clearOverlays(ui);stopVoices();state=L.createGame(settings);started=true;finished=false;lanes.forEach(b=>b.classList.remove('is-pressed'));enableAudio();buildNotes();render();ui.message('Đợi tâm nốt chạm vạch vàng rồi bấm.');}
    for(const [i,b] of lanes.entries()){
      scope.on(b,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();hit(i);});
      scope.on(b,'click',e=>{if(e.detail===0)hit(i);});
    }
    scope.on(window,'keydown',e=>{const lane=['d','f','j','k'].indexOf(S.gameKey(e));if(lane<0||e.repeat)return;e.preventDefault();hit(lane);});
    scope.on($('[data-piano-song]'),'change',e=>{settings.song=e.target.value;restart();});
    scope.on($('[data-piano-tempo]'),'change',e=>{settings.bpm=Number(e.target.value);restart();});
    scope.on($('[data-piano-sound]'),'click',()=>{muted=!muted;stopVoices();if(!muted)enableAudio();renderSound();});
    scope.onPause(paused=>{stopVoices();if(audio){if(paused)audio.suspend().catch(()=>{});else if(started&&!finished&&!muted)audio.resume().catch(()=>{});}});
    scope.cleanup(()=>{stopVoices();if(audio)audio.close().catch(()=>{});});
    scope.loop(dt=>{if(!started||finished)return;L.tick(state,dt);render();finish();});
    buildNotes();render();S.intro(ui,scope,{title:'Phím đàn vui',symbol:'spark',detail:'Bốn cột, một giai điệu. Chạm khi tâm nốt tới vạch vàng, hoặc dùng D F J K. Bạn có ba cơ hội và hai giây chuẩn bị.',onStart(){started=true;enableAudio();render();ui.message('Đợi nốt chạm vạch vàng.');}});
    return S.handle(scope,restart);
  };
})();
