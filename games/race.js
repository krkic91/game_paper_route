// version v1.0
(function () {
  'use strict';
  const S = window.ArcadeShared, R = window.RaceLogic, { icon } = window.ArcadeArt;
  const settingsKey = 'tram-choi.race.settings.v1';
  window.ArcadeGames.race = function (host, options) {
    const scope = S.createScope();
    const settings = { sound: true, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches };
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey));
      for (const key of Object.keys(settings)) if (typeof saved?.[key] === 'boolean') settings[key] = saved[key];
    } catch {}
    const ui = S.canvasUI(host, 900, 550, {
      className: 'race-workspace', renderer: options.renderer,
      label: 'Đua xe đạp qua đường cua và đồi. Trái/phải để lái, Space nước rút, S phanh, C thả trôi.',
      toolbar: S.stat('VỊ TRÍ', 'place', '4 / 4') + S.stat('QUÃNG ĐƯỜNG', 'distance', 0, '/ 1.000 m') +
        S.stat('TỐC ĐỘ', 'speed', 0, 'km/h') + S.stat('TÌNH TRẠNG XE', 'hearts', '♥ ♥ ♥'),
      controls: `<button class="control-button race-steering" data-hold="left" aria-label="Giữ để lái trái">${icon('arrow-left')}</button>
        <div class="race-drive-controls"><button class="control-button sprint-button" data-hold="sprint" aria-label="Giữ để nước rút">${icon('bolt')}<span>Nước rút <small data-race-energy>100%</small><span class="sprint-meter"><i></i></span></span></button>
        <button class="control-button" data-hold="coast" aria-label="Giữ để thả trôi">Thả trôi</button><button class="control-button race-brake" data-hold="brake" aria-label="Giữ để phanh">Phanh</button></div>
        <button class="control-button race-steering" data-hold="right" aria-label="Giữ để lái phải">${icon('arrow-right')}</button>`,
    });
    const info = document.createElement('div'); info.className = 'race-info';
    info.innerHTML = '<div class="race-road-readout"><span data-race-terrain>Đường nhựa</span><span data-race-grade>Đường bằng</span><span data-race-draft>Đạp đều</span></div><div class="race-settings"><button class="control-button" data-race-sound></button><button class="control-button" data-race-motion></button></div>';
    ui.controls.after(info);
    const visual = options.renderer === '3d' ? window.Arcade3D.createView('race', ui, scope) : window.createRace2D(ui);
    const sound = window.createRaceAudio(scope);
    const input = S.heldInput(scope, ui, {
      left: ['a', 'arrowleft'], right: ['d', 'arrowright'], sprint: [' ', 'w', 'arrowup', 'shift'],
      coast: ['c'], brake: ['s', 'arrowdown'],
    });
    const meter = ui.controls.querySelector('.sprint-meter i');
    const energyLabel = ui.controls.querySelector('[data-race-energy]');
    const terrainLabel = info.querySelector('[data-race-terrain]'), gradeLabel = info.querySelector('[data-race-grade]'), draftLabel = info.querySelector('[data-race-draft]');
    let state, started = false, finished = false, lastEvent = 0, eventUntil = 0, mode = 'idle';
    const instructions = 'Xe tự đạp đều. ← / → hoặc A / D: lái · Space: nước rút · S / ↓: phanh · C: thả trôi. Bám sau đối thủ để núp gió, giữ nút trên màn hình để điều khiển.';
    function updateSettings() {
      const audio = info.querySelector('[data-race-sound]'), motion = info.querySelector('[data-race-motion]');
      audio.textContent = `Âm thanh: ${settings.sound ? 'Bật' : 'Tắt'}`;
      audio.setAttribute('aria-pressed', String(settings.sound));
      motion.textContent = `Giảm rung: ${settings.reducedMotion ? 'Bật' : 'Tắt'}`;
      motion.setAttribute('aria-pressed', String(settings.reducedMotion));
    }
    scope.on(info, 'click', event => {
      const audio = event.target.closest('[data-race-sound]'), motion = event.target.closest('[data-race-motion]');
      if (!audio && !motion) return;
      const key = audio ? 'sound' : 'reducedMotion'; settings[key] = !settings[key];
      if (audio) sound.setEnabled(settings.sound);
      updateSettings();
      try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch {}
    });
    function updateStats() {
      ui.setStat('place', `${state.place} / 4`); ui.setStat('distance', Math.floor(state.distance));
      ui.setStat('speed', Math.round(state.speed * 3.6));
      ui.setStat('hearts', '♥ '.repeat(Math.max(0, state.hearts)).trim() || '—');
      meter.style.width = `${state.energy}%`; energyLabel.textContent = `${Math.round(state.energy)}%`;
      const surfaceNames = { asphalt: 'Đường nhựa', wet: 'Đường ướt · giảm bám', gravel: 'Đường sỏi · giảm bám', shoulder: 'Lề cỏ · giảm tốc' };
      terrainLabel.textContent = surfaceNames[state.surface] || 'Đường nhựa';
      const slope = Math.round(state.grade * 100);
      gradeLabel.textContent = Math.abs(slope) < 1 ? 'Đường bằng' : `${slope > 0 ? 'Lên' : 'Xuống'} dốc ${Math.abs(slope)}%`;
      const modeNames = { idle: 'Sẵn sàng', paused: 'Tạm dừng', finished: 'Đã kết thúc', pedal: 'Đạp đều', coast: 'Đang thả trôi', brake: 'Đang phanh', sprint: 'Nước rút' };
      draftLabel.textContent = state.drafting && mode !== 'finished' ? 'Núp gió · tiết kiệm sức' : modeNames[mode];
      draftLabel.classList.toggle('is-drafting', state.drafting && started && !finished);
      Object.assign(ui.workspace.dataset, {
        time: state.time.toFixed(3), speed: state.speed.toFixed(3), distance: state.distance.toFixed(3), energy: state.energy.toFixed(3),
        x: state.x.toFixed(3), mode, drafting: String(state.drafting),
        status: scope.paused ? 'paused' : !started ? 'intro' : state.status,
      });
    }
    function draw(dt = 0) { visual.draw(state, { reducedMotion: settings.reducedMotion }, dt); }
    function restart() {
      scope.clearTimers(); S.clearOverlays(ui); input.clear(); sound.silence();
      state = R.createRace(); started = false; finished = false; lastEvent = 0; eventUntil = 0; mode = 'idle';
      visual.reset?.(); ui.message(instructions);
      S.intro(ui, scope, {
        title: 'Đường đua xanh', symbol: 'bike',
        detail: '1 km qua những khúc cua và triền đồi. Bám đoàn để giữ sức, phanh trước khúc cua, chọn thời điểm nước rút.',
        onStart() { started = true; mode = 'pedal'; sound.setEnabled(settings.sound); },
      });
      draw(); updateStats();
    }
    scope.onPause(paused => {
      mode = paused ? 'paused' : !started ? 'idle' : finished ? 'finished' : 'pedal'; updateStats(); sound.silence();
    });
    scope.on(document, 'visibilitychange', () => { if (document.hidden) input.clear(); }, true);
    const eventMessages = {
      cone: 'Chạm cọc! Xe chao và mất tốc độ. Giữ hướng lái để lấy lại thăng bằng.',
      puddle: 'Qua vũng nước: độ bám giảm tạm thời. Lái nhẹ và tránh phanh gấp.',
      rider: 'Chạm tay đua khác! Giữ khoảng cách khi vượt.',
      shoulder: 'Bạn đang ở lề cỏ. Trở lại mặt đường để giữ tốc độ.',
      water: 'Đã tiếp nước, hồi thêm năng lượng.',
    };
    scope.loop(dt => {
      if (started && !finished) {
        const controls = {
          steer: Number(input.active('right')) - Number(input.active('left')), sprint: input.active('sprint'),
          coast: input.active('coast'), brake: input.active('brake'),
        };
        R.stepRace(state, dt, controls);
        mode = controls.brake ? 'brake' : controls.coast ? 'coast' : state.sprinting ? 'sprint' : 'pedal';
        if (state.event?.id !== lastEvent) {
          lastEvent = state.event?.id;
          if (eventMessages[state.event?.type]) { ui.message(eventMessages[state.event.type]); eventUntil = state.time + 4; }
        } else if (eventUntil && state.time >= eventUntil) { ui.message(instructions); eventUntil = 0; }
        if (state.status !== 'playing') {
          finished = true; mode = 'finished'; input.clear(); sound.silence();
          const won = state.status === 'won';
          const score = won ? Math.max(100, Math.round(6000 - state.time * 25 - (state.place - 1) * 650 + state.hearts * 100)) : Math.floor(state.distance);
          S.result(ui, scope, {
            title: won ? `Về đích hạng ${state.place}!` : 'Hẹn ở vòng đua tiếp theo!',
            detail: won ? `Bạn hoàn thành 1 km trong ${state.time.toFixed(1)} giây.` : `Bạn đã đi được ${Math.floor(state.distance)} m. Giảm tốc trước chướng ngại và chừa khoảng trống khi vượt nhé.`,
            score, win: won, onAgain: restart, onScore: options.onScore,
          });
        }
      }
      sound.update(state, started && !finished); draw(started && !finished ? dt : 0); updateStats();
    });
    updateSettings(); restart();
    return S.handle(scope, restart);
  };
})();
