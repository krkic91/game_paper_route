// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  window.ArcadeGames.reversi = function (host, options = {}) {
    const L = window.ArcadeReversi, scope = S.createScope();
    let settings = { mode: 'ai', human: 1, level: 'medium' }, state = L.createGame(settings);
    let started = false, flipped = false, hint = null, note = '', focused = 19;
    const ui = S.buildUI(host, {
      className: 'reversi-workspace',
      toolbar: '<div class="reversi-heading"><small>ĐEN & TRẮNG</small><strong>Cờ lật<span>.</span></strong></div><div class="reversi-settings"><label>Chế độ<select data-reversi-mode><option value="ai">Đấu máy</option><option value="local">2 người cùng máy</option></select></label><label>Độ khó<select data-reversi-level><option value="easy">Dễ</option><option value="medium" selected>Vừa</option><option value="hard">Khó</option></select></label><label>Quân của bạn<select data-reversi-human><option value="1">Đen · đi trước</option><option value="-1">Trắng · đi sau</option></select></label></div>',
      board: '<div class="reversi-table"><div class="reversi-scores"><div data-reversi-player="1"><span class="reversi-disc black"></span><strong data-reversi-black>2</strong><small>Đen</small></div><p data-reversi-turn></p><div data-reversi-player="-1"><span class="reversi-disc white"></span><strong data-reversi-white>2</strong><small>Trắng</small></div></div><div class="reversi-board" role="group" aria-label="Bàn cờ lật 8 hàng, 8 cột"></div><p class="reversi-legend">Chấm nhỏ: ô đi được · Viền vàng: nước vừa đi</p><p class="reversi-explanation" data-reversi-explanation aria-live="polite"></p></div>',
      controls: '<button type="button" class="control-button" data-reversi-undo>Đi lại</button><button type="button" class="control-button" data-reversi-hint>Gợi ý có giải thích</button><button type="button" class="control-button" data-reversi-flip>Xoay bàn</button><details class="reversi-rules"><summary>Luật & điều khiển</summary><p>Đen đi trước. Đặt quân vào ô trống để kẹp ít nhất một quân đối thủ giữa quân mới và quân sẵn có theo hàng, cột hoặc đường chéo; lật tất cả quân bị kẹp.</p><p>Không có nước hợp lệ: tự động bỏ lượt. Cả hai cùng hết nước: kết thúc, nhiều quân hơn thắng. Ô trống không cộng cho ai.</p><p>Phím mũi tên di chuyển ô, Enter hoặc Space đặt quân. Đi lại trả về trước lượt gần nhất của bạn khi đấu máy. Đổi chế độ, màu hoặc độ khó sẽ bắt đầu ván mới.</p></details>',
      status: 'Chiếm góc và giữ lựa chọn cho những lượt tiếp theo.',
    });
    const $ = selector => ui.workspace.querySelector(selector), board = $('.reversi-board');
    const name = player => player === 1 ? 'Đen' : 'Trắng';
    const humanTurn = () => started && state.phase === 'play' && (state.mode === 'local' || state.current === state.human);
    function render() {
      const count = L.counts(state), moves = L.legalMoves(state), legal = new Set(moves.map(move => move.index));
      const active = document.activeElement?.dataset?.reversiCell;
      const indices = Array.from({ length: 64 }, (_, i) => flipped ? 63 - i : i);
      board.replaceChildren(...indices.map(index => {
        const button = document.createElement('button'), value = state.board[index];
        button.type = 'button'; button.className = 'reversi-cell';
        button.dataset.reversiCell = index; button.tabIndex = index === focused ? 0 : -1;
        button.classList.toggle('is-legal', legal.has(index) && humanTurn());
        button.classList.toggle('is-last', state.lastMove === index);
        button.classList.toggle('is-hint', hint === index);
        button.setAttribute('aria-label', `${L.coordinate(index)}, ${value ? `quân ${name(value)}` : legal.has(index) ? 'trống, có thể đặt quân' : 'trống'}`);
        button.setAttribute('aria-disabled', String(!humanTurn() || !legal.has(index)));
        if (value) { const disc = document.createElement('span'); disc.className = `reversi-disc ${value === 1 ? 'black' : 'white'}`; button.append(disc); }
        const label = document.createElement('small'); label.textContent = L.coordinate(index);
        button.append(label); return button;
      }));
      if (active !== undefined) $(`[data-reversi-cell="${active}"]`)?.focus({ preventScroll: true });
      $('[data-reversi-black]').textContent = count.black;
      $('[data-reversi-white]').textContent = count.white;
      $('[data-reversi-turn]').textContent = !started ? 'Sẵn sàng' : state.phase === 'finished' ? 'Kết thúc ván' : `${name(state.current)} đi${!humanTurn() ? ' · Máy đang nghĩ…' : ''}`;
      for (const player of [1, -1]) $(`[data-reversi-player="${player}"]`).classList.toggle('is-active', started && state.phase === 'play' && state.current === player);
      $('[data-reversi-undo]').disabled = !started || !state.history.some(item => state.mode === 'local' || item.current === state.human);
      $('[data-reversi-hint]').disabled = !humanTurn();
      $('[data-reversi-level]').disabled = state.mode === 'local';
      $('[data-reversi-human]').disabled = state.mode === 'local';
      $('[data-reversi-explanation]').textContent = note || 'Các góc không bị lật. Hãy cân nhắc trước khi đặt quân cạnh góc còn trống.';
      ui.workspace.dataset.turn = state.turn;
      ui.workspace.dataset.phase = state.phase;
      ui.message(state.passed !== null ? `${name(state.passed)} không có nước đi và tự động bỏ lượt. ${name(state.current)} đi tiếp.` : state.phase === 'finished' ? `Đen ${count.black} – Trắng ${count.white}.` : `${name(state.current)} có ${moves.length} nước hợp lệ. ${humanTurn() ? 'Chọn ô có chấm nhỏ.' : 'Đợi lượt tiếp theo.'}`);
    }
    function finish() {
      scope.clearTimers();
      const count = L.counts(state), win = state.winner !== 0 && (state.mode === 'local' || state.winner === state.human);
      S.result(ui, scope, { title: state.winner === 0 ? 'Hai bên hòa nhau!' : `${name(state.winner)} thắng ván cờ!`,
        detail: `Đen ${count.black} – Trắng ${count.white}. Cả hai bên không còn nước hợp lệ.${count.empty ? ` Còn ${count.empty} ô trống.` : ''}`,
        score: state.mode === 'local' ? Math.max(count.black, count.white) : state.human === 1 ? count.black : count.white,
        win, onAgain: restart, onScore: options.onScore });
    }
    function schedule() {
      scope.clearTimers();
      if (!started || state.phase !== 'play' || state.mode !== 'ai' || state.current === state.human) return;
      scope.after(0.5, () => { const move = L.chooseMove(state); if (move) act(move.index); });
    }
    function act(index) {
      const result = L.play(state, index);
      if (!result.ok) { ui.message(result.error); return; }
      hint = null; note = `${name(result.player)} đặt ${L.coordinate(index)}, lật ${result.flips.length} quân.`;
      render(); if (state.phase === 'finished') finish(); else schedule();
    }
    function restart() {
      scope.clearTimers(); S.clearOverlays(ui);
      state = L.createGame(settings); started = true; hint = null; note = ''; focused = 19;
      render(); schedule();
    }
    scope.on(board, 'click', event => {
      const cell = event.target.closest('[data-reversi-cell]');
      if (cell && humanTurn()) { focused = Number(cell.dataset.reversiCell); act(focused); }
    });
    scope.on(board, 'keydown', event => {
      const cell = event.target.closest('[data-reversi-cell]'); if (!cell) return;
      const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
      if (!(event.key in steps)) return;
      event.preventDefault();
      const index = Number(cell.dataset.reversiCell), visual = flipped ? 63 - index : index;
      let next = visual + steps[event.key];
      if (next < 0 || next > 63 || (Math.abs(steps[event.key]) === 1 && Math.floor(next / 8) !== Math.floor(visual / 8))) return;
      focused = flipped ? 63 - next : next;
      cell.tabIndex = -1; const target = $(`[data-reversi-cell="${focused}"]`); target.tabIndex = 0; target.focus();
    });
    scope.on($('[data-reversi-undo]'), 'click', () => {
      if (!state.history.some(item => state.mode === 'local' || item.current === state.human)) return;
      scope.clearTimers(); S.clearOverlays(ui);
      do { L.undo(state); } while (state.mode === 'ai' && state.current !== state.human && state.history.length);
      hint = null; note = 'Đã trả lại bàn cờ trước lượt vừa chọn.'; render(); schedule();
    });
    scope.on($('[data-reversi-hint]'), 'click', () => {
      if (!humanTurn()) return;
      const move = L.chooseMove(state, 'medium'); hint = move?.index ?? null;
      note = L.explainMove(state, move); render();
    });
    scope.on($('[data-reversi-flip]'), 'click', () => { flipped = !flipped; render(); });
    for (const key of ['mode', 'level', 'human']) scope.on($(`[data-reversi-${key}]`), 'change', event => {
      settings = { ...settings, [key]: key === 'human' ? Number(event.target.value) : event.target.value }; restart();
    });
    render();
    S.intro(ui, scope, { title: 'Cờ lật · Đen & trắng', symbol: 'grid', detail: 'Đặt quân để kẹp và lật quân đối thủ. Giữ các góc, hạn chế nước đi của bên kia. Nhiều quân hơn khi cả hai hết nước là thắng.',
      onStart() { started = true; render(); schedule(); } });
    return S.handle(scope, restart);
  };
})();
