(function(){
  'use strict';const S=window.ArcadeShared,L=window.ArcadeColoring;
  window.ArcadeGames.coloring=function(host,options={}){
    const storageKey=id=>'tram-choi.coloring.'+id+(options.renderer==='3d'?'.3d':'');
    const scope=S.createScope(),urls=new Set();let selected=L.PALETTE[0],erasing=false,started=false,destroyed=false,scene='garden',state=restore(scene);
    function restore(id){let saved;try{saved=JSON.parse(localStorage.getItem(storageKey(id)));}catch{}return L.createGame(id,saved);}
    const ui=S.buildUI(host,{className:'family-workspace coloring-workspace',toolbar:'<div class="family-heading"><small>MỘT CHÚT MÀU · MỘT CHÚT BÌNH YÊN</small><strong>Xưởng tô màu</strong></div>'+S.stat('ĐÃ TÔ','painted','0'),
      board:'<div class="coloring-layout"><div class="coloring-top"><label class="family-option">Chọn tranh<select data-color-scene>'+L.SCENES.map(s=>`<option value="${s.id}">${s.title}</option>`).join('')+'</select></label><span data-color-save>Lưu tự động trên máy</span></div><svg class="coloring-canvas" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Tranh để tô màu"></svg><div class="coloring-palette" role="group" aria-label="Bảng màu">'+L.PALETTE.map((c,i)=>`<button type="button" data-color="${c}" style="--paint:${c}" aria-label="Màu ${i+1}, ${c}" aria-pressed="false"></button>`).join('')+'</div><div class="coloring-tools"><label class="coloring-custom">Màu riêng<input type="color" data-color-custom value="'+selected+'" aria-label="Chọn màu riêng"></label><button class="control-button" data-color-erase aria-pressed="false">Tẩy màu</button><span data-color-selected></span></div></div>',
      controls:'<button class="control-button" data-color-undo>Hoàn tác</button><button class="control-button" data-color-redo>Làm lại</button><button class="control-button" data-color-clear>Xóa màu</button><button class="control-button primary" data-color-download>Tải tranh PNG</button><details class="family-rules"><summary>Tô theo cách của bạn</summary><p>Chọn màu, rồi chạm vùng muốn tô. Có 16 màu sẵn và bộ chọn màu riêng. Dùng Tẩy màu để trả vùng về trắng; Hoàn tác và Làm lại giữ tối đa 100 bước. Có thể Tab đến từng vùng và nhấn Enter/Space để tô.</p><p>Sáu tranh được lưu riêng trên trình duyệt, mở lại sẽ tô tiếp. Tải PNG để giữ hoặc in tranh. Không chấm đúng sai, không giới hạn thời gian; tô đủ các vùng được 100 điểm. Nút Chơi lại bắt đầu tranh đang chọn từ đầu.</p></details>'});
    const $=q=>ui.workspace.querySelector(q),svg=$('.coloring-canvas');
    function save(){try{localStorage.setItem(storageKey(scene),JSON.stringify(L.snapshot(state)));$('[data-color-save]').textContent='Đã lưu trên máy';}catch{$('[data-color-save]').textContent='Phiên này chưa lưu được; có thể tải PNG';}}
    function build(){svg.innerHTML=L.scene(scene).regions.map(r=>`<g data-color-region="${r.id}" role="button" tabindex="0" aria-label="Tô ${r.label}" fill="#ffffff" stroke="#42554d" stroke-width="3" stroke-linejoin="round">${r.shape}</g>`).join('');render();}
    function render(){
      const p=L.progress(state);ui.setStat('painted',`${p.painted} / ${p.total}`);
      for(const el of svg.querySelectorAll('[data-color-region]')){el.setAttribute('fill',state.colors[el.dataset.colorRegion]||'#ffffff');el.setAttribute('tabindex',started?'0':'-1');}
      for(const b of ui.workspace.querySelectorAll('[data-color]')){b.setAttribute('aria-pressed',String(!erasing&&b.dataset.color===selected));b.disabled=!started;}
      $('[data-color-selected]').textContent=erasing?'Đang tẩy':`Màu đang chọn: ${selected}`;$('[data-color-erase]').setAttribute('aria-pressed',String(erasing));
      $('[data-color-undo]').disabled=!started||!state.history.length;$('[data-color-redo]').disabled=!started||!state.future.length;$('[data-color-clear]').disabled=!started||!p.painted;$('[data-color-download]').disabled=!started;
      ui.workspace.dataset.painted=p.painted;ui.message('Chạm một vùng để thêm màu. Mọi cách phối màu đều được chào đón.');
      if(p.painted===p.total&&!state.completed){state.completed=true;options.onScore?.(100);ui.message('Bạn đã tô kín bức tranh! Có thể đổi màu tiếp hoặc tải PNG để lưu lại.');}
    }
    function paint(id){if(started&&L.paint(state,id,erasing?null:selected)){render();save();}}
    function restart(){S.clearOverlays(ui);scope.clearTimers();state=L.createGame(scene);started=true;build();save();}
    scope.on(svg,'click',e=>{const r=e.target.closest('[data-color-region]');if(r)paint(r.dataset.colorRegion);});
    scope.on(svg,'keydown',e=>{const r=e.target.closest('[data-color-region]');if(r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();paint(r.dataset.colorRegion);}});
    scope.on($('.coloring-palette'),'click',e=>{const b=e.target.closest('[data-color]');if(b){selected=b.dataset.color;erasing=false;$('[data-color-custom]').value=selected;render();}});
    scope.on($('[data-color-custom]'),'input',e=>{selected=e.target.value;erasing=false;render();});scope.on($('[data-color-erase]'),'click',()=>{erasing=!erasing;render();});
    for(const action of ['undo','redo','clear'])scope.on($(`[data-color-${action}]`),'click',()=>{if(L[action](state)){render();save();}});
    scope.on($('[data-color-scene]'),'change',e=>{save();scene=e.target.value;state=restore(scene);started=true;S.clearOverlays(ui);build();});
    scope.on($('[data-color-download]'),'click',()=>{
      const copy=svg.cloneNode(true);copy.setAttribute('width','1200');copy.setAttribute('height','1200');copy.querySelectorAll('[tabindex]').forEach(el=>el.removeAttribute('tabindex'));
      const source=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'}));urls.add(source);const img=new Image();
      img.onload=()=>{URL.revokeObjectURL(source);urls.delete(source);if(destroyed)return;try{const canvas=document.createElement('canvas');canvas.width=canvas.height=1200;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1200,1200);ctx.drawImage(img,0,0,1200,1200);canvas.toBlob(blob=>{if(destroyed||!blob)return;const url=URL.createObjectURL(blob);urls.add(url);const a=document.createElement('a');a.href=url;a.download=`tram-choi-to-mau-${scene}.png`;document.body.append(a);a.click();a.remove();scope.after(2,()=>{URL.revokeObjectURL(url);urls.delete(url);});ui.message('Đã tạo tranh PNG. Kiểm tra thư mục tải xuống của trình duyệt.');},'image/png');}catch{ui.message('Chưa xuất được PNG. Tranh vẫn được giữ trong phiên này.');}};
      img.onerror=()=>{URL.revokeObjectURL(source);urls.delete(source);if(!destroyed)ui.message('Chưa xuất được tranh. Hãy thử lại.');};img.src=source;
    });
    scope.cleanup(()=>{destroyed=true;for(const url of urls)URL.revokeObjectURL(url);urls.clear();});
    build();S.intro(ui,scope,{title:'Hôm nay bạn thích màu gì?',symbol:'spark',detail:'Một vườn hoa, một ngôi nhà hay chuyến bay tới sao? Sáu tranh để tô tự do, tự lưu trên máy và tải được thành ảnh PNG.',onStart(){started=true;render();}});
    return S.handle(scope,restart);
  };
})();
