(function () {
  'use strict'; const S = window.ArcadeShared, L = window.ArcadeWordchain;
  window.ArcadeGames.wordchain = function (host, options = {}) {
    const scope = S.createScope(); let state = L.createGame(), started = false, finished = false, lastSecond = -1;
    const ui = S.buildUI(host, { className: 'family-workspace wordchain-workspace',
      toolbar: '<div class="family-heading"><small>TIẾNG VIỆT · CHƠI MÀ HỌC</small><strong>Nối chữ</strong></div>' + S.stat('ĐIỂM', 'score', 0) + S.stat('CÒN LẠI', 'time', '90s'),
      board: '<div class="wordchain-paper"><small class="wordchain-label">MÁY VỪA NỐI</small><h2 data-wordchain-word></h2><p>Bắt đầu từ tiếp theo bằng <strong data-wordchain-syllable></strong></p><form class="wordchain-form"><label for="wordchain-input" class="sr-only">Từ ghép tiếp theo</label><input id="wordchain-input" name="word" type="text" maxlength="40" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Nhập từ có dấu…" enterkeyhint="send"><button type="submit" class="control-button primary">Nối từ</button></form><p class="wordchain-feedback" data-wordchain-feedback role="status"></p><ol class="wordchain-history" aria-label="Chuỗi từ đã nối"></ol></div>',
      controls: '<button class="control-button" data-wordchain-hint>Gợi ý · 3 lần</button><details class="family-rules"><summary>Luật & từ điển của bàn</summary><p>Tiếng cuối của từ trước là tiếng đầu của từ sau: học sinh → sinh nhật. Dùng từ có dấu, không lặp từ. Mỗi từ đúng +10 điểm; máy hết từ +50. Có 90 giây, 3 gợi ý, mỗi gợi ý trừ 5 điểm (tối thiểu 0).</p><p data-wordchain-dictionary></p><p>Bàn dùng kho từ được chọn sẵn; một từ tiếng Việt đúng vẫn có thể chưa nằm trong kho. Gợi ý luôn đưa một từ hợp lệ để bạn học thêm.</p></details>' });
    const $ = sel => ui.workspace.querySelector(sel), input = $('#wordchain-input');
    $('[data-wordchain-dictionary]').textContent = `Kho từ: ${L.WORDS.length} từ/cụm từ quen thuộc, lưu sẵn để chơi offline.`;
    function render() {
      $('[data-wordchain-word]').textContent = state.word;
      $('[data-wordchain-syllable]').textContent = '“' + L.last(state.word) + '”';
      ui.setStat('score', state.score); ui.setStat('time', `${Math.ceil(state.seconds)}s`);
      $('[data-wordchain-hint]').textContent = `Gợi ý · ${state.hints} lần`;
      $('[data-wordchain-hint]').disabled = !started || finished || !state.hints;
      input.disabled = !started || finished; $('.wordchain-form button').disabled = !started || finished;
      $('.wordchain-history').replaceChildren(...state.history.slice(-10).map(item => {
        const li = document.createElement('li'); li.className = item.who === 'Bạn' ? 'is-human' : '';
        const who = document.createElement('small'); who.textContent = item.who;
        const word = document.createElement('span'); word.textContent = item.word; li.append(who, word); return li;
      }));
      ui.workspace.dataset.phase = state.phase; ui.workspace.dataset.turn = state.turns;
      ui.message('Giữ nguyên dấu tiếng Việt. Viết hoa và khoảng trắng thừa được tự chuẩn hóa.');
    }
    function finish() {
      if (finished || state.phase !== 'finished') return;
      finished = true; render(); S.result(ui, scope, { title: 'Một chuỗi từ thật hay!', detail: state.reason, score: state.score, onScore: options.onScore, onAgain: restart });
    }
    function restart() { scope.clearTimers(); S.clearOverlays(ui); state = L.createGame(); started = true; finished = false; lastSecond = -1; input.value = ''; $('[data-wordchain-feedback]').textContent = ''; render(); input.focus({ preventScroll: true }); }
    scope.on($('.wordchain-form'), 'submit', e => {
      e.preventDefault(); if (!started || finished) return;
      const result = L.submit(state, input.value);
      $('[data-wordchain-feedback]').textContent = result.ok ? '+10 điểm! Đến lượt bạn nối tiếp.' : result.error;
      if (result.ok) { input.value = ''; render(); finish(); } else input.select();
    });
    scope.on($('[data-wordchain-hint]'), 'click', () => {
      if (!started || finished) return; const word = L.hint(state);
      if (word) { input.value = word; render(); $('[data-wordchain-feedback]').textContent = 'Đã điền gợi ý (−5 điểm). Nhấn Nối từ để dùng.'; input.focus({ preventScroll: true }); }
    });
    scope.loop(dt => {
      if (!started || finished) return; L.tick(state, dt);
      const second = Math.ceil(state.seconds); if (second !== lastSecond) { lastSecond = second; ui.setStat('time', `${second}s`); }
      finish();
    });
    render(); S.intro(ui, scope, { title: 'Nối chữ tiếng Việt', symbol: 'puzzle', detail: `Học sinh → sinh nhật → nhật ký… Nối với máy trong 90 giây, cùng khám phá ${L.WORDS.length} từ và cụm từ quen thuộc. Có 3 gợi ý khi bí.`, onStart() { started = true; render(); scope.after(0.05, () => input.focus({ preventScroll: true })); } });
    return S.handle(scope, restart);
  };
})();
