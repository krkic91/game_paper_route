(function () {
  'use strict';
  const S = window.ArcadeShared, L = window.ArcadeDraughts;
  window.ArcadeGames.draughts = function (host, options = {}) {
    const scope = S.createScope(); let settings = {}, state = L.createGame(), started = false, route = [], hint = null;
    const ui = S.buildUI(host, { className: 'family-workspace draughts-workspace',
      toolbar: '<div class="family-heading"><small>MỘT BÀN CỜ · NHIỀU NƯỚC HAY</small><strong>Cờ đam<span> / Draughts</span></strong></div><label class="family-option">Chế độ<select data-draughts-mode><option value="ai">Đấu máy</option><option value="local">2 người</option></select></label><label class="family-option">Máy<select data-draughts-level><option value="medium">Vừa</option><option value="easy">Dễ</option></select></label>',
      board: '<div class="family-board-wrap"><div class="family-scoreline"><span data-draughts-count></span><strong data-draughts-turn></strong></div><div class="draughts-board" role="group" aria-label="Bàn cờ đam 8 nhân 8"></div><p class="family-caption">Đỏ đi trước · ★ là quân vua · Chấm sáng là ô có thể đi</p></div>',
      controls: '<button class="control-button" data-draughts-undo>Hoàn tác</button><button class="control-button" data-draughts-hint>Gợi ý</button><details class="family-rules"><summary>Luật bàn cờ</summary><p>Luật Anh 8 × 8: quân thường đi và bắt chéo về phía trước. Vua đi chéo một ô cả hai hướng, không bay. Có nước bắt thì bắt buộc ăn; được chọn chuỗi bất kỳ nhưng phải ăn hết chuỗi. Đến hàng cuối được phong vua và dừng lượt.</p><p>Hết quân hoặc hết nước đi là thua. Tự hòa khi lặp thế cờ 3 lần, hoặc 80 lượt liên tiếp chỉ đi vua và không bắt quân. Hai người chơi chung thiết bị.</p></details>' });
    const $ = sel => ui.workspace.querySelector(sel), board = $('.draughts-board');
    const human = () => started && state.phase === 'play' && (state.mode === 'local' || state.current === 1);
    const cells = Array.from({ length: 64 }, (_, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.draughtsCell = i;
      b.className = 'draughts-cell ' + ((Math.floor(i / 8) + i % 8) % 2 ? 'dark' : 'light');
      board.append(b); return b;
    });
    function render() {
      const moves = L.legalMoves(state), choices = moves.filter(m => route.every((v, i) => m.path[i] === v));
      const destinations = route.length ? choices.map(m => m.path[route.length]) : [];
      const view = state.board.slice();
      if (route.length > 1) {
        const piece = view[route[0]]; view[route[0]] = 0;
        for (let i = 1; i < route.length; i++) view[(route[i] + route[i - 1]) / 2] = 0;
        view[route.at(-1)] = piece;
      }
      cells.forEach((b, i) => {
        const p = view[i], name = p > 0 ? 'Đỏ' : 'Đen';
        b.innerHTML = p ? `<span class="draughts-piece ${p > 0 ? 'red' : 'black'}">${Math.abs(p) === 2 ? '★' : ''}</span>` : '';
        b.classList.toggle('is-selected', route.at(-1) === i); b.classList.toggle('is-target', destinations.includes(i));
        b.classList.toggle('is-hint', Boolean(hint?.path.includes(i))); b.classList.toggle('is-last', Boolean(state.last?.includes(i)));
        b.disabled = !human() || !((route.length < 2 && moves.some(m => m.path[0] === i)) || destinations.includes(i));
        b.setAttribute('aria-label', `${String.fromCharCode(65 + i % 8)}${8 - Math.floor(i / 8)}${p ? ', ' + name + (Math.abs(p) === 2 ? ' vua' : '') : ', trống'}${destinations.includes(i) ? ', có thể đi' : ''}`);
        b.setAttribute('aria-pressed', String(route.at(-1) === i));
      });
      $('[data-draughts-count]').textContent = `Đỏ ${state.board.filter(p => p > 0).length} · Đen ${state.board.filter(p => p < 0).length}`;
      $('[data-draughts-turn]').textContent = state.phase === 'finished' ? 'Kết thúc' : `${state.current > 0 ? 'Đỏ' : 'Đen'} ${human() ? 'đến lượt' : 'đang nghĩ…'}`;
      $('[data-draughts-undo]').disabled = !state.history.length && !route.length;
      $('[data-draughts-hint]').disabled = !human(); $('[data-draughts-level]').disabled = state.mode === 'local';
      ui.workspace.dataset.phase = state.phase; ui.workspace.dataset.turn = state.turn;
      ui.message(route.length > 1 ? 'Tiếp tục bắt bằng quân đang đi.' : moves[0]?.taken.length ? 'Có nước bắt: chọn quân và đi tới ô sáng để ăn quân.' : 'Chọn quân của mình, rồi chọn ô chéo được đánh dấu.');
    }
    function schedule() {
      scope.clearTimers();
      if (started && state.phase === 'play' && state.mode === 'ai' && state.current === -1) scope.after(0.4, () => act(L.chooseMove(state).path));
    }
    function act(path) {
      if (!L.play(state, path).ok) return;
      route = []; hint = null; render();
      if (state.phase === 'finished') S.result(ui, scope, { title: state.winner === 0 ? 'Hai bên hòa nhau!' : `${state.winner > 0 ? 'Đỏ' : 'Đen'} thắng!`,
        detail: state.winner === 0 ? 'Ván kết thúc theo luật lặp thế cờ hoặc không tiến triển.' : 'Đối phương đã hết quân hoặc không còn nước hợp lệ.',
        score: state.winner === 1 || state.mode === 'local' && state.winner ? 100 : 0, win: state.winner !== 0 && (state.mode === 'local' || state.winner === 1), onAgain: restart, onScore: options.onScore });
      else schedule();
    }
    function restart() { scope.clearTimers(); S.clearOverlays(ui); state = L.createGame(settings); route = []; hint = null; started = true; render(); }
    scope.on(board, 'click', e => {
      const b = e.target.closest('[data-draughts-cell]'); if (!b || b.disabled || !human()) return;
      const i = Number(b.dataset.draughtsCell), moves = L.legalMoves(state);
      if (route.length && moves.some(m => route.every((v, k) => m.path[k] === v) && m.path[route.length] === i)) {
        route.push(i); const completed = moves.find(m => m.path.length === route.length && m.path.every((v, k) => route[k] === v));
        if (completed) act(completed.path); else render();
      } else if (route.length < 2) { route = [i]; hint = null; render(); }
    });
    scope.on($('[data-draughts-hint]'), 'click', () => { if (human()) { route = []; hint = L.chooseMove(state); render(); ui.message('Đường viền vàng chỉ chuỗi nước đi gợi ý.'); } });
    scope.on($('[data-draughts-undo]'), 'click', () => {
      scope.clearTimers(); S.clearOverlays(ui);
      if (!route.length) { L.undo(state); if (state.mode === 'ai' && state.current !== 1) L.undo(state); }
      route = []; hint = null; render(); schedule();
    });
    for (const k of ['mode', 'level']) scope.on($(`[data-draughts-${k}]`), 'change', e => { settings[k] = e.target.value; restart(); });
    render(); S.intro(ui, scope, { title: 'Cờ đam', symbol: 'grid', detail: 'Mười hai quân mỗi bên. Đi chéo, bắt liên tiếp và đưa quân tới cuối bàn để phong vua. Bạn cầm Đỏ khi đấu máy.', onStart() { started = true; render(); } });
    return S.handle(scope, restart);
  };
})();
