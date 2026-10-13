// version v1.0
(function () {
  'use strict';
  const L = window.ArcadeLogic,
    S = window.ArcadeShared,
    { icon } = window.ArcadeArt;
  const Games = window.ArcadeGames;

  Games.caro = function (host, options) {
    const scope = S.createScope();
    const online = window.CaroOnline;
    const onlineUI = window.CaroOnlineUI;
    let visual = null;
    const ui = S.buildUI(host, {
      className: 'caro-workspace',
      toolbar:
        S.stat('LƯỢT HIỆN TẠI', 'turn', 'Bạn · X') +
        S.stat('NƯỚC ĐÃ ĐI', 'moves', 0) +
        S.modeSelect([
          ['bot', 'Đấu với máy'],
          ['local', '2 người cùng máy'],
          ['online', 'Chơi online'],
        ]),
      board:
        '<div class="caro-frame"><div class="caro-board" role="grid" aria-label="Bàn caro 15 hàng, 15 cột. Dùng mũi tên để chọn ô, Enter để đánh."></div></div>',
    });
    const board = ui.area.querySelector('.caro-board'),
      mode = ui.toolbar.querySelector('select');
    const panel = onlineUI.mount(ui, scope);
    let state = L.createCaro(),
      busy = false,
      focusIndex = 112;
    let network = online.getState();
    if (network.session || online.getInviteCode()) mode.value = 'online';
    let previousMode = mode.value;
    const isOnline = () => mode.value === 'online';
    const canPlayOnline = () => Boolean(
      network.room?.status === 'playing' && network.connection === 'connected' &&
      !network.pending && network.room.players.every((player) => player?.connected && !player.left) &&
      network.room.game.turn === network.you?.mark,
    );
    const signalMode = () => host.dispatchEvent(new CustomEvent('arcade:online-mode', {
      bubbles: true, detail: { online: isOnline() },
    }));
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
      if (isOnline()) {
        const person = network.room?.players.find((item) => item?.mark === player);
        return `${player === network.you?.mark ? 'Bạn' : person?.name || 'Đối thủ'} · ${player === 1 ? 'X' : 'O'}`;
      }
      return mode.value === 'bot'
        ? player === 1
          ? 'Bạn · X'
          : 'Máy · O'
        : `Người ${player} · ${player === 1 ? 'X' : 'O'}`;
    }
    function render() {
      cells.forEach((cell, i) => {
        const value = state.board[i];
        const className = `caro-cell ${value === 1 ? 'mark-x' : value === 2 ? 'mark-o' : ''}${state.line.includes(i) ? ' winning-cell' : ''}${i === state.last ? ' last-move' : ''}${isOnline() && network.pendingIndex === i ? ' pending-move' : ''}`;
        if (cell.className !== className) cell.className = className;
        const mark = value === 1 ? '×' : value === 2 ? '○' : '';
        if (cell.textContent !== mark) cell.textContent = mark;
        cell.setAttribute(
          'aria-label',
          `Hàng ${Math.floor(i / 15) + 1}, cột ${(i % 15) + 1}: ${value === 1 ? 'X' : value === 2 ? 'O' : 'trống'}`,
        );
        cell.setAttribute('aria-disabled', String(Boolean(value || state.ended || busy)));
      });
      ui.setStat(
        'turn',
        isOnline() && network.room?.status !== 'playing' && !state.ended ? 'Chờ sẵn sàng' :
          state.ended ? (state.winner ? name(state.winner) : 'Hòa') : name(state.turn),
      );
      ui.setStat('moves', state.moves);
      visual?.sync(state);
    }
    function announceTurn() {
      if (isOnline()) { ui.message(onlineUI.status(network)); return; }
      ui.message(
        busy ? 'Máy đang suy nghĩ…' : `Lượt ${name(state.turn)}. Nối 5 quân liên tiếp để thắng.`,
      );
    }
    function play(index) {
      if (isOnline()) {
        if (canPlayOnline() && !state.board[index])
          online.move(index).catch((error) => ui.message(error.message));
        return;
      }
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
      if (isOnline()) {
        if (network.room?.status === 'finished') online.rematch().catch((error) => ui.message(error.message));
        else ui.message('Chỉ có thể chơi tiếp sau khi ván hiện tại kết thúc.');
        return;
      }
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createCaro();
      busy = false;
      render();
      announceTurn();
    }
    scope.on(mode, 'change', () => {
      if (previousMode === 'online' && !isOnline()) {
        if (!onlineUI.confirmLeave()) { mode.value = 'online'; return; }
        onlineUI.clearInvite();
        online.leave();
      }
      previousMode = mode.value;
      scope.clearTimers();
      scope.setPaused(false);
      S.clearOverlays(ui);
      panel.setVisible(isOnline());
      if (isOnline()) {
        updateOnline(online.getState());
        online.resumeSaved();
      } else restart();
      signalMode();
    });
    function updateOnline(snapshot) {
      network = snapshot;
      panel.render(snapshot);
      if (!isOnline()) return;
      state = snapshot.room?.game || L.createCaro();
      busy = !canPlayOnline();
      S.clearOverlays(ui);
      render();
      announceTurn();
      signalMode();
    }
    if (options.renderer === '3d') visual = window.Arcade3D.createView('caro', ui, scope);
    panel.setVisible(isOnline());
    scope.cleanup(online.subscribe(updateOnline));
    if (isOnline()) online.resumeSaved();
    else restart();
    return {
      ...S.handle(scope, restart),
      get online() { return isOnline(); },
      confirmLeave: () => !isOnline() || onlineUI.confirmLeave(),
      setPaused: (value) => scope.setPaused(isOnline() ? false : value),
      destroy({ preserveOnline = false } = {}) {
        scope.destroy();
        if (isOnline() && !preserveOnline) online.leave();
      },
    };
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

  const QUAN_SETTINGS_KEY = 'tram-choi.quan.settings.v1';
  const QUAN_LEVELS = [
    ['easy', 'Dễ'],
    ['normal', 'Thường'],
    ['hard', 'Khó'],
  ];
  // Short labels for the in-game summary line, long ones for the help panel and result card.
  function quanRuleTexts(rules) {
    return [
      rules.youngQuan
        ? { short: `Quan non (< ${rules.youngMin} dân)`, long: `quan non: ô quan có ít hơn ${rules.youngMin} dân chưa được ăn` }
        : { short: 'Không quan non', long: 'không áp dụng quan non' },
      {
        negative: { short: 'Thiếu điểm: cho điểm âm', long: 'hàng trống mà thiếu điểm thì cho điểm âm' },
        borrow: { short: 'Thiếu điểm: vay đối thủ', long: 'hàng trống mà thiếu điểm thì vay 5 điểm của đối thủ, cuối ván trả lại' },
        end: { short: 'Thiếu điểm: kết thúc ván', long: 'hàng trống mà không đủ 5 điểm thì kết thúc ván ngay' },
      }[rules.debt],
      rules.emptyQuan === 'block'
        ? { short: 'Ô quan trống: chặn lượt', long: 'ô quan đã bị ăn và còn trống vẫn chặn lượt' }
        : { short: 'Ô quan trống: như ô trống', long: 'ô quan đã bị ăn và còn trống được tính như ô trống' },
    ];
  }

  Games.quan = function (host, options) {
    const scope = S.createScope();
    let visual = null;
    const settings = { rules: L.quanRules(), difficulty: 'normal' };
    try {
      const saved = JSON.parse(localStorage.getItem(QUAN_SETTINGS_KEY));
      if (saved?.rules) settings.rules = L.quanRules(saved.rules);
      if (QUAN_LEVELS.some(([value]) => value === saved?.difficulty)) settings.difficulty = saved.difficulty;
    } catch {}
    const saveSettings = () => {
      try {
        localStorage.setItem(QUAN_SETTINGS_KEY, JSON.stringify(settings));
      } catch {}
    };
    const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const ui = S.buildUI(host, {
      className: 'quan-workspace',
      toolbar:
        S.stat('BẠN', 'p1', 0, 'điểm') +
        S.stat('MÁY', 'p2', 0, 'điểm') +
        S.modeSelect([
          ['bot', 'Đấu với máy'],
          ['local', '2 người cùng máy'],
        ]) +
        `<label class="game-mode quan-difficulty" data-quan-difficulty-wrap><span>Độ khó</span><select data-quan-difficulty aria-label="Độ khó của máy">${QUAN_LEVELS.map(([value, title]) => `<option value="${value}">${title}</option>`).join('')}</select></label>` +
        '<button type="button" class="control-button quan-rules-toggle" data-quan-rules-toggle aria-expanded="false" aria-controls="quan-rules-panel">Luật chơi</button>',
      board:
        '<div class="quan-scene"><p class="quan-rules-summary"></p><div class="quan-player-label top-player"></div><div class="quan-board" aria-label="Bàn ô ăn quan, 10 ô dân và 2 ô quan"></div><div class="quan-player-label bottom-player"></div></div>',
      controls: `<button class="control-button sow-button" data-sow="left" aria-label="Rải về phía trái màn hình">${icon('arrow-left')}Rải</button><span class="quan-selection">Chọn một ô dân</span><button class="control-button sow-button" data-sow="right" aria-label="Rải về phía phải màn hình">Rải${icon('arrow-right')}</button><button class="control-button quan-skip" data-quan-skip hidden>Tua nhanh</button>`,
    });
    const panel = document.createElement('form');
    panel.className = 'quan-rules-panel';
    panel.id = 'quan-rules-panel';
    panel.hidden = true;
    panel.innerHTML = `<fieldset><legend>Luật tùy chọn</legend>
      <label class="quan-rule quan-rule-check"><input type="checkbox" name="youngQuan"><span><strong>Quan non</strong><small>Ô quan còn quan nhưng có ít hơn 5 dân thì chưa được ăn; lượt rải dừng lại ở đó.</small></span></label>
      <label class="quan-rule"><span><strong>Hàng trống mà không đủ 5 điểm</strong><small>Khi đủ 5 điểm, người chơi luôn tự trả 5 điểm để rải lại.</small></span><select name="debt"><option value="negative">Cho điểm âm</option><option value="borrow">Vay 5 điểm của đối thủ, cuối ván trả</option><option value="end">Kết thúc ván ngay</option></select></label>
      <label class="quan-rule"><span><strong>Ô quan đã bị ăn và còn trống</strong><small>Ảnh hưởng tới việc ăn quân nằm sau ô quan.</small></span><select name="emptyQuan"><option value="empty">Tính như ô trống, ăn tiếp được</option><option value="block">Vẫn chặn, rải tới là mất lượt</option></select></label>
      <p class="quan-rules-note">Luật được chốt cho cả ván. Đổi luật giữa ván sẽ bắt đầu ván mới.</p>
      <div class="quan-rules-actions"><button type="button" class="button button-secondary" data-quan-rules-close>Đóng</button><button type="submit" class="button button-primary">Áp dụng</button></div></fieldset>`;
    ui.toolbar.after(panel);
    const mode = ui.toolbar.querySelector('.game-mode select'),
      difficulty = ui.toolbar.querySelector('[data-quan-difficulty]'),
      rulesToggle = ui.toolbar.querySelector('[data-quan-rules-toggle]'),
      board = ui.area.querySelector('.quan-board'),
      summary = ui.area.querySelector('.quan-rules-summary'),
      skipButton = ui.controls.querySelector('[data-quan-skip]');
    difficulty.value = settings.difficulty;
    let state,
      selected = -1,
      busy = false,
      view = null, // snapshot shown while a move is replayed
      anim = null,
      lastMove = null,
      animToken = 0,
      mover = 0, // player whose move is being replayed
      finishAnimation = null;
    const isRoyalPit = (i) => i === 0 || i === 6;
    const placeInCell = (el, i) => {
      if (isRoyalPit(i)) {
        el.style.gridColumn = i === 0 ? 1 : 7;
        el.style.gridRow = '1 / 3';
      } else {
        el.style.gridColumn = i < 6 ? i + 1 : 13 - i;
        el.style.gridRow = i < 6 ? 1 : 2;
      }
    };
    const pits = Array.from({ length: 12 }, (_, index) => {
      const pit = document.createElement('button');
      pit.dataset.pit = index;
      pit.className = `quan-pit ${isRoyalPit(index) ? 'royal-pit' : 'folk-pit'}`;
      placeInCell(pit, index);
      board.append(pit);
      return pit;
    });
    // Board overlays share grid cells with the pits; pits stay first so :nth-child styles still match.
    const arrows = document.createElement('div');
    arrows.className = 'quan-arrows';
    arrows.innerHTML = `<button type="button" class="quan-arrow" data-arrow="left" aria-label="Rải về phía trái màn hình">${icon('arrow-left', 16)}</button><button type="button" class="quan-arrow" data-arrow="right" aria-label="Rải về phía phải màn hình">${icon('arrow-right', 16)}</button>`;
    const handBadge = document.createElement('span');
    handBadge.className = 'quan-hand';
    handBadge.setAttribute('aria-hidden', 'true');
    const skipLayer = document.createElement('button');
    skipLayer.type = 'button';
    skipLayer.className = 'quan-skip-layer';
    skipLayer.dataset.quanSkip = '';
    skipLayer.setAttribute('aria-label', 'Bỏ qua hiệu ứng rải');
    board.append(arrows, handBadge, skipLayer);

    const isBot = () => mode.value === 'bot';
    const playerName = (player) => (isBot() ? (player === 0 ? 'Bạn' : 'Máy') : `Người ${player + 1}`);
    const playerRef = (player) => (isBot() && player === 0 ? 'bạn' : playerName(player));
    const canAct = () => !state.ended && !busy && !(isBot() && state.turn === 1);
    // Bottom row is numbered right to left in the model, so screen directions are mirrored there.
    const logicDirection = (pit, screen) => (pit < 6 ? 1 : -1) * (screen === 'right' ? 1 : -1);
    const screenDirection = (pit, direction) => (logicDirection(pit, 'right') === direction ? 'right' : 'left');
    const screenOrder = (player) => (player === 0 ? [11, 10, 9, 8, 7] : [1, 2, 3, 4, 5]);

    function updateRulesInfo() {
      const texts = quanRuleTexts(state.rules);
      summary.textContent = `Luật ván này: ${texts.map((t) => t.short).join(' · ')}`;
      options.setHelpNote?.(
        `Luật đang áp dụng: ${texts.map((t) => t.long).join('; ')}. Bấm “Luật chơi” để đổi (bắt đầu ván mới). Máy có 3 mức Dễ / Thường / Khó, hoặc chọn 2 người để chơi chung thiết bị.`,
      );
    }
    function fillRulesForm(rules) {
      panel.elements.youngQuan.checked = rules.youngQuan;
      panel.elements.debt.value = rules.debt;
      panel.elements.emptyQuan.value = rules.emptyQuan;
    }
    function setPanel(open) {
      panel.hidden = !open;
      rulesToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        fillRulesForm(settings.rules);
        panel.elements.youngQuan.focus({ preventScroll: true });
      }
    }
    function render() {
      const shown = view || state;
      const animating = Boolean(view);
      const active = canAct();
      const showLast = lastMove && !animating;
      pits.forEach((pit, i) => {
        const royal = (i === 0 && shown.royals[0]) || (i === 6 && shown.royals[1]);
        const count = shown.pits[i];
        let stones = '';
        for (let n = 0; n < Math.min(count, 12); n++) {
          const angle = n * 2.4,
            radius = 10 + Math.sqrt(n) * 6;
          stones += `<i class="quan-stone" style="left:${50 + Math.cos(angle) * radius}%;top:${50 + Math.sin(angle) * radius}%;transform:rotate(${n * 47}deg)"></i>`;
        }
        const countText = royal ? `<span class="quan-tag">Quan</span>+ ${count}` : count;
        const lastDirection =
          showLast && lastMove.pit === i
            ? `<span class="quan-last-dir ${lastMove.screen}" aria-hidden="true">${lastMove.screen === 'left' ? '◀' : '▶'}</span>`
            : '';
        pit.innerHTML = `<span class="pit-stones" aria-hidden="true">${stones}${royal ? '<i class="royal-stone"></i>' : ''}</span>${lastDirection}<strong class="pit-count">${countText}</strong>`;
        pit.classList.toggle('selected', selected === i);
        pit.classList.toggle('own-pit', !animating && !state.ended && L.quanSide(state.turn).includes(i));
        pit.classList.toggle('sowing', Boolean(anim) && anim.pit === i);
        pit.classList.toggle('capture-flash', Boolean(anim) && anim.type === 'capture' && anim.pit === i);
        pit.classList.toggle('young-flash', Boolean(anim) && anim.type === 'young' && anim.pit === i);
        pit.classList.toggle('last-origin', Boolean(showLast) && lastMove.pit === i);
        pit.classList.toggle('last-captured', Boolean(showLast) && lastMove.captured.includes(i));
        pit.disabled = !active || !L.quanSide(state.turn).includes(i) || !count;
        pit.setAttribute(
          'aria-label',
          `${isRoyalPit(i) ? 'Ô quan' : `Ô dân ${i < 6 ? i : 12 - i}, hàng ${i < 6 ? 'trên' : 'dưới'}`}: ${count} dân${royal ? ', còn quan (10 điểm)' : ''}${selected === i ? ', đang chọn' : ''}${showLast && lastMove.pit === i ? ', ô vừa rải' : ''}${showLast && lastMove.captured.includes(i) ? ', vừa bị ăn' : ''}`,
        );
      });
      const showArrows = selected >= 0 && active;
      arrows.hidden = !showArrows;
      if (showArrows) placeInCell(arrows, selected);
      const handCount = anim && ['pick', 'relay', 'drop'].includes(anim.type) ? anim.hand : 0;
      handBadge.hidden = !handCount;
      if (handCount) {
        placeInCell(handBadge, anim.pit);
        handBadge.textContent = `✋ ${handCount}`;
      }
      skipLayer.hidden = !animating;
      skipButton.hidden = !animating;
      for (const player of [0, 1]) {
        const debt = shown.debts?.[player] || 0;
        ui.setStat(`p${player + 1}`, debt ? `${shown.scores[player]} (nợ ${debt})` : shown.scores[player]);
        const label = ui.toolbar.querySelector(`[data-stat="p${player + 1}"]`).previousElementSibling;
        const name = playerName(player).toUpperCase();
        if (label.textContent !== name) label.textContent = name;
      }
      ui.toolbar.querySelector('[data-quan-difficulty-wrap]').hidden = !isBot();
      ui.controls.querySelectorAll('[data-sow]').forEach((button) => {
        button.disabled = !showArrows;
      });
      ui.controls.querySelector('.quan-selection').textContent = animating
        ? 'Đang rải…'
        : selected >= 0
          ? `Đã chọn ${state.pits[selected]} dân`
          : 'Chọn một ô dân';
      const turnPlayer = animating ? mover : state.turn;
      const turnMark = (player) =>
        turnPlayer === player && (animating || !state.ended) ? (animating ? ' · Đang rải' : ' · Đến lượt') : '';
      ui.area.querySelector('.top-player').textContent = `${playerName(1)} · Hàng trên${turnMark(1)}`;
      ui.area.querySelector('.bottom-player').textContent = `${playerName(0)} · Hàng dưới${turnMark(0)}`;
      visual?.sync(shown, {
        selected,
        active: anim ? anim.pit : -1,
        flash: anim && anim.type === 'capture' ? anim.pit : -1,
        captured: showLast ? lastMove.captured : [],
        origin: showLast ? lastMove.pit : -1,
        names: [playerName(0), playerName(1)],
      });
    }
    function clearFloats() {
      board.querySelectorAll('.quan-gain').forEach((el) => el.remove());
    }
    function floatText(pit, text, className = '') {
      const el = document.createElement('span');
      el.className = `quan-gain ${className}`;
      el.setAttribute('aria-hidden', 'true');
      el.textContent = text;
      placeInCell(el, pit);
      board.append(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
      scope.after(1.2, () => el.remove());
    }
    // Replays the recorded steps one by one; any skip jumps straight to the real final state.
    function animate(steps, done) {
      const token = ++animToken;
      const factor = reducedMotion ? 0.35 : 1;
      const drops = steps.filter((step) => step.type === 'drop').length;
      const durations = {
        pick: 0.32,
        relay: 0.34,
        drop: Math.max(0.06, Math.min(0.17, 4.5 / Math.max(1, drops))),
        capture: 0.55,
        young: 0.6,
        refill: 0.65,
        finish: 0.2,
      };
      let index = 0;
      finishAnimation = () => {
        if (token !== animToken) return;
        animToken++;
        finishAnimation = null;
        view = null;
        anim = null;
        done();
      };
      const next = () => {
        if (token !== animToken) return;
        if (index >= steps.length) {
          finishAnimation();
          return;
        }
        const step = steps[index++];
        view = step;
        anim = { type: step.type, pit: step.pit ?? -1, hand: step.hand ?? 0 };
        if (step.type === 'capture') floatText(step.pit, `+${step.value}`);
        if (step.type === 'young') floatText(step.pit, 'Quan non', 'is-warning');
        render();
        scope.after((durations[step.type] || 0.2) * factor, next);
      };
      next();
    }
    function describe(move) {
      const name = playerName(move.player);
      let text = `${name} ${move.captured ? `ăn được ${move.captured} điểm` : 'đã rải xong'}${move.relays ? `, rải tiếp ${move.relays} ô` : ''}.`;
      if (move.blocked >= 0) text += ` Ô quan còn non (dưới ${state.rules.youngMin} dân) nên chưa ăn được.`;
      if (move.refill) {
        const who = move.refill.player;
        text +=
          move.refill.source === 'borrow'
            ? ` Hàng của ${playerRef(who)} trống → ${playerRef(who)} vay 5 điểm của ${playerRef(move.refill.lender)} để rải lại (trả lại cuối ván).`
            : ` Hàng của ${playerRef(who)} trống → ${playerRef(who)} trả 5 điểm để rải lại.`;
      }
      if (state.ended && state.endReason === 'debt') {
        const who = move.steps?.at(-1)?.player ?? state.turn;
        text += ` Hàng của ${playerRef(who)} trống mà không đủ 5 điểm → ván kết thúc.`;
      }
      return text;
    }
    function showResult() {
      const draw = state.winner === null;
      const reason =
        state.endReason === 'debt' ? 'Một bên không đủ điểm để rải lại nên ván kết thúc.' : 'Hết quan, đã thu dân còn lại.';
      S.result(ui, scope, {
        title: draw ? 'Một ván hòa!' : `${playerName(state.winner)} thắng!`,
        detail: `${reason} ${playerName(0)}: ${state.scores[0]} điểm · ${playerName(1)}: ${state.scores[1]} điểm. Luật: ${quanRuleTexts(state.rules)
          .map((t) => t.short.toLowerCase())
          .join(' · ')}.`,
        score: isBot() ? state.scores[0] : Math.max(...state.scores),
        win: !draw && (!isBot() || state.winner === 0),
        onAgain: restart,
        onScore: options.onScore,
      });
    }
    function afterMove(move) {
      lastMove = {
        pit: move.pit,
        screen: screenDirection(move.pit, move.direction),
        captured: move.capturedPits,
      };
      const detail = describe(move);
      if (state.ended) {
        busy = false;
        render();
        ui.message(detail);
        scope.after(0.7, showResult);
      } else if (isBot() && state.turn === 1) {
        render();
        ui.message(`${detail} Máy đang tính nước…`);
        scope.after(0.6, () => {
          const choice = L.chooseQuanMove(state, settings.difficulty);
          busy = false;
          if (choice) play(choice.pit, choice.direction);
        });
      } else {
        busy = false;
        render();
        ui.message(`${detail} Lượt ${playerName(state.turn)}.`);
      }
    }
    function play(pit, direction) {
      if (busy || state.ended) return;
      const move = L.moveQuan(state, pit, direction, { trace: true });
      if (!move) return;
      selected = -1;
      busy = true;
      mover = move.player;
      lastMove = null;
      clearFloats();
      ui.message(
        `${playerName(move.player)} bốc ${move.steps[0].hand} dân, rải về phía ${screenDirection(pit, direction) === 'left' ? 'trái' : 'phải'}…`,
      );
      animate(move.steps, () => afterMove(move));
    }
    function select(pit) {
      if (!canAct() || !L.quanSide(state.turn).includes(pit) || !state.pits[pit]) return;
      selected = selected === pit ? -1 : pit;
      render();
      ui.message(
        selected < 0
          ? 'Đã bỏ chọn.'
          : `Đã chọn ${state.pits[selected]} dân. Bấm mũi tên ◀ ▶ trên ô (hoặc phím ← →) để chọn hướng rải.`,
      );
    }
    function sow(screen) {
      if (selected < 0 || !canAct()) return;
      play(selected, logicDirection(selected, screen));
    }
    scope.on(board, 'click', (event) => {
      if (event.target.closest('[data-quan-skip]')) {
        finishAnimation?.();
        return;
      }
      const arrow = event.target.closest('[data-arrow]');
      if (arrow) {
        sow(arrow.dataset.arrow);
        return;
      }
      const pit = event.target.closest('[data-pit]');
      if (!pit || pit.disabled) return;
      select(Number(pit.dataset.pit));
    });
    scope.on(ui.controls, 'click', (event) => {
      if (event.target.closest('[data-quan-skip]')) {
        finishAnimation?.();
        return;
      }
      const button = event.target.closest('[data-sow]');
      if (button && !button.disabled) sow(button.dataset.sow);
    });
    scope.on(window, 'keydown', (event) => {
      if (!(host.contains(event.target) || event.target === document.body)) return;
      const key = S.gameKey(event);
      if (!key) return;
      if (key === 'escape') {
        if (!panel.hidden) {
          event.preventDefault();
          setPanel(false);
          rulesToggle.focus({ preventScroll: true });
        } else if (selected >= 0) {
          event.preventDefault();
          selected = -1;
          render();
          ui.message('Đã bỏ chọn.');
        }
        return;
      }
      if (/^[1-5]$/.test(key)) {
        if (!canAct()) return;
        event.preventDefault();
        const pit = screenOrder(state.turn)[Number(key) - 1];
        if (state.pits[pit]) {
          if (selected !== pit) select(pit);
        } else ui.message('Ô này đang trống, hãy chọn ô khác.');
        return;
      }
      if ((key === 'arrowleft' || key === 'arrowright') && selected >= 0 && canAct()) {
        event.preventDefault();
        sow(key === 'arrowleft' ? 'left' : 'right');
      }
    });
    scope.on(rulesToggle, 'click', () => setPanel(panel.hidden));
    scope.on(panel, 'click', (event) => {
      if (event.target.closest('[data-quan-rules-close]')) {
        setPanel(false);
        rulesToggle.focus({ preventScroll: true });
      }
    });
    scope.on(panel, 'submit', (event) => {
      event.preventDefault();
      const rules = L.quanRules({
        ...settings.rules,
        youngQuan: panel.elements.youngQuan.checked,
        debt: panel.elements.debt.value,
        emptyQuan: panel.elements.emptyQuan.value,
      });
      if (JSON.stringify(rules) === JSON.stringify(state.rules)) {
        setPanel(false);
        ui.message('Luật không thay đổi.');
        return;
      }
      const inProgress = state.moves > 0 && !state.ended;
      if (inProgress && !window.confirm('Bắt đầu ván mới với luật này? Ván đang chơi sẽ bị thay thế.')) {
        fillRulesForm(state.rules);
        return;
      }
      settings.rules = rules;
      saveSettings();
      setPanel(false);
      restart();
      ui.message(`Đã áp dụng luật mới cho ván này. ${ui.status.textContent}`);
    });
    scope.on(difficulty, 'change', () => {
      settings.difficulty = difficulty.value;
      saveSettings();
      ui.message(`Độ khó của máy: ${difficulty.selectedOptions[0].textContent}.`);
    });
    function restart() {
      animToken++;
      finishAnimation = null;
      view = null;
      anim = null;
      scope.clearTimers();
      S.clearOverlays(ui);
      clearFloats();
      state = L.createQuan(settings.rules);
      selected = -1;
      busy = false;
      lastMove = null;
      updateRulesInfo();
      render();
      ui.message(
        'Chọn một ô dân ở hàng dưới, rồi bấm mũi tên ◀ ▶ để rải. Phím tắt: 1–5 chọn ô, ← → rải, Esc bỏ chọn.',
      );
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
