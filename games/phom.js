(function () {
  'use strict'; const S = window.ArcadeShared, L = window.ArcadePhom;
  const names = ['Bạn', 'Máy 1', 'Máy 2', 'Máy 3'];
  window.ArcadeGames.phom = function (host, options = {}) {
    const scope = S.createScope(); let state = L.createGame(), started = false, selected = null, finished = false, note = '', legal = [];
    const ui = S.buildUI(host, { className: 'family-workspace phom-workspace',
      toolbar: '<div class="family-heading"><small>BÀN BÀI QUEN · BẠN VÀ BA MÁY</small><strong>Phỏm<span> / Tá lả</span></strong></div>' + S.stat('VÒNG', 'round', '1 / 4') + S.stat('NỌC', 'stock', 15),
      board: '<div class="phom-layout"><div class="phom-table"><div class="phom-opponents">' + [1, 2, 3].map(p => `<div class="phom-opponent" data-phom-player="${p}"><span class="phom-avatar">${p}</span><strong>${names[p]}</strong><small data-count></small><div class="phom-public" data-public></div></div>`).join('') + '</div><div class="phom-center"><div><small>LÁ VỪA ĐÁNH</small><div data-phom-last></div></div><div><strong data-phom-turn></strong><p data-phom-note></p></div></div></div><div class="family-scoreline"><strong>Bài của bạn</strong><span data-phom-summary></span></div><div class="phom-hand" role="group" aria-label="Bài của bạn"></div><div class="phom-laid" data-phom-laid></div></div>',
      controls: '<button class="control-button" data-phom-take>Ăn bài</button><button class="control-button" data-phom-draw>Bốc nọc</button><button class="control-button primary" data-phom-discard>Đánh lá chọn</button><button class="control-button" data-phom-hint>Gợi ý</button><details class="family-rules"><summary>Luật bàn Phỏm này</summary><p>Bộ 52 lá, bạn 10 lá đi trước; mỗi máy 9 lá. Phỏm là bộ 3–4 lá cùng số hoặc từ 3 lá liên tiếp cùng chất (A thấp, không nối K–A). Mỗi lượt ăn lá người trước để tạo phỏm, hoặc bốc nọc, rồi đánh 1 lá rác.</p><p>Lá đã ăn phải luôn nằm trong phỏm và không được đánh lại; mỗi phỏm chứa tối đa một lá ăn. Chơi 4 lượt đánh mỗi người. Lượt cuối tự hạ cách ghép ít điểm rác nhất và tự gửi lá vào phỏm người đã hạ trước nếu mình có phỏm. Không có phỏm là móm, xếp sau người có phỏm.</p><p>A = 1, J = 11, Q = 12, K = 13. Ít điểm rác hơn thắng; bằng điểm ưu tiên người hạ trước. Hết bài rác là ù. Bàn gia đình 4 vòng cố định: không tái, đền, tính tiền hay cộng phạt ăn chốt.</p></details>' });
    const $ = sel => ui.workspace.querySelector(sel);
    const canAct = () => started && !finished && state.current === 0;
    function card(id, interactive = false, group = -1) {
      const el = document.createElement(interactive ? 'button' : 'span');
      el.className = `phom-card${L.suit(id) > 1 ? ' is-red' : ''}${group >= 0 ? ' in-meld' : ''}`;
      el.innerHTML = `<b>${L.RANKS[L.rank(id) - 1]}</b><span>${L.SUITS[L.suit(id)]}</span>${state.eaten[0].includes(id) && interactive ? '<small>ĂN</small>' : ''}`;
      el.setAttribute('aria-label', L.cardName(id) + (group >= 0 ? ', trong phỏm' : ''));
      if (interactive) { el.type = 'button'; el.dataset.phomCard = id; el.setAttribute('aria-pressed', String(id === selected)); el.classList.toggle('is-selected', id === selected); el.disabled = !canAct() || !legal.includes(id); }
      return el;
    }
    function render() {
      legal = canAct() ? L.discards(state) : [];
      const best = !state.laid[0] ? L.layout(state.hands[0], state.eaten[0]) : null;
      $('.phom-hand').replaceChildren(...state.hands[0].slice().sort((a, b) => L.rank(a) - L.rank(b) || a - b).map(id => card(id, true, best?.melds.findIndex(m => m.includes(id)) ?? -1)));
      $('[data-phom-summary]').textContent = best ? `${best.melds.length} phỏm · ${best.points} điểm rác` : `${state.melds[0].length} phỏm đã hạ · ${state.hands[0].reduce((sum, c) => sum + L.rank(c), 0)} điểm rác`;
      $('[data-phom-laid]').replaceChildren(...state.melds[0].map(m => { const group = document.createElement('div'); group.append(...m.map(id => card(id))); return group; }));
      for (const p of [1, 2, 3]) {
        const el = $(`[data-phom-player="${p}"]`); el.classList.toggle('is-active', started && !finished && state.current === p);
        el.querySelector('[data-count]').textContent = state.laid[p] ? `${state.melds[p].length} phỏm đã hạ` : `${state.hands[p].length} lá · ${state.turns[p]}/4 lượt`;
        const pub = el.querySelector('[data-public]');
        pub.textContent = [...state.melds[p].map(m => m.map(L.cardName).join(' ')), ...(state.discards[p].length ? ['Đánh: ' + state.discards[p].map(L.cardName).join(' ')] : [])].join(' · ');
      }
      $('[data-phom-last]').replaceChildren(...(state.last ? [card(state.last.card)] : []));
      $('[data-phom-turn]').textContent = finished ? 'Ván đã kết thúc' : !started ? 'Sẵn sàng chia bài' : `${names[state.current]} · ${state.phase === 'draw' ? 'Ăn hoặc bốc' : 'Đánh 1 lá'}`;
      $('[data-phom-note]').textContent = note || 'Giữ phỏm, chờ cạ, chọn lá rác.';
      ui.setStat('round', `${Math.min(4, state.turns[state.current] + 1)} / 4`); ui.setStat('stock', state.stock.length);
      $('[data-phom-take]').disabled = !canAct() || !L.canTake(state);
      $('[data-phom-draw]').disabled = !canAct() || state.phase !== 'draw';
      $('[data-phom-discard]').disabled = !canAct() || selected == null || !legal.includes(selected);
      $('[data-phom-hint]').disabled = !canAct();
      ui.workspace.dataset.phase = state.phase; ui.workspace.dataset.turn = state.turn; ui.workspace.dataset.current = state.current;
      ui.message(canAct() ? state.phase === 'draw' ? 'Ăn lá vừa đánh nếu tạo được phỏm, hoặc bốc một lá từ nọc.' : 'Chọn một lá rác rồi bấm Đánh lá chọn. Viền xanh là phỏm dự kiến.' : 'Máy chỉ dùng bài của mình và những lá đã công khai.');
    }
    function finish() {
      if (state.phase !== 'finished' || finished) return false;
      finished = true; scope.clearTimers(); render();
      const detail = state.results.type === 'u' ? `${names[state.winner]} đã hết bài rác sau khi ghép phỏm hoặc gửi bài.` : state.results.ranking.map((p, i) => `${i + 1}. ${names[p]}: ${state.melds[p].length ? state.results.scores[p] + ' điểm' : 'móm'}`).join(' · ');
      S.result(ui, scope, { title: `${names[state.winner]} ${state.results.type === 'u' ? 'ù!' : 'về nhất!'}`, detail, score: state.winner === 0 ? 100 : 0, win: state.winner === 0, onScore: options.onScore, onAgain: restart }); return true;
    }
    function schedule() {
      scope.clearTimers(); if (!started || finished || state.current === 0) return;
      scope.after(0.7, () => act(L.chooseMove(state)));
    }
    function act(command) {
      if (!command || !started || finished) return;
      const p = state.current;
      const ok = command.type === 'draw' ? L.draw(state, command.take) : L.discard(state, command.card);
      if (!ok) return;
      note = command.type === 'draw' ? `${names[p]} ${command.take ? 'ăn lá vừa đánh để tạo phỏm' : 'bốc một lá từ nọc'}.` : `${names[p]} đánh ${L.cardName(command.card)}.`;
      selected = null; render(); if (!finish()) schedule();
    }
    function restart() { scope.clearTimers(); S.clearOverlays(ui); state = L.createGame(); started = true; finished = false; selected = null; note = ''; L.checkU(state); render(); if (!finish()) schedule(); }
    scope.on($('.phom-hand'), 'click', e => { const b = e.target.closest('[data-phom-card]'); if (!b || b.disabled) return; selected = Number(b.dataset.phomCard); render(); $('[data-phom-discard]').focus({ preventScroll: true }); });
    scope.on($('[data-phom-take]'), 'click', () => { if (canAct()) act({ type: 'draw', take: true }); });
    scope.on($('[data-phom-draw]'), 'click', () => { if (canAct()) act({ type: 'draw', take: false }); });
    scope.on($('[data-phom-discard]'), 'click', () => { if (canAct()) act({ type: 'discard', card: selected }); });
    scope.on($('[data-phom-hint]'), 'click', () => {
      if (!canAct()) return; const move = L.chooseMove(state);
      if (move.type === 'discard') { selected = move.card; render(); ui.message('Đã chọn lá gợi ý. Bấm Đánh lá chọn để xác nhận.'); }
      else ui.message(move.take ? 'Có thể ăn lá vừa đánh để tạo phỏm.' : 'Bốc nọc để tìm thêm cạ.');
    });
    render(); S.intro(ui, scope, { title: 'Phỏm · Tá lả', symbol: 'cards', detail: 'Bạn đấu 3 máy. Ghép bộ cùng số hoặc dây cùng chất, ăn hoặc bốc rồi đánh lá rác. Bàn 4 vòng cố định, tự hạ và gửi bài, tính điểm gia đình.', onStart() { started = true; L.checkU(state); render(); finish(); } });
    return S.handle(scope, restart);
  };
})();
