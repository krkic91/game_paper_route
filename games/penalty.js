(function () {
  'use strict'; const S = window.ArcadeShared, L = window.ArcadePenalty;
  const zones = ['Cao trái', 'Cao giữa', 'Cao phải', 'Thấp trái', 'Thấp giữa', 'Thấp phải'];
  window.ArcadeGames.penalty = function (host, options = {}) {
    const scope = S.createScope(); let mode = 'ai', state = L.createGame(), started = false, stage = 'choice', secret = 0, outcome = null;
    const ui = S.buildUI(host, { className: 'family-workspace penalty-workspace',
      toolbar: '<div class="family-heading"><small>MƯỜI MỘT MÉT · MỘT KHOẢNH KHẮC</small><strong>Luân lưu</strong></div><label class="family-option">Chế độ<select data-penalty-mode><option value="ai">Đấu máy</option><option value="local">2 người</option></select></label>',
      board: '<div class="penalty-stadium"><div class="penalty-score"><div><strong data-penalty-name0>Bạn</strong><span data-penalty-kicks0></span></div><b data-penalty-score>0 : 0</b><div><strong data-penalty-name1>Máy</strong><span data-penalty-kicks1></span></div></div><p class="penalty-prompt" data-penalty-prompt></p><div class="penalty-pitch"><div class="penalty-crowd" aria-hidden="true"></div><div class="penalty-goal"><div class="penalty-net"></div><div class="penalty-keeper" aria-hidden="true"><i></i><b></b></div><div class="penalty-zones">' + zones.map((z, i) => `<button type="button" data-penalty-zone="${i}" aria-label="${z}"><span>${z}</span></button>`).join('') + '</div></div><div class="penalty-ball" aria-hidden="true">⚽</div><div class="penalty-spot" aria-hidden="true"></div></div><div class="penalty-turn-panel"><strong data-penalty-note></strong><button class="control-button" data-penalty-next>Tiếp tục</button></div></div>',
      controls: '<details class="family-rules"><summary>Cách chơi luân lưu</summary><p>Mỗi đội sút 5 quả, luân phiên tấn công và bắt gôn. Chọn một trong 6 vùng: thủ môn đoán đúng vùng thì cản được, khác vùng thì có bàn thắng. Máy chọn kín trước khi bạn bấm. Có thể kết thúc sớm nếu không còn khả năng san bằng.</p><p>Hòa sau 5 quả thì đá từng cặp lượt quyết định. Chế độ 2 người: thủ môn chọn kín, chuyển thiết bị cho người sút rồi bấm Sẵn sàng.</p></details>' });
    const $ = sel => ui.workspace.querySelector(sel), buttons = [...ui.workspace.querySelectorAll('[data-penalty-zone]')];
    const name = p => mode === 'local' ? `Người ${p + 1}` : p === 0 ? 'Bạn' : 'Máy';
    function prepare() {
      outcome = null;
      stage = mode === 'local' ? 'handoff-keeper' : 'choice';
      secret = L.choose(); // Commit before any human choice.
      $('.penalty-ball').removeAttribute('style'); $('.penalty-ball').classList.remove('is-shot'); $('.penalty-keeper').removeAttribute('style');
      render();
    }
    function render() {
      $('[data-penalty-score]').textContent = state.scores.join(' : ');
      for (const p of [0, 1]) {
        $(`[data-penalty-name${p}]`).textContent = name(p);
        $(`[data-penalty-kicks${p}]`).textContent = state.kicks[p].map(k => k ? '●' : '×').join(' ') || '○ ○ ○ ○ ○';
      }
      const shoot = name(state.current), keeper = name(1 - state.current);
      let prompt = `${shoot} sút · Chọn một vùng trong khung thành`;
      if (stage === 'handoff-keeper') prompt = `Chuyển thiết bị cho ${keeper} để chọn hướng bắt`;
      if (stage === 'keeper') prompt = `${keeper}: chọn kín hướng đổ người`;
      if (stage === 'handoff-shot') prompt = `Đã giấu lựa chọn. Chuyển thiết bị cho ${shoot}`;
      if (mode === 'ai' && state.current === 1 && stage === 'choice') prompt = 'Bạn bắt gôn · Đoán vùng máy sẽ sút';
      if (stage === 'animation' || stage === 'result') prompt = outcome?.goal ? 'VÀO! Một cú sút thành công.' : 'CẢN PHÁ! Thủ môn đoán đúng hướng.';
      $('[data-penalty-prompt]').textContent = prompt;
      buttons.forEach(b => { b.disabled = !started || !['choice', 'keeper'].includes(stage); });
      const next = $('[data-penalty-next]');
      next.hidden = !started || ['choice', 'keeper', 'animation'].includes(stage);
      next.textContent = stage === 'result' ? 'Lượt tiếp theo' : 'Sẵn sàng';
      $('[data-penalty-note]').textContent = stage === 'result' ? `${name(outcome.player)} ${outcome.goal ? 'ghi bàn' : 'bị cản phá'} · ${zones[outcome.shot]}` : '5 quả mỗi đội · Hòa thì đá lượt quyết định';
      ui.workspace.dataset.phase = state.phase; ui.workspace.dataset.stage = stage; ui.workspace.dataset.turn = state.kicks.flat().length;
      ui.message(Math.min(...state.kicks.map(k => k.length)) >= 5 ? 'Lượt quyết định: chỉ phân thắng bại khi hai đội đã sút bằng số quả.' : 'Chạm một vùng để sút hoặc đổ người.');
    }
    function shoot(zone) {
      if (!started || !['choice', 'keeper'].includes(stage)) return;
      if (stage === 'keeper') { secret = zone; stage = 'handoff-shot'; render(); $('[data-penalty-next]').focus(); return; }
      const shot = mode === 'ai' && state.current === 1 ? secret : zone;
      const save = mode === 'ai' && state.current === 1 ? zone : secret;
      if (!L.kick(state, shot, save)) return;
      outcome = state.last; stage = 'animation'; render();
      const ball = $('.penalty-ball');
      ball.style.setProperty('--shot-x', `${20 + shot % 3 * 30}%`); ball.style.setProperty('--shot-y', `${shot < 3 ? 22 : 48}%`); ball.classList.add('is-shot');
      $('.penalty-keeper').style.transform = `translate(${(save % 3 - 1) * 90}%, ${save < 3 ? -35 : 15}%) rotate(${(save % 3 - 1) * 45}deg)`;
      scope.after(1.05, () => {
        stage = 'result'; render();
        if (state.phase === 'finished') S.result(ui, scope, { title: `${name(state.winner)} thắng ${state.scores.join('–')}!`, detail: 'Loạt luân lưu đã phân định thắng bại. Chơi lại để đổi chiến thuật chọn góc.',
          score: mode === 'local' ? Math.max(...state.scores) * 100 : state.scores[0] * 100, win: mode === 'local' || state.winner === 0, onScore: options.onScore, onAgain: restart });
      });
    }
    function restart() { scope.clearTimers(); S.clearOverlays(ui); state = L.createGame(mode); started = true; prepare(); }
    scope.on($('.penalty-zones'), 'click', e => { const b = e.target.closest('[data-penalty-zone]'); if (b && !b.disabled) shoot(Number(b.dataset.penaltyZone)); });
    scope.on($('[data-penalty-next]'), 'click', () => {
      if (stage === 'handoff-keeper') { stage = 'keeper'; render(); }
      else if (stage === 'handoff-shot') { stage = 'choice'; render(); }
      else if (stage === 'result' && state.phase === 'play') prepare();
    });
    scope.on($('[data-penalty-mode]'), 'change', e => { mode = e.target.value; restart(); });
    prepare(); S.intro(ui, scope, { title: 'Sút bóng luân lưu', symbol: 'flag', detail: 'Một chạm chọn góc. Luân phiên sút bóng và bắt gôn trong loạt 5 quả; nếu hòa, tiếp tục lượt quyết định. Có chế độ hai người chuyền thiết bị.', onStart() { started = true; prepare(); } });
    return S.handle(scope, restart);
  };
})();
