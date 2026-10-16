// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const names = ['Bạn', 'Máy 1', 'Máy 2', 'Máy 3'];
  const dots = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const half = value => `<span class="domino-half" aria-hidden="true">${dots[value].map(index => `<i style="grid-area:${Math.floor(index / 3) + 1}/${index % 3 + 1}"></i>`).join('')}</span>`;
  const face = (a, b) => `${half(a)}<span class="domino-divider" aria-hidden="true"></span>${half(b)}`;
  const tileName = tile => `${tile.a} – ${tile.b}${tile.a === tile.b ? ' (quân đôi)' : ''}`;

  window.ArcadeGames.domino = function (host, options = {}) {
    const L = window.ArcadeDomino;
    const scope = S.createScope();
    let state = L.createGame();
    let started = false, selected = null, handKey = '', chainKey = '';
    let history = [], lastMessage = `${names[state.current]} mở bàn bằng quân đôi 6 – 6.`;
    const ui = S.buildUI(host, {
      className: 'domino-workspace',
      toolbar: '<div class="domino-heading"><small>NỐI QUÂN · GIỮ THẾ</small><strong>Domino<span>.</span></strong></div><div class="domino-mode"><strong>Bạn + 3 máy</strong><span>28 quân · mỗi người 7 quân</span></div>',
      board: `<div class="domino-playfield">
        <div class="domino-table">
          <div class="domino-opponents">${[1, 2, 3].map(player => `<div class="domino-opponent" data-domino-player="${player}"><span class="domino-avatar" aria-hidden="true">${player}</span><strong>${names[player]}</strong><span data-domino-count="${player}"></span><small data-domino-thinking="${player}"></small></div>`).join('')}</div>
          <div class="domino-turn-line"><strong data-domino-turn></strong><span data-domino-played></span></div>
          <div class="domino-ends"><span>ĐẦU TRÁI <b data-domino-left>—</b></span><small>Nối các số bằng nhau</small><span>ĐẦU PHẢI <b data-domino-right>—</b></span></div>
          <div class="domino-chain" role="list" aria-label="Chuỗi quân trên bàn, từ trái sang phải" tabindex="0"></div>
          <p class="domino-scroll-note">Kéo ngang chuỗi quân để xem toàn bộ bàn.</p>
          <p class="domino-last-action" data-domino-last></p>
        </div>
        <div class="domino-choice" role="group" aria-label="Chọn đầu nối quân" hidden><strong data-domino-selection></strong><div><button type="button" class="control-button" data-domino-end="left">Nối bên trái</button><button type="button" class="control-button" data-domino-end="right">Nối bên phải</button><button type="button" class="domino-cancel" data-domino-cancel>Hủy chọn</button></div></div>
        <div class="domino-hand-heading"><strong>Quân của bạn <span data-domino-hand-count></span></strong><span data-domino-pips></span></div>
        <div class="domino-hand" role="group" aria-label="Quân domino của bạn"></div>
      </div>`,
      controls: '<button type="button" class="control-button" data-domino-pass>Bỏ lượt</button><details class="domino-rules"><summary>Luật chơi</summary><p>Mỗi người 7 quân. Người giữ đôi 6 mở bàn. Nối quân cùng số vào một trong hai đầu; hết quân trước là thắng. Không có quân để rút, chỉ được bỏ lượt khi không nối được.</p><p>Cả 4 người liên tiếp bỏ lượt: ai ít chấm nhất thắng; bằng điểm thấp nhất thì hòa. Điểm người thắng bằng tổng chấm còn lại của 3 người kia. Mỗi lần chơi là một ván độc lập.</p></details><details class="domino-history"><summary>Diễn biến</summary><ol></ol></details>',
      status: 'Chọn quân có viền sáng. Nếu nối được cả hai đầu, bạn chọn bên muốn nối.',
    });
    const $ = selector => ui.workspace.querySelector(selector);
    const hand = $('.domino-hand'), chain = $('.domino-chain'), picker = $('.domino-choice');
    const pass = $('[data-domino-pass]');
    const canAct = () => started && state.phase === 'play' && state.current === 0;

    function remember(message) {
      lastMessage = message;
      history.push(message);
      history = history.slice(-16);
      $('.domino-history ol').replaceChildren(...history.map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    }

    function render() {
      const moves = canAct() ? L.legalMoves(state, 0) : [];
      const legalIds = new Set(moves.map(move => move.tileId));
      const nextHandKey = state.hands[0].map(tile => tile.id).join(',');
      if (nextHandKey !== handKey) {
        handKey = nextHandKey;
        hand.replaceChildren(...state.hands[0].map(tile => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'domino-tile';
          button.dataset.dominoTile = tile.id;
          button.innerHTML = face(tile.a, tile.b);
          return button;
        }));
      }
      for (const tile of state.hands[0]) {
        const button = [...hand.children].find(item => item.dataset.dominoTile === tile.id);
        const legal = legalIds.has(tile.id);
        button.disabled = !legal;
        button.classList.toggle('is-playable', legal);
        button.classList.toggle('is-selected', selected === tile.id);
        button.setAttribute('aria-pressed', String(selected === tile.id));
        button.setAttribute('aria-label', `${tileName(tile)}${legal ? ', có thể nối' : ''}`);
        button.title = tileName(tile);
      }
      const nextChainKey = state.chain.map(tile => tile.id).join(',');
      if (nextChainKey !== chainKey || !chain.childElementCount) {
        chainKey = nextChainKey;
        chain.replaceChildren(...state.chain.map((tile, index) => {
          const item = document.createElement('div');
          item.className = `domino-tile domino-placed${state.lastAction?.tileId === tile.id ? ' is-last' : ''}`;
          item.setAttribute('role', 'listitem');
          item.setAttribute('aria-label', `Quân ${index + 1}: ${tile.left} – ${tile.right}, ${names[tile.player]}`);
          item.innerHTML = face(tile.left, tile.right);
          return item;
        }));
        if (!state.chain.length) {
          const empty = document.createElement('span');
          empty.className = 'domino-empty';
          empty.textContent = 'Đôi 6 sẽ mở đầu chuỗi quân';
          chain.append(empty);
        }
        chain.scrollLeft = state.lastAction?.end === 'left' ? 0 : chain.scrollWidth;
      }
      for (const player of [1, 2, 3]) {
        const active = started && state.phase === 'play' && state.current === player;
        $(`[data-domino-player="${player}"]`).classList.toggle('is-active', active);
        $(`[data-domino-count="${player}"]`).textContent = `${state.hands[player].length} quân`;
        $(`[data-domino-thinking="${player}"]`).textContent = active ? 'Đang chọn quân…' : 'Chờ lượt';
      }
      $('[data-domino-turn]').textContent = !started ? 'Sẵn sàng vào bàn' : state.phase === 'finished' ? 'Ván đấu kết thúc' : state.current === 0 ? 'Đến lượt bạn' : `Lượt ${names[state.current]}`;
      $('[data-domino-played]').textContent = `${state.chain.length}/28 quân trên bàn`;
      $('[data-domino-left]').textContent = state.chain[0]?.left ?? '—';
      $('[data-domino-right]').textContent = state.chain[state.chain.length - 1]?.right ?? '—';
      $('[data-domino-last]').textContent = lastMessage;
      $('[data-domino-hand-count]').textContent = `(${state.hands[0].length})`;
      $('[data-domino-pips]').textContent = `${L.handPips(state.hands[0])} chấm`;
      pass.disabled = !canAct() || moves.length > 0;
      picker.hidden = !selected;
      if (selected) {
        const tile = state.hands[0].find(item => item.id === selected);
        $('[data-domino-selection]').textContent = `Quân ${tileName(tile)} · Chọn đầu nối`;
        for (const end of ['left', 'right']) {
          const button = $(`[data-domino-end="${end}"]`);
          button.disabled = !moves.some(move => move.tileId === selected && move.end === end);
          button.textContent = `Nối ${end === 'left' ? 'trái' : 'phải'} · ${end === 'left' ? state.chain[0].left : state.chain[state.chain.length - 1].right}`;
        }
      }
      ui.message(state.phase === 'finished' ? lastMessage : !started ? 'Nối đúng số ở hai đầu. Hết quân trước là thắng.' : !canAct() ? `${names[state.current]} đang suy nghĩ. Bạn có thể xem trước quân của mình.` : selected ? 'Quân này nối được cả hai đầu. Chọn bên trái hoặc bên phải.' : !moves.length ? 'Bạn không có quân nối được. Nhấn Bỏ lượt để tiếp tục.' : !state.chain.length ? 'Bạn giữ đôi 6. Chọn quân 6 – 6 để mở bàn.' : 'Chọn quân có viền sáng để nối. Nếu có hai cách nối, bạn sẽ chọn đầu.');
    }

    function finish() {
      scope.clearTimers();
      const win = state.winner === 0;
      const title = state.draw ? 'Ván hòa!' : win ? 'Bạn thắng ván Domino!' : `${names[state.winner]} thắng ván này`;
      const reason = state.reason === 'blocked' ? 'Cả 4 người đều không nối được.' : `${names[state.winner]} đã đánh hết quân.`;
      const totals = state.hands.map((tiles, player) => `${names[player]}: ${L.handPips(tiles)} chấm`).join(' · ');
      remember(`${title} ${reason}`);
      render();
      S.result(ui, scope, {
        title, detail: `${reason} ${totals}.${state.draw ? ' Cùng ít chấm nhất: hòa, không tính điểm.' : ` Người thắng nhận ${state.score} điểm.`}`,
        score: win ? state.score : 0, win, onAgain: restart, onScore: options.onScore,
      });
    }

    function act(player, action) {
      if (!started || state.phase !== 'play') return;
      const result = L.applyAction(state, player, action);
      if (!result.ok) { ui.message(result.error); return; }
      selected = null;
      if (action.type === 'pass') remember(`${names[player]} không nối được, bỏ lượt (${state.passes}/4).`);
      else {
        const tile = result.action;
        remember(`${names[player]} nối ${tile.left} – ${tile.right} ${state.chain.length === 1 ? 'để mở bàn' : action.end === 'left' ? 'vào đầu trái' : 'vào đầu phải'}.`);
      }
      render();
      if (state.phase === 'finished') finish();
      else scheduleBot();
    }

    function scheduleBot() {
      scope.clearTimers();
      if (!started || state.phase !== 'play' || state.current === 0) return;
      scope.after(0.72, () => act(state.current, L.chooseBotAction(state)));
    }

    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createGame();
      started = true;
      selected = null;
      history = [];
      remember(`Ván mới: ${names[state.current]} mở bàn bằng đôi 6.`);
      render();
      ui.workspace.focus({ preventScroll: true });
      scheduleBot();
    }

    scope.on(hand, 'click', event => {
      const button = event.target.closest('[data-domino-tile]');
      if (!button || button.disabled || !canAct()) return;
      const moves = L.legalMoves(state, 0).filter(move => move.tileId === button.dataset.dominoTile);
      if (moves.length === 1) {
        act(0, moves[0]);
        if (state.phase !== 'finished') ui.workspace.focus({ preventScroll: true });
      }
      else if (moves.length > 1) {
        selected = button.dataset.dominoTile;
        render();
        picker.querySelector('[data-domino-end]:not(:disabled)').focus({ preventScroll: true });
        picker.scrollIntoView({ block: 'nearest' });
      }
    });
    scope.on(picker, 'click', event => {
      if (!selected || !canAct()) return;
      const end = event.target.closest('[data-domino-end]');
      if (end && !end.disabled) {
        act(0, { type: 'play', tileId: selected, end: end.dataset.dominoEnd });
        if (state.phase !== 'finished') ui.workspace.focus({ preventScroll: true });
      } else if (event.target.closest('[data-domino-cancel]')) {
        const id = selected;
        selected = null;
        render();
        [...hand.children].find(button => button.dataset.dominoTile === id)?.focus({ preventScroll: true });
      }
    });
    scope.on(pass, 'click', () => { if (!pass.disabled && canAct()) act(0, { type: 'pass' }); });
    render();
    S.intro(ui, scope, {
      title: 'Domino · Nối quân, giữ thế', symbol: 'grid',
      detail: 'Bạn đấu riêng với 3 máy, mỗi người 7 quân. Nối số giống nhau ở hai đầu; hết quân trước là thắng. Nếu cả bàn bị chặn, người ít chấm nhất thắng. Không rút thêm quân.',
      onStart() { started = true; remember(lastMessage); render(); scheduleBot(); },
    });
    return S.handle(scope, restart);
  };
})();
