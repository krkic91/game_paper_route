// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  window.ArcadeGames.minesweeper = function (host, options = {}) {
    const L = window.ArcadeMinesweeper, scope = S.createScope();
    let state = L.createGame(), started = false, flagMode = false, focused = 0, finished = false, generation = null, shownSecond = -1;
    const ui = S.buildUI(host, {
      className: 'minesweeper-workspace',
      toolbar: '<div class="ms-heading"><small>CHẬM MỘT NHỊP · CHẮC MỘT Ô</small><strong>Dò mìn<span>.</span></strong></div><div class="ms-stats"><span>CỜ CÒN LẠI<b data-ms-flags>10</b></span><span>THỜI GIAN<b data-ms-time>00:00</b></span></div>',
      board: '<div class="ms-panel"><div class="ms-board-heading"><span data-ms-badge>BÀN SUY LUẬN</span><strong data-ms-progress>0 / 54 ô an toàn</strong></div><div class="ms-scroll" tabindex="0" aria-label="Bàn dò mìn; kéo ngang để xem thêm cột"><div class="ms-grid" role="group" aria-label="Bàn dò mìn"></div></div><p class="ms-board-note" data-ms-note>Ô đầu tiên luôn an toàn và mở ra một vùng trống.</p></div>',
      controls: '<div class="ms-settings"><label>Độ khó<select data-ms-level aria-label="Độ khó Dò mìn"><option value="easy">Dễ · 8 × 8 · 10 mìn</option><option value="medium">Vừa · 10 × 10 · 18 mìn</option><option value="hard">Khó · 12 × 12 · 30 mìn</option></select></label><label class="ms-daily"><input type="checkbox" data-ms-daily> Thử thách hôm nay</label></div><div class="ms-actions" role="group" aria-label="Thao tác ô"><button type="button" class="control-button" data-ms-mode="reveal" aria-pressed="true">◈ Mở ô</button><button type="button" class="control-button" data-ms-mode="flag" aria-pressed="false">⚑ Cắm cờ</button></div><details class="ms-rules"><summary>Cách chơi & phím tắt</summary><p>Mở hết ô an toàn để thắng. Con số cho biết số mìn trong 8 ô xung quanh. Chọn Cắm cờ để đánh dấu ô nghi có mìn; chọn lại để bỏ cờ. Chuột phải cũng cắm cờ.</p><p>Chạm ô số đã mở khi đủ cờ xung quanh để mở nhanh các ô còn lại. Cờ sai có thể khiến bạn trúng mìn. Bàn được kiểm chứng giải được bằng suy luận từ ô đầu, không cần đoán.</p><p>Phím mũi tên: di chuyển · Enter hoặc Space: thao tác · F: cắm/bỏ cờ. Bàn lớn có thể kéo ngang. Đổi độ khó hoặc chế độ ngày sẽ bắt đầu ván mới. Thử thách ngày có cùng bố cục và tự mở ô trung tâm.</p></details>',
      status: 'Chọn một ô để bắt đầu cuộc khám phá.',
    });
    const $ = selector => ui.workspace.querySelector(selector), grid = $('.ms-grid');
    function buildBoard() {
      grid.style.setProperty('--ms-size', state.size);
      grid.replaceChildren(...state.mines.map((_, index) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'ms-cell'; button.dataset.msCell = index;
        button.tabIndex = index === focused ? 0 : -1;
        return button;
      }));
    }
    function render() {
      ui.workspace.dataset.phase = state.phase;
      ui.workspace.dataset.difficulty = state.difficulty;
      $('[data-ms-flags]').textContent = state.mineCount - state.flagged.filter(Boolean).length;
      $('[data-ms-progress]').textContent = `${state.revealed.filter(Boolean).length} / ${state.size ** 2 - state.mineCount} ô an toàn`;
      $('[data-ms-badge]').textContent = state.daily ? `THỬ THÁCH ${state.date}` : 'BÀN SUY LUẬN';
      $('[data-ms-note]').textContent = state.phase === 'generating' ? 'Đang kiểm tra bàn bằng suy luận…' : state.phase === 'ready' ? 'Ô đầu tiên luôn an toàn và mở ra một vùng trống.' : state.fallback ? 'Bàn dự phòng đã kiểm chứng · Kéo ngang nếu chưa thấy hết cột.' : 'Đã kiểm chứng giải được không cần đoán · Kéo ngang nếu cần.';
      for (const button of grid.children) {
        const index = Number(button.dataset.msCell), open = state.revealed[index], flag = state.flagged[index], ended = ['won', 'lost'].includes(state.phase);
        const mine = ended && state.mines[index], wrong = ended && flag && !state.mines[index];
        button.className = `ms-cell${open ? ' is-open' : ''}${flag ? ' is-flagged' : ''}${mine ? ' is-mine' : ''}${wrong ? ' is-wrong' : ''}${state.exploded === index ? ' is-hit' : ''}`;
        button.dataset.number = open ? state.numbers[index] : '';
        button.textContent = wrong ? '×' : mine ? '✹' : flag ? '⚑' : open && state.numbers[index] ? state.numbers[index] : '';
        button.setAttribute('aria-label', `Hàng ${Math.floor(index / state.size) + 1}, cột ${index % state.size + 1}: ${wrong ? 'cờ sai' : mine ? 'mìn' : flag ? 'đã cắm cờ' : open ? state.numbers[index] ? `${state.numbers[index]} mìn xung quanh` : 'trống' : 'chưa mở'}`);
        button.setAttribute('aria-disabled', String(!started || ended || state.phase === 'generating'));
      }
      for (const button of ui.controls.querySelectorAll('[data-ms-mode]')) button.setAttribute('aria-pressed', String((button.dataset.msMode === 'flag') === flagMode));
      showTime();
    }
    function showTime() {
      const seconds = Math.floor(state.elapsed);
      if (seconds !== shownSecond) { shownSecond = seconds; $('[data-ms-time]').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
    }
    function finish() {
      if (finished || !['won', 'lost'].includes(state.phase)) return;
      finished = true;
      S.result(ui, scope, {
        title: state.phase === 'won' ? 'Bạn đã mở sạch bãi mìn!' : 'Bạn đã chạm một quả mìn',
        detail: state.phase === 'won' ? `${L.LEVELS[state.difficulty].name} · ${state.mineCount} mìn · ${Math.floor(state.elapsed)} giây.${state.daily ? ' Chơi lại sẽ giữ nguyên thử thách hôm nay.' : ' Chơi tiếp để thử một bố cục mới.'}` : 'Số trên mỗi ô là số mìn trong 8 ô xung quanh. Thử cắm cờ vào những ô chắc chắn trước khi mở tiếp.',
        score: L.score(state), win: state.phase === 'won', onAgain: restart, onScore: options.onScore,
      });
    }
    function announce() {
      ui.message(state.phase === 'generating' ? 'Đang tạo bàn có thể giải bằng suy luận…' : state.phase === 'won' ? 'Tất cả ô an toàn đã được mở. Bạn thắng!' : state.phase === 'lost' ? 'Trúng mìn. Bạn có thể chơi lại một ván mới.' : flagMode ? 'Chế độ cắm cờ: chạm ô để cắm hoặc bỏ cờ.' : 'Chế độ mở ô: chạm ô chưa mở; chạm ô số có đủ cờ để mở nhanh.');
    }
    function stepGeneration() {
      if (!generation) return;
      const step = generation.next();
      if (!step.done) { scope.after(0, stepGeneration); return; }
      generation = null;
      render(); announce(); finish();
    }
    function generate(first) {
      generation = L.generate(state, first);
      // Allow the busy status to paint before the first verification.
      scope.after(0, () => { stepGeneration(); render(); announce(); });
      ui.message('Đang tạo và kiểm chứng bàn…');
    }
    function action(index, flag = flagMode) {
      if (!started || finished || generation || scope.paused) return;
      if (!flag && state.phase === 'ready' && !state.flagged[index]) { generate(index); return; }
      const result = flag ? L.toggleFlag(state, index) : state.revealed[index] ? L.chord(state, index) : L.reveal(state, index);
      render();
      if (!result.ok) ui.message(result.error); else announce();
      finish();
    }
    function restart() {
      scope.clearTimers(); generation = null; S.clearOverlays(ui);
      state = L.createGame({ difficulty: $('[data-ms-level]').value, daily: $('[data-ms-daily]').checked });
      started = true; finished = false; flagMode = false; focused = 0; shownSecond = -1;
      buildBoard(); render(); announce();
      if (state.daily) generate(Math.floor(state.size / 2) * state.size + Math.floor(state.size / 2));
    }
    scope.on(grid, 'click', event => { const button = event.target.closest('[data-ms-cell]'); if (button) action(Number(button.dataset.msCell)); });
    scope.on(grid, 'contextmenu', event => { const button = event.target.closest('[data-ms-cell]'); if (button) { event.preventDefault(); action(Number(button.dataset.msCell), true); } });
    scope.on(grid, 'focusin', event => {
      if (!event.target.matches('[data-ms-cell]')) return;
      focused = Number(event.target.dataset.msCell);
      for (const button of grid.children) button.tabIndex = Number(button.dataset.msCell) === focused ? 0 : -1;
    });
    scope.on(grid, 'keydown', event => {
      const index = Number(event.target.dataset.msCell);
      if (!Number.isInteger(index)) return;
      let next = index;
      if (event.key === 'ArrowLeft') next = Math.floor(index / state.size) * state.size + Math.max(0, index % state.size - 1);
      else if (event.key === 'ArrowRight') next = Math.floor(index / state.size) * state.size + Math.min(state.size - 1, index % state.size + 1);
      else if (event.key === 'ArrowUp') next = Math.max(index % state.size, index - state.size);
      else if (event.key === 'ArrowDown') next = Math.min((state.size - 1) * state.size + index % state.size, index + state.size);
      else if (event.key.toLowerCase() === 'f') { event.preventDefault(); action(index, true); return; }
      else return;
      event.preventDefault(); grid.children[next].focus();
    });
    scope.on(ui.controls, 'click', event => { const button = event.target.closest('[data-ms-mode]'); if (button) { flagMode = button.dataset.msMode === 'flag'; render(); announce(); } });
    scope.on($('[data-ms-level]'), 'change', restart);
    scope.on($('[data-ms-daily]'), 'change', restart);
    scope.loop(dt => { if (started && state.phase === 'play') { state.elapsed += dt; showTime(); } });
    buildBoard(); render();
    S.intro(ui, scope, {
      title: 'Dò mìn · Mỗi ô một suy luận', symbol: 'grid',
      detail: 'Mở hết ô an toàn, tránh mìn. Chọn Mở ô hoặc Cắm cờ để chơi trên điện thoại. Ô đầu luôn an toàn; mỗi bàn được kiểm chứng có lời giải không cần đoán.',
      onStart() { started = true; render(); announce(); },
    });
    return S.handle(scope, restart);
  };
})();
