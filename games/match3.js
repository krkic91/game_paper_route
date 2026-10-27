(function () {
  'use strict'; const S = window.ArcadeShared, L = window.ArcadeMatch3;
  const names = ['Hồng ngọc', 'Lam ngọc', 'Ngọc lục bảo', 'Thạch anh', 'Hổ phách', 'Ngọc trai'];
  window.ArcadeGames.match3 = function (host, options = {}) {
    const scope = S.createScope(); let state = L.createGame(), started = false, selected = null, hint = [];
    const ui = S.buildUI(host, { className: 'family-workspace match3-workspace',
      toolbar: '<div class="family-heading"><small>MỖI LẦN GHÉP · MỘT CHÚT LẤP LÁNH</small><strong>Vườn kim cương</strong></div>' + S.stat('ĐIỂM', 'score', 0) + S.stat('LƯỢT CÒN', 'moves', 30),
      board: '<div class="family-board-wrap"><div class="family-scoreline"><span>Ghép từ 3 viên cùng loại</span><strong data-match3-combo>Sẵn sàng!</strong></div><div class="match3-board" role="group" aria-label="Bàn kim cương 8 nhân 8"></div><p class="family-caption">Chạm hai ô cạnh nhau · Chuỗi liên tiếp nhân điểm</p></div>',
      controls: '<button class="control-button" data-match3-hint>Gợi ý</button><details class="family-rules"><summary>Cách tính điểm</summary><p>Mỗi viên 10 điểm, nhân số chuỗi rơi liên tiếp. Bạn có 30 lượt đổi hợp lệ; đổi sai không mất lượt. Hết nước sẽ tự tạo bàn mới, giữ nguyên điểm và số lượt. Gợi ý không trừ điểm.</p></details>' });
    const board = ui.workspace.querySelector('.match3-board');
    const cells = Array.from({ length: 64 }, (_, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'match3-cell'; b.dataset.match3Cell = i; board.append(b); return b; });
    function render() {
      cells.forEach((b, i) => {
        const gem = state.board[i];
        if (b.dataset.gem !== String(gem)) { b.dataset.gem = gem; b.innerHTML = window.ArcadeArt.gem(gem); }
        b.classList.toggle('is-selected', selected === i); b.classList.toggle('is-hint', hint.includes(i)); b.classList.remove('is-clearing');
        b.disabled = !started || state.phase !== 'play'; b.setAttribute('aria-label', `${names[gem]}, hàng ${Math.floor(i / 8) + 1}, cột ${i % 8 + 1}`); b.setAttribute('aria-pressed', String(selected === i));
      });
      ui.setStat('score', state.score); ui.setStat('moves', state.movesLeft);
      ui.workspace.dataset.phase = state.phase; ui.workspace.dataset.turn = state.turn;
      ui.workspace.querySelector('[data-match3-combo]').textContent = state.combo ? `Chuỗi ×${state.combo}` : 'Tìm bộ ba!';
      ui.workspace.querySelector('[data-match3-hint]').disabled = !started || state.phase !== 'play';
    }
    function resolve() {
      const hit = L.matches(state.board);
      if (!hit.length || state.combo >= 30) {
        const result = L.cascade(state); render();
        ui.message(result.reshuffled ? 'Bàn hết nước đã được làm mới. Điểm và lượt được giữ nguyên.' : 'Chọn hai viên cạnh nhau để ghép tiếp.');
        if (state.phase === 'finished') S.result(ui, scope, { title: 'Một vườn đầy lấp lánh!', detail: 'Bạn đã hoàn thành 30 lượt. Mỗi bàn mới là một cơ hội nối chuỗi cao hơn.', score: state.score, onScore: options.onScore, onAgain: restart });
        return;
      }
      hit.forEach(i => cells[i].classList.add('is-clearing'));
      scope.after(0.22, () => { const result = L.cascade(state); render(); ui.message(`+${result.points} điểm · Chuỗi ×${state.combo}`); scope.after(0.18, resolve); });
    }
    function pick(i) {
      if (!started || state.phase !== 'play') return;
      hint = [];
      if (selected == null) selected = i;
      else if (selected === i) selected = null;
      else if (L.swap(state, selected, i)) { selected = null; render(); resolve(); return; }
      else { selected = i; ui.message('Chọn hai ô kề nhau tạo được hàng từ 3 viên. Lượt chưa bị trừ.'); }
      render();
    }
    function restart() { scope.clearTimers(); S.clearOverlays(ui); state = L.createGame(); started = true; selected = null; hint = []; render(); ui.message('30 lượt để tìm kỷ lục mới.'); }
    scope.on(board, 'click', e => { const cell = e.target.closest('[data-match3-cell]'); if (cell) pick(Number(cell.dataset.match3Cell)); });
    scope.on(board, 'keydown', e => {
      const cell = e.target.closest('[data-match3-cell]'), delta = { ArrowUp: -8, ArrowDown: 8, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (!cell || !delta) return; e.preventDefault(); const i = Number(cell.dataset.match3Cell), j = i + delta;
      if (j >= 0 && j < 64 && (Math.abs(delta) === 8 || Math.floor(i / 8) === Math.floor(j / 8))) cells[j].focus();
    });
    scope.on(ui.workspace.querySelector('[data-match3-hint]'), 'click', () => { if (state.phase === 'play') { hint = L.moves(state.board)[0] || []; selected = null; render(); } });
    render(); S.intro(ui, scope, { title: 'Vườn kim cương', symbol: 'spark', detail: 'Đổi chỗ hai viên cạnh nhau, ghép từ ba viên cùng loại. Tạo chuỗi rơi liên tiếp để nhân điểm trong 30 lượt.', onStart() { started = true; render(); } });
    return S.handle(scope, restart);
  };
})();
