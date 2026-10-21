// version v1.0
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeJungle = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const NAMES = Object.freeze(['', 'Chuột', 'Mèo', 'Sói', 'Chó', 'Báo', 'Hổ', 'Sư tử', 'Voi']);
  const DENS = Object.freeze([59, 3]);
  const TRAPS = Object.freeze([[58, 60, 52], [2, 4, 10]].map(Object.freeze));
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const VALUE = [0, 145, 110, 165, 210, 270, 410, 460, 490];
  const sideOf = piece => piece > 0 ? 0 : 1;
  const row = i => Math.floor(i / 7), col = i => i % 7;
  const inside = (r, c) => r >= 0 && r < 9 && c >= 0 && c < 7;
  const water = i => row(i) >= 3 && row(i) <= 5 && [1, 2, 4, 5].includes(col(i));
  const trapOwner = i => TRAPS[0].includes(i) ? 0 : TRAPS[1].includes(i) ? 1 : null;
  const coordinate = i => `${'ABCDEFG'[col(i)]}${9 - row(i)}`;
  const positionKey = state => `${state.turn}:${state.board.join(',')}`;

  function initialBoard() {
    const board = Array(63).fill(0);
    // Rotational symmetry: each elephant faces the opposing rat.
    const top = [[0, 7], [6, 6], [8, 4], [12, 2], [14, 1], [16, 5], [18, 3], [20, 8]];
    for (const [square, rank] of top) { board[square] = -rank; board[62 - square] = rank; }
    return board;
  }

  function createGame({ first = 0 } = {}) {
    const state = { board: initialBoard(), turn: first === 1 ? 1 : 0, phase: 'play', winner: null,
      reason: null, ply: 0, quiet: 0, lastMove: null, captured: [], positions: [], history: [] };
    state.positions.push(positionKey(state));
    return state;
  }

  function canCapture(state, from, to) {
    const attacker = state.board[from], defender = state.board[to];
    if (!attacker || !defender || sideOf(attacker) === sideOf(defender)) return false;
    // A capture never crosses the water/land boundary, including rat against rat.
    if (water(from) !== water(to)) return false;
    const a = Math.abs(attacker), d = Math.abs(defender);
    if (trapOwner(to) === sideOf(attacker)) return true;
    if (a === 1 && d === 8) return true;
    if (a === 8 && d === 1) return false;
    // Leaving a hostile trap restores the moving animal's normal strength.
    return a >= d;
  }

  function legalMoves(state, side = state.turn) {
    if (state.phase !== 'play') return [];
    const moves = [];
    for (let from = 0; from < 63; from++) {
      const piece = state.board[from], rank = Math.abs(piece);
      if (!piece || sideOf(piece) !== side) continue;
      for (const [dr, dc] of DIRS) {
        let r = row(from) + dr, c = col(from) + dc, jumped = false, blocked = false;
        if (!inside(r, c)) continue;
        let to = r * 7 + c;
        if (water(to) && rank !== 1) {
          if (rank !== 6 && rank !== 7) continue;
          jumped = true;
          while (inside(r, c) && water(r * 7 + c)) {
            if (state.board[r * 7 + c]) { blocked = true; break; }
            r += dr; c += dc;
          }
          if (blocked || !inside(r, c)) continue;
          to = r * 7 + c;
        }
        if (to === DENS[side]) continue;
        const target = state.board[to];
        if (target && !canCapture(state, from, to)) continue;
        moves.push({ from, to, capture: target, jump: jumped });
      }
    }
    return moves;
  }

  function snapshot(state) {
    return { ...state, board: state.board.slice(), captured: state.captured.slice(),
      positions: state.positions.slice(), history: undefined,
      lastMove: state.lastMove ? { ...state.lastMove } : null };
  }
  function finish(state, winner, reason) { state.phase = 'finished'; state.winner = winner; state.reason = reason; }
  function apply(state, action) {
    const piece = state.board[action.from], captured = state.board[action.to], mover = state.turn;
    state.board[action.from] = 0;
    state.board[action.to] = piece;
    state.lastMove = { ...action, piece, capture: captured };
    state.ply++;
    state.quiet = captured ? 0 : state.quiet + 1;
    if (captured) state.captured.push(captured);
    state.turn = 1 - mover;
    const key = positionKey(state);
    state.positions.push(key);
    if (action.to === DENS[1 - mover]) finish(state, mover, 'den');
    else if (!legalMoves(state).length) finish(state, mover, 'no-moves');
    else if (state.positions.filter(value => value === key).length >= 3) finish(state, null, 'repetition');
    else if (state.quiet >= 100) finish(state, null, 'quiet');
    else if (state.ply >= 300) finish(state, null, 'limit');
  }

  function move(state, from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to)) return { ok: false, error: 'Ô không hợp lệ.' };
    const action = legalMoves(state).find(item => item.from === from && item.to === to);
    if (!action) return { ok: false, error: 'Nước đi không hợp lệ.' };
    state.history.push(snapshot(state));
    apply(state, action);
    return { ok: true, ...action };
  }

  function undo(state, plies = 1) {
    if (!Number.isInteger(plies) || plies < 1 || !state.history.length) return false;
    const remaining = state.history;
    let previous;
    for (let i = 0; i < plies && remaining.length; i++) previous = remaining.pop();
    Object.assign(state, previous, { history: remaining });
    return true;
  }

  function evaluate(state, side) {
    if (state.phase === 'finished') return state.winner === null ? 0 : state.winner === side ? 100000 : -100000;
    let value = 0;
    for (let square = 0; square < 63; square++) {
      const piece = state.board[square];
      if (!piece) continue;
      const owner = sideOf(piece), rank = Math.abs(piece), goal = DENS[1 - owner];
      const distance = Math.abs(row(square) - row(goal)) + Math.abs(col(square) - col(goal));
      let points = VALUE[rank] + (11 - distance) * 10 + 150 / (distance + 1);
      if (trapOwner(square) === 1 - owner) points -= VALUE[rank] * .7;
      value += owner === side ? points : -points;
    }
    return value;
  }

  function chooseMove(state, difficulty = 'normal', random = Math.random) {
    const moves = legalMoves(state);
    if (!moves.length) return null;
    const side = state.turn, maximum = difficulty === 'hard' ? 2600 : difficulty === 'normal' ? 650 : 80;
    const depth = difficulty === 'hard' ? 3 : difficulty === 'normal' ? 2 : 1;
    let nodes = 0;
    const ordered = (s, list) => list.sort((a, b) => {
      const priority = m => (m.to === DENS[1 - s.turn] ? 100000 : 0) + VALUE[Math.abs(m.capture)] * 3 +
        (s.turn === 0 ? row(m.from) - row(m.to) : row(m.to) - row(m.from)) * 12;
      return priority(b) - priority(a);
    });
    function search(s, remaining, alpha, beta) {
      nodes++;
      if (remaining <= 0 || s.phase === 'finished' || nodes >= maximum) return evaluate(s, side);
      const maximizing = s.turn === side;
      let best = maximizing ? -Infinity : Infinity;
      for (const action of ordered(s, legalMoves(s))) {
        const next = snapshot(s);
        apply(next, action);
        const score = search(next, remaining - 1, alpha, beta);
        best = maximizing ? Math.max(best, score) : Math.min(best, score);
        if (maximizing) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
        if (beta <= alpha || nodes >= maximum) break;
      }
      return Number.isFinite(best) ? best : evaluate(s, side);
    }
    let best = -Infinity, choice = moves[0];
    for (const action of ordered(state, moves)) {
      const next = snapshot(state);
      apply(next, action);
      const score = search(next, depth - 1, -Infinity, Infinity) +
        (difficulty === 'easy' ? (random() - .5) * 180 : random() * .1);
      if (score > best) { best = score; choice = action; }
    }
    return { ...choice };
  }
  return Object.freeze({ NAMES, DENS, TRAPS, createGame, initialBoard, sideOf, water, trapOwner,
    coordinate, positionKey, canCapture, legalMoves, move, undo, chooseMove });
});
