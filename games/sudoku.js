// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const L = window.SudokuLogic;
  const STORAGE_KEY = 'tram-choi.sudoku.v1';
  const DIFFICULTIES = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' };

  window.ArcadeGames.sudoku = function (host, options = {}) {
    const scope = S.createScope();
    let state;
    let selected = 0;
    let elapsed = 0;
    let started = false;
    let noteMode = false;
    let checked = new Set();
    let undoCount = 0;
    let savedSecond = -1;
    let restored = false;
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state = raw && L.restore(raw.state);
      if (state) {
        elapsed = Number.isFinite(raw.elapsed) ? Math.max(0, Math.min(raw.elapsed, 31536000)) : 0;
        started = raw.started === true;
        selected = Number.isInteger(raw.selected) && raw.selected >= 0 && raw.selected < 81 ? raw.selected : 0;
        restored = true;
      }
    } catch (_) {
      // Storage can be unavailable in private browsing; the game remains playable.
    }
    if (!state) {
      state = L.create('easy');
      selected = Math.max(0, state.givens.indexOf(0));
    }

    const ui = S.buildUI(host, {
      className: 'sudoku-workspace',
      toolbar:
        S.stat('THỜI GIAN', 'time', '00:00') +
        S.stat('ĐÃ ĐIỀN', 'filled', '0 / 81') +
        S.stat('GỢI Ý', 'hints', 0) +
        '<label class="game-mode sudoku-difficulty"><span>Độ khó</span><select data-sudoku-difficulty aria-label="Chọn độ khó Sudoku"><option value="easy">Dễ</option><option value="medium">Vừa</option><option value="hard">Khó</option></select></label>',
      board: '<div class="sudoku-frame"><div class="sudoku-board" role="grid" aria-label="Sudoku 9 hàng, 9 cột. Dùng phím mũi tên để chọn ô, phím 1 đến 9 để điền số." aria-rowcount="9" aria-colcount="9"></div></div>',
      controls:
        `<div class="sudoku-keypad" role="group" aria-label="Điền số">${Array.from({ length: 9 }, (_, i) => `<button class="sudoku-key" data-number="${i + 1}" aria-label="Điền số ${i + 1}"><span>${i + 1}</span><small aria-hidden="true" data-remaining="${i + 1}">9</small></button>`).join('')}</div>` +
        '<div class="sudoku-tools" role="group" aria-label="Công cụ Sudoku">' +
        '<button class="control-button" data-sudoku-action="notes" aria-pressed="false" title="Bật hoặc tắt ghi chú · phím N">Ghi chú <kbd>N</kbd></button>' +
        '<button class="control-button" data-sudoku-action="erase" title="Xóa số hoặc ghi chú · Delete / Backspace">Xóa</button>' +
        '<button class="control-button" data-sudoku-action="undo">Hoàn tác</button>' +
        '<button class="control-button" data-sudoku-action="check" title="Đánh dấu số điền sai; mỗi lần kiểm tra trừ 25 điểm">Kiểm tra</button>' +
        '<button class="control-button" data-sudoku-action="hint" title="Điền đúng một ô; mỗi gợi ý trừ 100 điểm">Gợi ý</button></div>',
    });
    const board = ui.area.querySelector('.sudoku-board');
    const difficulty = ui.toolbar.querySelector('[data-sudoku-difficulty]');
    const noteButton = ui.controls.querySelector('[data-sudoku-action="notes"]');
    const rows = Array.from({ length: 9 }, (_, index) => {
      const row = document.createElement('div');
      row.className = 'sudoku-row';
      row.setAttribute('role', 'row');
      row.setAttribute('aria-rowindex', String(index + 1));
      board.append(row);
      return row;
    });
    const cells = Array.from({ length: 81 }, (_, index) => {
      const cell = document.createElement('button');
      cell.className = 'sudoku-cell';
      cell.type = 'button';
      cell.dataset.cell = index;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-colindex', String(index % 9 + 1));
      cell.innerHTML = '<span class="sudoku-value" aria-hidden="true"></span><span class="sudoku-notes" aria-hidden="true">' +
        Array.from({ length: 9 }, () => '<span></span>').join('') + '</span>';
      rows[Math.floor(index / 9)].append(cell);
      return { cell, value: cell.firstElementChild, notes: [...cell.lastElementChild.children] };
    });

    function formatTime(value) {
      const total = Math.floor(value);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor(total / 60) % 60;
      const seconds = total % 60;
      return (hours ? `${hours}:` : '') + `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, elapsed, started, selected }));
      } catch (_) {
        // A blocked or full storage quota must never interrupt a move.
      }
    }
    function startClock() {
      if (!state.ended) started = true;
    }
    function sameUnit(a, b) {
      return Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 ||
        (Math.floor(a / 27) === Math.floor(b / 27) && Math.floor((a % 9) / 3) === Math.floor((b % 9) / 3));
    }
    function render() {
      const conflicts = new Set(L.conflicts(state.board));
      const picked = state.board[selected];
      cells.forEach(({ cell, value, notes }, index) => {
        const digit = state.board[index];
        const mask = state.notes[index];
        const given = Boolean(state.givens[index]);
        const invalid = conflicts.has(index) || checked.has(index);
        const className = 'sudoku-cell' + (given ? ' is-given' : '') +
          (sameUnit(index, selected) ? ' is-peer' : '') +
          (picked && picked === digit ? ' is-same' : '') +
          (invalid ? ' is-error' : '') + (selected === index ? ' is-selected' : '');
        if (cell.className !== className) cell.className = className;
        const text = digit ? String(digit) : '';
        if (value.textContent !== text) value.textContent = text;
        const candidates = [];
        notes.forEach((note, bit) => {
          const text = !digit && (mask & (1 << bit)) ? String(bit + 1) : '';
          if (note.textContent !== text) note.textContent = text;
          if (text) candidates.push(text);
        });
        cell.dataset.value = digit;
        cell.dataset.notes = mask;
        cell.tabIndex = index === selected ? 0 : -1;
        cell.setAttribute('aria-selected', String(index === selected));
        cell.setAttribute('aria-readonly', String(given));
        cell.setAttribute('aria-invalid', String(invalid));
        cell.setAttribute('aria-label', `Hàng ${Math.floor(index / 9) + 1}, cột ${index % 9 + 1}: ${digit || 'trống'}${given ? ', số cho sẵn' : ''}${candidates.length ? `, ghi chú ${candidates.join(', ')}` : ''}${invalid ? ', cần kiểm tra' : ''}`);
      });
      ui.setStat('time', formatTime(elapsed));
      ui.setStat('filled', `${state.board.filter(Boolean).length} / 81`);
      ui.setStat('hints', state.hints);
      difficulty.value = state.difficulty;
      noteButton.setAttribute('aria-pressed', String(noteMode));
      ui.workspace.classList.toggle('is-note-mode', noteMode);
      ui.controls.querySelectorAll('[data-number]').forEach((button) => {
        const digit = Number(button.dataset.number);
        const remaining = Math.max(0, 9 - state.board.filter((value) => value === digit).length);
        button.querySelector('small').textContent = remaining;
        button.classList.toggle('is-used', remaining === 0);
        button.disabled = state.ended;
        button.setAttribute('aria-label', `${noteMode ? 'Ghi chú' : 'Điền'} số ${digit}, còn thiếu ${remaining}`);
      });
      ui.controls.querySelectorAll('[data-sudoku-action]').forEach((button) => {
        const action = button.dataset.sudokuAction;
        button.disabled = state.ended || (action === 'undo' && undoCount === 0) ||
          (action === 'erase' && (state.givens[selected] !== 0 || (!state.board[selected] && !state.notes[selected])));
      });
    }
    function prompt() {
      if (state.ended) ui.message('Đã hoàn thành! Chọn chơi lại để khám phá một bảng Sudoku mới.');
      else if (noteMode) ui.message('Ghi chú đang bật. Chọn ô trống rồi nhấn 1–9 để thêm hoặc bỏ số dự đoán.');
      else if (state.givens[selected]) ui.message('Đây là số cho sẵn. Chọn một ô trống để điền số từ 1 đến 9.');
      else ui.message('Mỗi hàng, cột và vùng 3 × 3 cần đủ các số 1–9, không lặp lại.');
    }
    function select(index, focus = false) {
      selected = Math.max(0, Math.min(80, index));
      render();
      prompt();
      if (focus) cells[selected].cell.focus({ preventScroll: true });
    }
    function complete() {
      if (!L.isComplete(state.board)) return false;
      state.ended = true;
      const base = { easy: 1000, medium: 1500, hard: 2000 }[state.difficulty];
      const score = Math.max(100, base - state.hints * 100 - state.checks * 25 - Math.floor(elapsed / 10));
      // Credit the solved board even if the player leaves before the result animation.
      options.onScore?.(score);
      render();
      save();
      ui.message(`Hoàn thành Sudoku mức ${DIFFICULTIES[state.difficulty]} trong ${formatTime(elapsed)}!`);
      scope.after(0.4, () => S.result(ui, scope, {
        title: 'Bảng số đã hoàn chỉnh!',
        detail: `Mức ${DIFFICULTIES[state.difficulty]} · ${formatTime(elapsed)} · ${state.hints} gợi ý · ${state.checks} lần kiểm tra.`,
        score,
        onAgain: restart,
      }));
      return true;
    }
    function applyValue(value) {
      if (state.ended) return;
      if (state.givens[selected]) {
        ui.message('Số cho sẵn không thể thay đổi. Hãy chọn một ô trống.');
        return;
      }
      if (!L.setValue(state, selected, value, { notes: noteMode && value !== 0 })) return;
      startClock();
      undoCount = Math.min(200, undoCount + 1);
      checked.clear();
      render();
      save();
      if (!complete()) {
        if (L.conflicts(state.board).length) ui.message('Các ô được đánh dấu đang trùng số trong hàng, cột hoặc vùng 3 × 3.');
        else prompt();
      }
    }
    function action(name) {
      if (state.ended) return;
      if (name === 'notes') {
        noteMode = !noteMode;
        render();
        prompt();
      } else if (name === 'erase') {
        applyValue(0);
      } else if (name === 'undo') {
        if (!L.undo(state)) { undoCount = 0; render(); return; }
        undoCount = Math.max(0, undoCount - 1);
        checked.clear();
        render();
        save();
        ui.message('Đã hoàn tác thao tác vừa rồi.');
      } else if (name === 'check') {
        startClock();
        checked = new Set(L.check(state));
        render();
        save();
        ui.message(checked.size ? `Có ${checked.size} ô điền chưa đúng, đã được đánh dấu. Mỗi lần kiểm tra trừ 25 điểm.` : 'Các số bạn đã điền đều đúng. Tiếp tục nhé! Mỗi lần kiểm tra trừ 25 điểm.');
      } else if (name === 'hint') {
        const index = L.hint(state, selected);
        if (!Number.isInteger(index) || index < 0) return;
        startClock();
        undoCount = Math.min(200, undoCount + 1);
        checked.clear();
        selected = index;
        render();
        save();
        if (!complete()) ui.message(`Đã gợi ý ô hàng ${Math.floor(index / 9) + 1}, cột ${index % 9 + 1}. Mỗi gợi ý trừ 100 điểm.`);
      }
    }
    function hasProgress() {
      return !state.ended && state.board.some((value, index) => (!state.givens[index] && value) || state.notes[index]);
    }
    function restart(nextDifficulty = state.difficulty) {
      if (!DIFFICULTIES[nextDifficulty]) nextDifficulty = state.difficulty;
      if (hasProgress() && !window.confirm('Tạo bảng Sudoku mới? Tiến trình ván hiện tại sẽ được thay thế.')) {
        difficulty.value = state.difficulty;
        return false;
      }
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.create(nextDifficulty);
      elapsed = 0;
      started = false;
      noteMode = false;
      undoCount = 0;
      checked.clear();
      selected = Math.max(0, state.givens.indexOf(0));
      savedSecond = -1;
      render();
      prompt();
      save();
      return true;
    }

    scope.on(board, 'click', (event) => {
      const cell = event.target.closest('[data-cell]');
      if (cell) select(Number(cell.dataset.cell));
    });
    scope.on(board, 'focusin', (event) => {
      const cell = event.target.closest('[data-cell]');
      if (cell && Number(cell.dataset.cell) !== selected) select(Number(cell.dataset.cell));
    });
    scope.on(ui.controls, 'click', (event) => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.number) applyValue(Number(button.dataset.number));
      else if (button.dataset.sudokuAction) action(button.dataset.sudokuAction);
    });
    scope.on(difficulty, 'change', () => restart(difficulty.value));
    scope.on(window, 'keydown', (event) => {
      const key = S.gameKey(event);
      if (!key || event.repeat && !key.startsWith('arrow')) return;
      const row = Math.floor(selected / 9);
      const column = selected % 9;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        const next = key === 'arrowup' ? Math.max(0, row - 1) * 9 + column :
          key === 'arrowdown' ? Math.min(8, row + 1) * 9 + column :
            key === 'arrowleft' ? row * 9 + Math.max(0, column - 1) : row * 9 + Math.min(8, column + 1);
        select(next, true);
      } else if (/^[1-9]$/.test(key)) {
        event.preventDefault();
        applyValue(Number(key));
      } else if (key === 'backspace' || key === 'delete' || key === '0') {
        event.preventDefault();
        action('erase');
      } else if (key === 'n') {
        event.preventDefault();
        action('notes');
      }
    });
    scope.loop((dt) => {
      if (!started || state.ended) return;
      elapsed += dt;
      ui.setStat('time', formatTime(elapsed));
      const second = Math.floor(elapsed);
      if (second !== savedSecond && second % 5 === 0) {
        savedSecond = second;
        save();
      }
    });
    scope.onPause(save);
    scope.on(window, 'pagehide', save, true);
    scope.on(document, 'visibilitychange', () => { if (document.hidden) save(); }, true);
    scope.cleanup(save);
    render();
    prompt();
    if (state.ended) complete();
    else if (restored) ui.message('Đã khôi phục ván Sudoku đang chơi. Tiến trình được tự lưu trên trình duyệt này.');
    save();
    return S.handle(scope, restart);
  };
})();
