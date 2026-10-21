// version v1.0
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeBlocks = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WIDTH = 10, HEIGHT = 20, STEP = 1 / 120, LOCK_DELAY = 0.5, MAX_RESETS = 15;
  const KINDS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  };
  const randoms = new WeakMap();
  function cells(piece) {
    let matrix = SHAPES[piece.kind];
    for (let rotation = 0; rotation < (piece.kind === 'O' ? 0 : piece.rotation); rotation++) {
      matrix = matrix.map((row, y) => row.map((_, x) => matrix[matrix.length - 1 - x][y]));
    }
    const result = [];
    matrix.forEach((row, y) => row.forEach((value, x) => { if (value) result.push({ x: piece.x + x, y: piece.y + y }); }));
    return result;
  }
  function collides(state, piece) {
    return cells(piece).some(({ x, y }) => x < 0 || x >= WIDTH || y >= HEIGHT || (y >= 0 && state.board[y][x] !== null));
  }
  function refill(state) {
    if (state.queue.length >= 4) return;
    const bag = KINDS.slice(), random = randoms.get(state) || Math.random;
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    state.queue.push(...bag);
  }
  function spawn(state, kind) {
    if (!kind) { refill(state); kind = state.queue.shift(); refill(state); }
    state.active = { kind, x: kind === 'O' ? 4 : 3, y: -1, rotation: 0 };
    state.gravityTime = 0; state.lockTime = 0; state.lockResets = 0;
    if (collides(state, state.active)) state.phase = 'over';
  }
  function createGame(options = {}) {
    const state = {
      board: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null)),
      active: null, queue: [], hold: null, holdUsed: false, phase: 'play',
      score: 0, lines: 0, level: 1, combo: -1, pieces: 0,
      gravityTime: 0, lockTime: 0, lockResets: 0, accumulator: 0, lastClear: 0,
    };
    randoms.set(state, options.random || Math.random); spawn(state);
    return state;
  }
  function grounded(state) { return collides(state, { ...state.active, y: state.active.y + 1 }); }
  function resetLock(state, wasGrounded) {
    if (wasGrounded && state.lockResets < MAX_RESETS) { state.lockTime = 0; state.lockResets++; }
  }
  function move(state, dx) {
    if (state.phase !== 'play' || (dx !== -1 && dx !== 1)) return false;
    const next = { ...state.active, x: state.active.x + dx };
    if (collides(state, next)) return false;
    const floor = grounded(state); state.active = next; resetLock(state, floor); return true;
  }
  function rotate(state, direction = 1) {
    if (state.phase !== 'play' || ![1, -1].includes(direction) || state.active.kind === 'O') return false;
    const rotation = (state.active.rotation + direction + 4) % 4;
    // A compact, symmetric kick system, not SRS: test horizontal offsets before upward kicks.
    const kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1], [0, -2]];
    for (const [dx, dy] of kicks) {
      const next = { ...state.active, rotation, x: state.active.x + dx, y: state.active.y + dy };
      if (collides(state, next)) continue;
      const floor = grounded(state); state.active = next; resetLock(state, floor); return true;
    }
    return false;
  }
  function ghostY(state) {
    let y = state.active.y;
    while (!collides(state, { ...state.active, y: y + 1 })) y++;
    return y;
  }
  function lock(state) {
    const occupied = cells(state.active);
    if (occupied.some(cell => cell.y < 0)) { state.phase = 'over'; return; }
    for (const { x, y } of occupied) state.board[y][x] = state.active.kind;
    const remaining = state.board.filter(row => row.some(value => value === null));
    const cleared = HEIGHT - remaining.length;
    state.board = [...Array.from({ length: cleared }, () => Array(WIDTH).fill(null)), ...remaining];
    state.combo = cleared ? state.combo + 1 : -1;
    state.score += ([0, 100, 300, 500, 800][cleared] + (cleared ? 50 * state.combo : 0)) * state.level;
    state.lastClear = cleared; state.lines += cleared; state.level = 1 + Math.floor(state.lines / 10);
    state.pieces++; state.holdUsed = false; spawn(state);
  }
  function softDrop(state) {
    if (state.phase !== 'play' || grounded(state)) return false;
    state.active.y++; state.score++; state.gravityTime = 0; return true;
  }
  function hardDrop(state) {
    if (state.phase !== 'play') return false;
    const distance = ghostY(state) - state.active.y;
    state.active.y += distance; state.score += distance * 2; lock(state); return true;
  }
  function hold(state) {
    if (state.phase !== 'play' || state.holdUsed) return false;
    const kind = state.active.kind, stored = state.hold;
    state.hold = kind; spawn(state, stored); state.holdUsed = true; return true;
  }
  function dropInterval(state) { return Math.max(0.075, 0.8 * Math.pow(0.85, state.level - 1)); }
  function advance(state, dt) {
    if (state.phase !== 'play' || !Number.isFinite(dt) || dt <= 0) return;
    state.accumulator += Math.min(0.25, dt);
    while (state.accumulator + 1e-10 >= STEP && state.phase === 'play') {
      state.accumulator = Math.max(0, state.accumulator - STEP);
      state.gravityTime += STEP;
      const interval = dropInterval(state);
      if (state.gravityTime + 1e-10 >= interval) {
        state.gravityTime = Math.max(0, state.gravityTime - interval);
        if (!grounded(state)) state.active.y++;
      }
      if (grounded(state)) {
        state.lockTime += STEP;
        if (state.lockTime + 1e-10 >= LOCK_DELAY) lock(state);
      } else if (state.lockResets < MAX_RESETS) state.lockTime = 0;
    }
  }
  return Object.freeze({ WIDTH, HEIGHT, KINDS: Object.freeze(KINDS), STEP, LOCK_DELAY, MAX_RESETS, createGame, cells, collides, ghostY, move, rotate, softDrop, hardDrop, hold, advance, dropInterval });
});
