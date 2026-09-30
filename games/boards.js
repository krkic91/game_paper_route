// version v1.0
(function () {
  'use strict';
  const L = window.ArcadeLogic,
    S = window.ArcadeShared,
    { icon } = window.ArcadeArt;
  const Games = window.ArcadeGames;

  Games.caro = function (host, options) {
    const scope = S.createScope();
    let visual = null;
    const ui = S.buildUI(host, {
      className: 'caro-workspace',
      toolbar:
        S.stat('LƯỢT HIỆN TẠI', 'turn', 'Bạn · X') +
        S.stat('NƯỚC ĐÃ ĐI', 'moves', 0) +
        S.modeSelect([
          ['bot', 'Đấu với máy'],
          ['local', '2 người cùng máy'],
        ]),
      board:
        '<div class="caro-frame"><div class="caro-board" role="grid" aria-label="Bàn caro 15 hàng, 15 cột. Dùng mũi tên để chọn ô, Enter để đánh."></div></div>',
    });
    const board = ui.area.querySelector('.caro-board'),
      mode = ui.toolbar.querySelector('select');
    let state,
      busy = false,
      focusIndex = 112;
    const rows = Array.from({ length: 15 }, () => {
      const row = document.createElement('div');
      row.className = 'board-row';
      row.setAttribute('role', 'row');
      board.append(row);
      return row;
    });
    const cells = Array.from({ length: 225 }, (_, i) => {
      const button = document.createElement('button');
      button.className = 'caro-cell';
      button.dataset.cell = i;
      button.setAttribute('role', 'gridcell');
      button.tabIndex = i === focusIndex ? 0 : -1;
      rows[Math.floor(i / 15)].append(button);
      return button;
    });
    function name(player) {
      return mode.value === 'bot'
        ? player === 1
          ? 'Bạn · X'
          : 'Máy · O'
        : `Người ${player} · ${player === 1 ? 'X' : 'O'}`;
    }
    function render() {
      cells.forEach((cell, i) => {
        const value = state.board[i];
        cell.className = `caro-cell ${value === 1 ? 'mark-x' : value === 2 ? 'mark-o' : ''}${state.line.includes(i) ? ' winning-cell' : ''}${i === state.last ? ' last-move' : ''}`;
        cell.textContent = value === 1 ? '×' : value === 2 ? '○' : '';
        cell.setAttribute(
          'aria-label',
          `Hàng ${Math.floor(i / 15) + 1}, cột ${(i % 15) + 1}: ${value === 1 ? 'X' : value === 2 ? 'O' : 'trống'}`,
        );
        cell.setAttribute('aria-disabled', String(Boolean(value || state.ended || busy)));
      });
      ui.setStat(
        'turn',
        state.ended ? (state.winner ? name(state.winner) : 'Hòa') : name(state.turn),
      );
      ui.setStat('moves', state.moves);
      visual?.sync(state);
    }
    function announceTurn() {
      ui.message(
        busy ? 'Máy đang suy nghĩ…' : `Lượt ${name(state.turn)}. Nối 5 quân liên tiếp để thắng.`,
      );
    }
    function play(index) {
      if (!L.moveCaro(state, index)) return;
      render();
      if (state.ended) {
        busy = false;
        const win = state.winner && (mode.value === 'local' || state.winner === 1);
        ui.message(
          state.winner ? `${name(state.winner)} đã nối được 5 quân!` : 'Bàn đã kín. Một ván hòa!',
        );
        scope.after(0.75, () =>
          S.result(ui, scope, {
            title: state.winner ? `${name(state.winner)} thắng!` : 'Một ván đấu cân tài!',
            detail: `${state.moves} nước đi. Thêm một ván để đổi chiến thuật nhé?`,
            score: win ? 100 : 0,
            win: Boolean(win),
            onAgain: restart,
            onScore: options.onScore,
          }),
        );
      } else if (mode.value === 'bot' && state.turn === 2) {
        busy = true;
        render();
        announceTurn();
        scope.after(0.4, () => {
          busy = false;
          play(L.chooseCaroMove(state));
        });
      } else {
        busy = false;
        announceTurn();
      }
    }
    scope.on(board, 'click', (event) => {
      const cell = event.target.closest('[data-cell]');
      if (!cell || busy || state.ended) return;
      const index = Number(cell.dataset.cell);
      cells[focusIndex].tabIndex = -1;
      focusIndex = index;
      cells[focusIndex].tabIndex = 0;
      play(index);
    });
    scope.on(board, 'keydown', (event) => {
      const dirs = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -15, ArrowDown: 15 };
      if (!dirs[event.key]) return;
      event.preventDefault();
      const next = L.clamp(focusIndex + dirs[event.key], 0, 224);
      if (Math.abs(dirs[event.key]) === 1 && Math.floor(next / 15) !== Math.floor(focusIndex / 15))
        return;
      cells[focusIndex].tabIndex = -1;
      focusIndex = next;
      cells[focusIndex].tabIndex = 0;
      cells[focusIndex].focus({ preventScroll: true });
    });
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createCaro();
      busy = false;
      render();
      announceTurn();
    }
    scope.on(mode, 'change', restart);
    if (options.renderer === '3d') visual = window.Arcade3D.createView('caro', ui, scope);
    restart();
    return S.handle(scope, restart);
  };

  const { LUDO_PATH, LUDO_COLORS, LUDO_NAMES, LUDO_YARDS, homePosition } = window.ArcadeLayouts;
  function ludoSVG() {
    let svg =
      '<svg viewBox="0 0 450 450" aria-hidden="true"><rect width="450" height="450" rx="17" fill="#e9e8d4"/>';
    [
      [0, 9],
      [0, 0],
      [9, 0],
      [9, 9],
    ].forEach(([x, y], player) => {
      svg += `<rect x="${x * 30 + 10}" y="${y * 30 + 10}" width="160" height="160" rx="20" fill="${LUDO_COLORS[player]}" opacity=".75"/><rect x="${x * 30 + 25}" y="${y * 30 + 25}" width="130" height="130" rx="16" fill="#f6f1df"/><text x="${x * 30 + 90}" y="${y * 30 + 146}" text-anchor="middle" font-family="sans-serif" font-size="9" letter-spacing="1" font-weight="700" fill="#556347">${LUDO_NAMES[player].toUpperCase()}</text>`;
    });
    LUDO_PATH.forEach(([x, y], i) => {
      const start = L.LUDO_STARTS.indexOf(i);
      svg += `<rect x="${x * 30 + 1}" y="${y * 30 + 1}" width="28" height="28" rx="4" fill="${start >= 0 ? LUDO_COLORS[start] : '#fcf8e8'}" stroke="#cfceba" stroke-width=".8"/>`;
      if (L.LUDO_SAFE.has(i))
        svg += `<text x="${x * 30 + 15}" y="${y * 30 + 21}" text-anchor="middle" font-size="18" fill="#607455" opacity=".65">✦</text>`;
    });
    for (let player = 0; player < 4; player++)
      for (let p = 52; p <= 57; p++) {
        const [x, y] = homePosition(player, p);
        svg += `<rect x="${x * 30 + 1}" y="${y * 30 + 1}" width="28" height="28" rx="4" fill="${LUDO_COLORS[player]}" opacity=".8"/><text x="${x * 30 + 15}" y="${y * 30 + 19}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#324d35" opacity=".65">${p - 51}</text>`;
      }
    svg +=
      '<path d="m225 203 22 22-22 22-22-22Z" fill="#c1cb9b"/><text x="225" y="230" text-anchor="middle" font-size="17" fill="#5a7953">★</text></svg>';
    return svg;
  }
  function diceFace(value) {
    const patterns = {
      1: [[12, 12]],
      2: [
        [6, 6],
        [18, 18],
      ],
      3: [
        [6, 6],
        [12, 12],
        [18, 18],
      ],
      4: [
        [6, 6],
        [18, 6],
        [6, 18],
        [18, 18],
      ],
      5: [
        [6, 6],
        [18, 6],
        [12, 12],
        [6, 18],
        [18, 18],
      ],
      6: [
        [6, 6],
        [18, 6],
        [6, 12],
        [18, 12],
        [6, 18],
        [18, 18],
      ],
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x=".5" y=".5" width="23" height="23" rx="5" fill="#f0f1d8"/>${(patterns[value] || patterns[1]).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#486340"/>`).join('')}</svg>`;
  }
  Games.ludo = function (host, options) {
    const scope = S.createScope();
    let visual = null;
    const ui = S.buildUI(host, {
      className: 'ludo-workspace',
      toolbar:
        S.stat('LƯỢT CỦA', 'turn', 'Xanh lá') +
        S.stat('VỀ ĐÍCH', 'home', '0 / 4') +
        S.modeSelect([
          ['bot', 'Bạn + 3 máy'],
          ['two', '2 người cùng máy'],
          ['four', '4 người cùng máy'],
        ]),
      board: `<div class="ludo-board">${ludoSVG()}<div class="ludo-pieces"></div></div>`,
      controls: `<button class="dice-button" data-roll><span class="dice-face">${diceFace(1)}</span><span>Tung xúc xắc<small>Ra 6 để xuất chuồng</small></span></button>`,
    });
    const mode = ui.toolbar.querySelector('select'),
      pieces = ui.area.querySelector('.ludo-pieces'),
      roll = ui.controls.querySelector('[data-roll]');
    let state,
      busy,
      lastDie = 1;
    const isBot = () => mode.value === 'bot' && state.players[state.turn] !== 0;
    function render() {
      const current = state.winner ?? state.players[state.turn],
        legal = L.legalLudoMoves(state);
      const locations = [];
      for (const player of state.players)
        state.tokens[player].forEach((progress, token) => {
          let position;
          if (progress < 0) {
            const [x, y] = LUDO_YARDS[player];
            position = [x + (token % 2) * 1.8, y + Math.floor(token / 2) * 1.8];
          } else
            position =
              progress < 52
                ? LUDO_PATH[L.ludoPosition(player, progress)]
                : homePosition(player, progress);
          locations.push({ player, token, progress, position, key: position.join(',') });
        });
      pieces.innerHTML = locations
        .map((item) => {
          const stack = locations.filter((other) => other.key === item.key),
            order = stack.indexOf(item);
          const spread = stack.length > 1 ? 0.17 : 0;
          const x = ((item.position[0] + 0.5 + (order % 2 ? spread : -spread)) / 15) * 100;
          const y = ((item.position[1] + 0.5 + (order > 1 ? spread : -spread)) / 15) * 100;
          const available =
            item.player === current &&
            legal.includes(item.token) &&
            !isBot() &&
            !busy &&
            state.winner === null;
          return `<button class="horse-token ${available ? 'can-move' : ''} ${item.progress === 57 ? 'at-home' : ''}" style="left:${x}%;top:${y}%;--horse:${LUDO_COLORS[item.player]};--token-size:${stack.length > 1 ? '4.1' : item.progress < 0 ? '8.5' : '5.5'}%" data-owner="${item.player}" data-token="${item.token}" aria-label="Ngựa ${item.token + 1}, đội ${LUDO_NAMES[item.player]}, ${item.progress < 0 ? 'trong chuồng' : item.progress === 57 ? 'đã về đích' : `bước ${item.progress + 1}`}${available ? ', có thể đi' : ''}" ${available ? '' : 'disabled'}><span aria-hidden="true">♞</span></button>`;
        })
        .join('');
      roll.disabled = Boolean(state.die || busy || isBot() || state.winner !== null);
      roll.querySelector('.dice-face').innerHTML = diceFace(state.die || lastDie);
      roll.setAttribute('aria-label', `Tung xúc xắc. Kết quả gần nhất: ${lastDie}`);
      ui.setStat(
        'turn',
        `${LUDO_NAMES[current]}${mode.value === 'bot' ? (current === 0 ? ' · Bạn' : ' · Máy') : ''}`,
      );
      ui.setStat('home', `${state.tokens[current].filter((p) => p === 57).length} / 4`);
      ui.toolbar.querySelector('[data-stat="turn"]').style.color = LUDO_COLORS[current];
      visual?.sync(state, { lastDie });
    }
    function beginTurn() {
      busy = false;
      render();
      ui.message(
        isBot()
          ? `Máy ${LUDO_NAMES[state.players[state.turn]]} chuẩn bị tung xúc xắc…`
          : `Lượt ${LUDO_NAMES[state.players[state.turn]]}. Tung xúc xắc để bắt đầu.`,
      );
      if (isBot()) {
        busy = true;
        render();
        scope.after(0.65, toss);
      }
    }
    function toss() {
      if (!L.rollLudo(state)) return;
      lastDie = state.die;
      busy = false;
      render();
      const legal = L.legalLudoMoves(state);
      if (!legal.length) {
        busy = true;
        ui.message(`Ra ${state.die}. Không có ngựa đi được, tự động chuyển lượt.`);
        render();
        scope.after(0.8, () => {
          L.passLudo(state);
          beginTurn();
        });
      } else if (isBot()) {
        busy = true;
        ui.message(`Máy tung được ${state.die}, đang chọn ngựa…`);
        render();
        scope.after(0.6, () => {
          busy = false;
          move(L.chooseLudoMove(state));
        });
      } else
        ui.message(
          `Ra ${state.die}! Chạm một ngựa đang sáng để đi.${state.die === 6 ? ' Bạn được thêm lượt.' : ''}`,
        );
    }
    function move(token) {
      const result = L.moveLudo(state, token);
      if (!result) return;
      busy = true;
      render();
      ui.message(
        result.captured
          ? `Đá ${result.captured} ngựa về chuồng!`
          : result.finished
            ? 'Một ngựa đã về đích!'
            : result.extra
              ? 'Ra 6! Bạn được tung thêm một lần.'
              : 'Đã đi. Chuẩn bị lượt tiếp theo…',
      );
      if (state.winner !== null) {
        const winner = state.winner;
        scope.after(0.7, () =>
          S.result(ui, scope, {
            title: `${LUDO_NAMES[winner]} chiến thắng!`,
            detail: 'Cả 4 ngựa đã về đích. Một ván đua thật đáng nhớ!',
            score: mode.value !== 'bot' || winner === 0 ? 100 : 0,
            win: mode.value !== 'bot' || winner === 0,
            onAgain: restart,
            onScore: options.onScore,
          }),
        );
      } else scope.after(0.45, beginTurn);
    }
    scope.on(roll, 'click', () => {
      if (!busy && !isBot()) toss();
    });
    scope.on(pieces, 'click', (event) => {
      const piece = event.target.closest('[data-token]');
      if (piece && !piece.disabled && !busy && !isBot()) move(Number(piece.dataset.token));
    });
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createLudo(mode.value === 'two' ? [0, 2] : [0, 1, 2, 3]);
      lastDie = 1;
      beginTurn();
    }
    scope.on(mode, 'change', restart);
    if (options.renderer === '3d') visual = window.Arcade3D.createView('ludo', ui, scope);
    restart();
    return S.handle(scope, restart);
  };

  Games.quan = function (host, options) {
    const scope = S.createScope();
    let visual = null;
    const ui = S.buildUI(host, {
      className: 'quan-workspace',
      toolbar:
        S.stat('BẠN / NGƯỜI 1', 'p1', 0, 'điểm') +
        S.stat('MÁY / NGƯỜI 2', 'p2', 0, 'điểm') +
        S.modeSelect([
          ['bot', 'Đấu với máy'],
          ['local', '2 người cùng máy'],
        ]),
      board:
        '<div class="quan-scene"><div class="quan-player-label top-player">Máy · Hàng trên</div><div class="quan-board" aria-label="Bàn ô ăn quan, 10 ô dân và 2 ô quan"></div><div class="quan-player-label bottom-player">Bạn · Hàng dưới</div></div>',
      controls: `<button class="control-button sow-button" data-sow="left">${icon('arrow-left')}Rải bên trái</button><span class="quan-selection">Chọn một ô dân</span><button class="control-button sow-button" data-sow="right">Rải bên phải${icon('arrow-right')}</button>`,
    });
    const mode = ui.toolbar.querySelector('select'),
      board = ui.area.querySelector('.quan-board');
    let state,
      selected = -1,
      busy = false;
    const pits = Array.from({ length: 12 }, (_, index) => {
      const pit = document.createElement('button');
      pit.dataset.pit = index;
      pit.className = `quan-pit ${index === 0 || index === 6 ? 'royal-pit' : 'folk-pit'}`;
      if (index === 0 || index === 6) {
        pit.style.gridColumn = index === 0 ? 1 : 7;
        pit.style.gridRow = '1 / 3';
      } else {
        pit.style.gridColumn = index < 6 ? index + 1 : 13 - index;
        pit.style.gridRow = index < 6 ? 1 : 2;
      }
      board.append(pit);
      return pit;
    });
    const playerName = (player) =>
      mode.value === 'bot' ? (player === 0 ? 'Bạn' : 'Máy') : `Người ${player + 1}`;
    function render() {
      pits.forEach((pit, i) => {
        const royal = (i === 0 && state.royals[0]) || (i === 6 && state.royals[1]);
        const count = state.pits[i];
        let stones = '';
        for (let n = 0; n < Math.min(count, 12); n++) {
          const angle = n * 2.4,
            radius = 10 + Math.sqrt(n) * 6;
          stones += `<i class="quan-stone" style="left:${50 + Math.cos(angle) * radius}%;top:${50 + Math.sin(angle) * radius}%;transform:rotate(${n * 47}deg)"></i>`;
        }
        pit.innerHTML = `<span class="pit-stones" aria-hidden="true">${stones}${royal ? '<i class="royal-stone"></i>' : ''}</span><strong class="pit-count">${count}${royal ? '<span> + Q</span>' : ''}</strong>`;
        pit.classList.toggle('selected', selected === i);
        pit.classList.toggle('own-pit', !state.ended && L.quanSide(state.turn).includes(i));
        pit.disabled =
          state.ended ||
          busy ||
          (mode.value === 'bot' && state.turn === 1) ||
          !L.quanSide(state.turn).includes(i) ||
          !count;
        pit.setAttribute(
          'aria-label',
          `${i === 0 || i === 6 ? 'Ô quan' : `Ô dân ${i < 6 ? i : 12 - i}, hàng ${i < 6 ? 'trên' : 'dưới'}`}: ${count} dân${royal ? ', 1 quan (10 điểm)' : ''}${selected === i ? ', đang chọn' : ''}`,
        );
      });
      ui.setStat('p1', state.scores[0]);
      ui.setStat('p2', state.scores[1]);
      ui.controls.querySelectorAll('[data-sow]').forEach((button) => {
        button.disabled = selected < 0 || busy || state.ended;
      });
      ui.controls.querySelector('.quan-selection').textContent =
        selected >= 0 ? `Đã chọn ${state.pits[selected]} dân` : 'Chọn một ô dân';
      ui.area.querySelector('.top-player').textContent =
        `${playerName(1)} · Hàng trên${state.turn === 1 && !state.ended ? ' · Đến lượt' : ''}`;
      ui.area.querySelector('.bottom-player').textContent =
        `${playerName(0)} · Hàng dưới${state.turn === 0 && !state.ended ? ' · Đến lượt' : ''}`;
      visual?.sync(state, { selected });
    }
    function play(pit, direction) {
      const move = L.moveQuan(state, pit, direction);
      if (!move) return;
      selected = -1;
      const detail = `${playerName(move.player)} ${move.captured ? `ăn được ${move.captured} điểm` : 'đã rải xong'}${move.relays ? `, rải tiếp ${move.relays} ô` : ''}.${move.refilled ? ' Hàng trống được rải lại 5 dân (trừ 5 điểm).' : ''}`;
      ui.message(detail);
      if (state.ended) {
        busy = false;
        render();
        const won = state.winner === null || mode.value === 'local' || state.winner === 0;
        scope.after(0.7, () =>
          S.result(ui, scope, {
            title: state.winner === null ? 'Một ván hòa!' : `${playerName(state.winner)} thắng!`,
            detail: `Đã thu dân còn lại. ${playerName(0)}: ${state.scores[0]} điểm · ${playerName(1)}: ${state.scores[1]} điểm.`,
            score: mode.value === 'bot' ? state.scores[0] : Math.max(...state.scores),
            win: won,
            onAgain: restart,
            onScore: options.onScore,
          }),
        );
      } else if (mode.value === 'bot' && state.turn === 1) {
        busy = true;
        render();
        ui.message(`${detail} Máy đang tính nước…`);
        scope.after(0.75, () => {
          const choice = L.chooseQuanMove(state);
          busy = false;
          if (choice) play(choice.pit, choice.direction);
        });
      } else {
        busy = false;
        render();
        ui.message(`${detail} Lượt ${playerName(state.turn)}.`);
      }
    }
    scope.on(board, 'click', (event) => {
      const pit = event.target.closest('[data-pit]');
      if (!pit || pit.disabled || busy) return;
      selected = Number(pit.dataset.pit);
      render();
      ui.message(`Đã chọn ${state.pits[selected]} dân. Chọn rải bên trái hoặc bên phải.`);
    });
    scope.on(ui.controls, 'click', (event) => {
      const button = event.target.closest('[data-sow]');
      if (!button || button.disabled || busy || selected < 0) return;
      const left = button.dataset.sow === 'left';
      play(selected, selected > 6 ? (left ? 1 : -1) : left ? -1 : 1);
    });
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createQuan();
      selected = -1;
      busy = false;
      render();
      ui.message('Chọn một ô dân ở hàng dưới, rồi chọn hướng rải. Quan = 10 điểm, dân = 1 điểm.');
    }
    scope.on(mode, 'change', restart);
    if (options.renderer === '3d') visual = window.Arcade3D.createView('quan', ui, scope);
    restart();
    return S.handle(scope, restart);
  };

  Games['2048'] = function (host, options) {
    const scope = S.createScope();
    let visual = null;
    const ui = S.buildUI(host, {
      className: 'puzzle-workspace',
      toolbar:
        S.stat('ĐIỂM', 'score', 0) +
        S.stat('KỶ LỤC', 'best', options.best || 0) +
        S.stat('NƯỚC ĐI', 'moves', 0),
      board:
        '<div class="board-2048" role="grid" aria-label="Bàn 2048. Dùng phím mũi tên hoặc vuốt để gộp các ô."></div>',
      controls: S.directionPad(),
    });
    const board = ui.area.querySelector('.board-2048');
    const rows = Array.from({ length: 4 }, () => {
      const row = document.createElement('div');
      row.className = 'board-row';
      row.setAttribute('role', 'row');
      board.append(row);
      return row;
    });
    const cells = Array.from({ length: 16 }, (_, i) => {
      const cell = document.createElement('div');
      cell.className = 'number-tile';
      cell.setAttribute('role', 'gridcell');
      rows[Math.floor(i / 4)].append(cell);
      return cell;
    });
    let values,
      score,
      moves,
      ended,
      reached,
      best = options.best || 0;
    function render() {
      cells.forEach((cell, i) => {
        if (cell.dataset.value !== String(values[i]))
          cell.className = `number-tile tile-${Math.min(values[i], 4096)} tile-changed`;
        cell.dataset.value = values[i];
        cell.textContent = values[i] || '';
        cell.setAttribute(
          'aria-label',
          `Hàng ${Math.floor(i / 4) + 1}, cột ${(i % 4) + 1}: ${values[i] || 'trống'}`,
        );
      });
      ui.setStat('score', score.toLocaleString('vi-VN'));
      ui.setStat('moves', moves);
      ui.setStat('best', best.toLocaleString('vi-VN'));
      visual?.sync(values);
    }
    function move(direction) {
      if (ended) return;
      const result = L.move2048(values, direction);
      if (!result.changed) return;
      values = result.board;
      score += result.score;
      moves++;
      L.add2048Tile(values);
      best = Math.max(best, score);
      options.onScore(score);
      if (!reached && values.includes(2048)) {
        reached = true;
        ui.message('Tuyệt vời, bạn đã chạm 2048! Có thể tiếp tục để chinh phục 4096.');
      } else if (!reached)
        ui.message(
          result.score
            ? `+${result.score} điểm. Tiếp tục gộp những ô cùng số!`
            : 'Thử giữ ô lớn nhất ở một góc bàn nhé.',
        );
      render();
      if (!L.canMove2048(values)) {
        ended = true;
        scope.after(0.35, () =>
          S.result(ui, scope, {
            title: reached ? 'Một kỷ lục đáng nhớ!' : 'Hết nước đi rồi!',
            detail: `Ô lớn nhất: ${Math.max(...values)} · ${moves} nước đi.`,
            score,
            win: reached,
            onAgain: restart,
            onScore: options.onScore,
          }),
        );
      }
    }
    if (options.renderer === '3d') visual = window.Arcade3D.createView('2048', ui, scope);
    S.bindDirections(scope, ui, move, visual?.canvas || board);
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      values = L.create2048();
      score = 0;
      moves = 0;
      ended = false;
      reached = false;
      render();
      ui.message('Dùng phím mũi tên, nút bên dưới hoặc vuốt bàn để gộp các ô cùng số.');
    }
    restart();
    return S.handle(scope, restart);
  };

  Games.memory = function (host, options) {
    const scope = S.createScope();
    let visual = null;
    const symbols = ['🍋', '🍒', '🥝', '🍇', '🍓', '🍊', '🍉', '🥥'];
    const names = ['chanh', 'anh đào', 'kiwi', 'nho', 'dâu tây', 'cam', 'dưa hấu', 'dừa'];
    const ui = S.buildUI(host, {
      className: 'memory-workspace',
      toolbar:
        S.stat('CẶP ĐÃ TÌM', 'pairs', '0 / 8') +
        S.stat('LẦN LẬT', 'moves', 0) +
        S.stat('THỜI GIAN', 'time', '00:00'),
      board: '<div class="memory-board" aria-label="16 thẻ, tìm 8 cặp giống nhau"></div>',
    });
    const board = ui.area.querySelector('.memory-board');
    let state, elapsed, started;
    const cells = Array.from({ length: 16 }, (_, index) => {
      const button = document.createElement('button');
      button.className = 'memory-card';
      button.dataset.card = index;
      board.append(button);
      return button;
    });
    function render() {
      cells.forEach((cell, i) => {
        const open = state.matched[i] || state.open.includes(i);
        cell.className = `memory-card ${open ? 'is-open' : ''} ${state.matched[i] ? 'is-matched' : ''}`;
        cell.innerHTML = `<span class="memory-card-inner" aria-hidden="true"><span class="card-back">${icon('spark', 30)}</span><span class="card-front">${symbols[state.cards[i]]}</span></span>`;
        cell.setAttribute(
          'aria-label',
          `Thẻ ${i + 1}: ${open ? names[state.cards[i]] : 'đang úp'}${state.matched[i] ? ', đã ghép' : ''}`,
        );
        cell.setAttribute('aria-pressed', String(open));
        cell.disabled = state.matched[i] || state.ended;
      });
      ui.setStat('moves', state.moves);
      ui.setStat('pairs', `${state.matched.filter(Boolean).length / 2} / 8`);
      visual?.sync(state);
    }
    scope.on(board, 'click', (event) => {
      const card = event.target.closest('[data-card]');
      if (!card) return;
      const flip = L.flipMemory(state, Number(card.dataset.card));
      if (flip === 'ignored') return;
      started = true;
      render();
      if (flip === 'miss') {
        ui.message('Chưa phải một cặp. Ghi nhớ vị trí này nhé!');
        scope.after(0.85, () => {
          L.closeMemoryPair(state);
          render();
          ui.message('Chọn hai thẻ để tìm một cặp giống nhau.');
        });
      } else if (flip === 'match') {
        ui.message('Chính xác! Bạn đã tìm được một cặp.');
        if (state.ended)
          scope.after(0.5, () =>
            S.result(ui, scope, {
              title: 'Trí nhớ siêu đỉnh!',
              detail: `Tìm đủ 8 cặp trong ${state.moves} lần lật và ${Math.floor(elapsed)} giây.`,
              score: Math.max(100, 1600 - state.moves * 30 - Math.floor(elapsed) * 2),
              onAgain: restart,
              onScore: options.onScore,
            }),
          );
      }
    });
    scope.loop((dt) => {
      if (started && !state.ended) elapsed += dt;
      const total = Math.floor(elapsed);
      ui.setStat(
        'time',
        `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
      );
    });
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createMemory();
      elapsed = 0;
      started = false;
      render();
      ui.setStat('time', '00:00');
      ui.message(
        'Chọn hai thẻ để tìm một cặp giống nhau. Đồng hồ bắt đầu khi bạn lật thẻ đầu tiên.',
      );
    }
    if (options.renderer === '3d') visual = window.Arcade3D.createView('memory', ui, scope);
    restart();
    return S.handle(scope, restart);
  };
})();
