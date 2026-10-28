(function () {
  'use strict'; const S = window.ArcadeShared, L = window.ArcadeCoganh;
  window.ArcadeGames.coganh = function (host, options = {}) {
    const scope = S.createScope(); let settings = {}, state = L.createGame(), started = false, selected = null, hint = null;
    let lines = '';
    for (let i = 0; i < 25; i++) for (const j of L.neighbors(i)) if (j > i) lines += `<path d="M${10+i%5*20} ${10+Math.floor(i/5)*20}L${10+j%5*20} ${10+Math.floor(j/5)*20}"/>`;
    const ui = S.buildUI(host, { className: 'family-workspace coganh-workspace',
      toolbar: '<div class="family-heading"><small>QUÂN LẬT HAI MÀU · TRÒ QUEN XỨ QUẢNG</small><strong>Cờ gánh</strong></div><label class="family-option">Chế độ<select data-coganh-mode><option value="ai">Đấu máy</option><option value="local">2 người</option></select></label><label class="family-option">Máy<select data-coganh-level><option value="medium">Vừa</option><option value="easy">Dễ</option></select></label>',
      board: `<div class="family-board-wrap"><div class="family-scoreline"><span data-coganh-count></span><strong data-coganh-turn></strong></div><div class="coganh-board" role="group" aria-label="Bàn cờ gánh 5 nhân 5"><svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#a18b63" stroke-width=".5">${lines}</g></svg></div><p class="coganh-note" data-coganh-note></p></div>`,
      controls: '<button class="control-button" data-coganh-hint>Gợi ý</button><button class="control-button" data-coganh-undo>Hoàn tác</button><label class="coganh-opening"><input type="checkbox" data-coganh-opening checked> Luật mở</label><details class="family-rules"><summary>Học chơi trong một phút</summary><p>Đi một bước theo đường kẻ tới giao điểm trống. Không nhảy qua quân. Đỏ đi trước, mỗi bên 8 quân.</p><p><strong>Gánh:</strong> đi vào giữa hai quân đối phương trên một đường thẳng nối liền, cả hai đổi sang màu của bạn. Có thể gánh nhiều cặp một lúc. <strong>Vây:</strong> nhóm quân đối phương không còn đường tới ô trống sẽ đổi màu.</p><p><strong>Mở:</strong> nếu một nước không đổi quân nhưng để lại ô vừa rời giữa hai quân cùng màu, đối thủ phải đi vào ô đó để gánh nếu đi tới được. Tắt Luật mở để học bản cơ bản; đổi luật bắt đầu ván mới.</p><p>Chiếm hết quân hoặc khiến đối thủ hết nước là thắng. Tự hòa khi lặp thế 3 lần, 80 lượt không đổi màu, hoặc hết 300 lượt. Chế độ 2 người chơi cùng thiết bị.</p></details>' });
    const $ = sel => ui.workspace.querySelector(sel), board = $('.coganh-board');
    const human = () => started && state.phase === 'play' && (state.mode === 'local' || state.current === 1);
    const cells = Array.from({ length: 25 }, (_, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'coganh-cell'; b.dataset.coganhCell = i; board.append(b); return b; });
    function render() {
      const moves = L.legalMoves(state), targets = moves.filter(m => m.from === selected).map(m => m.to);
      cells.forEach((b,i) => {
        const p = state.board[i]; b.innerHTML = p ? `<span class="coganh-piece ${p > 0 ? 'red' : 'blue'}">${p > 0 ? '●' : '○'}</span>` : '<span class="coganh-point"></span>';
        b.disabled = !human() || (!moves.some(m => m.from === i) && !targets.includes(i));
        b.classList.toggle('is-selected', selected === i); b.classList.toggle('is-target', targets.includes(i));
        b.classList.toggle('is-hint', Boolean(hint && (hint.from === i || hint.to === i)));
        b.classList.toggle('is-flipped', Boolean(state.last?.flipped.includes(i))); b.classList.toggle('is-trap', state.trap === i);
        b.setAttribute('aria-label', `${String.fromCharCode(65+i%5)}${5-Math.floor(i/5)}, ${p > 0 ? 'Đỏ' : p < 0 ? 'Xanh' : 'trống'}${targets.includes(i) ? ', có thể đi' : ''}`);
        b.setAttribute('aria-pressed', String(selected === i));
      });
      $('[data-coganh-count]').textContent = `Đỏ ${state.board.filter(p=>p===1).length} · Xanh ${state.board.filter(p=>p===-1).length}`;
      $('[data-coganh-turn]').textContent = state.phase === 'finished' ? 'Kết thúc' : `${state.current === 1 ? 'Đỏ' : 'Xanh'} ${human() ? 'đến lượt' : 'đang nghĩ…'}`;
      $('[data-coganh-note]').textContent = state.trap != null ? 'Có thế mở: phải đi vào ô viền vàng để gánh.' : state.last?.flipped.length ? `Vừa đổi ${state.last.flipped.length} quân: gánh ${state.last.pinched.length}, vây ${state.last.surrounded.length}.` : 'Đi vào giữa để gánh · Chặn đường để vây';
      $('[data-coganh-hint]').disabled = !human(); $('[data-coganh-undo]').disabled = !state.history.length;
      $('[data-coganh-level]').disabled = state.mode === 'local';
      ui.workspace.dataset.phase = state.phase; ui.workspace.dataset.turn = state.turn;
      ui.message('Chọn quân của mình, rồi chọn giao điểm được đánh dấu. Quân bị bắt đổi màu, tổng số quân luôn là 16.');
    }
    function schedule() {
      scope.clearTimers();
      if (started && state.phase === 'play' && state.mode === 'ai' && state.current === -1) scope.after(.4, () => { const m = L.chooseMove(state); if (m) act(m.from,m.to); });
    }
    function act(from,to) {
      if (!L.play(state,from,to)) return; selected = null; hint = null; render();
      if (state.phase === 'finished') S.result(ui,scope,{ title: state.winner === 0 ? 'Hai bên hòa nhau!' : `${state.winner === 1 ? 'Đỏ' : 'Xanh'} thắng!`, detail: state.winner ? 'Đối thủ đã hết quân hoặc không còn nước đi.' : 'Ván kết thúc theo giới hạn lặp thế hoặc số lượt.', score: state.winner && (state.mode === 'local' || state.winner === 1) ? 100 : 0, win: Boolean(state.winner && (state.mode === 'local' || state.winner === 1)), onScore: options.onScore, onAgain: restart });
      else schedule();
    }
    function restart() { scope.clearTimers(); S.clearOverlays(ui); state = L.createGame(settings); selected = null; hint = null; started = true; render(); }
    scope.on(board,'click',e=>{ const b = e.target.closest('[data-coganh-cell]'); if (!b || b.disabled || !human()) return; const i = Number(b.dataset.coganhCell); if (selected != null && L.legalMoves(state).some(m=>m.from===selected&&m.to===i)) act(selected,i); else { selected = i; hint = null; render(); } });
    scope.on($('[data-coganh-hint]'),'click',()=>{ if (human()) { hint = L.chooseMove(state); selected = hint.from; render(); } });
    scope.on($('[data-coganh-undo]'),'click',()=>{ scope.clearTimers(); S.clearOverlays(ui); L.undo(state); if (state.mode==='ai'&&state.current!==1) L.undo(state); selected = hint = null; render(); schedule(); });
    for (const k of ['mode','level','opening']) scope.on($(`[data-coganh-${k}]`),'change',e=>{ settings[k]=k==='opening'?e.target.checked:e.target.value; restart(); });
    render(); S.intro(ui,scope,{title:'Cờ gánh',symbol:'grid',detail:'Mười sáu quân, hai màu, cả một thế cờ. Đi vào giữa để gánh một cặp; vây kín để đổi cả nhóm. Có máy Dễ/Vừa và hai người cùng thiết bị.',onStart(){started=true;render();}});
    return S.handle(scope,restart);
  };
})();
