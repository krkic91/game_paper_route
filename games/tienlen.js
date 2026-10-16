// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const names = ['Bạn', 'Máy 1', 'Máy 2', 'Máy 3'];
  window.ArcadeGames.tienlen = function (host, options = {}) {
    const L = window.ArcadeTienLen, scope = S.createScope();
    let state = L.createGame(), started = false, finished = false, sortBySuit = false;
    let selection = new Set(), history = [], handKey = '';
    const ui = S.buildUI(host, {
      className: 'tienlen-workspace',
      toolbar: '<div class="tl-heading"><span>BÀN BÀI BỐN NGƯỜI</span><strong>Tiến lên <em>miền Nam</em></strong></div><div class="tl-mode"><strong>Bạn + 3 máy</strong><span>13 lá · Hết bài trước thắng</span></div>',
      board: `<div class="tl-playfield">
        <div class="tl-table">
          <div class="tl-opponents">${[1, 2, 3].map(player => `<div class="tl-opponent" data-tl-player="${player}"><span class="tl-avatar" aria-hidden="true">${player}</span><strong>${names[player]}</strong><span data-tl-count></span><small data-tl-player-status></small></div>`).join('')}</div>
          <div class="tl-turn-line"><strong data-tl-turn></strong><span data-tl-round></span></div>
          <div class="tl-trick" role="group" aria-label="Bộ bài trên bàn"></div>
          <p class="tl-trick-name" data-tl-trick-name></p>
          <p class="tl-last-action" aria-live="polite"></p>
        </div>
        <div class="tl-hand-heading"><strong>Bài của bạn <span data-tl-hand-count></span></strong><small>Chạm để chọn nhiều lá</small></div>
        <div class="tl-hand" role="group" aria-label="Bài của bạn"></div>
        <p class="tl-selection" data-tl-selection aria-live="polite"></p>
      </div>`,
      controls: '<button type="button" class="control-button tl-play" data-tl-play>Đánh bài</button><button type="button" class="control-button" data-tl-pass>Bỏ lượt</button><button type="button" class="control-button" data-tl-hint>Gợi ý</button><button type="button" class="control-button" data-tl-sort>Sắp xếp: số</button><details class="tl-details tl-history"><summary>Diễn biến ván</summary><ol></ol></details><details class="tl-details tl-rules"><summary>Luật bàn này</summary><p>Thứ tự: 3 → 4 → … → A → 2; bích ♠ &lt; tép ♣ &lt; rô ♦ &lt; cơ ♥. Mỗi ván bắt đầu bằng bộ chứa 3 bích. Chặn bằng bộ cùng loại, cùng số lá và lớn hơn; sảnh và đôi thông không chứa 2.</p><p>Ba đôi thông chặt 1 lá 2. Tứ quý chặt 1 lá 2, đôi 2 hoặc ba đôi thông. Bốn đôi thông chặt các bộ trên và tứ quý. Cùng loại chặt bằng bộ lớn hơn. Chỉ chặt khi đến lượt; bỏ lượt thì chờ vòng mới.</p><p>Ván kết thúc ngay khi một người hết bài. Không xét tới trắng, cóng hoặc phạt thối 2; không cược. Thắng được 100 điểm.</p></details>',
      status: 'Chọn một hoặc nhiều lá rồi bấm Đánh bài. Bạn có thể dùng Gợi ý để chọn một bộ hợp lệ.',
    });
    const $ = selector => ui.workspace.querySelector(selector);
    const hand = $('.tl-hand'), trick = $('.tl-trick');
    const playButton = $('[data-tl-play]'), passButton = $('[data-tl-pass]'), hintButton = $('[data-tl-hint]');
    const canAct = () => started && !finished && state.current === 0 && !state.passed[0];

    function face(card) {
      return `<span class="tl-card-corner" aria-hidden="true">${L.RANKS[card.rank]}<small>${L.SUITS[card.suit]}</small></span><span class="tl-card-suit" aria-hidden="true">${L.SUITS[card.suit]}</span><span class="tl-card-bottom" aria-hidden="true">${L.RANKS[card.rank]}</span>`;
    }
    function cardElement(card, button) {
      const element = document.createElement(button ? 'button' : 'span');
      element.className = `tl-card${card.suit > 1 ? ' tl-card-red' : ''}`;
      element.innerHTML = face(card);
      element.setAttribute('aria-label', L.cardName(card));
      if (button) { element.type = 'button'; element.dataset.tlCard = card.id; }
      else element.setAttribute('role', 'img');
      return element;
    }
    function remember(message) {
      history.push(message);
      history = history.slice(-12);
      $('.tl-last-action').textContent = message;
      $('.tl-history ol').replaceChildren(...history.map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    }
    function selectedMove() {
      const cards = state.hands[0].filter(card => selection.has(card.id));
      const combo = L.classify(cards);
      const legal = Boolean(combo && (!state.opening || selection.has('tl-0-0')) && L.beats(combo, state.trick && state.trick.combo));
      return { cards, combo, legal };
    }
    function renderSelection() {
      const { cards, combo, legal } = selectedMove();
      for (const button of hand.children) {
        const selected = selection.has(button.dataset.tlCard);
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
        button.disabled = !canAct();
      }
      playButton.disabled = !canAct() || !legal;
      const preview = $('[data-tl-selection]');
      preview.classList.toggle('is-valid', canAct() && legal);
      preview.textContent = !canAct() ? state.passed[0] ? 'Bạn đã bỏ lượt · Chờ vòng bài mới' : started && !finished ? 'Đợi đến lượt của bạn' : 'Chọn bộ bài khi đến lượt' :
        !cards.length ? state.opening ? 'Lượt đầu: chọn bộ có 3 bích' : state.trick ? 'Chọn bộ để chặn, hoặc bỏ lượt' : 'Bạn mở vòng · Chọn bộ bất kỳ' :
        !combo ? `${cards.length} lá đã chọn · Chưa thành bộ hợp lệ` :
        state.opening && !selection.has('tl-0-0') ? `${L.comboName(combo)} · Cần có 3 bích ở lượt đầu` :
        `${L.comboName(combo)} · ${cards.length} lá · ${legal ? 'Có thể đánh' : 'Chưa chặn được bài trên bàn'}`;
    }
    function render() {
      const focusedId = document.activeElement?.dataset.tlCard;
      const cards = state.hands[0].slice().sort(sortBySuit ? (a, b) => a.suit - b.suit || L.order(a, b) : L.order);
      const nextKey = cards.map(card => card.id).join('|');
      if (nextKey !== handKey) {
        handKey = nextKey;
        hand.replaceChildren(...cards.map(card => cardElement(card, true)));
      }
      renderSelection();
      if (focusedId) {
        const target = [...hand.children].find(button => button.dataset.tlCard === focusedId && !button.disabled);
        (target || ui.workspace).focus({ preventScroll: true });
      }
      for (const player of [1, 2, 3]) {
        const element = $(`[data-tl-player="${player}"]`);
        element.classList.toggle('is-active', started && !finished && state.current === player);
        element.classList.toggle('has-passed', state.passed[player]);
        element.querySelector('[data-tl-count]').textContent = `${state.hands[player].length} lá`;
        element.querySelector('[data-tl-player-status]').textContent = finished && state.winner === player ? 'Thắng ván!' : state.passed[player] ? 'Đã bỏ lượt' : started && !finished && state.current === player ? 'Đang nghĩ…' : 'Máy';
      }
      $('[data-tl-hand-count]').textContent = `· ${cards.length} lá`;
      $('[data-tl-turn]').textContent = !started ? 'Sẵn sàng chia bài' : finished ? 'Ván đã kết thúc' : state.current === 0 ? 'Lượt của bạn' : `Lượt ${names[state.current]}`;
      $('[data-tl-round]').textContent = `Vòng ${state.trickNumber} · ↻`;
      if (state.trick) {
        trick.replaceChildren(...state.trick.cards.map(card => cardElement(card, false)));
        $('[data-tl-trick-name]').textContent = `${names[state.trick.player]} · ${L.comboName(state.trick.combo)}`;
      } else {
        trick.innerHTML = '<span class="tl-empty-table" aria-hidden="true">♠ <span>♥</span> ♣ <span>♦</span></span>';
        $('[data-tl-trick-name]').textContent = state.opening ? 'Mở bàn bằng 3 bích' : `${names[state.current]} được mở vòng mới`;
      }
      passButton.disabled = !canAct() || !state.trick;
      hintButton.disabled = !canAct();
      $('[data-tl-sort]').disabled = !started || finished;
      $('[data-tl-sort]').textContent = sortBySuit ? 'Sắp xếp: chất' : 'Sắp xếp: số';
      ui.workspace.dataset.current = String(state.current);
      ui.workspace.dataset.phase = state.phase;
      ui.workspace.dataset.started = String(started);
      ui.workspace.dataset.turn = String(state.turn);
      ui.workspace.dataset.winner = state.winner == null ? '' : String(state.winner);
      ui.message(!started ? 'Một bàn bài, bốn người chơi. Hết 13 lá trước để thắng.' : finished ? 'Chơi thêm ván nữa để chia lại bộ bài.' : canAct() ? state.opening ? 'Bạn giữ 3 bích và đi trước. Bộ mở đầu phải có lá này.' : state.trick ? 'Đánh bộ lớn hơn cùng loại và số lá, hoặc dùng bộ chặt theo luật bàn này.' : 'Bạn thắng vòng trước. Được mở vòng mới với bộ bất kỳ.' : state.passed[0] ? 'Bạn đã bỏ lượt và sẽ được chơi lại ở vòng bài mới.' : 'Máy đang chọn bài. Bài của mỗi đối thủ được giữ kín.');
    }
    function showResult() {
      if (finished || state.phase !== 'finished') return;
      finished = true;
      scope.clearTimers();
      render();
      S.result(ui, scope, {
        title: state.winner === 0 ? 'Bạn đã về nhất!' : `${names[state.winner]} đã hết bài`,
        detail: state.winner === 0 ? 'Bạn đã đánh hết 13 lá trước ba đối thủ. Thêm một ván để thử cách phối hợp bài khác nhé.' : `Bạn còn ${state.hands[0].length} lá. Mỗi lần chia lại là một cơ hội mới để giữ nhịp và chọn đúng thời điểm.`,
        score: state.winner === 0 ? 100 : 0,
        win: state.winner === 0,
        onScore: options.onScore,
        onAgain: restart,
      });
    }
    function action(player, command) {
      if (!started || finished) return false;
      const result = command.type === 'play' ? L.play(state, player, command.cardIds) : L.pass(state, player);
      if (!result.ok) { ui.message(result.error); return false; }
      selection.clear();
      for (const event of result.events) {
        if (event.type === 'play') remember(`${names[player]} đánh ${L.comboName(event.combo).toLowerCase()}: ${event.cards.map(card => `${L.RANKS[card.rank]}${L.SUITS[card.suit]}`).join(' ')}.`);
        if (event.type === 'pass') remember(`${names[player]} bỏ lượt.`);
        if (event.type === 'new-trick') remember(`Cả bàn bỏ lượt. ${names[event.player]} mở vòng ${state.trickNumber}.`);
      }
      render();
      showResult();
      scheduleBot();
      return true;
    }
    function scheduleBot() {
      scope.clearTimers();
      if (!started || finished || state.current === 0) return;
      scope.after(0.85, () => action(state.current, L.chooseMove(state)));
    }
    function hint() {
      if (!canAct()) return;
      const command = L.chooseMove(state, 0);
      selection = new Set(command.cardIds || []);
      renderSelection();
      ui.message(command.type === 'pass' ? 'Bạn chưa có bộ chặn hợp lệ. Bấm Bỏ lượt để tiếp tục.' : 'Đã chọn bộ gợi ý. Bấm Đánh bài, hoặc chạm các lá để đổi lựa chọn.');
    }
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createGame();
      started = true;
      finished = false;
      selection.clear();
      history = [];
      remember(`Ván mới: mỗi người 13 lá. ${names[state.current]} giữ 3 bích và đi trước.`);
      render();
      ui.workspace.focus({ preventScroll: true });
      scheduleBot();
    }
    scope.on(hand, 'click', event => {
      const button = event.target.closest('[data-tl-card]');
      if (!button || button.disabled || !canAct()) return;
      const id = button.dataset.tlCard;
      if (selection.has(id)) selection.delete(id);
      else selection.add(id);
      renderSelection();
    });
    scope.on(playButton, 'click', () => {
      if (canAct() && !playButton.disabled) action(0, { type: 'play', cardIds: [...selection] });
    });
    scope.on(passButton, 'click', () => { if (canAct() && !passButton.disabled) action(0, { type: 'pass' }); });
    scope.on(hintButton, 'click', hint);
    scope.on($('[data-tl-sort]'), 'click', () => { sortBySuit = !sortBySuit; render(); });
    render();
    S.intro(ui, scope, {
      title: 'Tiến lên miền Nam',
      detail: 'Bạn đấu với 3 máy, mỗi người 13 lá. Chọn lẻ, đôi, bộ ba, sảnh hoặc bộ chặt. Người có 3 bích mở đầu; hết bài trước là thắng. Bỏ lượt phải chờ vòng mới.',
      symbol: 'cards',
      onStart() {
        started = true;
        remember(`${names[state.current]} giữ 3 bích và mở đầu ván.`);
        render();
        scheduleBot();
      },
    });
    return S.handle(scope, restart);
  };
})();
