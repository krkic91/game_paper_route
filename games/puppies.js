// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const L = window.PuppiesLogic;
  const STORAGE_KEY = 'tram-choi.puppies.v1';
  const PUPPY = window.ArcadeArt.puppy();
  const BONE = '<svg viewBox="0 0 36 26" aria-hidden="true"><path d="M10 7C5-2-3 7 3 12C-3 19 6 28 11 19H25C30 28 39 19 33 13C39 6 30-2 25 7Z" fill="currentColor"/></svg>';
  function ruleIcon(kind) {
    return '<span class="puppies-rule-grid" aria-hidden="true">' + Array.from({ length: 9 }, (_, i) => {
      const blocked = kind === 'region' ? [0, 1, 2, 3, 6].includes(i) : kind === 'line' ? [1, 3, 5, 7].includes(i) : i !== 4;
      return '<i class="' + (blocked ? 'rule-blocked' : '') + '">' + (i === 4 ? PUPPY : blocked ? '×' : '') + '</i>';
    }).join('') + '</span>';
  }

  window.ArcadeGames.puppies = function (host, options = {}) {
    const scope = S.createScope();
    let state = null;
    let mode = 'dog';
    let selected = 0;
    let colorblind = false;
    let autoMark = true;
    let completed = new Set();
    let restored = false;
    let wrong = -1;
    let feedback = '';
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state = saved && L.restore(saved.state);
      colorblind = saved?.colorblind === true;
      autoMark = saved?.autoMark !== false;
      if (Array.isArray(saved?.completed)) completed = new Set(saved.completed.filter((level) => Number.isInteger(level) && level >= 1 && level <= L.LEVEL_COUNT));
      restored = Boolean(state);
    } catch (_) { /* Storage may be unavailable; play still works. */ }
    if (!state) state = L.createShuffled(1);

    const ui = S.buildUI(host, {
      className: 'puppies-workspace',
      toolbar: `<label class="puppies-level"><span>XẾP CÚN · ${L.LEVEL_COUNT} CẤP</span><select data-puppies-level aria-label="Chọn cấp độ Xếp cún" aria-describedby="puppies-difficulty">` +
        Array.from({ length: L.LEVEL_COUNT }, (_, i) => `<option value="${i + 1}">Cấp độ ${i + 1}</option>`).join('') + '</select><small id="puppies-difficulty" data-puppies-difficulty></small></label>' +
        '<button type="button" class="puppies-access" data-puppies-action="colorblind" aria-pressed="false"><span aria-hidden="true">Aa</span><span>Ký hiệu vùng</span></button>' +
        '<label class="puppies-assist"><input type="checkbox" data-puppies-auto-mark><span>Tự đánh dấu ×<small>Tắt để chơi khó hơn: tự đánh dấu các ô loại trừ.</small></span></label>',
      board: '<div class="puppies-playfield"><div class="puppies-summary"><div class="puppies-count">' + PUPPY + '<strong data-puppies-count>0 / 5</strong><span>cún về nhà</span></div><div class="puppies-lives" role="img" aria-label="Còn 3 lượt sai">' + BONE.repeat(3) + '</div></div>' +
        '<div class="puppies-rules" aria-label="Ba quy tắc xếp cún"><div>' + ruleIcon('region') + '<p><strong>1 cún</strong><br>mỗi vùng màu</p></div><div>' + ruleIcon('line') + '<p><strong>1 cún</strong><br>mỗi hàng, cột</p></div><div>' + ruleIcon('near') + '<p><strong>Không chạm</strong><br>kể cả đường chéo</p></div></div>' +
        '<div class="puppies-frame"><div class="puppies-board" role="grid" aria-label="Bảng Xếp cún"></div></div>' +
        '<div class="puppies-end" data-puppies-end hidden><div class="puppies-end-icon">' + PUPPY + '</div><div><h3 data-puppies-result></h3><p data-puppies-detail></p></div><button type="button" data-puppies-action="next">Cấp tiếp theo →</button></div></div>',
      controls: '<div class="puppies-modes" role="group" aria-label="Cách chọn ô"><button type="button" data-puppies-mode="dog" aria-pressed="true">' + PUPPY + 'Đặt cún</button><button type="button" data-puppies-mode="mark" aria-pressed="false"><span aria-hidden="true">×</span>Đánh dấu ×</button></div>' +
        '<div class="puppies-tools"><button type="button" data-puppies-action="undo" disabled>↶ Hoàn tác</button><button type="button" data-puppies-action="hint">✦ Gợi ý</button></div>' +
        '<p class="puppies-help">Chọn chế độ rồi chạm một ô. Chạm cún để bỏ. Mỗi lần đặt sai mất 1 xương.</p>',
    });
    const board = ui.area.querySelector('.puppies-board');
    const levelSelect = ui.toolbar.querySelector('[data-puppies-level]');
    const endPanel = ui.area.querySelector('[data-puppies-end]');
    const lives = ui.area.querySelector('.puppies-lives');
    let cells = [];

    function save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, completed: [...completed], colorblind, autoMark })); }
      catch (_) { /* Full storage must never interrupt a move. */ }
    }
    function buildBoard() {
      board.replaceChildren();
      board.style.setProperty('--puppies-size', state.size);
      board.dataset.size = state.size;
      board.setAttribute('aria-rowcount', state.size);
      board.setAttribute('aria-colcount', state.size);
      board.setAttribute('aria-label', `Xếp cún ${state.size} hàng, ${state.size} cột. Dùng phím mũi tên để chọn ô và Enter để đặt cún hoặc đánh dấu.`);
      cells = [];
      for (let row = 0; row < state.size; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'puppies-row';
        rowElement.setAttribute('role', 'row');
        rowElement.setAttribute('aria-rowindex', row + 1);
        for (let column = 0; column < state.size; column++) {
          const index = row * state.size + column;
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'puppies-cell';
          cell.dataset.cell = index;
          cell.dataset.region = state.regions[index];
          cell.setAttribute('role', 'gridcell');
          cell.setAttribute('aria-colindex', column + 1);
          cell.innerHTML = '<span class="puppies-region-label" aria-hidden="true">' + String.fromCharCode(65 + state.regions[index]) + '</span><span class="puppies-cell-dog" aria-hidden="true">' + PUPPY + '</span><span class="puppies-cell-cross" aria-hidden="true"></span>';
          rowElement.append(cell);
          cells.push(cell);
        }
        board.append(rowElement);
      }
    }
    function render() {
      const automatic = new Set(autoMark ? L.autoMarks(state) : []);
      ui.workspace.classList.toggle('puppies-colorblind', colorblind);
      ui.workspace.dataset.status = state.status;
      levelSelect.value = state.level;
      const info = L.getLevelInfo(state.level);
      host.querySelector('[data-puppies-difficulty]').textContent = `${info.difficulty} · ${info.size} × ${info.size}`;
      [...levelSelect.options].forEach((option) => {
        const level = Number(option.value);
        option.textContent = `Cấp độ ${level}${completed.has(level) ? ' ✓' : ''}`;
      });
      cells.forEach((cell, index) => {
        const value = state.dogs[index] ? 'dog' : automatic.has(index) ? 'blocked' : state.marks[index] ? 'marked' : 'empty';
        cell.dataset.state = value;
        cell.classList.toggle('is-wrong', wrong === index);
        cell.tabIndex = selected === index ? 0 : -1;
        cell.setAttribute('aria-selected', String(selected === index));
        cell.setAttribute('aria-disabled', String(state.status !== 'playing'));
        const description = value === 'dog' ? 'có cún' : value === 'blocked' ? 'tự động loại trừ' : value === 'marked' ? 'đã đánh dấu loại trừ' : 'ô trống';
        cell.setAttribute('aria-label', `Hàng ${Math.floor(index / state.size) + 1}, cột ${index % state.size + 1}, vùng ${String.fromCharCode(65 + state.regions[index])}, ${description}`);
      });
      ui.area.querySelector('[data-puppies-count]').textContent = `${state.dogs.filter(Boolean).length} / ${state.size}`;
      lives.setAttribute('aria-label', `Còn ${state.lives} lượt sai`);
      [...lives.children].forEach((bone, index) => bone.classList.toggle('is-used', index >= state.lives));
      host.querySelector('[data-puppies-action="colorblind"]').setAttribute('aria-pressed', String(colorblind));
      host.querySelector('[data-puppies-auto-mark]').checked = autoMark;
      host.querySelectorAll('[data-puppies-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.puppiesMode === mode)));
      host.querySelector('[data-puppies-action="undo"]').disabled = state.status !== 'playing' || !L.canUndo(state);
      host.querySelector('[data-puppies-action="hint"]').disabled = state.status !== 'playing';
      endPanel.hidden = state.status === 'playing';
      if (!endPanel.hidden) {
        const won = state.status === 'won';
        endPanel.classList.toggle('is-lost', !won);
        endPanel.querySelector('[data-puppies-result]').textContent = won ? 'Cả đàn đã về nhà!' : 'Hết xương rồi!';
        endPanel.querySelector('[data-puppies-detail]').textContent = won ? (state.level === L.LEVEL_COUNT ? 'Bạn đã hoàn thành cấp cuối. Chọn một cấp bất kỳ để thử lại nhé.' : `Hoàn thành cấp ${state.level} · ${state.hints} gợi ý · ${state.mistakes} lần sai.`) : 'Chơi lại cấp này với bố trí mới, giữ nguyên độ khó. Dùng dấu × để loại trừ từng ô nhé.';
        const next = endPanel.querySelector('[data-puppies-action="next"]');
        next.textContent = won && state.level < L.LEVEL_COUNT ? 'Cấp tiếp theo →' : 'Chơi lại cấp này';
      }
      ui.message(feedback || (state.status === 'won' ? 'Mỗi cún đã tìm được chỗ của mình. Làm tốt lắm!' : state.status === 'lost' ? 'Bạn có thể chơi lại cấp này bất cứ lúc nào.' : mode === 'mark' ? 'Chế độ đánh dấu: chạm ô để đặt hoặc bỏ dấu ×. Không mất xương.' : autoMark ? 'Tìm một chỗ cho mỗi cún. Các ô bị loại trừ được tự động đánh dấu ×.' : 'Chơi khó: tự đánh dấu × để loại trừ. Mỗi lần đặt cún sai mất 1 xương.'));
    }
    function finish(before) {
      if (before === 'playing' && state.status === 'won') {
        completed.add(state.level);
        options.onScore?.(Math.max(100, state.size * 200 - state.mistakes * 100 - state.hints * 150));
      }
      render();
      save();
    }
    function activate(index) {
      if (state.status !== 'playing') return;
      selected = index;
      wrong = -1;
      feedback = '';
      const before = state.status;
      if (state.dogs[index]) {
        L.place(state, index, autoMark);
        feedback = 'Đã bỏ cún khỏi ô này.';
      } else if (mode === 'mark') {
        if (!L.toggleMark(state, index, autoMark)) feedback = 'Ô này được tự động loại trừ bởi một cún đã đặt.';
      } else {
        const result = L.place(state, index, autoMark);
        if (result.code === 'mistake') {
          wrong = index;
          feedback = state.status === 'lost' ? 'Bạn đã dùng hết 3 xương. Chơi lại để thử cách suy luận khác nhé.' : `Cún chưa thể ở ô này. Còn ${state.lives} xương; hãy kiểm tra các vùng màu.`;
          scope.clearTimers();
          scope.after(0.8, () => { wrong = -1; render(); });
        } else if (result.code === 'blocked') {
          feedback = 'Ô này đã được loại trừ. Hãy chọn một ô khác; bạn không mất xương.';
        } else if (result.code === 'placed') feedback = state.status === 'won' ? '' : autoMark ? 'Đúng rồi! Các ô cùng hàng, cột, vùng màu và cạnh cún đã được loại trừ.' : 'Đúng rồi! Hãy tự đánh dấu × ở các ô bạn đã loại trừ.';
      }
      finish(before);
    }
    function hasProgress() {
      return state.status === 'playing' && (state.dogs.some(Boolean) || state.marks.some(Boolean) || state.mistakes || state.hints);
    }
    function restart(nextLevel = state.level) {
      if (!Number.isInteger(nextLevel) || nextLevel < 1 || nextLevel > L.LEVEL_COUNT) nextLevel = state.level;
      if (hasProgress() && !window.confirm('Bắt đầu ván mới với bố trí xáo trộn? Tiến trình của bàn đang chơi sẽ được thay thế.')) {
        levelSelect.value = state.level;
        return false;
      }
      scope.clearTimers();
      state = L.createShuffled(nextLevel, state);
      mode = 'dog'; selected = 0; wrong = -1; feedback = 'Ván mới đã xáo trộn bố trí và màu sắc. Độ khó của cấp này được giữ nguyên.';
      buildBoard(); render(); save();
      ui.workspace.scrollIntoView({ block: 'start', inline: 'nearest' });
      return true;
    }
    function action(name) {
      if (name === 'colorblind') {
        colorblind = !colorblind;
        feedback = colorblind ? `Đã bật ký hiệu A–${String.fromCharCode(64 + state.size)} và họa tiết để phân biệt vùng màu.` : '';
      } else if (name === 'next') {
        restart(state.status === 'won' && state.level < L.LEVEL_COUNT ? state.level + 1 : state.level);
        return;
      } else if (state.status !== 'playing') return;
      else if (name === 'undo') {
        if (!L.undo(state)) return;
        wrong = -1; feedback = 'Đã hoàn tác. Lượt sai và số gợi ý đã dùng được giữ nguyên.';
      } else if (name === 'hint') {
        const before = state.status;
        const index = L.hint(state);
        if (index < 0) return;
        selected = index; wrong = -1;
        feedback = state.status === 'won' ? '' : `Một cún đang ở hàng ${Math.floor(index / state.size) + 1}, cột ${index % state.size + 1}. Hãy tiếp tục loại trừ nhé!`;
        finish(before);
        return;
      }
      render(); save();
    }
    scope.on(board, 'click', (event) => {
      const cell = event.target.closest('[data-cell]');
      if (cell) activate(Number(cell.dataset.cell));
    });
    scope.on(board, 'focusin', (event) => {
      const cell = event.target.closest('[data-cell]');
      if (!cell || Number(cell.dataset.cell) === selected) return;
      selected = Number(cell.dataset.cell);
      cells.forEach((item, index) => { item.tabIndex = selected === index ? 0 : -1; item.setAttribute('aria-selected', String(selected === index)); });
    });
    scope.on(ui.workspace, 'click', (event) => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.puppiesAction) action(button.dataset.puppiesAction);
      else if (button.dataset.puppiesMode) { mode = button.dataset.puppiesMode; feedback = ''; render(); }
    });
    scope.on(levelSelect, 'change', () => restart(Number(levelSelect.value)));
    scope.on(host.querySelector('[data-puppies-auto-mark]'), 'change', (event) => {
      autoMark = event.target.checked;
      feedback = autoMark ? 'Đã bật đánh dấu × tự động.' : 'Đã tắt đánh dấu × tự động. Bạn tự loại trừ các ô; đặt cún sai mất 1 xương.';
      render(); save();
    });
    scope.on(window, 'keydown', (event) => {
      const key = S.gameKey(event);
      if (!key || (event.repeat && !key.startsWith('arrow'))) return;
      const row = Math.floor(selected / state.size), column = selected % state.size;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        selected = key === 'arrowup' ? Math.max(0, row - 1) * state.size + column : key === 'arrowdown' ? Math.min(state.size - 1, row + 1) * state.size + column : key === 'arrowleft' ? row * state.size + Math.max(0, column - 1) : row * state.size + Math.min(state.size - 1, column + 1);
        render(); cells[selected].focus({ preventScroll: true });
        cells[selected].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else if (key === 'x') {
        event.preventDefault(); mode = mode === 'dog' ? 'mark' : 'dog'; feedback = ''; render();
      } else if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        if (state.status !== 'playing') return;
        if (state.dogs[selected]) L.place(state, selected, autoMark);
        else if (state.marks[selected]) L.toggleMark(state, selected, autoMark);
        feedback = ''; render(); save();
      } else if (key === 'enter' || key === ' ') {
        event.preventDefault(); activate(selected);
      }
    });
    scope.onPause(save);
    scope.on(window, 'pagehide', save, true);
    scope.on(document, 'visibilitychange', () => { if (document.hidden) save(); }, true);
    scope.cleanup(save);
    buildBoard();
    if (restored && state.status === 'playing') feedback = 'Đã khôi phục bàn đang chơi. Tiến trình tự lưu trên trình duyệt này.';
    render(); save();
    return S.handle(scope, restart);
  };
})();
