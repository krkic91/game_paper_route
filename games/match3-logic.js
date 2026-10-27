(function (root, factory) {
  'use strict'; const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ArcadeMatch3 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SIZE = 8, TYPES = 6;
  function matches(board) {
    const found = new Set();
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const at = r * SIZE + c, gem = board[at]; if (gem == null) continue;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const line = []; let y = r, x = c;
        while (y < SIZE && x < SIZE && board[y * SIZE + x] === gem) { line.push(y * SIZE + x); y += dr; x += dc; }
        if (line.length >= 3) for (const i of line) found.add(i);
      }
    }
    return [...found];
  }
  const adjacent = (a, b) => Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a < 64 && b < 64 && Math.abs(Math.floor(a / 8) - Math.floor(b / 8)) + Math.abs(a % 8 - b % 8) === 1;
  function validSwap(board, a, b) {
    if (!adjacent(a, b) || board[a] === board[b]) return false;
    const copy = board.slice(); [copy[a], copy[b]] = [copy[b], copy[a]];
    return matches(copy).some(i => i === a || i === b);
  }
  function moves(board) {
    const result = [];
    for (let i = 0; i < 64; i++) for (const j of [i + 1, i + 8]) if (validSwap(board, i, j)) result.push([i, j]);
    return result;
  }
  function generate(rng = Math.random) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const board = [];
      for (let i = 0; i < 64; i++) {
        const allowed = Array.from({ length: TYPES }, (_, k) => k).filter(k => !(i % 8 >= 2 && board[i - 1] === k && board[i - 2] === k) && !(i >= 16 && board[i - 8] === k && board[i - 16] === k));
        board.push(allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))]);
      }
      if (moves(board).length) return board;
    }
    // A stable board with a guaranteed opening even with an adversarial random source.
    const board = Array.from({ length: 64 }, (_, i) => (Math.floor(i / 8) * 2 + i % 8) % TYPES);
    board[0] = board[2] = board[9] = 0; board[1] = 1; return board;
  }
  function createGame(rng = Math.random) { return { board: generate(rng), score: 0, movesLeft: 30, phase: 'play', combo: 0, turn: 0 }; }
  function swap(s, a, b) {
    if (s.phase !== 'play' || !validSwap(s.board, a, b)) return false;
    [s.board[a], s.board[b]] = [s.board[b], s.board[a]];
    s.movesLeft--; s.turn++; s.combo = 0; s.phase = 'cascade'; return true;
  }
  function cascade(s, rng = Math.random) {
    if (s.phase !== 'cascade') return { cleared: [], done: true };
    const cleared = matches(s.board);
    if (!cleared.length || s.combo >= 30) {
      const reshuffled = s.combo >= 30 || !moves(s.board).length;
      if (reshuffled) s.board = generate(rng);
      s.phase = s.movesLeft ? 'play' : 'finished';
      return { cleared: [], done: true, reshuffled };
    }
    s.combo++; const points = cleared.length * 10 * s.combo; s.score += points;
    for (const i of cleared) s.board[i] = null;
    for (let c = 0; c < 8; c++) {
      const column = []; for (let r = 7; r >= 0; r--) if (s.board[r * 8 + c] != null) column.push(s.board[r * 8 + c]);
      for (let r = 7; r >= 0; r--) s.board[r * 8 + c] = column[7 - r] ?? Math.min(TYPES - 1, Math.floor(rng() * TYPES));
    }
    return { cleared, points, done: false };
  }
  return { SIZE, TYPES, matches, moves, validSwap, generate, createGame, swap, cascade };
});
