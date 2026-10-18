// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared;
  window.ArcadeGames.werewolf = function (host, options = {}) {
    const L = window.ArcadeWerewolf, scope = S.createScope();
    let state = L.createGame(), started = false, selected = null, busy = false;
    const descriptions = {
      wolf: 'Mỗi đêm chọn một người để tấn công. Bạn biết đồng đội sói và dẫn đầu lựa chọn của bầy.',
      seer: 'Mỗi đêm kiểm tra một người có phải sói không. Kết quả chỉ mình bạn biết.',
      guard: 'Mỗi đêm bảo vệ một người, có thể chọn bản thân. Không bảo vệ cùng người hai đêm liên tiếp.',
      villager: 'Theo dõi lời nói, kết quả bỏ phiếu và các vai trò được công khai để tìm sói.',
    };
    const labels = { kill: 'Chọn người tấn công', inspect: 'Chọn người kiểm tra', protect: 'Chọn người bảo vệ', vote: 'Chọn người bạn nghi là sói' };
    const ui = S.buildUI(host, {
      className: 'werewolf-workspace',
      toolbar: '<div class="werewolf-heading"><small>LÀNG NHỎ · BÍ MẬT LỚN</small><strong>Ma sói<span>.</span></strong></div><div class="werewolf-clock"><strong data-ww-phase></strong><span data-ww-alive></span></div>',
      board: `<div class="werewolf-village">
        <div class="werewolf-role"><span class="werewolf-moon" aria-hidden="true">☾</span><div><small>VAI TRÒ CỦA BẠN</small><strong data-ww-role></strong><p data-ww-role-help></p></div></div>
        <p class="werewolf-prompt" data-ww-prompt></p>
        <div class="werewolf-seats" role="group" aria-label="Người trong làng">${Array.from({ length: 8 }, (_, id) => `<button type="button" class="werewolf-person" data-ww-target="${id}" aria-pressed="false"><span class="werewolf-avatar" aria-hidden="true">${id ? id : 'B'}</span><strong>${id ? `Máy ${id}` : 'Bạn'}</strong><span data-ww-identity="${id}"></span><small data-ww-person-status="${id}"></small></button>`).join('')}</div>
        <div class="werewolf-actions"><button type="button" class="control-button" data-ww-confirm>Xác nhận lựa chọn</button><button type="button" class="control-button" data-ww-next>Qua đêm</button></div>
        <div class="werewolf-notebook" data-ww-notebook hidden><strong>Sổ tay riêng của Tiên tri</strong><p data-ww-knowledge></p></div>
        <section class="werewolf-discussion"><h3 data-ww-discussion-title>Chuyện trong làng</h3><ul data-ww-discussion></ul></section>
      </div>`,
      controls: '<details class="werewolf-rules"><summary>Luật chơi</summary><p>Bạn và 7 máy: 2 sói, 1 tiên tri, 1 bảo vệ, 4 dân làng. Vai được chia lại mỗi ván. Ban đêm dùng năng lực; ban ngày đọc lời bàn và bỏ phiếu. Người nhiều phiếu nhất bị loại và lộ vai; hòa phiếu thì không loại ai.</p><p>Làng thắng khi hết sói. Sói thắng khi số sói còn sống bằng hoặc nhiều hơn số người phe làng. Tối đa 12 ngày, sau đó hòa. Bảo vệ được tự bảo vệ nhưng không chọn cùng mục tiêu hai đêm liên tiếp. Người bị loại tiếp tục xem tự động.</p><p>Lời của máy là nghi ngờ, có thể sai. Đây là bản chơi với máy theo luật đơn giản, không phải phòng chơi online.</p></details><details class="werewolf-history"><summary>Nhật ký ván chơi</summary><ol data-ww-history></ol></details>',
      status: 'Đọc vai trò của bạn rồi bắt đầu khám phá bí mật trong làng.',
    });
    const $ = selector => ui.workspace.querySelector(selector);

    function render() {
      const snapshot = L.view(state), self = snapshot.players[0], type = L.actionType(snapshot);
      const available = started && !busy ? L.legalTargets(state, 0) : [];
      ui.workspace.dataset.phase = snapshot.phase;
      ui.workspace.dataset.day = snapshot.day;
      ui.workspace.dataset.turn = snapshot.turn;
      ui.workspace.dataset.winner = snapshot.winner || '';
      ui.workspace.classList.toggle('is-day', snapshot.phase === 'day');
      $('[data-ww-phase]').textContent = snapshot.phase === 'over' ? 'Ván đã kết thúc' : `${snapshot.phase === 'night' ? 'Đêm' : 'Ngày'} ${snapshot.day}`;
      $('[data-ww-alive]').textContent = `${snapshot.players.filter(person => person.alive).length}/8 người còn trong làng`;
      $('[data-ww-role]').textContent = L.ROLES[self.role];
      $('[data-ww-role-help]').textContent = descriptions[self.role];
      const prompt = snapshot.phase === 'over' ? snapshot.reason : !self.alive ? 'Bạn đã bị loại. Hãy theo dõi diễn biến tự động của làng.' : busy ? 'Làng đang đưa ra quyết định…' : type ? `${labels[type]}.` : 'Bạn ngủ trong đêm. Nhấn Qua đêm để đến buổi sáng.';
      $('[data-ww-prompt]').textContent = prompt;
      ui.message(prompt);
      for (const person of snapshot.players) {
        const button = $(`[data-ww-target="${person.id}"]`);
        const identity = person.role ? L.ROLES[person.role] : 'Chưa rõ vai';
        button.disabled = !available.includes(person.id);
        button.classList.toggle('is-selected', selected === person.id);
        button.classList.toggle('is-eliminated', !person.alive);
        button.classList.toggle('is-ally', person.role === 'wolf' && self.role === 'wolf');
        button.setAttribute('aria-pressed', String(selected === person.id));
        button.setAttribute('aria-label', `${person.name}, ${identity}, ${person.alive ? 'còn trong làng' : 'đã bị loại'}`);
        $(`[data-ww-identity="${person.id}"]`).textContent = identity;
        $(`[data-ww-person-status="${person.id}"]`).textContent = !person.alive ? 'Đã bị loại' : person.id === selected ? 'Đang chọn' : self.role === 'guard' && snapshot.phase === 'night' && snapshot.guardLast === person.id ? 'Đã bảo vệ đêm trước' : 'Còn trong làng';
      }
      $('[data-ww-confirm]').hidden = !type || snapshot.phase === 'over';
      $('[data-ww-confirm]').disabled = !started || busy || !available.includes(selected);
      $('[data-ww-confirm]').textContent = selected === null ? 'Xác nhận lựa chọn' : `${type === 'vote' ? 'Bỏ phiếu' : 'Xác nhận'}: ${snapshot.players[selected].name}`;
      $('[data-ww-next]').hidden = Boolean(type) || !self.alive || snapshot.phase === 'over';
      $('[data-ww-next]').disabled = !started || busy;
      $('[data-ww-notebook]').hidden = self.role !== 'seer';
      $('[data-ww-knowledge]').textContent = Object.entries(snapshot.knowledge).map(([id, wolf]) => `${snapshot.players[id].name}: ${wolf ? 'là sói' : 'không phải sói'}`).join(' · ') || 'Chưa kiểm tra ai. Kết quả sẽ hiện sau khi đêm kết thúc.';
      $('[data-ww-discussion-title]').textContent = snapshot.phase === 'day' ? 'Lời bàn trong làng · có thể đúng hoặc sai' : snapshot.phase === 'over' ? 'Các vai trò đã được công khai' : 'Đêm xuống trên làng';
      $('[data-ww-discussion]').replaceChildren(...(snapshot.phase === 'day' ? snapshot.discussion.map(item => item.text) : snapshot.history.slice(-2).map(item => item.text)).map(text => {
        const item = document.createElement('li'); item.textContent = text; return item;
      }));
      $('[data-ww-history]').replaceChildren(...snapshot.history.map(event => {
        const item = document.createElement('li'); item.textContent = `Ngày ${event.day} · ${event.text}`; return item;
      }));
    }

    function finish() {
      scope.clearTimers();
      const role = L.view(state).players[0].role;
      const win = state.winner === (role === 'wolf' ? 'wolves' : 'village');
      const title = state.winner === 'draw' ? `Làng hòa sau ${state.maxDays} ngày` : state.winner === 'wolves' ? 'Phe sói chiến thắng!' : 'Phe làng chiến thắng!';
      S.result(ui, scope, {
        title, detail: `${state.reason} Bạn là ${L.ROLES[role]}.${win ? ' Phe của bạn chiến thắng.' : ''} ${state.players.filter(person => person.role === 'wolf').map(person => person.name).join(' và ')} là hai sói.`,
        score: win ? 100 : 0, win, onAgain: restart, onScore: options.onScore,
      });
    }

    function progress() {
      scope.clearTimers();
      const result = L.advance(state);
      busy = false; selected = null;
      render();
      if (!result.ok) { ui.message(result.error); return; }
      if (state.phase === 'over') finish();
      else scheduleSpectator();
    }

    function scheduleSpectator() {
      if (started && state.phase !== 'over' && !L.view(state).players[0].alive) scope.after(1.6, progress);
    }

    function restart() {
      scope.clearTimers(); S.clearOverlays(ui);
      state = L.createGame(); started = true; selected = null; busy = false;
      render(); ui.workspace.focus({ preventScroll: true }); scheduleSpectator();
    }

    scope.on($('.werewolf-seats'), 'click', event => {
      const button = event.target.closest('[data-ww-target]');
      if (!button || button.disabled || busy || !started) return;
      selected = Number(button.dataset.wwTarget); render();
    });
    scope.on($('[data-ww-confirm]'), 'click', () => {
      if (!started || busy || selected === null) return;
      const result = L.act(state, 0, { type: L.actionType(L.view(state)), target: selected });
      if (!result.ok) { ui.message(result.error); return; }
      busy = true; render(); scope.after(0.7, progress);
    });
    scope.on($('[data-ww-next]'), 'click', () => {
      if (!started || busy) return;
      busy = true; render(); scope.after(0.7, progress);
    });
    render();
    S.intro(ui, scope, {
      title: 'Ma sói · Bí mật trong làng', symbol: 'users',
      detail: 'Một mình bạn cùng 7 máy, mỗi người giữ một vai bí mật. Dùng năng lực trong đêm, đọc lời bàn và bỏ phiếu ban ngày. Sói biết đồng đội; Tiên tri có sổ tay riêng. Chọn người trong làng rồi xác nhận.',
      onStart() { started = true; render(); scheduleSpectator(); },
    });
    return S.handle(scope, restart);
  };
})();
