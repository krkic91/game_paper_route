(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeDraughts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const crown = (piece, cell) => Math.abs(piece) === 1 && Math.floor(cell / 8) === (piece > 0 ? 0 : 7);
  const key = s => `${s.current}:${s.board.join(',')}`;
  function createGame(options = {}) {
    const board = Array.from({ length: 64 }, (_, i) => (Math.floor(i / 8) + i % 8) % 2 ? i < 24 ? -1 : i > 39 ? 1 : 0 : 0);
    const s = { board, current: 1, phase: 'play', winner: null, turn: 0, quiet: 0, history: [], positions: [],
      mode: options.mode === 'local' ? 'local' : 'ai', level: options.level === 'easy' ? 'easy' : 'medium', last: null };
    s.positions.push(key(s)); return s;
  }
  function legalMoves(s) {
    if (s.phase !== 'play') return [];
    const jumps = [], walks = [];
    function capture(board, at, piece, path, taken) {
      let more = false;
      for (const dr of Math.abs(piece) === 2 ? [-1, 1] : [-Math.sign(piece)]) for (const dc of [-1, 1]) {
        const r = Math.floor(at / 8), c = at % 8, mid = (r + dr) * 8 + c + dc, end = (r + dr * 2) * 8 + c + dc * 2;
        if (!inside(r + dr * 2, c + dc * 2) || Math.sign(board[mid]) !== -s.current || board[end]) continue;
        more = true;
        const next = board.slice(); next[at] = next[mid] = 0; next[end] = piece;
        const move = { path: [...path, end], taken: [...taken, mid] };
        if (crown(piece, end)) jumps.push(move);
        else capture(next, end, piece, move.path, move.taken);
      }
      if (!more && taken.length) jumps.push({ path, taken });
    }
    for (let at = 0; at < 64; at++) {
      const piece = s.board[at]; if (Math.sign(piece) !== s.current) continue;
      capture(s.board, at, piece, [at], []);
      for (const dr of Math.abs(piece) === 2 ? [-1, 1] : [-s.current]) for (const dc of [-1, 1]) {
        const r = Math.floor(at / 8) + dr, c = at % 8 + dc;
        if (inside(r, c) && !s.board[r * 8 + c]) walks.push({ path: [at, r * 8 + c], taken: [] });
      }
    }
    return jumps.length ? jumps : walks;
  }
  function advance(s, move) {
    const from = move.path[0], to = move.path[move.path.length - 1], piece = s.board[from];
    s.board[from] = 0; for (const cell of move.taken) s.board[cell] = 0;
    s.board[to] = crown(piece, to) ? piece * 2 : piece;
    s.quiet = move.taken.length || Math.abs(piece) === 1 ? 0 : s.quiet + 1;
    s.current *= -1; s.turn++; s.last = move.path.slice();
    s.positions.push(key(s));
    if (!legalMoves(s).length) { s.phase = 'finished'; s.winner = -s.current; }
    else if (s.quiet >= 80 || s.positions.filter(p => p === key(s)).length >= 3) { s.phase = 'finished'; s.winner = 0; }
  }
  function play(s, path) {
    const move = Array.isArray(path) && legalMoves(s).find(m => m.path.length === path.length && m.path.every((v, i) => v === path[i]));
    if (!move) return { ok: false, error: 'Phải bắt quân nếu có, và đi hết chuỗi bắt.' };
    const { history, ...snapshot } = s;
    history.push({ ...snapshot, board: s.board.slice(), positions: s.positions.slice() });
    advance(s, move); return { ok: true, move };
  }
  function undo(s) { if (!s.history.length) return false; Object.assign(s, s.history.pop()); return true; }
  function chooseMove(s, level = s.level) {
    const moves = legalMoves(s); if (!moves.length) return null;
    let nodes = 0;
    function search(position, depth, alpha, beta) {
      if (position.phase === 'finished') return position.winner === 0 ? 0 : position.winner * 100000;
      if (!depth || ++nodes > 14000) return position.board.reduce((sum, p, i) => sum + Math.sign(p) * (Math.abs(p) === 2 ? 175 : p ? 100 + (p > 0 ? 7 - Math.floor(i / 8) : Math.floor(i / 8)) * 4 : 0), 0);
      let best = position.current > 0 ? -Infinity : Infinity;
      for (const move of legalMoves(position)) {
        const next = { ...position, board: position.board.slice(), positions: position.positions.slice() }; advance(next, move);
        const value = search(next, depth - 1, alpha, beta);
        if (position.current > 0) { best = Math.max(best, value); alpha = Math.max(alpha, best); }
        else { best = Math.min(best, value); beta = Math.min(beta, best); }
        if (alpha >= beta) break;
      }
      return best;
    }
    let chosen = moves[0], best = -Infinity;
    for (const move of moves) {
      const next = { ...s, board: s.board.slice(), positions: s.positions.slice() }; advance(next, move);
      const value = s.current * search(next, level === 'easy' ? 1 : 4, -Infinity, Infinity);
      if (value > best) { best = value; chosen = move; }
    }
    return chosen;
  }
  return { createGame, legalMoves, play, undo, chooseMove };
});
