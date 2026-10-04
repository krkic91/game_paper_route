// version v1.0
(function () {
  'use strict';
  const O = window.CaroOnline;
  function clearInvite() {
    const [route, query = ''] = location.hash.split('?');
    const params = new URLSearchParams(query);
    params.delete('room');
    history.replaceState(null, '', `${location.pathname}${location.search}${route}${params.size ? `?${params}` : ''}`);
  }
  function confirmLeave() {
    const room = O.getState().room;
    return room?.status !== 'playing' ||
      window.confirm('Rời phòng lúc này sẽ tính là bỏ cuộc. Bạn muốn rời phòng?');
  }
  function status(snapshot) {
    const { room, you, connection, pendingIndex, error } = snapshot;
    if (error) return error;
    if (connection === 'replaced') return 'Phiên chơi đã được mở ở cửa sổ khác.';
    if (connection === 'reconnecting') return 'Mất kết nối. Đang tự kết nối lại…';
    if (connection === 'connecting') return 'Đang kết nối phòng chơi…';
    if (!room) return 'Tạo phòng hoặc nhập mã để chơi với bạn bè trên thiết bị khác.';
    if (connection !== 'connected') return 'Chưa kết nối máy chủ. Bạn có thể thử kết nối lại.';
    const me = room.players[you?.seat];
    const other = room.players.find((player) => player && player.seat !== you?.seat);
    if (room.status === 'finished') {
      const winner = room.players.find((player) => player?.mark === room.outcome?.winner);
      const result = winner ? `${winner.name} thắng!` : 'Ván đấu kết thúc hòa.';
      const reason = room.outcome?.reason === 'leave' ? ' Đối thủ đã rời phòng.' :
        room.outcome?.reason === 'timeout' ? ' Đã hết thời gian chờ kết nối lại.' : '';
      if (other?.left) return `${result}${reason} Hãy rời phòng để tạo ván mới.`;
      return `${result}${reason} ${me?.rematch ? 'Đang chờ đối thủ đồng ý chơi tiếp.' : 'Cả hai chọn Chơi tiếp để mở ván mới.'}`;
    }
    if (room.players.some((player) => player && !player.connected))
      return 'Đối thủ mất kết nối. Giữ chỗ tối đa 90 giây; bàn cờ đang chờ kết nối lại.';
    if (room.status === 'waiting') {
      if (!other) return 'Đang chờ người thứ hai. Gửi mã hoặc link mời cho bạn của bạn.';
      return me?.ready ? 'Bạn đã sẵn sàng. Đang chờ đối thủ.' : 'Đã đủ hai người. Chọn Sẵn sàng để bắt đầu.';
    }
    if (pendingIndex !== null && pendingIndex !== undefined) return 'Đang gửi nước đi…';
    return room.game.turn === you?.mark ? 'Lượt của bạn. Nối 5 quân liên tiếp để thắng.' : 'Đang chờ đối thủ đánh.';
  }
  function mount(ui, scope) {
    const panel = document.createElement('section');
    panel.className = 'caro-online-panel';
    panel.setAttribute('aria-label', 'Phòng Caro online');
    panel.hidden = true;
    panel.innerHTML = `
      <div class="online-lobby" data-online-lobby>
        <label class="online-field">Tên của bạn<input data-online-name maxlength="24" autocomplete="nickname" placeholder="Nhập tên hiển thị" /></label>
        <div class="online-lobby-actions">
          <button type="button" class="button button-primary" data-online-create>Tạo phòng</button>
          <label class="online-field online-code-field">Mã phòng<input data-online-code maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC234" /></label>
          <button type="button" class="button button-secondary" data-online-join>Vào phòng</button>
        </div>
      </div>
      <div data-online-room hidden>
        <div class="online-room-top"><span>PHÒNG <strong data-online-room-code></strong></span><span data-online-connection></span></div>
        <div class="online-players" data-online-players></div>
        <div class="online-invite"><label class="sr-only" for="caro-invite-link">Link mời vào phòng</label><input id="caro-invite-link" data-online-link readonly /><button type="button" class="button button-secondary" data-online-copy>Sao chép link</button></div>
        <div class="online-room-actions">
          <button type="button" class="button button-primary" data-online-ready>Sẵn sàng</button>
          <button type="button" class="button button-primary" data-online-rematch hidden>Chơi tiếp · đổi X/O</button>
          <button type="button" class="button button-secondary" data-online-leave>Rời phòng</button>
        </div>
      </div>
      <p class="online-message" data-online-message role="status" aria-live="polite"></p>
      <button type="button" class="button button-secondary" data-online-retry hidden>Kết nối lại</button>`;
    ui.toolbar.after(panel);
    const get = (selector) => panel.querySelector(selector);
    const nickname = get('[data-online-name]');
    const code = get('[data-online-code]');
    nickname.value = O.getName?.() || '';
    code.value = O.getInviteCode();
    const message = get('[data-online-message]');
    const run = (action) => {
      message.textContent = '';
      Promise.resolve().then(action).catch((error) => { message.textContent = error.message; });
    };
    const name = () => {
      const value = nickname.value.trim();
      if (!value) {
        nickname.focus();
        throw new Error('Nhập tên của bạn trước khi vào phòng.');
      }
      return value;
    };
    const join = () => {
      const value = code.value.trim().toUpperCase();
      if (!/^[A-Z2-9]{6}$/.test(value)) {
        code.focus();
        throw new Error('Mã phòng gồm 6 ký tự chữ hoặc số từ 2 đến 9.');
      }
      return O.join(value, name());
    };
    scope.on(get('[data-online-create]'), 'click', () => run(() => O.create(name())), true);
    scope.on(get('[data-online-join]'), 'click', () => run(join), true);
    scope.on(code, 'input', () => { code.value = code.value.toUpperCase(); }, true);
    scope.on(code, 'keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); run(join); }
    }, true);
    scope.on(get('[data-online-ready]'), 'click', () => run(() => O.ready()), true);
    scope.on(get('[data-online-rematch]'), 'click', () => run(() => O.rematch()), true);
    scope.on(get('[data-online-retry]'), 'click', () => run(() => O.retry()), true);
    scope.on(get('[data-online-leave]'), 'click', () => {
      if (confirmLeave()) { clearInvite(); run(() => O.leave()); }
    }, true);
    scope.on(get('[data-online-copy]'), 'click', () => run(async () => {
      const input = get('[data-online-link]');
      try {
        await navigator.clipboard.writeText(input.value);
        message.textContent = 'Đã sao chép link mời.';
      } catch {
        input.focus(); input.select();
        message.textContent = 'Link đã được chọn. Sao chép rồi gửi cho bạn của bạn.';
      }
    }), true);
    function render(snapshot) {
      const { room, you, pending, connection, session } = snapshot;
      const connected = connection === 'connected';
      const occupied = Boolean(room || session);
      get('[data-online-lobby]').hidden = occupied;
      get('[data-online-room]').hidden = !room;
      get('[data-online-create]').disabled = pending;
      get('[data-online-join]').disabled = pending;
      message.textContent = status(snapshot);
      get('[data-online-retry]').hidden = !['reconnecting', 'unavailable', 'replaced'].includes(connection);
      if (!room) return;
      get('[data-online-room-code]').textContent = room.code;
      get('[data-online-link]').value = O.inviteLink(room.code);
      get('[data-online-connection]').textContent = connected ? 'Đã kết nối' : 'Đang kết nối lại…';
      const players = get('[data-online-players]');
      players.replaceChildren();
      for (let seat = 0; seat < 2; seat++) {
        const player = room.players[seat];
        const item = document.createElement('div');
        item.className = `online-player${seat === you?.seat ? ' is-you' : ''}`;
        const title = document.createElement('strong');
        const detail = document.createElement('span');
        title.textContent = player ? `${player.mark === 1 ? 'X' : 'O'} · ${player.name}${seat === you?.seat ? ' (Bạn)' : ''}` : 'Đang chờ người chơi';
        detail.textContent = !player ? 'Gửi link mời để cùng chơi' : player.left ? 'Đã rời phòng' :
          !player.connected ? 'Mất kết nối' : room.status === 'waiting' ? (player.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng') :
          room.status === 'finished' ? (player.rematch ? 'Muốn chơi tiếp' : 'Đã kết thúc ván') :
          room.game.turn === player.mark ? 'Đang đến lượt' : 'Chờ lượt';
        item.append(title, detail); players.append(item);
      }
      const me = room.players[you?.seat];
      const both = room.players.every((player) => player?.connected && !player.left);
      const ready = get('[data-online-ready]');
      ready.hidden = room.status !== 'waiting';
      ready.disabled = !connected || pending || !both || Boolean(me?.ready);
      ready.textContent = me?.ready ? 'Đã sẵn sàng' : 'Sẵn sàng';
      const rematch = get('[data-online-rematch]');
      rematch.hidden = room.status !== 'finished';
      rematch.disabled = !connected || pending || !both || Boolean(me?.rematch);
      rematch.textContent = me?.rematch ? 'Đang chờ đối thủ…' : 'Chơi tiếp · đổi X/O';
    }
    return {
      render,
      setVisible(value) { panel.hidden = !value; ui.workspace.classList.toggle('is-online', value); },
    };
  }
  window.CaroOnlineUI = { mount, status, confirmLeave, clearInvite };
})();
