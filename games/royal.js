// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const chessNames = { K: 'Vua', Q: 'Hậu', R: 'Xe', B: 'Tượng', N: 'Mã', P: 'Tốt' };
  const xiangqiNames = { K: 'Tướng', A: 'Sĩ', B: 'Tượng', N: 'Mã', R: 'Xe', C: 'Pháo', P: 'Tốt' };
  const glyphs = { rK: '帥', rA: '仕', rB: '相', rN: '傌', rR: '俥', rC: '炮', rP: '兵', bK: '將', bA: '士', bB: '象', bN: '馬', bR: '車', bC: '砲', bP: '卒' };

  // Original vector pieces stay sharp and consistent across browser/font systems.
  function chessPiece(piece, side) {
    const role = piece.length === 2 ? piece[1] : piece;
    const color = side || (piece.length === 2 ? piece[0] : 'w');
    const fill = color === 'w' ? '#fff9e8' : '#31483d';
    const line = color === 'w' ? '#526650' : '#e6dfc4';
    const shapes = {
      P: '<circle cx="32" cy="19" r="8"/><path d="M27 27h10l-1 8 7 12H21l7-12z"/>',
      N: '<path d="M19 46l3-13 12-7-12 1-5-5 8-14 4 5 10-1 9 13-1 21z"/><path d="M27 18l5-4M24 28l7 4" fill="none"/><circle cx="36" cy="21" r="1.3" fill="' + line + '" stroke="none"/>',
      B: '<path d="M32 7c-4 8-12 12-12 19 0 6 6 8 9 10l-7 11h20l-7-11c3-2 9-4 9-10 0-7-8-11-12-19z"/><path d="M35 17l-7 10" fill="none"/>',
      R: '<path d="M19 10h7v7h5v-7h6v7h5v-7h5v15l-6 4 2 18H21l2-18-4-4z"/><path d="M23 26h18" fill="none"/>',
      Q: '<path d="M19 18l6 8 7-14 7 14 6-8-5 20 4 9H20l4-9z"/><circle cx="17" cy="15" r="3"/><circle cx="32" cy="9" r="3"/><circle cx="47" cy="15" r="3"/><path d="M25 37h14" fill="none"/>',
      K: '<path d="M32 6v12M26 12h12" fill="none" stroke-width="3.5"/><path d="M25 19c-10-3-14 8-8 14l9 7-5 7h22l-5-7 9-7c6-6 2-17-8-14l-7 5z"/><path d="M26 39h12" fill="none"/>',
    };
    return '<svg class="royal-piece-art" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><g fill="' + fill + '" stroke="' + line + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (shapes[role] || shapes.P) + '<path d="M20 47h24l3 7H17z"/><path d="M17 55h30" stroke-width="3"/></g></svg>';
  }
  function xiangqiPiece(piece, vector = false) {
    if (vector) {
      const ink = piece[0] === 'r' ? '#b44835' : '#3b443b';
      return '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="33" r="29" fill="#aa8755"/><circle cx="32" cy="30" r="28" fill="#fff0ce" stroke="' + ink + '" stroke-width="2"/><circle cx="32" cy="30" r="23" fill="none" stroke="' + ink + '"/><text x="32" y="42" text-anchor="middle" font-family="SimSun,Songti SC,serif" font-size="35" font-weight="700" fill="' + ink + '">' + glyphs[piece] + '</text></svg>';
    }
    return '<span class="royal-disc ' + (piece[0] === 'r' ? 'is-red' : 'is-black') + '" aria-hidden="true"><span lang="zh">' + (glyphs[piece] || '') + '</span></span>';
  }
  window.ArcadeRoyalArt = { chessPiece, xiangqiPiece };

  function riverBoard() {
    let lines = '';
    for (let row = 0; row < 10; row++) lines += '<path d="M50 ' + (50 + row * 100) + 'H850"/>';
    for (let col = 0; col < 9; col++) {
      const x = 50 + col * 100;
      lines += '<path d="M' + x + ' 50V450M' + x + ' 550V950"/>';
    }
    lines += '<path d="M50 450V550M850 450V550M350 50L550 250M550 50L350 250M350 750L550 950M550 750L350 950"/>';
    for (const [row, col] of [[2, 1], [2, 7], [7, 1], [7, 7], [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]]) {
      const x = 50 + col * 100, y = 50 + row * 100;
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
        if ((col === 0 && dx === -1) || (col === 8 && dx === 1)) continue;
        lines += '<path d="M' + (x + dx * 22) + ' ' + (y + dy * 8) + 'H' + (x + dx * 8) + 'V' + (y + dy * 22) + '"/>';
      }
    }
    return '<svg class="royal-river-lines" viewBox="0 0 900 1000" aria-hidden="true"><g fill="none" stroke="#85683f" stroke-width="2.2">' + lines + '</g><g fill="#927342" font-size="29" text-anchor="middle" font-family="serif" letter-spacing="8"><text x="245" y="511">SÔNG</text><text x="655" y="511">RANH GIỚI</text></g></svg>';
  }

  function mount(host, options, kind) {
    const chess = kind === 'chess';
    const L = chess ? window.ChessLogic : window.XiangqiLogic;
    const names = chess ? chessNames : xiangqiNames;
    const columns = chess ? 8 : 9, rows = chess ? 8 : 10;
    const human = chess ? 'w' : 'r';
    const pieceArt = chess ? chessPiece : xiangqiPiece;
    const sideName = (side) => side === 'b' ? 'Đen' : chess ? 'Trắng' : 'Đỏ';
    const scope = S.createScope();
    let state = L.create(), mode = 'bot', difficulty = 'normal', flipped = false;
    let selected = -1, focused = chess ? 52 : 58, moves = [], thinking = false, promotion = null;
    let captures = [], history = [], scored = false, notice = '';
    const reasons = {
      checkmate: 'Chiếu hết.', stalemate: chess ? 'Hết nước đi hợp lệ, không bị chiếu.' : 'Không còn nước đi hợp lệ.',
      'insufficient-material': 'Không đủ quân để chiếu hết.', 'threefold-repetition': 'Thế cờ lặp lại ba lần.',
      repetition: 'Thế cờ lặp lại ba lần.', 'fifty-move': '50 lượt không bắt quân hoặc đi Tốt.',
      'king-captured': 'Tướng đã bị bắt.',
    };
    const ui = S.buildUI(host, {
      className: 'royal-workspace royal-' + kind,
      toolbar: '<div class="royal-heading"><span>BÀN CỜ CỦA BẠN</span><strong>' + (chess ? 'Cờ vua' : 'Cờ tướng') + '</strong></div>' +
        '<div class="royal-settings"><label><span>Chế độ</span><select data-royal-mode aria-label="Chế độ chơi"><option value="bot">Chơi với máy</option><option value="local">2 người / 1 máy</option></select></label><label data-royal-difficulty-wrap><span>Độ khó</span><select data-royal-difficulty aria-label="Độ khó của máy"><option value="easy">Dễ</option><option value="normal" selected>Vừa</option></select></label></div>',
      board: '<div class="royal-playfield"><div class="royal-player" data-royal-player="top"></div><div class="royal-frame"><div class="royal-board" role="grid"></div></div><div class="royal-player" data-royal-player="bottom"></div>' +
        '<div class="royal-promotion" data-royal-promotion-panel role="group" aria-label="Chọn quân phong cấp" hidden><div><strong>Phong cấp cho Tốt</strong><span>Chọn quân để hoàn tất nước đi.</span></div><div class="royal-promotion-options">' + ['Q', 'R', 'B', 'N'].map((role) => '<button type="button" data-royal-promotion="' + role + '" aria-label="Phong cấp thành ' + chessNames[role] + '">' + chessPiece(role, human) + '<span>' + chessNames[role] + '</span></button>').join('') + '</div><button type="button" class="royal-text-button" data-royal-action="cancel-promotion">Hủy chọn</button></div>' +
        '<div class="royal-result" data-royal-result hidden><strong data-royal-result-title></strong><p data-royal-result-detail></p><button type="button" data-royal-action="restart">Chơi ván mới</button></div></div>',
      controls: '<div class="royal-turn" role="status"><span data-royal-turn></span><small data-royal-ply>Nước 1</small></div><div class="royal-tools"><button type="button" data-royal-action="undo">↶ Hoàn tác</button><button type="button" data-royal-action="flip" aria-pressed="false">⇅ Xoay bàn</button></div>' +
        '<p class="royal-help">Chọn quân rồi chọn ô có chấm. Phím mũi tên để di chuyển, Enter để chọn.</p>' +
        (!chess ? '<details class="royal-legend"><summary>Tên các quân cờ</summary><div>' + Object.keys(xiangqiNames).map((role) => '<span>' + xiangqiPiece('r' + role) + xiangqiNames[role] + '</span>').join('') + '</div></details>' : ''),
    });
    ui.workspace.dataset.game = kind;
    const board = ui.area.querySelector('.royal-board');
    const promotionPanel = ui.area.querySelector('[data-royal-promotion-panel]');
    const resultPanel = ui.area.querySelector('[data-royal-result]');
    const cells = [];
    board.style.setProperty('--royal-columns', columns);
    board.style.setProperty('--royal-rows', rows);
    board.setAttribute('aria-label', (chess ? 'Bàn cờ vua' : 'Bàn cờ tướng') + '. Dùng mũi tên và Enter để chọn quân và nước đi.');
    board.setAttribute('aria-rowcount', rows);
    board.setAttribute('aria-colcount', columns);

    function squareName(index) {
      const row = Math.floor(index / columns), col = index % columns;
      return chess ? String.fromCharCode(65 + col) + (8 - row) : 'hàng ' + (row + 1) + ', cột ' + (col + 1);
    }
    function buildBoard() {
      board.innerHTML = chess ? '' : riverBoard();
      cells.length = 0;
      for (let visualRow = 0; visualRow < rows; visualRow++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'royal-row';
        rowElement.setAttribute('role', 'row');
        rowElement.setAttribute('aria-rowindex', visualRow + 1);
        for (let visualCol = 0; visualCol < columns; visualCol++) {
          const row = flipped ? rows - 1 - visualRow : visualRow;
          const col = flipped ? columns - 1 - visualCol : visualCol;
          const index = row * columns + col;
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'royal-cell ' + ((row + col) % 2 ? 'is-dark' : 'is-light');
          cell.dataset.cell = index;
          cell.setAttribute('role', 'gridcell');
          cell.setAttribute('aria-colindex', visualCol + 1);
          const coordinate = chess ? (visualCol === 0 ? '<span class="royal-rank" aria-hidden="true">' + (8 - row) + '</span>' : '') + (visualRow === rows - 1 ? '<span class="royal-file" aria-hidden="true">' + String.fromCharCode(97 + col) + '</span>' : '') : '';
          cell.innerHTML = '<span class="royal-cell-piece"></span><span class="royal-move-dot" aria-hidden="true"></span>' + coordinate;
          rowElement.append(cell);
          cells[index] = cell;
        }
        board.append(rowElement);
      }
    }
    function playerPanel(position, side) {
      const panel = ui.area.querySelector('[data-royal-player="' + position + '"]');
      const isTurn = state.turn === side && state.status === 'playing';
      const pieces = captures.filter((piece) => piece[0] !== side);
      panel.classList.toggle('is-active', isTurn);
      panel.innerHTML = '<span class="royal-player-name"><i class="royal-side-token is-' + side + '"></i><strong>' + sideName(side) + '</strong><small>' + (mode === 'bot' ? side === human ? 'Bạn' : 'Máy' : side === human ? 'Người chơi 1' : 'Người chơi 2') + '</small></span><span class="royal-captures" aria-label="' + (pieces.length ? 'Đã bắt: ' + pieces.map((piece) => names[piece[1]]).join(', ') : 'Chưa bắt quân') + '">' + pieces.map(piece => pieceArt(piece)).join('') + '</span>';
    }
    function render() {
      const check = state.status !== 'draw' && L.inCheck(state, state.turn);
      const destinations = new Set(moves.map((move) => move.to));
      ui.workspace.dataset.turn = state.turn;
      ui.workspace.dataset.ply = state.ply ?? history.length;
      ui.workspace.dataset.status = state.status;
      ui.workspace.dataset.thinking = String(thinking);
      ui.workspace.dataset.mode = mode;
      for (let index = 0; index < cells.length; index++) {
        const cell = cells[index], piece = state.board[index];
        if (cell.dataset.piece !== (piece || '')) {
          cell.dataset.piece = piece || '';
          cell.querySelector('.royal-cell-piece').innerHTML = piece ? pieceArt(piece) : '';
        }
        cell.dataset.legal = String(destinations.has(index));
        cell.classList.toggle('is-selected', selected === index);
        cell.classList.toggle('is-last', state.lastMove?.from === index || state.lastMove?.to === index);
        cell.classList.toggle('is-check', check && piece === state.turn + 'K');
        cell.tabIndex = focused === index ? 0 : -1;
        cell.setAttribute('aria-selected', String(selected === index));
        cell.setAttribute('aria-disabled', String(state.status !== 'playing' || thinking || Boolean(promotion)));
        cell.setAttribute('aria-label', squareName(index) + ', ' + (piece ? names[piece[1]] + ' ' + sideName(piece[0]).toLowerCase() : 'ô trống') + (destinations.has(index) ? ', có thể đi tới' : '') + (check && piece === state.turn + 'K' ? ', đang bị chiếu' : ''));
      }
      playerPanel('top', flipped ? human : 'b');
      playerPanel('bottom', flipped ? 'b' : human);
      host.querySelector('[data-royal-mode]').value = mode;
      host.querySelector('[data-royal-difficulty]').value = difficulty;
      host.querySelector('[data-royal-difficulty-wrap]').hidden = mode !== 'bot';
      host.querySelector('[data-royal-action="undo"]').disabled = !L.canUndo(state);
      host.querySelector('[data-royal-action="flip"]').setAttribute('aria-pressed', String(flipped));
      host.querySelector('[data-royal-turn]').textContent = state.status === 'playing' ? thinking ? 'Máy đang suy nghĩ…' : 'Lượt ' + sideName(state.turn) + (check ? ' · Đang bị chiếu!' : '') : state.status === 'draw' ? 'Ván cờ hòa' : sideName(state.winner) + ' thắng';
      host.querySelector('[data-royal-ply]').textContent = 'Nước ' + (Math.floor((state.ply ?? history.length) / 2) + 1);
      promotionPanel.hidden = !promotion;
      resultPanel.hidden = state.status === 'playing';
      if (!resultPanel.hidden) {
        resultPanel.querySelector('[data-royal-result-title]').textContent = state.status === 'draw' ? 'Một ván cờ hòa' : sideName(state.winner) + ' giành chiến thắng!';
        resultPanel.querySelector('[data-royal-result-detail]').textContent = reasons[state.reason] || 'Ván cờ đã kết thúc.';
      }
      ui.message(notice || (promotion ? 'Tốt đã tới hàng cuối. Chọn quân muốn phong cấp.' : state.status !== 'playing' ? reasons[state.reason] || 'Bạn có thể hoàn tác hoặc bắt đầu ván mới.' : check ? 'Vua / Tướng đang bị chiếu. Hãy chọn một nước đi để thoát chiếu.' : mode === 'bot' ? 'Bạn cầm quân ' + sideName(human).toLowerCase() + ' và đi trước. Máy chơi ở mức ' + (difficulty === 'easy' ? 'dễ.' : 'vừa.') : 'Hai người lần lượt chơi trên cùng thiết bị.'));
    }
    function clearSelection() { selected = -1; moves = []; promotion = null; }
    function restart() {
      scope.clearTimers();
      state = L.create(); thinking = false; captures = []; history = []; scored = false; notice = '';
      clearSelection(); focused = chess ? 52 : 58;
      render();
    }
    function finishMove(move) {
      const before = state.board.slice(), beforeCaptures = captures.slice();
      if (!L.move(state, move)) return false;
      history.push(beforeCaptures);
      const mover = before[move.from]?.[0];
      const survivors = state.board.filter((piece) => piece && piece[0] !== mover);
      for (const piece of before.filter((piece) => piece && piece[0] !== mover)) {
        const index = survivors.indexOf(piece);
        if (index === -1) captures.push(piece); else survivors.splice(index, 1);
      }
      clearSelection(); notice = ''; focused = move.to;
      if (!scored && state.status === 'won' && (mode === 'local' || state.winner === human)) {
        scored = true;
        options.onScore?.(1000);
      }
      render();
      return true;
    }
    function scheduleBot() {
      if (mode !== 'bot' || state.turn === human || state.status !== 'playing') return;
      thinking = true; render();
      scope.after(0.35, () => {
        const move = L.chooseMove(state, difficulty);
        thinking = false;
        if (move) finishMove(move); else render();
      });
    }
    function activate(index) {
      if (state.status !== 'playing' || thinking || promotion || (mode === 'bot' && state.turn !== human)) return;
      focused = index; notice = '';
      const candidates = moves.filter((move) => move.to === index);
      if (candidates.length) {
        if (candidates.some((move) => move.promotion)) {
          promotion = candidates;
          promotionPanel.querySelectorAll('[data-royal-promotion]').forEach((button) => {
            button.querySelector('svg').outerHTML = chessPiece(button.dataset.royalPromotion, state.turn);
          });
          render();
          promotionPanel.querySelector('button').focus();
          return;
        }
        if (finishMove(candidates[0])) scheduleBot();
        return;
      }
      if (state.board[index]?.[0] === state.turn && selected !== index) {
        selected = index; moves = L.legalMoves(state, index);
        if (!moves.length) notice = 'Quân này chưa có nước đi hợp lệ.';
      } else clearSelection();
      render();
    }
    function undo() {
      if (!L.canUndo(state)) return;
      scope.clearTimers(); thinking = false; clearSelection();
      do {
        if (!L.undo(state)) break;
        captures = history.pop() || [];
      } while (mode === 'bot' && state.turn !== human && L.canUndo(state));
      notice = mode === 'bot' ? 'Đã hoàn tác về lượt của bạn.' : 'Đã hoàn tác một nước đi.';
      render();
    }
    scope.on(board, 'click', (event) => {
      const cell = event.target.closest('[data-cell]');
      if (cell) activate(Number(cell.dataset.cell));
    });
    scope.on(board, 'focusin', (event) => {
      const cell = event.target.closest('[data-cell]');
      if (!cell) return;
      focused = Number(cell.dataset.cell);
      cells.forEach((item, index) => { item.tabIndex = index === focused ? 0 : -1; });
    });
    scope.on(ui.workspace, 'click', (event) => {
      const promote = event.target.closest('[data-royal-promotion]');
      if (promote && promotion) {
        const move = promotion.find((candidate) => candidate.promotion.toUpperCase() === promote.dataset.royalPromotion);
        if (move && finishMove(move)) { cells[focused].focus({ preventScroll: true }); scheduleBot(); }
        return;
      }
      const button = event.target.closest('[data-royal-action]');
      if (!button) return;
      switch (button.dataset.royalAction) {
        case 'undo': undo(); break;
        case 'flip': flipped = !flipped; buildBoard(); render(); break;
        case 'restart': restart(); break;
        case 'cancel-promotion': promotion = null; render(); cells[selected]?.focus(); break;
      }
    });
    scope.on(host.querySelector('[data-royal-mode]'), 'change', (event) => {
      const next = event.target.value;
      if ((state.ply ?? history.length) && state.status === 'playing' && !window.confirm('Đổi chế độ sẽ bắt đầu ván mới. Bạn muốn đổi chứ?')) {
        event.target.value = mode; return;
      }
      mode = next; restart();
    });
    scope.on(host.querySelector('[data-royal-difficulty]'), 'change', (event) => {
      difficulty = event.target.value; render();
    });
    scope.on(window, 'keydown', (event) => {
      if (!host.contains(event.target)) return;
      const key = S.gameKey(event);
      if (key === 'escape') {
        if (selected !== -1 || promotion) { event.preventDefault(); clearSelection(); render(); cells[focused].focus({ preventScroll: true }); }
        return;
      }
      if (promotion || (!event.target.closest('.royal-cell') && event.target !== ui.workspace)) return;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        const direction = flipped ? -1 : 1;
        let row = Math.floor(focused / columns), col = focused % columns;
        if (key === 'arrowup') row -= direction;
        if (key === 'arrowdown') row += direction;
        if (key === 'arrowleft') col -= direction;
        if (key === 'arrowright') col += direction;
        focused = Math.max(0, Math.min(rows - 1, row)) * columns + Math.max(0, Math.min(columns - 1, col));
        cells[focused].focus();
      } else if (key === 'enter' || key === ' ') { event.preventDefault(); activate(focused); }
    });
    buildBoard(); render();
    return S.handle(scope, restart);
  }
  window.ArcadeGames.chess = (host, options = {}) => mount(host, options, 'chess');
  window.ArcadeGames.xiangqi = (host, options = {}) => mount(host, options, 'xiangqi');
})();
