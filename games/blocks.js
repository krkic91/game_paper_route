// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const COLORS = { I: '#65d4dc', J: '#7799f0', L: '#f1a268', O: '#eed379', S: '#9ad3a0', T: '#b79bdf', Z: '#ed8997' };
  const labels = { left: 'Sang trái', right: 'Sang phải', rotate: 'Xoay phải', counter: 'Xoay trái', soft: 'Hạ chậm', drop: 'Thả ngay', hold: 'Giữ khối' };
  const buttons = [['left', '←'], ['rotate', '↻'], ['right', '→'], ['soft', '↓'], ['counter', '↺'], ['hold', '⇄'], ['drop', '⤓']];
  window.ArcadeGames.blocks = function (host, options = {}) {
    const L = window.ArcadeBlocks, scope = S.createScope();
    let state = L.createGame(), started = false, finished = false, previewKey = '', lastPieces = -1;
    const held = new Map();
    const ui = S.buildUI(host, {
      className: 'blocks-workspace',
      toolbar: `<div class="blocks-heading"><span>NHỊP RƠI · NHỊP NGHĨ</span><strong>XẾP GẠCH<span>▦</span></strong></div><div class="blocks-stats">${S.stat('Điểm', 'score', 0)}${S.stat('Cấp', 'level', 1)}${S.stat('Hàng', 'lines', 0)}</div>`,
      board: '<div class="blocks-playfield"><div class="blocks-well"><canvas data-blocks-board role="img" aria-label="Giếng xếp gạch 10 cột, 20 hàng. Khối viền mờ cho biết vị trí rơi."></canvas><span class="blocks-well-label" aria-hidden="true">10 × 20</span></div><aside class="blocks-sidebar"><div class="blocks-preview-panel"><span>GIỮ KHỐI</span><div data-blocks-hold></div><small data-blocks-hold-note>C / Shift</small></div><div class="blocks-preview-panel"><span>TIẾP THEO</span><div data-blocks-next></div></div><p class="blocks-combo" data-blocks-combo>Chậm lại.<br>Tìm khoảng trống.</p></aside></div>',
      controls: `<div class="blocks-touch-controls">${buttons.map(([action, symbol]) => `<button type="button" class="control-button blocks-action" data-blocks-action="${action}" aria-label="${labels[action]}"><strong aria-hidden="true">${symbol}</strong><span>${labels[action]}</span></button>`).join('')}</div><p class="blocks-key-guide">← → Di chuyển · ↑ / X Xoay · Z Xoay trái · ↓ Hạ chậm<br>Space Thả ngay · C / Shift Giữ khối · P Tạm dừng</p>`,
      status: 'Lấp đầy hàng ngang để ghi điểm. Khối viền mờ là vị trí rơi; giữ một khối để dùng sau.',
    });
    const $ = selector => ui.workspace.querySelector(selector);
    const canvas = $('[data-blocks-board]'), context = canvas.getContext('2d');
    const ratio = Math.min(window.devicePixelRatio || 1, 2), cell = 28;
    canvas.width = 280 * ratio; canvas.height = 560 * ratio; context.scale(ratio, ratio);
    function tile(x, y, kind, ghost = false) {
      if (y < 0) return;
      const px = x * cell + 2, py = y * cell + 2;
      if (ghost) {
        context.strokeStyle = COLORS[kind]; context.globalAlpha = 0.6;
        context.lineWidth = 1.5; context.strokeRect(px + 1, py + 1, cell - 6, cell - 6); context.globalAlpha = 1;
      } else {
        S.roundRect(context, px, py, cell - 4, cell - 4, 4, COLORS[kind]);
        context.fillStyle = '#ffffff45'; context.fillRect(px + 4, py + 3, cell - 12, 2);
        context.fillStyle = '#18222d28'; context.fillRect(px + 4, py + cell - 10, cell - 12, 2);
      }
    }
    function mini(kind) {
      if (!kind) return '<div class="blocks-mini blocks-mini-empty" aria-label="Chưa giữ khối nào"><span>—</span></div>';
      const cells = L.cells({ kind, x: 0, y: 0, rotation: 0 }), minX = Math.min(...cells.map(c => c.x)), minY = Math.min(...cells.map(c => c.y));
      return `<div class="blocks-mini" role="img" aria-label="Khối ${kind}" style="--block-color:${COLORS[kind]}">${cells.map(c => `<i style="grid-column:${c.x - minX + 1};grid-row:${c.y - minY + 1}"></i>`).join('')}</div>`;
    }
    function render() {
      context.fillStyle = '#14212d'; context.fillRect(0, 0, 280, 560);
      context.strokeStyle = '#c9d6df09'; context.lineWidth = 1;
      for (let x = 0; x <= 10; x++) { context.beginPath(); context.moveTo(x * cell, 0); context.lineTo(x * cell, 560); context.stroke(); }
      for (let y = 0; y <= 20; y++) { context.beginPath(); context.moveTo(0, y * cell); context.lineTo(280, y * cell); context.stroke(); }
      state.board.forEach((row, y) => row.forEach((kind, x) => { if (kind) tile(x, y, kind); }));
      if (state.phase === 'play') {
        L.cells({ ...state.active, y: L.ghostY(state) }).forEach(c => tile(c.x, c.y, state.active.kind, true));
        L.cells(state.active).forEach(c => tile(c.x, c.y, state.active.kind));
      }
      ui.setStat('score', state.score); ui.setStat('level', state.level); ui.setStat('lines', state.lines);
      const key = `${state.hold}|${state.queue.slice(0, 3).join('')}|${state.holdUsed}`;
      if (key !== previewKey) {
        previewKey = key; $('[data-blocks-hold]').innerHTML = mini(state.hold);
        $('[data-blocks-next]').innerHTML = state.queue.slice(0, 3).map(mini).join('');
        $('[data-blocks-hold-note]').textContent = state.holdUsed ? 'Chờ khối tiếp theo' : 'C / Shift';
      }
      for (const button of ui.controls.querySelectorAll('[data-blocks-action]')) button.disabled = !started || finished || (button.dataset.blocksAction === 'hold' && state.holdUsed);
      if (lastPieces !== state.pieces) {
        lastPieces = state.pieces;
        $('[data-blocks-combo]').textContent = state.combo > 0 ? `COMBO ×${state.combo + 1}` : state.lastClear ? `+${state.lastClear} HÀNG` : 'Tìm khoảng trống.';
        ui.message(state.lastClear ? `Vừa xóa ${state.lastClear} hàng${state.combo > 0 ? ` · Chuỗi ${state.combo + 1} lần xóa liên tiếp` : ''}. Cấp ${state.level}.` : 'Khối viền mờ chỉ vị trí rơi. Giữ khối để dành cho khoảng trống phù hợp.');
      }
      ui.workspace.dataset.phase = state.phase; ui.workspace.dataset.pieces = state.pieces;
    }
    function checkResult() {
      if (state.phase !== 'over' || finished) return;
      finished = true; held.clear(); render();
      S.result(ui, scope, { title: 'Giếng đã đầy!', detail: `Bạn xóa ${state.lines} hàng, đạt cấp ${state.level} và đặt ${state.pieces} khối. Thử giữ một khoảng trống cho khối dài ở ván sau.`, score: state.score, win: false, onAgain: restart, onScore: options.onScore });
    }
    function action(name) {
      if (!started || finished || scope.paused) return;
      if (name === 'left' || name === 'right') L.move(state, name === 'left' ? -1 : 1);
      else if (name === 'rotate' || name === 'counter') L.rotate(state, name === 'rotate' ? 1 : -1);
      else if (name === 'soft') L.softDrop(state);
      else if (name === 'drop') L.hardDrop(state);
      else if (name === 'hold') L.hold(state);
      render(); checkResult();
    }
    function clearHeld() {
      held.clear(); ui.controls.querySelectorAll('.is-held').forEach(button => button.classList.remove('is-held'));
    }
    function restart() {
      clearHeld(); S.clearOverlays(ui); state = L.createGame(); started = true; finished = false; previewKey = ''; lastPieces = -1;
      render(); ui.workspace.focus({ preventScroll: true });
    }
    const keys = { arrowleft: 'left', arrowright: 'right', arrowup: 'rotate', x: 'rotate', z: 'counter', arrowdown: 'soft', ' ': 'drop', c: 'hold', shift: 'hold' };
    scope.on(ui.workspace, 'keydown', event => {
      const key = S.gameKey(event), name = keys[key];
      if (!name || !started || finished) return;
      event.preventDefault(); if (event.repeat || held.has(`key:${key}`)) return;
      action(name);
      if (['left', 'right', 'soft'].includes(name)) held.set(`key:${key}`, { name, time: name === 'soft' ? 0.055 : 0.17 });
    });
    scope.on(window, 'keyup', event => held.delete(`key:${event.key.toLowerCase()}`), true);
    scope.on(window, 'blur', clearHeld, true);
    scope.on(document, 'visibilitychange', clearHeld, true);
    scope.onPause(clearHeld); scope.cleanup(clearHeld);
    for (const button of ui.controls.querySelectorAll('[data-blocks-action]')) {
      scope.on(button, 'pointerdown', event => {
        if (button.disabled || event.button !== 0) return;
        event.preventDefault(); button.setPointerCapture(event.pointerId);
        const name = button.dataset.blocksAction; action(name);
        if (['left', 'right', 'soft'].includes(name)) held.set(`pointer:${event.pointerId}`, { name, time: name === 'soft' ? 0.055 : 0.17 });
        button.classList.add('is-held'); if (!finished) ui.workspace.focus({ preventScroll: true });
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) scope.on(button, type, event => {
        held.delete(`pointer:${event.pointerId}`); button.classList.remove('is-held');
      }, true);
      scope.on(button, 'click', event => { if (event.detail === 0) action(button.dataset.blocksAction); });
    }
    scope.loop(dt => {
      if (!started || finished) return;
      for (const value of held.values()) {
        value.time -= dt;
        while (value.time <= 0 && !finished) { action(value.name); value.time += value.name === 'soft' ? 0.055 : 0.065; }
      }
      L.advance(state, dt); render(); checkResult();
    });
    render();
    S.intro(ui, scope, { title: 'Xếp gạch · Tìm nhịp của bạn', detail: 'Lấp kín hàng ngang, giữ một khối để dùng sau và nhìn bóng rơi trước khi thả. Xóa 10 hàng để lên cấp. Càng lên cao, khối rơi càng nhanh.', symbol: 'play', onStart() { started = true; render(); } });
    return S.handle(scope, restart);
  };
})();
