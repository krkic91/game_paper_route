// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  window.ArcadeGames.onet = function (host, options = {}) {
    const L = window.ArcadeOnet, scope = S.createScope();
    let state = L.createGame(), started = false, busy = false, selected = null, hintPair = [], level = 1;
    const ui = S.buildUI(host, {
      className: 'onet-workspace',
      toolbar: `<div class="onet-heading"><small>KHU VƯỜN CỦA NHỮNG NGƯỜI BẠN</small><strong>Nối thú<span> ✿</span></strong></div><label class="onet-level">Cấp độ<select data-onet-level aria-label="Chọn cấp độ Nối thú">${Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}">Cấp ${i + 1}</option>`).join('')}</select></label>`,
      board: '<div class="onet-playfield"><div class="onet-stats"><span>THỜI GIAN <b data-onet-time></b></span><span>CÒN LẠI <b data-onet-left></b></span><span>ĐÓNG BĂNG <b data-onet-ice></b></span></div><div class="onet-scroll" tabindex="0" aria-label="Bàn nối thú, có thể kéo ngang trên màn hình nhỏ"><div class="onet-board" role="group" aria-label="Các ô thú"><div class="onet-grid"></div><svg class="onet-path" aria-hidden="true"><polyline></polyline></svg></div></div><p class="onet-caption">Chọn hai thú giống nhau · Đường nối tối đa 2 lần rẽ</p></div>',
      controls: '<button type="button" class="control-button" data-onet-hint>Gợi ý</button><button type="button" class="control-button" data-onet-shuffle>Xáo trộn</button><details class="onet-rules"><summary>Cách chơi</summary><p>Nối hai thú giống nhau bằng đường ngang/dọc không quá 2 lần rẽ. Đường được đi vòng qua viền trống ngoài bàn, nhưng không đi xuyên ô có thú.</p><p>Từ cấp 5, một số thú đóng băng. Ghép đủ 3 cặp (cấp 17 trở lên: 5 cặp) để mở tất cả ô băng. Đồng hồ dừng khi tạm dừng hoặc chuyển ứng dụng. Gợi ý và xáo trộn có giới hạn; nếu bàn hết nước đi, game tự sắp lại miễn phí và báo rõ.</p><p>24 cấp độ thay đổi kích thước, khoảng trống, số loại thú, thời gian và số ô băng. Chọn cấp bất kỳ để luyện tập; chơi lại tạo bàn mới. Trên màn hình hẹp, kéo riêng bàn sang ngang.</p></details>',
      status: 'Cùng đưa những người bạn về đôi!',
    });
    const $ = selector => ui.workspace.querySelector(selector), grid = $('.onet-grid'), board = $('.onet-board'), line = $('.onet-path polyline');
    function timeText() { const seconds = Math.ceil(state.time); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
    function clearPath() { line.setAttribute('points', ''); }
    function drawPath(path) {
      const w = state.cols + 2, h = state.rows + 2;
      $('.onet-path').setAttribute('viewBox', `0 0 ${w * 100} ${h * 100}`);
      line.setAttribute('points', path.map(p => `${(p % w + .5) * 100},${(Math.floor(p / w) + .5) * 100}`).join(' '));
    }
    function render() {
      const active = document.activeElement?.dataset?.onetCell;
      board.style.setProperty('--onet-cols', state.cols + 2);
      grid.replaceChildren(...state.board.map((value, index) => {
        const el = document.createElement(value ? 'button' : 'span');
        el.className = value ? 'onet-cell' : 'onet-empty';
        if (value) {
          const locked = L.isLocked(state, index);
          el.type = 'button'; el.dataset.onetCell = index;
          el.classList.toggle('is-selected', selected === index);
          el.classList.toggle('is-hint', hintPair.includes(index));
          el.classList.toggle('is-locked', locked);
          el.innerHTML = `<span aria-hidden="true">${L.ANIMALS[value - 1]}</span>${locked ? '<small aria-hidden="true">❄</small>' : ''}`;
          el.disabled = !started || busy || state.phase !== 'play';
          el.setAttribute('aria-pressed', String(selected === index));
          el.setAttribute('aria-label', `${L.NAMES[value - 1]}, hàng ${Math.floor(index / (state.cols + 2))}, cột ${index % (state.cols + 2)}${locked ? `, đóng băng, cần ghép thêm ${state.locks[index] - state.matched} cặp` : ''}`);
        }
        return el;
      }));
      if (active != null) $(`[data-onet-cell="${active}"]`)?.focus({ preventScroll: true });
      $('[data-onet-time]').textContent = timeText();
      $('[data-onet-time]').classList.toggle('is-urgent', state.time < 30);
      $('[data-onet-left]').textContent = `${state.remaining / 2} cặp`;
      const locks = state.locks.filter(value => value > state.matched).length;
      $('[data-onet-ice]').textContent = locks ? `${locks} ô · còn ${L.config(state.level).unlock - state.matched} cặp` : 'Đã mở';
      $('[data-onet-hint]').textContent = `💡 Gợi ý (${state.hints})`;
      $('[data-onet-shuffle]').textContent = `↻ Xáo trộn (${state.shuffles})`;
      $('[data-onet-hint]').disabled = !started || busy || state.phase !== 'play' || !state.hints;
      $('[data-onet-shuffle]').disabled = !started || busy || state.phase !== 'play' || !state.shuffles;
      $('[data-onet-level]').value = String(state.level);
      ui.workspace.dataset.phase = state.phase;
      ui.workspace.dataset.level = state.level;
    }
    function finish() {
      busy = false; scope.clearTimers(); clearPath(); render();
      const won = state.phase === 'won';
      S.result(ui, scope, {
        title: won ? state.level === 24 ? 'Bạn đã chinh phục cấp 24!' : `Hoàn thành cấp ${state.level}!` : 'Hết thời gian rồi!',
        detail: won ? `Đã ghép ${state.matched} cặp, còn ${timeText()}. Bạn có thể chơi lại một bàn mới hoặc tiếp tục thử thách.` : `Còn ${state.remaining / 2} cặp chưa về đôi. Chơi lại sẽ tạo bố trí mới.`,
        win: won, score: won ? state.level * 100 + Math.ceil(state.time) * 5 : state.matched * 10,
        onAgain: restart, onScore: options.onScore,
      });
      if (won && state.level < 24) {
        const next = document.createElement('button'); next.type = 'button'; next.className = 'button button-primary';
        next.dataset.onetNext = ''; next.textContent = `Cấp ${state.level + 1} →`;
        $('.game-result-card').append(next);
        next.addEventListener('click', () => { if (!scope.paused) { level = state.level + 1; restart(); } }, { once: true });
      }
    }
    function restart() {
      scope.clearTimers(); S.clearOverlays(ui); clearPath();
      state = L.createGame({ level }); started = true; busy = false; selected = null; hintPair = [];
      render(); ui.message(`Cấp ${state.level}: chọn hai thú giống nhau để bắt đầu. ${L.config(level).lockCount ? 'Ghép các ô tự do trước để mở băng.' : 'Đường có thể vòng ngoài viền bàn.'}`);
      ui.workspace.focus({ preventScroll: true });
    }
    scope.on(grid, 'click', event => {
      const target = event.target.closest('[data-onet-cell]');
      if (!target || !started || busy || state.phase !== 'play') return;
      const index = Number(target.dataset.onetCell);
      if (L.isLocked(state, index)) { ui.message(`Ô đang đóng băng: ghép thêm ${state.locks[index] - state.matched} cặp tự do để mở khóa.`); return; }
      hintPair = []; clearPath();
      if (selected === index) { selected = null; render(); return; }
      if (selected === null) { selected = index; render(); ui.message('Chọn thú giống với ô đang sáng để nối cặp.'); return; }
      const result = L.match(state, selected, index);
      if (!result.ok) { selected = index; render(); ui.message(result.error); return; }
      selected = null; busy = true; drawPath(result.path);
      for (const p of [result.path[0], result.path[result.path.length - 1]]) $(`[data-onet-cell="${p}"]`)?.classList.add('is-matched');
      $('[data-onet-hint]').disabled = $('[data-onet-shuffle]').disabled = true;
      scope.after(.3, () => {
        busy = false; clearPath(); render();
        ui.message(state.notice || 'Đã nối một cặp! Tiếp tục tìm những người bạn còn lại.');
        if (state.phase !== 'play') finish();
      });
    });
    scope.on($('[data-onet-hint]'), 'click', () => {
      if (!started || busy || state.phase !== 'play') return;
      const result = L.hint(state);
      if (result.ok) { selected = null; hintPair = [result.a, result.b]; render(); drawPath(result.path); ui.message('Hai ô viền vàng nối được với nhau. Chọn cả hai để ghép.'); }
    });
    scope.on($('[data-onet-shuffle]'), 'click', () => {
      if (!started || busy || state.phase !== 'play') return;
      const result = L.shuffle(state);
      if (result.ok) { selected = null; hintPair = []; clearPath(); render(); ui.message(state.notice); }
    });
    scope.on($('[data-onet-level]'), 'change', event => { level = Number(event.target.value); restart(); });
    scope.on(grid, 'keydown', event => {
      const from = event.target.closest('[data-onet-cell]');
      const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -(state.cols + 2), ArrowDown: state.cols + 2 };
      if (!from || !offsets[event.key]) return;
      event.preventDefault(); let p = Number(from.dataset.onetCell);
      while (p >= 0 && p < state.board.length) { p += offsets[event.key]; const next = $(`[data-onet-cell="${p}"]`); if (next) { next.focus(); break; } }
    });
    scope.loop(dt => {
      if (!started || busy || state.phase !== 'play') return;
      const before = Math.ceil(state.time); L.tick(state, dt);
      if (Math.ceil(state.time) !== before) { $('[data-onet-time]').textContent = timeText(); $('[data-onet-time]').classList.toggle('is-urgent', state.time < 30); }
      if (state.phase === 'lost') finish();
    });
    render();
    S.intro(ui, scope, { title: 'Nối thú · Những người bạn về đôi', symbol: 'grid', detail: 'Tìm hai thú giống nhau, nối bằng đường không quá hai lần rẽ. Dọn hết bàn trước khi hết giờ. 24 cấp độ, các ô đóng băng và bàn mới mỗi lần chơi lại đang chờ bạn!', onStart() { started = true; render(); } });
    return S.handle(scope, restart);
  };
})();
