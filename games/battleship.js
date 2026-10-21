// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const coordinate = cell => `${String.fromCharCode(65 + Math.floor(cell / 10))}${cell % 10 + 1}`;
  const shipIcon = '<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M5 21h54l-9 9H15Z" fill="currentColor"/><path d="M22 20V10h21v10M30 10V3h3v7M43 15h10v5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M2 31h60" stroke="currentColor" opacity=".4"/></svg>';
  window.ArcadeGames.battleship = function (host, options = {}) {
    const L = window.ArcadeBattleship, scope = S.createScope();
    let difficulty = 'normal', state = L.createGame({ difficulty }), started = false;
    let selected = L.FLEET[0].id, vertical = false, preview = null, message = 'Chọn tàu, rồi chạm ô đầu tàu trên vùng biển của bạn.';
    const ui = S.buildUI(host, {
      className: 'battleship-workspace',
      toolbar: '<div class="bs-heading"><small>CHIẾN THUẬT TRÊN BIỂN</small><strong>Hải chiến<span>.</span></strong></div><label class="bs-difficulty">Đối thủ máy<select data-bs-difficulty aria-label="Độ khó Hải chiến"><option value="easy">Dễ · Tìm ngẫu nhiên</option><option value="normal" selected>Vừa · Truy tìm</option><option value="hard">Khó · Suy luận vị trí</option></select></label>',
      board: `<div class="bs-field"><div class="bs-mission"><div>${shipIcon}<strong data-bs-phase></strong></div><span data-bs-turn></span></div>
        <section class="bs-setup" data-bs-setup aria-label="Xếp đội tàu"><div class="bs-fleet" data-bs-fleet>${L.FLEET.map(ship => `<button type="button" data-bs-ship="${ship.id}"><span>${ship.name}</span><i aria-hidden="true">${'▰'.repeat(ship.length)}</i><small data-bs-placed="${ship.id}">Chưa đặt</small></button>`).join('')}</div><div class="bs-setup-actions"><button type="button" class="control-button" data-bs-rotate>Xoay: Ngang ↔</button><button type="button" class="control-button" data-bs-random>Xếp ngẫu nhiên</button><button type="button" class="control-button" data-bs-clear>Xếp lại từ đầu</button><button type="button" class="control-button bs-launch" data-bs-launch>Xuất trận →</button></div><p data-bs-instruction></p></section>
        <div class="bs-boards"><section class="bs-sea bs-home"><header><div><small>HẬU PHƯƠNG</small><h3>Đội tàu của bạn</h3></div><strong data-bs-own-count></strong></header><div class="bs-grid-scroll"><div class="bs-grid" data-bs-board="own" role="group" aria-label="Bản đồ của bạn, 10 hàng A đến J, 10 cột"></div></div></section>
        <section class="bs-sea bs-enemy"><header><div><small>VÙNG BIỂN ĐỐI PHƯƠNG</small><h3>Radar mục tiêu</h3></div><strong data-bs-enemy-count></strong></header><div class="bs-grid-scroll"><div class="bs-grid" data-bs-board="target" role="group" aria-label="Bản đồ mục tiêu, 10 hàng A đến J, 10 cột"></div></div></section></div>
        <div class="bs-legend"><span><i class="bs-legend-ship"></i>Tàu</span><span><i class="bs-legend-miss">·</i>Trượt</span><span><i class="bs-legend-hit">×</i>Trúng</span><span><i class="bs-legend-sunk">×</i>Chìm</span></div><p class="bs-report" data-bs-report role="status"></p></div>`,
      controls: '<details class="bs-rules"><summary>Luật chơi & điều khiển</summary><p>Mỗi bên có 5 tàu dài 5, 4, 3, 3, 2 ô. Tàu được chạm nhau nhưng không chồng lên nhau, chỉ đặt ngang hoặc dọc. Chọn lại tên tàu rồi chọn ô mới để di chuyển tàu trước khi xuất trận.</p><p>Bạn bắn trước. Hai bên luân phiên bắn một ô, kể cả khi bắn trúng. Phá đủ 17 ô của 5 tàu đối phương để thắng. Máy chỉ suy luận từ các phát bắn đã biết.</p><p>Dùng phím mũi tên để di chuyển giữa các ô, Enter hoặc Space để chọn. Nhấn R trong lúc xếp tàu để xoay. Trên màn hình nhỏ, hai vùng biển xếp dọc.</p></details>',
      status: message,
    });
    const $ = selector => ui.workspace.querySelector(selector);
    const ownGrid = $('[data-bs-board="own"]'), targetGrid = $('[data-bs-board="target"]');
    for (let cell = 0; cell < 100; cell++) for (const [grid, kind] of [[ownGrid, 'place'], [targetGrid, 'target']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'bs-cell'; button.dataset[kind === 'place' ? 'bsPlace' : 'bsTarget'] = cell;
      grid.append(button);
    }
    function say(text) { message = text; $('[data-bs-report]').textContent = text; ui.message(text); }
    function render() {
      const view = L.getView(state, 0), setup = state.phase === 'setup';
      ui.workspace.dataset.phase = state.phase;
      ui.workspace.dataset.current = state.current;
      ui.workspace.classList.toggle('bs-in-battle', !setup);
      $('[data-bs-setup]').hidden = !setup;
      $('[data-bs-difficulty]').disabled = !setup;
      $('[data-bs-phase]').textContent = setup ? 'Chuẩn bị đội tàu' : state.phase === 'finished' ? 'Trận hải chiến kết thúc' : state.current === 0 ? 'Đến lượt bạn khai hỏa' : 'Đối phương đang ngắm bắn…';
      $('[data-bs-turn]').textContent = setup ? `${view.own.ships.length}/5 tàu đã đặt` : `${state.turn} phát bắn`;
      const lost = view.own.ships.filter(ship => ship.cells.every(cell => view.own.shots[cell])).length;
      $('[data-bs-own-count]').textContent = setup ? `${view.own.ships.length}/5` : `${5 - lost}/5 còn lại`;
      $('[data-bs-enemy-count]').textContent = `${5 - view.sunkShips.length}/5 còn lại`;
      $('[data-bs-launch]').disabled = !started || view.own.ships.length !== 5;
      const spec = L.FLEET.find(ship => ship.id === selected);
      $('[data-bs-instruction]').textContent = `Đang chọn ${spec.name.toLowerCase()} · ${spec.length} ô · ${vertical ? 'dọc ↓' : 'ngang →'}. Chọn ô bắt đầu tàu.`;
      $('[data-bs-rotate]').textContent = `Xoay: ${vertical ? 'Dọc ↕' : 'Ngang ↔'}`;
      for (const ship of L.FLEET) {
        const button = $(`[data-bs-ship="${ship.id}"]`);
        button.setAttribute('aria-pressed', String(selected === ship.id));
        $(`[data-bs-placed="${ship.id}"]`).textContent = view.own.ships.some(item => item.id === ship.id) ? '✓ Đã đặt' : 'Chưa đặt';
      }
      const ownCells = new Set(view.own.ships.flatMap(ship => ship.cells));
      const lostCells = new Set(view.own.ships.filter(ship => ship.cells.every(cell => view.own.shots[cell])).flatMap(ship => ship.cells));
      const revealed = new Set((view.revealed || []).flatMap(ship => ship.cells));
      const previewCells = setup && preview !== null ? L.cellsFor(preview, spec.length, vertical) || [] : [];
      const conflict = previewCells.length !== spec.length || view.own.ships.some(ship => ship.id !== selected && ship.cells.some(cell => previewCells.includes(cell)));
      for (let cell = 0; cell < 100; cell++) {
        const own = ownGrid.children[cell], enemy = targetGrid.children[cell];
        const ownStatus = view.own.shots[cell] ? lostCells.has(cell) ? 'sunk' : ownCells.has(cell) ? 'hit' : 'miss' : ownCells.has(cell) ? 'ship' : 'unknown';
        const targetStatus = view.target[cell] === 'unknown' && revealed.has(cell) ? 'ship' : view.target[cell];
        for (const [button, status, mine] of [[own, ownStatus, true], [enemy, targetStatus, false]]) {
          button.className = `bs-cell bs-${status}`;
          button.textContent = status === 'hit' || status === 'sunk' ? '×' : status === 'miss' ? '·' : status === 'ship' ? '▬' : '';
          button.setAttribute('aria-label', `${mine ? 'Biển của bạn' : 'Mục tiêu'} ${coordinate(cell)}: ${{ unknown: 'chưa bắn', ship: 'tàu', miss: 'trượt', hit: 'trúng tàu', sunk: 'tàu đã chìm' }[status]}`);
          button.disabled = mine ? !started || !setup : !started || setup || state.phase !== 'battle' || state.current !== 0 || view.target[cell] !== 'unknown';
          if (state.lastShot && state.lastShot.cell === cell && (mine ? state.lastShot.player === 1 : state.lastShot.player === 0)) button.classList.add('bs-last');
        }
        if (previewCells.includes(cell)) own.classList.add(conflict ? 'bs-preview-invalid' : 'bs-preview');
      }
      $('[data-bs-report]').textContent = message;
    }
    function finish() {
      scope.clearTimers(); render();
      const won = state.winner === 0, shots = state.boards[1].shots.filter(Boolean).length;
      say(won ? 'Toàn bộ 5 tàu đối phương đã bị đánh chìm!' : 'Đội tàu của bạn đã bị đánh chìm. Hãy thử cách bố trí khác!');
      S.result(ui, scope, { title: won ? 'Bạn làm chủ vùng biển!' : 'Hẹn phục thù trên biển!', detail: `${won ? 'Bạn' : 'Đối phương'} đã đánh chìm đủ 5 tàu. Bạn dùng ${shots} phát bắn. Các tàu còn lại được mở trên radar.`, score: won ? Math.max(100, 1500 - shots * 10) : 0, win: won, onAgain: restart, onScore: options.onScore });
    }
    function fire(player, cell) {
      const result = L.shoot(state, player, cell);
      if (!result.ok) { say(result.error); return; }
      const shipName = result.shipId && L.FLEET.find(ship => ship.id === result.shipId).name.toLowerCase();
      say(`${player === 0 ? 'Bạn' : 'Máy'} bắn ${coordinate(cell)}: ${result.result === 'miss' ? 'trượt' : result.result === 'hit' ? 'trúng tàu' : `đánh chìm ${shipName}`}!`);
      render();
      if (state.phase === 'finished') finish();
      else if (state.current === 1) scope.after(0.7, () => {
        const cell = L.chooseShot(L.getView(state, 1), state.difficulty);
        if (cell !== null) fire(1, cell);
      });
    }
    function restart() {
      scope.clearTimers(); S.clearOverlays(ui);
      state = L.createGame({ difficulty }); started = true; vertical = false; selected = L.FLEET[0].id; preview = null;
      say('Ván mới: xếp đội tàu của bạn hoặc chọn Xếp ngẫu nhiên.'); render(); ui.workspace.focus({ preventScroll: true });
    }
    scope.on(ownGrid, 'click', event => {
      const button = event.target.closest('[data-bs-place]');
      if (!button || button.disabled || !started) return;
      const result = L.placeShip(state, 0, selected, Number(button.dataset.bsPlace), vertical);
      if (result.ok) {
        const name = L.FLEET.find(ship => ship.id === selected).name;
        selected = L.FLEET.find(ship => !state.boards[0].ships.some(item => item.id === ship.id))?.id || selected;
        say(`Đã đặt ${name.toLowerCase()}. ${state.boards[0].ships.length === 5 ? 'Đội tàu sẵn sàng xuất trận!' : 'Tiếp tục xếp tàu kế tiếp.'}`);
      } else say(result.error);
      preview = null; render();
    });
    scope.on(ownGrid, 'pointerover', event => { const button = event.target.closest('[data-bs-place]'); if (button && state.phase === 'setup') { preview = Number(button.dataset.bsPlace); render(); } });
    scope.on(ownGrid, 'pointerleave', () => { if (preview !== null) { preview = null; render(); } });
    scope.on(targetGrid, 'click', event => { const button = event.target.closest('[data-bs-target]'); if (button && !button.disabled && started) fire(0, Number(button.dataset.bsTarget)); });
    scope.on($('[data-bs-fleet]'), 'click', event => { const button = event.target.closest('[data-bs-ship]'); if (button) { selected = button.dataset.bsShip; preview = null; render(); } });
    scope.on($('[data-bs-rotate]'), 'click', () => { vertical = !vertical; render(); });
    scope.on($('[data-bs-random]'), 'click', () => { L.randomizeFleet(state); preview = null; say('Đã xếp đủ 5 tàu ngẫu nhiên. Bạn vẫn có thể chọn từng tàu để đổi vị trí.'); render(); });
    scope.on($('[data-bs-clear]'), 'click', () => { L.clearFleet(state); selected = L.FLEET[0].id; preview = null; say('Đã dọn bản đồ. Chọn ô đầu tiên để đặt tàu sân bay.'); render(); });
    scope.on($('[data-bs-launch]'), 'click', () => {
      if (!started) return;
      const result = L.start(state);
      if (!result.ok) { say(result.error); return; }
      preview = null; say('Bạn bắn trước. Chọn một ô chưa bắn trên radar mục tiêu.'); render();
      targetGrid.children[0].focus({ preventScroll: true }); targetGrid.scrollIntoView({ block: 'nearest' });
    });
    scope.on($('[data-bs-difficulty]'), 'change', event => { if (state.phase === 'setup') { difficulty = event.target.value; state.difficulty = difficulty; } });
    scope.on(ui.workspace, 'keydown', event => {
      if (event.target.tagName === 'SELECT') return;
      if (event.key.toLowerCase() === 'r' && state.phase === 'setup' && started) {
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) { vertical = !vertical; render(); }
        return;
      }
      const cell = event.target.closest('.bs-cell');
      if (!cell || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const grid = cell.parentElement, buttons = [...grid.children], index = buttons.indexOf(cell), step = { ArrowUp: -10, ArrowDown: 10, ArrowLeft: -1, ArrowRight: 1 }[event.key];
      let next = index + step;
      while (next >= 0 && next < 100 && buttons[next].disabled) next += step;
      if (next >= 0 && next < 100) { buttons[next].focus(); if (grid === ownGrid) { preview = next; render(); } }
    });
    render();
    S.intro(ui, scope, { title: 'Hải chiến · Làm chủ vùng biển', symbol: 'target', detail: 'Giấu 5 tàu trên biển 10×10. Hai bên luân phiên khai hỏa. Tìm và đánh chìm toàn bộ đội tàu đối phương trước khi quá muộn!', onStart() { started = true; render(); } });
    return S.handle(scope, restart);
  };
})();
