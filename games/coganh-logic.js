(function (root, factory) {
  'use strict'; const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ArcadeCoganh = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const inside = (r, c) => r >= 0 && r < 5 && c >= 0 && c < 5;
  function neighbors(i) {
    if (!Number.isInteger(i) || i < 0 || i >= 25) return [];
    const r = Math.floor(i / 5), c = i % 5, result = [];
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1], ...((r + c) % 2 === 0 ? [[1,1],[1,-1],[-1,1],[-1,-1]] : [])]) {
      if (inside(r + dr, c + dc)) result.push((r + dr) * 5 + c + dc);
    }
    return result;
  }
  const EDGES = Array.from({ length: 25 }, (_, i) => neighbors(i));
  const key = s => `${s.current}:${s.trap ?? '-'}:${s.board.join(',')}`;
  function createGame(options = {}) {
    const board = Array(25).fill(0);
    for (const i of [0,1,2,3,4,5,9,10]) board[i] = -1;
    for (const i of [14,15,19,20,21,22,23,24]) board[i] = 1;
    const s = { board, current: 1, phase: 'play', winner: null, turn: 0, quiet: 0, trap: null, last: null, positions: [], history: [],
      mode: options.mode === 'local' ? 'local' : 'ai', level: options.level === 'easy' ? 'easy' : 'medium', opening: options.opening !== false };
    s.positions.push(key(s)); return s;
  }
  function ganh(board, at, side) {
    const r = Math.floor(at / 5), c = at % 5, result = [];
    for (const [dr, dc] of [[1,0],[0,1], ...((r + c) % 2 === 0 ? [[1,1],[1,-1]] : [])]) {
      if (!inside(r + dr, c + dc) || !inside(r - dr, c - dc)) continue;
      const a = (r + dr) * 5 + c + dc, b = (r - dr) * 5 + c - dc;
      if (board[a] === -side && board[b] === -side) result.push(a, b);
    }
    return result;
  }
  function trapped(board, side) {
    const visited = new Set(), captured = [];
    for (let i = 0; i < 25; i++) {
      if (board[i] !== side || visited.has(i)) continue;
      const group = [i]; visited.add(i); let liberty = false;
      for (let n = 0; n < group.length; n++) for (const next of EDGES[group[n]]) {
        if (!board[next]) liberty = true;
        if (board[next] === side && !visited.has(next)) { visited.add(next); group.push(next); }
      }
      if (!liberty) captured.push(...group);
    }
    return captured;
  }
  function legalMoves(s) {
    if (s.phase !== 'play') return [];
    const moves = [];
    for (let from = 0; from < 25; from++) if (s.board[from] === s.current) {
      for (const to of EDGES[from]) if (!s.board[to]) moves.push({ from, to });
    }
    const forced = s.opening && s.trap != null ? moves.filter(m => m.to === s.trap) : [];
    return forced.length ? forced : moves;
  }
  function advance(s, move) {
    const side = s.current; s.board[move.from] = 0; s.board[move.to] = side;
    const pinched = ganh(s.board, move.to, side); for (const i of pinched) s.board[i] = side;
    const surrounded = trapped(s.board, -side); for (const i of surrounded) s.board[i] = side;
    const flipped = [...new Set([...pinched, ...surrounded])];
    s.current = -side; s.turn++; s.quiet = flipped.length ? 0 : s.quiet + 1; s.trap = null;
    if (s.opening && !flipped.length && ganh(s.board, move.from, -side).length && EDGES[move.from].some(i => s.board[i] === -side)) s.trap = move.from;
    s.last = { ...move, flipped, pinched, surrounded }; s.positions.push(key(s));
    if (!s.board.includes(-side) || !legalMoves(s).length) { s.phase = 'finished'; s.winner = side; }
    else if (s.quiet >= 80 || s.turn >= 300 || s.positions.filter(p => p === key(s)).length >= 3) { s.phase = 'finished'; s.winner = 0; }
  }
  function play(s, from, to) {
    if (!legalMoves(s).some(m => m.from === from && m.to === to)) return false;
    const { history, ...snapshot } = s;
    history.push({ ...snapshot, board: s.board.slice(), positions: s.positions.slice() });
    advance(s, { from, to }); return true;
  }
  function undo(s) { if (!s.history.length) return false; Object.assign(s, s.history.pop()); return true; }
  function chooseMove(s, level = s.level) {
    const choices = legalMoves(s); if (!choices.length) return null;
    let visited = 0;
    function search(p, depth, alpha, beta) {
      if (p.phase === 'finished') return p.winner * 100000;
      if (!depth || ++visited > 7000) return p.board.reduce((sum, v, i) => sum + v * (100 + EDGES[i].length), 0);
      let best = p.current > 0 ? -Infinity : Infinity;
      for (const m of legalMoves(p)) {
        const next = { ...p, board: p.board.slice(), positions: p.positions.slice() }; advance(next, m);
        const value = search(next, depth - 1, alpha, beta);
        if (p.current > 0) { best = Math.max(best, value); alpha = Math.max(alpha, best); }
        else { best = Math.min(best, value); beta = Math.min(beta, best); }
        if (alpha >= beta) break;
      }
      return best;
    }
    let best = choices[0], score = -Infinity;
    for (const m of choices) {
      const next = { ...s, board: s.board.slice(), positions: s.positions.slice() }; advance(next, m);
      const value = s.current * search(next, level === 'easy' ? 0 : 2, -Infinity, Infinity);
      if (value > score) { best = m; score = value; }
    }
    return { ...best };
  }
  return { createGame, neighbors, ganh, trapped, legalMoves, play, undo, chooseMove };
});
