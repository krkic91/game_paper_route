// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const names = ['Bạn', 'Máy 1', 'Máy 2', 'Máy 3'];
  const colors = { red: 'Đỏ', yellow: 'Vàng', green: 'Xanh lá', blue: 'Xanh dương' };
  const symbols = { skip: '⊘', reverse: '⇄', draw2: '+2', wild: '✦', wild4: '+4' };
  const values = { skip: 'Mất lượt', reverse: 'Đổi chiều', draw2: 'Rút hai', wild: 'Đổi màu', wild4: 'Đổi màu, rút bốn' };
  const cardName = (card) => `${values[card.value] || card.value}${card.color ? ' · ' + colors[card.color] : ''}`;
  function face(card) {
    const symbol = symbols[card.value] || card.value;
    return `<span class="uno-card-corner" aria-hidden="true">${symbol}</span><span class="uno-card-center" aria-hidden="true">${symbol}</span><span class="uno-card-color" aria-hidden="true">${colors[card.color] || 'ĐỔI MÀU'}</span>`;
  }

  window.ArcadeGames.uno = function (host, options = {}) {
    const L = window.ArcadeUno;
    const scope = S.createScope();
    let state = L.createGame();
    let started = false, finished = false, armed = false, choosing = null, handKey = '';
    let lastAction = 'Bài đã chia. Bạn đi trước!', history = [];
    const ui = S.buildUI(host, {
      className: 'uno-workspace',
      toolbar: '<div class="uno-heading"><span>MỘT LÁ NỮA THÔI!</span><strong>UNO<span class="uno-heading-dot">.</span></strong></div><div class="uno-mode-note"><strong>Bạn + 3 máy</strong><span>7 lá mỗi người · 1 ván</span></div>',
      board: `<div class="uno-playfield">
        <div class="uno-table">
          <div class="uno-opponents">${[1, 2, 3].map((p) => `<div class="uno-opponent" data-player="${p}"><span class="uno-avatar" aria-hidden="true">${p}</span><strong>${names[p]}</strong><span class="uno-opponent-count"></span><small class="uno-opponent-turn"></small></div>`).join('')}</div>
          <div class="uno-table-label"><span data-uno-turn></span><span class="uno-direction" data-uno-direction></span></div>
          <div class="uno-piles">
            <div class="uno-pile"><button type="button" class="uno-card uno-card-back" data-uno-draw aria-label="Rút một lá bài"><span aria-hidden="true">UNO</span></button><span data-uno-deck-count></span><small>RÚT BÀI</small></div>
            <div class="uno-pile"><div class="uno-card uno-discard" data-uno-discard role="img"></div><span class="uno-current-color" data-uno-current-color></span><small>LÁ TRÊN BÀN</small></div>
          </div>
          <p class="uno-last-action" aria-live="polite"></p>
        </div>
        <div class="uno-color-picker" role="group" aria-label="Chọn màu cho lá bài" hidden>
          <strong>Chọn màu tiếp theo</strong><span>Lá bài chỉ được đánh sau khi bạn chọn màu.</span>
          <div class="uno-color-options">${Object.entries(colors).map(([key, label]) => `<button type="button" data-uno-color="${key}" class="uno-color-${key}">${label}</button>`).join('')}</div>
          <button type="button" class="uno-text-button" data-uno-cancel>Hủy chọn</button>
        </div>
        <div class="uno-hand-heading"><strong>Bài của bạn <span data-uno-hand-count></span></strong><small data-uno-hand-hint></small></div>
        <div class="uno-hand" role="group" aria-label="Bài của bạn"></div>
      </div>`,
      controls: '<button type="button" class="control-button uno-pass" data-uno-pass>Giữ lá · Qua lượt</button><button type="button" class="control-button uno-call" data-uno-call aria-pressed="false">Hô UNO!</button><details class="uno-history"><summary>Diễn biến ván</summary><ol></ol></details>',
      status: 'Đánh lá cùng màu, cùng số hoặc cùng ký hiệu. Lá có viền sáng là lá bạn có thể đánh.',
    });
    const hand = ui.area.querySelector('.uno-hand');
    const picker = ui.area.querySelector('.uno-color-picker');
    const drawButton = ui.area.querySelector('[data-uno-draw]');
    const passButton = ui.controls.querySelector('[data-uno-pass]');
    const callButton = ui.controls.querySelector('[data-uno-call]');
    const discard = ui.area.querySelector('[data-uno-discard]');
    const $ = (selector) => ui.workspace.querySelector(selector);
    const canAct = () => started && !finished && state.current === 0 && !choosing;

    function remember(message) {
      lastAction = message;
      history.push(message);
      history = history.slice(-12);
      const list = $('.uno-history ol');
      list.replaceChildren(...history.map((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    }

    function render() {
      const legal = new Set(canAct() ? L.legalCards(state, 0) : []);
      const cards = state.hands[0];
      const focusedId = document.activeElement?.dataset.unoCard;
      const nextKey = cards.map((card) => card.id).join('|');
      if (nextKey !== handKey) {
        handKey = nextKey;
        hand.replaceChildren(...cards.map((card) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.unoCard = card.id;
          button.className = `uno-card uno-color-${card.color || 'wild'}`;
          button.innerHTML = face(card);
          return button;
        }));
      }
      for (const card of cards) {
        const button = [...hand.children].find((el) => el.dataset.unoCard === card.id);
        const allowed = legal.has(card.id);
        button.disabled = !allowed;
        button.classList.toggle('is-playable', allowed);
        button.classList.toggle('is-drawn', state.drawnId === card.id);
        button.setAttribute('aria-label', `${cardName(card)}${state.drawnId === card.id ? ', vừa rút' : ''}${allowed ? ', có thể đánh' : ''}`);
        button.title = card.value === 'wild4' && !allowed && canAct()
          ? 'Chỉ dùng +4 khi không còn lá cùng màu hiện tại.' : cardName(card);
      }
      if (focusedId && !choosing) {
        const target = [...hand.children].find((el) => el.dataset.unoCard === focusedId && !el.disabled);
        (target || hand.querySelector('button:not(:disabled)') || (canAct() ? drawButton : ui.workspace)).focus({ preventScroll: true });
      }
      const top = state.discard[state.discard.length - 1];
      discard.className = `uno-card uno-discard uno-color-${top.color || 'wild'}`;
      discard.innerHTML = face(top);
      discard.setAttribute('aria-label', `Lá trên bàn: ${cardName(top)}. Màu hiện tại: ${colors[state.color]}`);
      const currentColor = $('[data-uno-current-color]');
      currentColor.textContent = colors[state.color];
      currentColor.dataset.color = state.color;
      $('[data-uno-turn]').textContent = !started ? 'Sẵn sàng vào bàn' : finished ? 'Ván đã kết thúc' : state.current === 0 ? 'Lượt của bạn' : `Lượt ${names[state.current]}`;
      $('[data-uno-direction]').textContent = state.direction === 1 ? '↻ Thuận chiều' : '↺ Ngược chiều';
      $('[data-uno-deck-count]').textContent = `${state.deck.length} lá`;
      $('[data-uno-hand-count]').textContent = `· ${cards.length} lá`;
      $('[data-uno-hand-hint]').textContent = choosing ? 'Chọn màu phía trên' : !canAct() ? 'Chờ lượt của bạn' : state.phase === 'drawn' ? 'Đánh lá vừa rút hoặc giữ lá' : legal.size ? 'Chọn lá có viền sáng' : 'Chạm chồng bài để rút 1 lá';
      $('.uno-last-action').textContent = lastAction;
      for (const player of [1, 2, 3]) {
        const opponent = $(`.uno-opponent[data-player="${player}"]`);
        const active = started && !finished && state.current === player;
        opponent.classList.toggle('is-active', active);
        opponent.querySelector('.uno-opponent-count').textContent = `${state.hands[player].length} lá${state.hands[player].length === 1 && state.unoCalled[player] ? ' · UNO!' : ''}`;
        opponent.querySelector('.uno-opponent-turn').textContent = active ? 'Đang nghĩ…' : 'Máy';
      }
      drawButton.disabled = !canAct() || state.phase !== 'play';
      drawButton.classList.toggle('is-playable', !drawButton.disabled);
      passButton.disabled = !canAct() || state.phase !== 'drawn';
      const canCall = started && !finished && (state.unoPending === 0 || (state.current === 0 && cards.length === 2));
      callButton.disabled = !canCall;
      callButton.setAttribute('aria-pressed', String(armed));
      callButton.classList.toggle('needs-uno', state.unoPending === 0);
      callButton.textContent = armed ? 'Đã hô UNO! ✓' : state.unoPending === 0 ? 'Hô UNO ngay!' : 'Hô UNO!';
      picker.hidden = !choosing;
      ui.workspace.dataset.current = String(state.current);
      ui.workspace.dataset.phase = state.phase;
      ui.workspace.dataset.turn = String(state.turn);
      ui.workspace.dataset.winner = state.winner == null ? '' : String(state.winner);
      ui.message(!started ? 'Hết bài trước ba đối thủ để thắng ván.' : finished ? 'Chọn Chơi thêm ván nữa để chia lại bài.' : state.unoPending === 0 ? 'Bạn còn 1 lá! Hô UNO trước khi máy bắt lỗi, nếu không sẽ phải rút 2 lá.' : armed ? 'Đã sẵn sàng hô UNO. Chọn lá bạn muốn đánh.' : choosing ? 'Chọn một trong bốn màu để hoàn tất lượt đánh.' : canAct() && state.phase === 'drawn' ? 'Bạn chỉ được đánh lá vừa rút. Có thể chọn Giữ lá · Qua lượt.' : canAct() && cards.length === 2 ? 'Còn 2 lá: bấm Hô UNO! trước khi đánh để không bị phạt.' : 'Đánh cùng màu hoặc cùng số/ký hiệu. Không cộng dồn +2/+4. Phím D: rút bài · U: hô UNO.');
    }

    function showResult() {
      if (finished || state.phase !== 'finished') return;
      finished = true;
      scope.clearTimers();
      choosing = null;
      render();
      const draw = state.winner === -1;
      S.result(ui, scope, {
        title: draw ? 'Ván hòa' : state.winner === 0 ? 'UNO! Bạn thắng rồi' : `${names[state.winner]} đã hết bài`,
        detail: draw ? 'Không còn bài để rút và cả bàn không thể đánh tiếp.' : `${names[state.winner]} nhận ${state.score} điểm từ bài còn lại của ba người chơi. ${state.winner === 0 ? 'Một ván bài thật khéo!' : 'Chia lại bài và thử một chiến thuật mới nhé.'}`,
        score: state.winner === 0 ? state.score : 0,
        win: state.winner === 0,
        onScore: options.onScore,
        onAgain: restart,
      });
    }

    function action(player, command) {
      if (!started || finished) return false;
      let result, message;
      if (command.type === 'play') {
        const card = state.hands[player].find((item) => item.id === command.cardId);
        if (!card) return false;
        const next = (player + state.direction + 4) % 4;
        result = L.play(state, player, card.id, { color: command.color, uno: command.uno });
        message = `${names[player]} đánh ${cardName(card)}`;
        if (!card.color) message += `, chọn ${colors[command.color]}`;
        if (card.value === 'skip') message += ` — ${names[next]} mất lượt`;
        if (card.value === 'draw2' || card.value === 'wild4') message += ` — ${names[next]} rút ${card.value === 'draw2' ? 2 : 4} lá và mất lượt`;
        if (command.uno && state.hands[player].length === 1) message += ' · UNO!';
      } else if (command.type === 'draw') {
        const before = state.hands[player].length;
        result = L.draw(state, player);
        message = `${names[player]} ${state.hands[player].length > before ? 'rút 1 lá' : 'không còn bài để rút'}`;
        if (state.current !== player) message += ' · Qua lượt';
      } else if (command.type === 'pass') {
        result = L.pass(state, player);
        message = `${names[player]} giữ lá vừa rút · Qua lượt`;
      } else return false;
      if (!result.ok) {
        ui.message('Thao tác chưa hợp lệ. Hãy chọn lá có viền sáng hoặc rút bài khi đến lượt.');
        return false;
      }
      choosing = null;
      if (player === 0) armed = false;
      remember(message + '.');
      render();
      showResult();
      scheduleBot();
      return true;
    }

    function scheduleBot() {
      scope.clearTimers();
      if (!started || finished || state.current === 0) return;
      // Game-time timers also pause the UNO response window when the tab is hidden.
      scope.after(state.unoPending === 0 ? 3 : 0.85, () => {
        if (state.unoPending === 0) {
          const result = L.catchUno(state, state.current);
          if (result.ok) remember('Bạn quên hô UNO và bị máy bắt lỗi: rút thêm 2 lá.');
          render();
          scheduleBot();
          return;
        }
        action(state.current, L.chooseBotAction(state));
      });
    }

    function selectCard(id) {
      if (!canAct() || !L.legalCards(state, 0).includes(id)) return;
      const card = state.hands[0].find((item) => item.id === id);
      if (!card.color) {
        choosing = id;
        render();
        picker.querySelector('[data-uno-color]').focus({ preventScroll: true });
        picker.scrollIntoView({ block: 'nearest' });
      } else action(0, { type: 'play', cardId: id, uno: armed });
    }

    function callUno() {
      if (callButton.disabled) return;
      if (state.unoPending === 0) {
        if (!L.callUno(state, 0).ok) return;
        armed = false;
        remember('Bạn hô UNO! Còn một lá để chiến thắng.');
        render();
        scheduleBot();
      } else {
        armed = !armed;
        render();
      }
    }

    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createGame();
      started = true;
      finished = false;
      choosing = null;
      armed = false;
      history = [];
      remember('Ván mới: mỗi người 7 lá. Bạn đi trước!');
      render();
      ui.workspace.focus({ preventScroll: true });
      scheduleBot();
    }
    scope.on(hand, 'click', (event) => {
      const button = event.target.closest('[data-uno-card]');
      if (button && !button.disabled) selectCard(button.dataset.unoCard);
    });
    scope.on(drawButton, 'click', () => { if (canAct()) action(0, { type: 'draw' }); });
    scope.on(passButton, 'click', () => { if (canAct()) action(0, { type: 'pass' }); });
    scope.on(callButton, 'click', callUno);
    scope.on(picker, 'click', (event) => {
      if (!choosing) return;
      const color = event.target.closest('[data-uno-color]');
      if (color) {
        action(0, { type: 'play', cardId: choosing, color: color.dataset.unoColor, uno: armed });
        if (!finished) ui.workspace.focus({ preventScroll: true });
      } else if (event.target.closest('[data-uno-cancel]')) {
        const id = choosing;
        choosing = null;
        render();
        [...hand.children].find((button) => button.dataset.unoCard === id)?.focus({ preventScroll: true });
      }
    });
    scope.on(ui.workspace, 'keydown', (event) => {
      if (event.repeat) return;
      const key = S.gameKey(event);
      if (key === 'u' && !callButton.disabled) { event.preventDefault(); callUno(); }
      if (key === 'd' && !drawButton.disabled) { event.preventDefault(); action(0, { type: 'draw' }); }
    });
    render();
    S.intro(ui, scope, {
      title: 'UNO · Bốn màu, một cuộc đua',
      detail: 'Bạn đấu với 3 máy. Đánh lá cùng màu, số hoặc ký hiệu; hết bài trước là thắng. Hô UNO khi còn một lá! Không cộng dồn +2/+4.',
      symbol: 'cards',
      onStart() { started = true; render(); scheduleBot(); },
    });
    return S.handle(scope, restart);
  };
})();
