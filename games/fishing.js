(function () {
  'use strict'; const S = window.ArcadeShared, L = window.ArcadeFishing, STORAGE = 'tram-choi-fishing-collection-v1';
  function fishArt(color) { return `<svg viewBox="0 0 120 70" aria-hidden="true"><path d="m81 34 30-23v47Z" fill="${color}"/><ellipse cx="50" cy="35" rx="37" ry="23" fill="${color}"/><path d="m42 15 15-12 16 17M39 55l19 11 12-17" fill="${color}"/><path d="M61 18q-14 17 0 34" fill="none" stroke="#fff8" stroke-width="2"/><circle cx="28" cy="29" r="4" fill="#243d41"/><circle cx="27" cy="28" r="1.2" fill="#fff"/></svg>`; }
  window.ArcadeGames.fishing = function (host, options = {}) {
    const scope = S.createScope(); let state = L.createGame(), started = false, collection = Array(6).fill(0), saved = true, lastPhase = '';
    try { const data = JSON.parse(localStorage.getItem(STORAGE)); if (Array.isArray(data)) collection = collection.map((_, i) => Number.isSafeInteger(data[i]) && data[i] >= 0 ? data[i] : 0); } catch { saved = false; }
    const ui = S.buildUI(host, { className: 'family-workspace fishing-workspace',
      toolbar: '<div class="family-heading"><small>THẢ CÂU · THẢ NHẸ MỘT NGÀY</small><strong>Một chiều bên hồ</strong></div>' + S.stat('ĐIỂM', 'score', 0) + S.stat('ĐÃ CÂU', 'catches', 0),
      board: '<div class="fishing-layout"><div class="fishing-pond"><svg class="fishing-landscape" viewBox="0 0 700 360" aria-hidden="true"><rect width="700" height="360" fill="#dbe7d2"/><circle cx="536" cy="63" r="32" fill="#f5d88c"/><path d="M0 155Q100 25 242 151Q382 31 534 141Q640 80 700 135V260H0Z" fill="#aac3a5"/><path d="M0 180Q120 105 277 184Q520 98 700 169V360H0Z" fill="#759d87"/><path d="M0 217Q300 163 700 208V360H0Z" fill="#85b5b4"/><path d="M0 279q130-25 300 0t400-8M70 324q120-24 260 0m75-92h92" fill="none" stroke="#d6e4cc" stroke-width="3" opacity=".55"/><path d="M0 288h173v18H0m135 0v54m-78-54v54" fill="#9a7958" stroke="#9a7958" stroke-width="10"/><path d="m144 287 99-169" stroke="#6b6853" stroke-width="5"/><path d="M244 118q120 20 160 156" fill="none" stroke="#f4f0d4" stroke-width="1.8"/><g transform="translate(630 272)" fill="#73977b"><ellipse rx="34" ry="9"/><circle cx="-8" cy="-5" r="8" fill="#edc0ae"/></g></svg><div class="fishing-float" aria-hidden="true"><i></i></div><div class="fishing-catch" aria-hidden="true"></div><span class="fishing-scene-label">HỒ AN NHIÊN · 6 LOÀI CÁ</span></div><div class="fishing-meter-label"><strong data-fishing-label>Thả câu khi bạn sẵn sàng</strong><span data-fishing-value></span></div><div class="fishing-meter" role="meter" aria-label="Lực câu" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="fishing-safe"></span><i></i></div><progress class="fishing-progress" max="1" value="0" aria-label="Tiến độ kéo cá"></progress><p class="fishing-message" role="status"></p><div class="fishing-collection-heading"><strong>Bộ sưu tập của bạn</strong><small data-fishing-storage></small></div><div class="fishing-collection"></div></div>',
      controls: '<button class="control-button primary" data-fishing-action>Thả câu</button><button class="control-button" data-hold="reel">Giữ để kéo</button><details class="family-rules"><summary>Một buổi câu nhẹ nhàng</summary><p>Thả câu, chạm lần nữa khi kim nằm trong vùng xanh. Chờ phao rung rồi Giật cần trong 2,5 giây. Giữ nút kéo (hoặc Space) để tăng lực, thả ra để giảm. Giữ kim trong vùng xanh để đưa cá vào bờ; chạm hai đầu thanh thì cá thoát.</p><p>Không giới hạn thời gian hoặc số lần thả. Sáu loài cá có độ hiếm và độ khó khác nhau. Bộ sưu tập lưu trên trình duyệt khi có thể; Chơi lại chỉ đặt lại điểm buổi câu.</p></details>' });
    const $ = sel => ui.workspace.querySelector(sel), input = S.heldInput(scope, ui, { reel: [' '] });
    function renderCollection() {
      $('.fishing-collection').innerHTML = L.FISH.map((fish, i) => `<div class="fishing-species ${collection[i] ? 'is-caught' : ''}">${fishArt(fish.color)}<strong>${fish.name}</strong><small>${collection[i] ? 'Đã câu: ' + collection[i] : 'Chưa tìm thấy'}</small></div>`).join('');
      $('[data-fishing-storage]').textContent = saved ? 'Lưu trên thiết bị' : 'Lưu tạm trong phiên này';
    }
    function render() {
      const active = started, phase = state.phase;
      $('[data-fishing-action]').textContent = phase === 'aim' ? 'Thả mồi!' : phase === 'bite' ? 'Giật cần!' : phase === 'waiting' ? 'Đang chờ cá…' : 'Thả câu';
      $('[data-fishing-action]').disabled = !active || ['waiting', 'reeling'].includes(phase);
      $('[data-hold="reel"]').disabled = !active || phase !== 'reeling';
      $('.fishing-message').textContent = state.message;
      $('[data-fishing-label]').textContent = phase === 'reeling' ? 'Lực căng dây · Giữ kim trong vùng xanh' : phase === 'aim' ? 'Canh lực · Vùng xanh thả mồi đẹp nhất' : phase === 'bite' ? 'Phao rung! Giật cần ngay!' : 'Bình yên, rồi cá sẽ đến';
      ui.setStat('score', state.score); ui.setStat('catches', state.catches);
      ui.workspace.dataset.phase = phase;
      $('.fishing-pond').dataset.phase = phase;
      $('.fishing-catch').innerHTML = phase === 'caught' ? fishArt(L.FISH[state.fish].color) : '';
      $('.fishing-safe').style.left = phase === 'reeling' ? '23%' : '50%'; $('.fishing-safe').style.width = phase === 'reeling' ? '55%' : '30%';
      ui.message('Không cần vội. Thả câu, chờ cá, giữ nhịp kéo.');
    }
    function action() { if (started && L.action(state)) { input.clear(); lastPhase = state.phase; render(); } }
    function restart() { scope.clearTimers(); S.clearOverlays(ui); input.clear(); state = L.createGame(); started = true; lastPhase = ''; render(); }
    scope.on($('[data-fishing-action]'), 'click', action);
    scope.on(window, 'keydown', e => { if (S.gameKey(e) === ' ' && !e.repeat && state.phase !== 'reeling') { e.preventDefault(); action(); } });
    scope.onPause(paused => { ui.workspace.classList.toggle('is-paused', paused); });
    scope.loop(dt => {
      if (!started) return;
      const event = L.tick(state, dt, input.active('reel'));
      if (event) {
        collection[event.caught]++;
        try { localStorage.setItem(STORAGE, JSON.stringify(collection)); } catch { saved = false; }
        renderCollection(); options.onScore?.(state.score);
      }
      if (lastPhase !== state.phase) { lastPhase = state.phase; input.clear(); render(); }
      const amount = state.phase === 'aim' ? state.meter : state.phase === 'reeling' ? state.tension : 0;
      $('.fishing-meter i').style.left = `${amount * 100}%`; $('.fishing-meter').setAttribute('aria-valuenow', String(Math.round(amount * 100)));
      $('[data-fishing-value]').textContent = state.phase === 'aim' || state.phase === 'reeling' ? Math.round(amount * 100) + '%' : '';
      $('.fishing-progress').value = state.phase === 'reeling' ? state.progress : 0;
    });
    render(); renderCollection(); S.intro(ui, scope, { title: 'Một chiều bên hồ', symbol: 'heart', detail: 'Canh lực thả câu, chờ phao rung rồi giữ nhịp kéo cá. Sáu loài cá đang đợi bạn sưu tập, không đồng hồ đếm ngược.', onStart() { started = true; render(); } });
    return S.handle(scope, restart);
  };
})();
