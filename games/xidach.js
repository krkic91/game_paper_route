// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  const suits = { spades: ['♠', 'bích'], clubs: ['♣', 'tép'], diamonds: ['♦', 'rô'], hearts: ['♥', 'cơ'] };
  const labels = { xiban: 'Xì bàn', xidach: 'Xì dách', ngulinh: 'Ngũ linh', bust: 'Quắc', under: 'Chưa đủ 16 điểm', normal: 'Điểm thường' };
  const rankName = rank => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[rank] || String(rank);
  function cardMarkup(card) {
    if (!card) return '<div class="xidach-card xidach-card-back" role="img" aria-label="Lá bài úp"><span aria-hidden="true">✦</span></div>';
    const [symbol, name] = suits[card.suit], rank = rankName(card.rank);
    return `<div class="xidach-card ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'is-red' : ''}" role="img" aria-label="${rank} ${name}"><span class="xidach-corner" aria-hidden="true">${rank}<small>${symbol}</small></span><span class="xidach-pip" aria-hidden="true">${symbol}</span><span class="xidach-corner xidach-corner-bottom" aria-hidden="true">${rank}<small>${symbol}</small></span></div>`;
  }
  function valueLabel(value) {
    if (value.rank >= 2) return `${labels[value.type]} · ${value.points} điểm`;
    return `${value.total} điểm${value.bust ? ' · Quắc' : ''}`;
  }

  window.ArcadeGames.xidach = function (host, options = {}) {
    const L = window.ArcadeXiDach, scope = S.createScope();
    let state = L.createGame(), started = false, reported = false, pending = false;
    let rounds = 0, wins = 0, draws = 0;
    const ui = S.buildUI(host, {
      className: 'xidach-workspace',
      toolbar: '<div class="xidach-heading"><small>MỘT LÁ, MỘT QUYẾT ĐỊNH</small><strong>Xì dách<span>♠</span></strong></div><div class="xidach-session">' + S.stat('Thắng', 'xidach-wins', 0) + S.stat('Ván', 'xidach-rounds', 0) + '</div>',
      board: `<div class="xidach-playfield"><div class="xidach-table">
        <div class="xidach-seat xidach-seat-dealer"><div class="xidach-seat-title"><strong>Nhà cái <small>Máy</small></strong><span data-xidach-value="dealer"></span></div><div class="xidach-hand" data-xidach-hand="dealer" role="group" aria-label="Bài nhà cái"></div></div>
        <div class="xidach-table-middle"><span class="xidach-table-mark" aria-hidden="true">21</span><p data-xidach-phase></p><small>Nhà cái rút dưới 17 · Dừng từ 17</small></div>
        <div class="xidach-seat xidach-seat-player"><div class="xidach-seat-title"><strong>Bạn</strong><span data-xidach-value="player"></span></div><div class="xidach-hand" data-xidach-hand="player" role="group" aria-label="Bài của bạn"></div><p class="xidach-ace-note" data-xidach-ace></p></div>
      </div><div class="xidach-round-result" data-xidach-result role="status" aria-live="polite" hidden><strong></strong><p></p><button class="control-button" data-xidach-next type="button">Chia ván mới</button></div></div>`,
      controls: '<button type="button" class="control-button xidach-hit" data-xidach-hit>+ Rút bài</button><button type="button" class="control-button xidach-stand" data-xidach-stand>Dừng bài</button><details class="xidach-rules"><summary>Luật bàn chơi</summary><p>Xì bàn (2 A) &gt; Xì dách (A + 10/J/Q/K) &gt; Ngũ linh (5 lá không quá 21) &gt; điểm thường. Ngũ linh ít điểm hơn thắng; điểm thường cao hơn thắng. Cùng hạng và điểm thì hòa.</p><p>A tính 1, 10 hoặc 11. Cần ít nhất 16 điểm để dừng; đủ 21 hoặc 5 lá sẽ tự dừng. Quá 21 là quắc và thua ngay. Bài đặc biệt 2 lá được so ngay khi chia.</p><p>Nhà cái rút dưới 17, dừng từ 17 kể cả có A. Mỗi ván dùng bộ 52 lá mới; không cược tiền. Thắng được 100 điểm vào tổng điểm phiên.</p></details>',
      status: 'Rút thêm hay dừng lại? Đưa tổng điểm đến gần 21 mà không vượt quá.',
    });
    const $ = selector => ui.workspace.querySelector(selector);
    const hitButton = $('[data-xidach-hit]'), standButton = $('[data-xidach-stand]');
    const result = $('[data-xidach-result]');

    function render() {
      const view = L.publicState(state);
      ui.workspace.dataset.phase = started ? state.phase : 'intro';
      for (const seat of ['player', 'dealer']) {
        $(`[data-xidach-hand="${seat}"]`).innerHTML = view.hands[seat].map(cardMarkup).join('');
        const value = seat === 'player' ? view.playerValue : view.dealerValue;
        $(`[data-xidach-value="${seat}"]`).textContent = value ? valueLabel(value) : '1 lá đang úp';
      }
      const possible = view.playerValue.validTotals;
      $('[data-xidach-ace]').textContent = state.hands.player.some(card => card.rank === 1)
        ? `A = 1 / 10 / 11${possible.length > 1 ? ` · Tổng hợp lệ: ${possible.join(', ')}` : ''}${view.playerValue.type === 'ngulinh' ? ' · Ngũ linh dùng tổng nhỏ nhất' : ''}`
        : 'J, Q, K = 10 điểm · Tối đa 5 lá';
      $('[data-xidach-phase]').textContent = !started ? 'Sẵn sàng vào bàn' : state.phase === 'player' ? 'Lượt của bạn' : state.phase === 'dealer' ? 'Nhà cái đang rút bài…' : 'Đã so bài';
      hitButton.disabled = !started || !view.canHit;
      standButton.disabled = !started || !view.canStand;
      standButton.title = state.phase === 'player' && !view.canStand ? 'Cần ít nhất 16 điểm để dừng.' : '';
      result.hidden = !started || state.phase !== 'done';
      if (started && state.phase === 'done') {
        const titles = { win: 'Bạn thắng!', loss: 'Nhà cái thắng', push: 'Ván hòa' };
        result.dataset.outcome = state.outcome;
        result.querySelector('strong').textContent = titles[state.outcome];
        result.querySelector('p').textContent = `${valueLabel(view.playerValue)} · Nhà cái: ${valueLabel(view.dealerValue)}. ${state.reason === 'player-bust' ? 'Bạn quắc nên ván kết thúc ngay.' : state.reason === 'natural' ? 'So bài đặc biệt ngay khi chia.' : state.outcome === 'push' ? 'Hai bên cùng hạng và điểm.' : ''} Tổng phiên: ${wins * 100} điểm · ${draws} ván hòa.`;
      }
      ui.setStat('xidach-wins', wins);
      ui.setStat('xidach-rounds', rounds);
      ui.message(!started ? 'Mỗi người nhận 2 lá. Chọn Bắt đầu để vào bàn.' : state.phase === 'player' ? view.canStand ? 'Bạn có thể rút thêm hoặc dừng bài. Đủ 21 hay 5 lá sẽ tự dừng.' : 'Bạn chưa đủ 16 điểm. Hãy rút thêm một lá.' : state.phase === 'dealer' ? 'Nhà cái theo luật cố định: rút dưới 17, dừng từ 17.' : state.outcome === 'win' ? 'Thắng ván này: +100 điểm. Chia ván mới để tiếp tục.' : 'Chia ván mới để thử lại.');
    }

    function advance() {
      if (!started) return render();
      if (state.phase === 'done' && !reported) {
        reported = true;
        rounds++;
        if (state.outcome === 'win') wins++;
        if (state.outcome === 'push') draws++;
        if (typeof options.onScore === 'function') options.onScore(wins * 100);
        render();
        $('[data-xidach-next]').focus({ preventScroll: true });
        return;
      }
      render();
      if (state.phase === 'dealer' && !pending) {
        pending = true;
        scope.after(0.8, () => {
          pending = false;
          L.dealerStep(state);
          advance();
        });
      }
    }

    function restart() {
      scope.clearTimers();
      S.clearOverlays(ui);
      pending = false;
      reported = false;
      state = L.createGame();
      started = true;
      advance();
    }
    scope.on(hitButton, 'click', () => { if (started && L.hit(state).ok) advance(); });
    scope.on(standButton, 'click', () => { if (started && L.stand(state).ok) advance(); });
    scope.on($('[data-xidach-next]'), 'click', restart);
    render();
    S.intro(ui, scope, {
      title: 'Xì dách', symbol: 'play',
      detail: 'Bạn đấu nhà cái máy với bộ 52 lá. Rút gần 21, dừng từ 16 điểm. Xì bàn, Xì dách và Ngũ linh có thứ hạng riêng. Không cược tiền.',
      onStart: () => { started = true; advance(); },
    });
    return S.handle(scope, restart);
  };
})();
