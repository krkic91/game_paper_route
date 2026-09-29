(function () {
  'use strict';
  const { icon } = window.ArcadeArt;
  window.ArcadeGames = {};

  // One owned lifecycle per game. Timers use game time, so pause never loses a turn.
  function createScope() {
    let destroyed = false,
      paused = false,
      previous = 0,
      frameId = 0;
    let timers = [],
      timerGeneration = 0;
    const cleanups = [],
      callbacks = [],
      pauseCallbacks = [];
    function frame(time) {
      if (destroyed) return;
      const dt = previous ? Math.min(0.05, (time - previous) / 1000) : 0;
      previous = time;
      if (!paused && !document.hidden) {
        const pending = timers;
        timers = [];
        for (const timer of pending) {
          if (destroyed || timer.generation !== timerGeneration) continue;
          if (paused) {
            timers.push(timer);
            continue;
          }
          timer.left -= dt;
          if (timer.left <= 0) {
            if (!destroyed) timer.fn();
          } else timers.push(timer);
        }
        for (const callback of callbacks) if (!destroyed && !paused) callback(dt, time / 1000);
      }
      if (!destroyed) frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
    return {
      get paused() {
        return paused;
      },
      on(target, name, fn, always = false, options) {
        const wrapped = (event) => {
          if (!destroyed && (always || !paused)) fn(event);
        };
        target.addEventListener(name, wrapped, options);
        cleanups.push(() => target.removeEventListener(name, wrapped, options));
        return wrapped;
      },
      loop(fn) {
        callbacks.push(fn);
      },
      after(seconds, fn) {
        if (!destroyed) timers.push({ left: seconds, fn, generation: timerGeneration });
      },
      clearTimers() {
        timerGeneration++;
        timers = [];
      },
      cleanup(fn) {
        cleanups.push(fn);
      },
      onPause(fn) {
        pauseCallbacks.push(fn);
      },
      setPaused(value) {
        paused = Boolean(value);
        previous = 0;
        for (const fn of pauseCallbacks) fn(paused);
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        timerGeneration++;
        cancelAnimationFrame(frameId);
        timers = [];
        for (const cleanup of cleanups) cleanup();
      },
    };
  }

  function stat(label, name, value, suffix = '') {
    return `<div class="game-stat"><small>${label}</small><strong data-stat="${name}">${value}</strong>${suffix ? `<span>${suffix}</span>` : ''}</div>`;
  }
  function modeSelect(options) {
    return `<label class="game-mode"><span>Chế độ</span><select aria-label="Chọn chế độ chơi">${options.map(([value, title]) => `<option value="${value}">${title}</option>`).join('')}</select></label>`;
  }
  function buildUI(host, options = {}) {
    host.innerHTML = `<div class="game-workspace ${options.className || ''}"><div class="game-toolbar">${options.toolbar || ''}</div><div class="game-board-area">${options.board || ''}</div><div class="game-controls">${options.controls || ''}</div><p class="game-status" role="status" aria-live="polite">${options.status || ''}</p></div>`;
    const ui = {
      host,
      workspace: host.firstElementChild,
      toolbar: host.querySelector('.game-toolbar'),
      area: host.querySelector('.game-board-area'),
      controls: host.querySelector('.game-controls'),
      status: host.querySelector('.game-status'),
      setStat(name, value) {
        const el = host.querySelector(`[data-stat="${name}"]`);
        if (el && el.textContent !== String(value)) el.textContent = value;
      },
      message(value) {
        if (ui.status.textContent !== value) ui.status.textContent = value;
      },
    };
    ui.workspace.tabIndex = -1;
    return ui;
  }
  function result(ui, scope, { title, detail, score, win = true, onAgain, onScore }) {
    ui.area.querySelector('.game-overlay')?.remove();
    if (onScore && Number.isFinite(score)) onScore(Math.max(0, Math.round(score)));
    const overlay = document.createElement('div');
    overlay.className = 'game-overlay result-overlay';
    overlay.innerHTML = `<div class="game-result-card"><span class="result-symbol ${win ? '' : 'result-neutral'}">${icon(win ? 'trophy' : 'flag', 32)}</span><span class="eyebrow">${win ? 'THÊM MỘT CHÚT NIỀM VUI' : 'MỖI LẦN CHƠI, MỘT LẦN TIẾN BỘ'}</span><h3>${title}</h3><p>${detail}</p>${Number.isFinite(score) ? `<div class="result-score">${Math.max(0, Math.round(score)).toLocaleString('vi-VN')}<small>ĐIỂM</small></div>` : ''}<button class="button button-primary" data-again>${icon('restart')}Chơi thêm ván nữa</button></div>`;
    ui.area.append(overlay);
    overlay.querySelector('[data-again]').addEventListener('click', () => {
      if (!scope.paused) onAgain();
    });
    overlay.querySelector('button').focus({ preventScroll: true });
  }
  function intro(ui, scope, { title, detail, symbol = 'play', onStart }) {
    const overlay = document.createElement('div');
    overlay.className = 'game-overlay intro-overlay';
    overlay.innerHTML = `<div class="game-result-card"><span class="result-symbol">${icon(symbol, 34)}</span><span class="eyebrow">MỘT CHÚT THỬ THÁCH, MỘT CHÚT VUI</span><h3>${title}</h3><p>${detail}</p><button class="button button-primary" data-start>${icon('play')}Bắt đầu chơi</button></div>`;
    ui.area.append(overlay);
    // The listener belongs to the removable element, rather than the long-lived scope.
    overlay.querySelector('button').addEventListener(
      'click',
      () => {
        if (scope.paused) return;
        overlay.remove();
        onStart();
        ui.workspace.focus({ preventScroll: true });
      },
      { once: true },
    );
  }
  function clearOverlays(ui) {
    ui.area.querySelectorAll('.game-overlay').forEach((el) => el.remove());
  }
  function canvasUI(host, width, height, options = {}) {
    const ui = buildUI(host, {
      ...options,
      className: `action-workspace ${options.className || ''}`,
      board: `<div class="canvas-wrap" style="max-width:${width}px"><canvas aria-label="${options.label || 'Màn chơi'}"></canvas></div>`,
    });
    ui.workspace.tabIndex = -1;
    const canvas = ui.area.querySelector('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * width,
        y: ((event.clientY - rect.top) / rect.height) * height,
      };
    }
    return { ...ui, canvas, ctx, point };
  }
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }
  function text(ctx, value, x, y, size = 18, color = '#edf6de', align = 'center', weight = 600) {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`;
    ctx.fillText(value, x, y);
  }
  function isTyping(event) {
    return (
      event.target instanceof Element &&
      (Boolean(event.target.closest('input,select,textarea,[contenteditable="true"]')) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey)
    );
  }
  function gameKey(event) {
    if (isTyping(event)) return '';
    if (
      (event.key === ' ' || event.key === 'Enter') &&
      event.target instanceof Element &&
      event.target.closest('button')
    )
      return '';
    return event.key.toLowerCase();
  }
  function heldInput(scope, ui, mapping) {
    const keys = new Set(),
      pointers = new Map();
    scope.on(window, 'keydown', (event) => {
      const key = gameKey(event);
      if (Object.values(mapping).some((values) => values.includes(key))) {
        event.preventDefault();
        keys.add(key);
      }
    });
    scope.on(window, 'keyup', (event) => keys.delete(event.key.toLowerCase()), true);
    const clear = () => {
      keys.clear();
      pointers.clear();
      ui.controls.querySelectorAll('.held').forEach((el) => el.classList.remove('held'));
    };
    scope.on(window, 'blur', clear, true);
    scope.onPause(clear);
    ui.controls.querySelectorAll('[data-hold]').forEach((button) => {
      scope.on(button, 'pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, button.dataset.hold);
        button.classList.add('held');
      });
      const release = (event) => {
        pointers.delete(event.pointerId);
        if (![...pointers.values()].includes(button.dataset.hold)) button.classList.remove('held');
      };
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
        scope.on(button, name, release, true);
    });
    return {
      active(name) {
        return (
          [...pointers.values()].includes(name) ||
          (mapping[name] || []).some((key) => keys.has(key))
        );
      },
      clear,
    };
  }
  function directionPad() {
    return `<div class="direction-pad"><button class="control-button pad-up" data-direction="up" aria-label="Đi lên">${icon('arrow-up')}</button><button class="control-button" data-direction="left" aria-label="Sang trái">${icon('arrow-left')}</button><button class="control-button" data-direction="down" aria-label="Đi xuống">${icon('arrow-down')}</button><button class="control-button" data-direction="right" aria-label="Sang phải">${icon('arrow-right')}</button></div>`;
  }
  function bindDirections(scope, ui, onDirection, swipeTarget) {
    const map = {
      arrowup: 'up',
      w: 'up',
      arrowdown: 'down',
      s: 'down',
      arrowleft: 'left',
      a: 'left',
      arrowright: 'right',
      d: 'right',
    };
    scope.on(window, 'keydown', (event) => {
      const key = gameKey(event);
      if (map[key]) {
        event.preventDefault();
        onDirection(map[key]);
      }
    });
    scope.on(ui.controls, 'click', (event) => {
      const button = event.target.closest('[data-direction]');
      if (button) onDirection(button.dataset.direction);
    });
    if (swipeTarget) {
      let start = null;
      scope.on(swipeTarget, 'pointerdown', (event) => {
        start = { x: event.clientX, y: event.clientY, id: event.pointerId };
        swipeTarget.setPointerCapture(event.pointerId);
      });
      scope.on(swipeTarget, 'pointerup', (event) => {
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x,
          dy = event.clientY - start.y;
        start = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 15) return;
        onDirection(
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up',
        );
      });
      scope.on(
        swipeTarget,
        'pointercancel',
        () => {
          start = null;
        },
        true,
      );
      scope.onPause(() => {
        start = null;
      });
    }
  }
  function handle(scope, restart, extra = {}) {
    return {
      restart,
      setPaused: (value) => scope.setPaused(value),
      destroy: () => scope.destroy(),
      ...extra,
    };
  }
  window.ArcadeShared = {
    createScope,
    stat,
    modeSelect,
    buildUI,
    result,
    intro,
    clearOverlays,
    canvasUI,
    roundRect,
    text,
    gameKey,
    isTyping,
    heldInput,
    directionPad,
    bindDirections,
    handle,
  };
})();
