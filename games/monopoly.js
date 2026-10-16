// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const playerColors = ['#b9d68d', '#e5a181', '#90bdd9', '#c5a8df'];
  const symbols = { start: '↗', chance: '?', jail: 'Ⅱ', 'go-jail': '⇥', parking: '♧', tax: '−' };
  const money = amount => amount.toLocaleString('vi-VN');
  function cellPosition(index) {
    if (index <= 6) return [7, 7 - index];
    if (index <= 12) return [13 - index, 1];
    if (index <= 18) return [1, index - 11];
    return [index - 17, 7];
  }
  window.ArcadeGames.monopoly = function (host, options = {}) {
    const L = window.ArcadeMonopoly, scope = S.createScope();
    let state = L.createGame(), started = false, finished = false, busy = false, botPending = false;
    let selected = 0, fast = false, history = [], lastAction = 'Bốn người, một thành phố. Bạn đi trước!';
    const ui = S.buildUI(host, {
      className: 'monopoly-workspace',
      toolbar: '<div class="monopoly-heading"><span>THÀNH PHỐ TRONG TAY</span><strong>Cờ tỷ phú<span>.</span></strong></div><div class="monopoly-mode"><strong>Ván ngắn · 30 vòng</strong><span>Bạn + 3 máy · Xu trong game</span></div>',
      board: `<div class="monopoly-layout">
        <div class="monopoly-map-column"><div class="monopoly-board" role="group" aria-label="Bàn cờ 24 ô. Chọn ô để xem chi tiết.">
          ${L.BOARD.map(tile => {
            const [row, column] = cellPosition(tile.index), group = L.GROUPS[tile.group];
            return `<button type="button" class="monopoly-tile monopoly-tile-${tile.type}" data-monopoly-tile="${tile.index}" style="grid-row:${row};grid-column:${column};--district:${group?.color || '#738770'}"><span class="monopoly-tile-group" aria-hidden="true">${group?.code || symbols[tile.type]}</span><span class="monopoly-tile-name">${tile.name}</span><span class="monopoly-tile-value"></span><span class="monopoly-tokens" aria-hidden="true"></span></button>`;
          }).join('')}
          <div class="monopoly-center">
            <span class="monopoly-center-kicker">MỘT THÀNH PHỐ · BỐN ƯỚC MƠ</span>
            <div class="monopoly-city" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <strong class="monopoly-center-title">Xây phố.<br>Đón cơ hội.</strong>
            <span class="monopoly-round" data-monopoly-round></span>
            <div class="monopoly-dice" aria-label="Chưa gieo xúc xắc"><span>·</span><span>·</span></div>
            <strong class="monopoly-current" data-monopoly-current></strong>
            <small>Mỗi lượt gieo 1 lần, kể cả gieo đôi.</small>
          </div>
        </div><p class="monopoly-board-note">Chọn một ô để xem giá và tiền thuê. A–G là các nhóm đất.</p></div>
        <div class="monopoly-side">
          <div class="monopoly-players" aria-label="Tình hình người chơi"></div>
          <section class="monopoly-turn-panel" aria-label="Hành động trong lượt">
            <span class="monopoly-section-label">LƯỢT HIỆN TẠI</span><strong data-monopoly-prompt></strong><p data-monopoly-context></p>
            <div class="monopoly-actions">
              <button type="button" class="control-button monopoly-primary" data-monopoly-action="roll" data-monopoly-roll>Gieo xúc xắc</button>
              <button type="button" class="control-button monopoly-primary" data-monopoly-action="buy" data-monopoly-buy>Mua đất</button>
              <button type="button" class="control-button" data-monopoly-action="decline" data-monopoly-decline>Bỏ qua</button>
              <button type="button" class="control-button monopoly-primary" data-monopoly-action="end" data-monopoly-end>Kết thúc lượt</button>
              <button type="button" class="control-button" data-monopoly-action="bail" data-monopoly-bail>Rời tạm giữ · 50 xu</button>
            </div>
          </section>
          <section class="monopoly-detail" aria-label="Thông tin ô đất">
            <label for="monopoly-inspect">XEM Ô TRÊN BÀN</label>
            <select id="monopoly-inspect" data-monopoly-inspect>${L.BOARD.map(tile => `<option value="${tile.index}">${tile.index + 1}. ${tile.name}</option>`).join('')}</select>
            <div data-monopoly-detail></div>
            <button type="button" class="control-button" data-monopoly-action="upgrade" data-monopoly-upgrade>Nâng cấp</button>
          </section>
        </div>
        <p class="monopoly-last-action" aria-live="polite"></p>
      </div>`,
      controls: '<label class="monopoly-speed"><input type="checkbox" data-monopoly-fast> Máy đi nhanh</label><details class="monopoly-history"><summary>Diễn biến ván</summary><ol></ol></details><details class="monopoly-rules"><summary>Luật ván ngắn</summary><p>Mỗi người có 1.100 xu. Qua Khởi hành nhận 160 xu. Mua đủ 2 ô cùng nhóm để nhân đôi tiền thuê và xây tối đa 2 cấp. Tiền thuê cấp 1 / 2 bằng 4 / 7 lần giá thuê cơ bản. Hết 30 vòng, tổng tài sản cao nhất thắng; bằng điểm thì đồng hạng.</p><p>Mỗi lượt chỉ gieo một lần, kể cả gieo đôi. Khi bị tạm giữ, trả 50 xu trước khi gieo hoặc thử gieo đôi. Lần thử thứ hai không thành công: tự trả 50 xu rồi đi. Ghé ô Tạm giữ bình thường không bị giữ.</p><p>Thiếu tiền trả nợ: tự bán công trình trước, rồi bán đất về ngân hàng, hoàn lại 50% chi phí. Vẫn thiếu thì phá sản; chủ nợ chỉ nhận số xu thực trả. Không đấu giá, trao đổi hay thế chấp. Tổng tài sản tính theo giá mua đất và chi phí xây, cộng tiền đang có.</p></details>',
      status: 'Mua đất, hoàn thành các nhóm và giữ một khoản dự phòng cho tiền thuê.',
    });
    const $ = selector => ui.workspace.querySelector(selector);
    const tiles = [...ui.workspace.querySelectorAll('[data-monopoly-tile]')];
    const humanTurn = () => started && !finished && !busy && state.current === 0 && !state.players[0].bankrupt;

    function remember(events) {
      for (const event of events) if (event.text) history.push(event.text);
      history = history.slice(-24);
      if (events.length) lastAction = events[events.length - 1].text;
      $('.monopoly-history ol').replaceChildren(...history.map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    }
    function renderDetail() {
      const tile = L.BOARD[selected], deed = state.properties[selected], group = L.GROUPS[tile.group];
      $('[data-monopoly-inspect]').value = String(selected);
      const detail = $('[data-monopoly-detail]');
      if (tile.type === 'property') {
        const owner = deed.owner === null ? 'Chưa có chủ' : state.players[deed.owner].name;
        const full = deed.owner !== null && L.ownsGroup(state, deed.owner, tile.group);
        detail.innerHTML = `<div class="monopoly-detail-group" style="--district:${group.color}">Nhóm ${group.code} · ${group.name}</div><strong>${tile.name}</strong><p>${owner}${deed.level ? ` · Cấp ${deed.level}/2` : full ? ' · Đủ nhóm' : ''}</p><dl><div><dt>Giá mua</dt><dd>${money(tile.price)} xu</dd></div><div><dt>Thuê hiện tại</dt><dd>${money(deed.owner === null ? tile.rent : L.rent(state, selected))} xu</dd></div><div><dt>Thuê khi đủ nhóm</dt><dd>${tile.rent * 2} xu</dd></div><div><dt>Thuê cấp 1 / 2</dt><dd>${tile.rent * 4} / ${tile.rent * 7} xu</dd></div><div><dt>Mỗi lần xây</dt><dd>${tile.upgrade} xu</dd></div></dl>`;
        const upgradeButton = $('[data-monopoly-upgrade]');
        upgradeButton.hidden = deed.owner !== 0 || deed.level >= L.MAX_LEVEL;
        upgradeButton.disabled = !humanTurn() || !L.legalUpgrades(state, 0).includes(selected);
        upgradeButton.textContent = `Xây cấp ${deed.level + 1} · ${tile.upgrade} xu`;
        if (deed.owner === 0 && !full) detail.insertAdjacentHTML('beforeend', '<small>Cần sở hữu cả 2 ô cùng nhóm mới được xây.</small>');
      } else {
        const explanations = {
          start: 'Đi qua hoặc dừng tại đây nhận 160 xu một lần. Đi thẳng vào Tạm giữ không được nhận.',
          jail: 'Ghé thăm bình thường không mất lượt. Nếu bị đưa đến đây: trả 50 xu hoặc gieo đôi để rời đi. Sau 2 lần thử không thành công, tự trả 50 xu rồi đi.',
          parking: 'Một điểm nghỉ chân. Không thu phí, không có thưởng.',
          'go-jail': 'Di chuyển thẳng về Tạm giữ và kết thúc lượt. Không nhận tiền Khởi hành.',
          chance: 'Rút ngẫu nhiên một thẻ: nhận xu, trả phí, về Khởi hành hoặc vào Tạm giữ. Bộ 8 thẻ được xáo lại khi dùng hết.',
          tax: `Trả ${tile.amount} xu cho ngân hàng. Nếu thiếu tiền, tài sản được bán theo quy tắc trả nợ.`,
        };
        detail.innerHTML = `<strong>${tile.name}</strong><p>${explanations[tile.type]}</p>`;
        $('[data-monopoly-upgrade]').hidden = true;
      }
      for (const button of tiles) button.setAttribute('aria-pressed', String(Number(button.dataset.monopolyTile) === selected));
    }
    function render() {
      const person = state.players[state.current], myTurn = humanTurn();
      ui.workspace.dataset.current = String(state.current);
      ui.workspace.dataset.phase = state.phase;
      ui.workspace.dataset.round = String(state.round);
      ui.workspace.dataset.turn = String(state.turn);
      ui.workspace.dataset.busy = String(busy);
      ui.workspace.dataset.winner = state.winner === null ? '' : String(state.winner);
      ui.workspace.dataset.cash = String(state.players[0].cash);
      $('[data-monopoly-round]').textContent = `Vòng ${state.round} / ${state.maxRounds}`;
      $('[data-monopoly-current]').textContent = !started ? 'Sẵn sàng khởi hành' : finished ? 'Ván đã kết thúc' : `${state.current === 0 ? 'Lượt của bạn' : `Lượt ${person.name}`}${person.jailed ? ' · Tạm giữ' : ''}`;
      const dice = $('.monopoly-dice');
      dice.classList.toggle('is-rolling', busy);
      const glyphs = ['·', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      [...dice.children].forEach((el, index) => { el.textContent = glyphs[state.dice[index]]; });
      dice.setAttribute('aria-label', state.dice[0] ? `Xúc xắc: ${state.dice[0]} và ${state.dice[1]}` : 'Chưa gieo xúc xắc');
      $('.monopoly-players').innerHTML = state.players.map(player => {
        const count = state.properties.filter(deed => deed.owner === player.id).length;
        return `<div class="monopoly-player ${player.id === state.current && started && !finished ? 'is-current' : ''} ${player.bankrupt ? 'is-bankrupt' : ''}" data-monopoly-player="${player.id}" style="--player:${playerColors[player.id]}"><span class="monopoly-player-marker" aria-hidden="true">${player.id + 1}</span><strong>${player.name}</strong><b>${money(player.cash)}<small> xu</small></b><span>${player.bankrupt ? 'Phá sản' : `${count} đất${player.jailed ? ' · Tạm giữ' : ''}`}</span><small>Tài sản ${money(L.netWorth(state, player.id))}</small></div>`;
      }).join('');
      for (const tile of L.BOARD) {
        const button = tiles[tile.index], deed = state.properties[tile.index];
        const occupants = state.players.filter(player => !player.bankrupt && player.position === tile.index);
        button.classList.toggle('has-current', occupants.some(player => player.id === state.current) && started && !finished);
        button.style.setProperty('--owner', deed.owner === null ? 'transparent' : playerColors[deed.owner]);
        button.querySelector('.monopoly-tile-value').textContent = tile.type === 'property' ? deed.owner === null ? `${tile.price}` : `${deed.level ? '▰'.repeat(deed.level) + ' ' : ''}${state.players[deed.owner].id + 1}` : tile.type === 'tax' ? `−${tile.amount}` : tile.type === 'start' ? '+160' : '';
        button.querySelector('.monopoly-tokens').innerHTML = occupants.map(player => `<i style="--player:${playerColors[player.id]}">${player.id + 1}</i>`).join('');
        button.setAttribute('aria-label', `${tile.index + 1}. ${tile.name}${tile.type === 'property' ? `, nhóm ${L.GROUPS[tile.group].code}, ${deed.owner === null ? `giá ${tile.price} xu, chưa có chủ` : `chủ ${state.players[deed.owner].name}, thuê ${L.rent(state, tile.index)} xu`}` : ''}${occupants.length ? `, ${occupants.map(player => player.name).join(', ')} đang ở đây` : ''}`);
      }
      for (const action of ['roll', 'buy', 'decline', 'end', 'bail']) {
        const button = $(`[data-monopoly-action="${action}"]`);
        const visible = action === 'roll' ? state.phase === 'roll' : action === 'buy' || action === 'decline' ? state.phase === 'buy' : action === 'end' ? state.phase === 'end' : state.phase === 'roll' && person.jailed;
        button.hidden = !visible || state.current !== 0 || state.players[0].bankrupt;
        button.disabled = !myTurn || (action === 'buy' && state.players[0].cash < (L.BOARD[state.pending]?.price || 0)) || (action === 'bail' && state.players[0].cash < L.BAIL);
      }
      if (state.phase === 'buy') $('[data-monopoly-buy]').textContent = `Mua · ${L.BOARD[state.pending].price} xu`;
      let prompt = !started ? 'Khởi đầu với 1.100 xu' : finished ? 'Đã có kết quả' : state.current !== 0 || state.players[0].bankrupt ? `${person.name} đang ${state.phase === 'roll' ? 'chuẩn bị gieo' : state.phase === 'buy' ? 'cân nhắc mua đất' : 'hoàn tất lượt'}…` : busy ? 'Xúc xắc đang lăn…' : state.phase === 'buy' ? `Mua ${L.BOARD[state.pending].name}?` : state.phase === 'end' ? 'Bạn đã đi xong' : person.jailed ? 'Rời Tạm giữ' : 'Đến lượt bạn';
      let context = !started ? 'Mua đất, xây phố và trở thành người có tổng tài sản cao nhất sau 30 vòng.' : finished ? 'Tổng tài sản = xu đang có + giá mua đất + chi phí đã xây.' : state.players[0].bankrupt ? 'Bạn đã phá sản. Các máy tiếp tục chơi để xác định người thắng; có thể bật Máy đi nhanh.' : state.current !== 0 ? `Bạn đang có ${money(state.players[0].cash)} xu. Có thể xem thông tin các ô trong lúc chờ.` : state.phase === 'buy' ? `Tiền thuê cơ bản ${L.BOARD[state.pending].rent} xu. Bạn có ${money(person.cash)} xu.${person.cash < L.BOARD[state.pending].price ? ' Chưa đủ tiền mua, hãy chọn Bỏ qua.' : ''}` : person.jailed && state.phase === 'roll' ? `Trả 50 xu để rời ngay hoặc thử gieo đôi. Đã thử ${person.jailAttempts}/2 lần.` : state.phase === 'end' ? 'Có thể nâng cấp đất đủ nhóm trước khi kết thúc lượt.' : 'Gieo 2 xúc xắc để di chuyển. Giữ xu dự phòng cho phí và tiền thuê.';
      $('[data-monopoly-prompt]').textContent = prompt;
      $('[data-monopoly-context]').textContent = context;
      $('.monopoly-last-action').textContent = lastAction;
      renderDetail();
      ui.message(!started ? 'Bản ván ngắn có 24 ô, 7 nhóm đất; không đấu giá, giao dịch hay thế chấp.' : finished ? 'Chọn Chơi thêm ván nữa để khởi đầu một thành phố mới.' : lastAction);
    }
    function showResult() {
      if (finished || state.phase !== 'over') return;
      finished = true;
      render();
      const win = state.winners.includes(0);
      const ranking = state.ranking.map((entry, index) => `${index + 1}. ${state.players[entry.player].name}: ${money(entry.worth)} xu${entry.bankrupt ? ' (phá sản)' : ''}`).join('<br>');
      S.result(ui, scope, {
        title: win ? state.winners.length > 1 ? 'Bạn đồng hạng nhất!' : 'Thành phố thuộc về bạn!' : `${state.players[state.winner].name} thắng ván`,
        detail: `${state.reason === 'round-limit' ? `Đã hoàn thành ${state.maxRounds} vòng.` : 'Chỉ còn một người chưa phá sản.'}<br>${ranking}`,
        score: L.netWorth(state, 0), win, onAgain: restart, onScore: options.onScore,
      });
    }
    function scheduleBot() {
      if (!started || finished || busy || botPending || (state.current === 0 && !state.players[0].bankrupt)) return;
      botPending = true;
      scope.after(fast ? 0.16 : 0.75, () => {
        botPending = false;
        if (finished) return;
        const action = L.botAction(state);
        if (action) perform(action);
      });
    }
    function complete(action) {
      busy = false;
      const actor = state.current, result = L.act(state, actor, action);
      if (!result.ok) { ui.message(result.error); render(); return; }
      remember(result.events);
      if (action.type === 'roll') selected = state.players[actor].position;
      if (action.type === 'upgrade') selected = action.tile;
      render();
      showResult();
      scheduleBot();
    }
    function perform(action) {
      if (!started || finished || busy) return;
      if (action.type === 'roll') {
        busy = true;
        render();
        scope.after(fast ? 0.12 : 0.38, () => complete(action));
      } else complete(action);
    }
    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      state = L.createGame();
      started = true;
      finished = false;
      busy = false;
      botPending = false;
      selected = 0;
      history = [];
      lastAction = 'Thành phố đã sẵn sàng. Bạn đi trước!';
      remember([]);
      render();
    }
    scope.on(ui.workspace, 'click', event => {
      const tile = event.target.closest('[data-monopoly-tile]');
      if (tile) { selected = Number(tile.dataset.monopolyTile); renderDetail(); return; }
      const button = event.target.closest('[data-monopoly-action]');
      if (!button || button.disabled || !humanTurn()) return;
      perform({ type: button.dataset.monopolyAction, tile: selected });
    });
    scope.on($('[data-monopoly-inspect]'), 'change', event => {
      selected = Number(event.target.value);
      renderDetail();
    });
    scope.on($('[data-monopoly-fast]'), 'change', event => { fast = event.target.checked; });
    render();
    S.intro(ui, scope, {
      title: 'Xây một thành phố của riêng bạn', symbol: 'flag',
      detail: 'Bạn đấu với 3 máy trên bàn cờ 24 ô. Mua trọn nhóm đất, nâng cấp và thu tiền thuê. Sau 30 vòng, tổng tài sản cao nhất thắng. Toàn bộ xu chỉ dùng trong ván chơi.',
      onStart: () => { started = true; render(); },
    });
    return S.handle(scope, restart);
  };
})();
