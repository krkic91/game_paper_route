// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const sides = ['Đỏ', 'Xanh'];
  // Local vector portraits keep the pieces readable without fonts or downloaded images.
  function portrait(rank) {
    const ears = rank === 8 ? '<ellipse cx="9" cy="21" rx="7" ry="10"/><ellipse cx="35" cy="21" rx="7" ry="10"/>' :
      rank === 1 ? '<circle cx="10" cy="10" r="8"/><circle cx="34" cy="10" r="8"/>' :
      rank === 4 ? '<ellipse cx="10" cy="20" rx="6" ry="13"/><ellipse cx="34" cy="20" rx="6" ry="13"/>' :
      '<path d="M9 19 9 4 19 11M25 11 35 4 35 19Z"/>';
    const mane = rank === 7 ? '<path d="m22 1 7 5 8 1 1 8 5 7-5 7-1 8-8 1-7 5-7-5-8-1-1-8-5-7 5-7 1-8 8-1Z"/>' : '';
    const markings = rank === 6 ? '<path d="m11 18 7 3-7 2m22-5-7 3 7 2M20 8l2 8 2-8" fill="none"/>' :
      rank === 5 ? '<g fill="currentColor" stroke="none"><circle cx="12" cy="20" r="2"/><circle cx="32" cy="20" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="27" cy="12" r="2"/><circle cx="13" cy="29" r="2"/><circle cx="31" cy="29" r="2"/></g>' : '';
    return `<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><g fill="var(--animal-fill)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${mane}${ears}<path d="M8 20Q8 9 22 9T36 20Q36 37 22 39Q8 37 8 20Z"/>${markings}<g fill="currentColor" stroke="none"><circle cx="16" cy="23" r="2"/><circle cx="28" cy="23" r="2"/></g>${rank === 8 ? '<path d="M19 28v10q0 5 6 2l3-4" fill="none" stroke-width="4"/>' : '<path d="m19 29 3 3 3-3Z"/><path d="M22 32v3m-6-1q6 5 12 0" fill="none"/>'}${rank === 1 || rank === 2 ? '<path d="m14 29-9-2m9 5-9 2m25-5 9-2m-9 5 9 2" fill="none"/>' : ''}</g></svg>`;
  }

  window.ArcadeGames.jungle = function (host, options = {}) {
    const L = window.ArcadeJungle, scope = S.createScope();
    let state = L.createGame(), started = false, selected = null, flipped = false;
    let mode = 'ai', difficulty = 'normal', first = 0, human = 0, thinking = false;
    const ui = S.buildUI(host, {
      className: 'jungle-workspace',
      toolbar: '<div class="jungle-heading"><small>VƯỢT SÔNG · CHIẾM HANG</small><strong>Cờ Thú<span>.</span></strong></div><div class="jungle-settings"><label>Chế độ<select data-jungle-mode aria-label="Chế độ Cờ Thú"><option value="ai">Đấu máy</option><option value="local">2 người cùng máy</option></select></label><label>Độ khó<select data-jungle-difficulty aria-label="Độ khó Cờ Thú"><option value="easy">Dễ</option><option value="normal" selected>Vừa</option><option value="hard">Khó</option></select></label><label>Đi trước<select data-jungle-first aria-label="Bên đi trước"><option value="0">Đỏ (bạn)</option><option value="1">Xanh (máy)</option></select></label></div>',
      board: '<div class="jungle-table"><div class="jungle-turn"><strong data-jungle-turn></strong><span data-jungle-count></span></div><div class="jungle-board" role="group" aria-label="Bàn Cờ Thú 7 cột 9 hàng"></div><div class="jungle-legend"><span><i class="jungle-water-key"></i>Sông</span><span>◇ Bẫy</span><span>⌂ Hang</span><span>● Ô có thể đi</span></div><div class="jungle-captured" data-jungle-captured></div></div>',
      controls: '<button class="control-button" data-jungle-undo>Đi lại</button><button class="control-button" data-jungle-hint>Gợi ý</button><button class="control-button" data-jungle-flip>Xoay bàn</button><details class="jungle-rules"><summary>Luật & sức mạnh</summary><p>Chuột 1 · Mèo 2 · Sói 3 · Chó 4 · Báo 5 · Hổ 6 · Sư tử 7 · Voi 8. Quân mạnh ăn quân yếu hoặc bằng sức. Chuột ăn Voi; Voi không ăn Chuột, trừ Chuột trong bẫy của Voi.</p><p>Mỗi lượt đi một ô ngang hoặc dọc. Chỉ Chuột xuống sông; không ăn qua ranh giới sông và đất. Hổ và Sư tử nhảy qua sông nếu không có Chuột trên đường nhảy.</p><p>Quân trong bẫy đối phương bị bắt bởi mọi quân bảo vệ; ra khỏi bẫy lấy lại sức. Không được vào hang mình. Vào hang đối phương hoặc khiến họ hết nước đi là thắng.</p><p>Hòa khi cùng thế cờ và bên đi lặp 3 lần, 100 lượt không ăn quân hoặc 300 lượt tổng. Đấu máy: bạn cầm Đỏ; Đi lại hoàn tác cả cặp lượt. Đổi thiết lập sẽ bắt đầu ván mới.</p></details>',
      status: 'Chọn quân, sau đó chọn ô có chấm sáng để đi.',
    });
    const $ = selector => ui.workspace.querySelector(selector);
    const board = $('.jungle-board'), modeSelect = $('[data-jungle-mode]'), difficultySelect = $('[data-jungle-difficulty]'), firstSelect = $('[data-jungle-first]');
    const canAct = () => started && state.phase === 'play' && !thinking && (mode === 'local' || state.turn === human);

    function render() {
      const focused = document.activeElement?.dataset.jungleCell;
      const moves = canAct() && selected !== null ? L.legalMoves(state).filter(m => m.from === selected) : [];
      const order = Array.from({ length: 63 }, (_, i) => flipped ? 62 - i : i);
      board.innerHTML = order.map(i => {
        const piece = state.board[i], rank = Math.abs(piece), side = piece ? L.sideOf(piece) : null;
        const den = L.DENS.indexOf(i), trap = L.trapOwner(i), legal = moves.find(m => m.to === i);
        const terrain = L.water(i) ? 'sông' : den >= 0 ? `hang ${sides[den]}` : trap !== null ? `bẫy ${sides[trap]}` : 'đất';
        const label = `${L.coordinate(i)}, ${piece ? `${L.NAMES[rank]} ${sides[side]}, sức ${rank}` : 'trống'}, ${terrain}${legal ? ', có thể đi' : ''}`;
        return `<button type="button" data-jungle-cell="${i}" class="jungle-cell${L.water(i) ? ' is-water' : ''}${den >= 0 ? ` is-den side-${den}` : ''}${trap !== null ? ` is-trap side-${trap}` : ''}${piece ? ` has-piece piece-${side}` : ''}${selected === i ? ' is-selected' : ''}${legal ? ' is-legal' : ''}${state.lastMove && (state.lastMove.from === i || state.lastMove.to === i) ? ' is-last' : ''}" aria-label="${label}" aria-pressed="${selected === i}"${!canAct() ? ' disabled' : ''}>${piece ? `<span class="jungle-animal">${portrait(rank)}<span>${L.NAMES[rank]}</span><b>${rank}</b></span>` : `<span class="jungle-terrain" aria-hidden="true">${den >= 0 ? '⌂' : trap !== null ? '◇' : ''}</span>`}${legal ? '<i class="jungle-target" aria-hidden="true"></i>' : ''}</button>`;
      }).join('');
      if (focused !== undefined && canAct()) board.querySelector(`[data-jungle-cell="${focused}"]`)?.focus({ preventScroll: true });
      $('[data-jungle-turn]').textContent = state.phase === 'finished' ? 'Ván đã kết thúc' : thinking ? 'Xanh đang suy nghĩ…' : `${sides[state.turn]} đi${mode === 'ai' && state.turn === human ? ' · lượt của bạn' : ''}`;
      $('[data-jungle-count]').textContent = `Lượt ${state.ply + 1} · Đỏ ${state.board.filter(p => p > 0).length} / Xanh ${state.board.filter(p => p < 0).length}`;
      $('[data-jungle-captured]').textContent = state.captured.length ? `Đã bắt: ${state.captured.map(p => `${L.NAMES[Math.abs(p)]} ${sides[L.sideOf(p)]}`).join(' · ')}` : 'Mục tiêu: đưa một quân vào hang đối phương.';
      $('[data-jungle-undo]').disabled = !started || !state.history.length;
      $('[data-jungle-hint]').disabled = !canAct();
      difficultySelect.disabled = mode !== 'ai';
      firstSelect.options[0].text = mode === 'ai' ? 'Đỏ (bạn)' : 'Đỏ';
      firstSelect.options[1].text = mode === 'ai' ? 'Xanh (máy)' : 'Xanh';
      ui.workspace.dataset.turn = String(state.turn);
      ui.workspace.dataset.ply = String(state.ply);
      ui.workspace.dataset.phase = state.phase;
    }

    function finish() {
      thinking = false;
      render();
      const reason = { den: 'đã chiếm hang đối phương', 'no-moves': 'đối phương không còn nước đi', repetition: 'thế cờ lặp lại 3 lần', quiet: '100 lượt không ăn quân', limit: 'đã đi đủ 300 lượt' }[state.reason];
      const draw = state.winner === null;
      S.result(ui, scope, { title: draw ? 'Hai bên hòa cờ' : `${sides[state.winner]} chiến thắng!`,
        detail: draw ? `Ván hòa vì ${reason}.` : `${sides[state.winner]} thắng vì ${reason}.`,
        score: draw ? 50 : mode === 'local' || state.winner === human ? 100 : 0,
        win: !draw && (mode === 'local' || state.winner === human), onAgain: restart, onScore: options.onScore });
    }

    function act(from, to) {
      const result = L.move(state, from, to);
      if (!result.ok) { ui.message(result.error); return; }
      selected = null;
      const last = state.lastMove;
      ui.message(`${sides[L.sideOf(last.piece)]}: ${L.NAMES[Math.abs(last.piece)]} ${L.coordinate(from)} → ${L.coordinate(to)}${last.jump ? ', nhảy sông' : ''}${last.capture ? `, bắt ${L.NAMES[Math.abs(last.capture)]}` : ''}.`);
      if (state.phase === 'finished') finish();
      else { render(); scheduleBot(); }
    }
    function scheduleBot() {
      if (!started || state.phase !== 'play' || mode !== 'ai' || state.turn === human) return;
      thinking = true;
      render();
      scope.after(.45, () => {
        const action = L.chooseMove(state, difficulty);
        thinking = false;
        if (action) act(action.from, action.to);
      });
    }
    function restart() {
      scope.clearTimers(); S.clearOverlays(ui);
      mode = modeSelect.value; difficulty = difficultySelect.value; first = Number(firstSelect.value);
      state = L.createGame({ first }); started = true; thinking = false; selected = null;
      ui.message('Ván mới. Chọn quân của bên đến lượt để xem nước đi hợp lệ.');
      render(); scheduleBot();
    }
    scope.on(board, 'click', event => {
      const target = event.target.closest('[data-jungle-cell]');
      if (!target || !canAct()) return;
      const square = Number(target.dataset.jungleCell), piece = state.board[square];
      if (selected !== null && L.legalMoves(state).some(m => m.from === selected && m.to === square)) {
        act(selected, square); return;
      }
      selected = piece && L.sideOf(piece) === state.turn ? selected === square ? null : square : null;
      render();
      if (selected !== null) ui.message(`${L.NAMES[Math.abs(piece)]} ${sides[state.turn]} ở ${L.coordinate(square)}. Chọn một ô có chấm sáng.`);
    });
    scope.on(board, 'keydown', event => {
      const index = Number(event.target.closest('[data-jungle-cell]')?.dataset.jungleCell);
      if (!Number.isInteger(index)) return;
      const delta = { ArrowUp: -7, ArrowDown: 7, ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!delta) return;
      event.preventDefault();
      const next = index + delta * (flipped ? -1 : 1);
      if (next >= 0 && next < 63 && (Math.abs(delta) !== 1 || Math.floor(index / 7) === Math.floor(next / 7))) board.querySelector(`[data-jungle-cell="${next}"]`)?.focus();
    });
    scope.on($('[data-jungle-undo]'), 'click', () => {
      if (!state.history.length) return;
      scope.clearTimers(); S.clearOverlays(ui);
      const lastHuman = mode === 'ai' ? state.history.map(s => s.turn).lastIndexOf(human) : -1;
      const count = mode === 'ai' && lastHuman >= 0 ? state.history.length - lastHuman : 1;
      L.undo(state, count); thinking = false; selected = null;
      ui.message('Đã hoàn tác nước đi.'); render(); scheduleBot();
    });
    scope.on($('[data-jungle-flip]'), 'click', () => { flipped = !flipped; render(); });
    scope.on($('[data-jungle-hint]'), 'click', () => {
      if (!canAct()) return;
      const action = L.chooseMove(state, 'normal');
      if (!action) return;
      selected = action.from; render();
      board.querySelector(`[data-jungle-cell="${action.to}"]`)?.classList.add('is-hint');
      ui.message(`Gợi ý: ${L.NAMES[Math.abs(state.board[action.from])]} ${L.coordinate(action.from)} → ${L.coordinate(action.to)}. Bấm ô đích để đi.`);
    });
    for (const select of [modeSelect, difficultySelect, firstSelect]) scope.on(select, 'change', restart);
    render();
    S.intro(ui, scope, { title: 'Cờ Thú · Chiếm hang đối phương', symbol: 'grid',
      detail: 'Tám loài thú, hai dòng sông và những chiếc bẫy. Bạn cầm Đỏ đấu máy; có thể chọn hai người cùng máy. Chọn quân để xem các ô được phép đi.',
      onStart() { started = true; render(); scheduleBot(); } });
    return S.handle(scope, restart);
  };
})();
