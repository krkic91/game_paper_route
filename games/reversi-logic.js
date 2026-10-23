// version v1.0
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeReversi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DIRECTIONS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const CORNERS = [0, 7, 56, 63];
  const ADJACENT = [[1, 8, 9], [6, 14, 15], [48, 49, 57], [54, 55, 62]];
  const validPlayer = player => player === 1 || player === -1;
  function createGame(options = {}) {
    const board = Array(64).fill(0);
    board[27] = board[36] = -1;
    board[28] = board[35] = 1;
    return { board, current: 1, phase: 'play', winner: null, lastMove: null, passed: null, turn: 0, history: [],
      mode: options.mode === 'local' ? 'local' : 'ai', human: options.human === -1 ? -1 : 1,
      level: ['easy', 'medium', 'hard'].includes(options.level) ? options.level : 'medium' };
  }
  function flipsAt(board, index, player) {
    if (!validPlayer(player) || !Number.isInteger(index) || index < 0 || index > 63 || board[index] !== 0) return [];
    const row = Math.floor(index / 8), col = index % 8, flips = [];
    for (const [dr, dc] of DIRECTIONS) {
      const line = [];
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === -player) {
        line.push(r * 8 + c); r += dr; c += dc;
      }
      if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === player) flips.push(...line);
    }
    return flips;
  }
  function legalMoves(state, player = state.current) {
    if (state.phase === 'finished' || !validPlayer(player)) return [];
    const moves = [];
    for (let index = 0; index < 64; index++) {
      const flips = flipsAt(state.board, index, player);
      if (flips.length) moves.push({ index, flips });
    }
    return moves;
  }
  function counts(state) {
    let black = 0, white = 0;
    for (const cell of state.board) { if (cell === 1) black++; if (cell === -1) white++; }
    return { black, white, empty: 64 - black - white };
  }
  function snapshot(state) {
    return { board: state.board.slice(), current: state.current, phase: state.phase, winner: state.winner,
      lastMove: state.lastMove, passed: state.passed, turn: state.turn };
  }
  function settle(state) {
    state.passed = null;
    if (legalMoves(state).length) return;
    const skipped = state.current;
    state.current = -state.current;
    if (legalMoves(state).length) { state.passed = skipped; return; }
    const { black, white } = counts(state);
    state.current = skipped;
    state.phase = 'finished';
    state.winner = black === white ? 0 : black > white ? 1 : -1;
  }
  function play(state, index) {
    if (state.phase !== 'play') return { ok: false, error: 'Ván đấu đã kết thúc.' };
    const flips = flipsAt(state.board, index, state.current);
    if (!flips.length) return { ok: false, error: 'Chọn ô trống kẹp được ít nhất một quân đối thủ.' };
    state.history.push(snapshot(state));
    const player = state.current;
    state.board[index] = player;
    for (const cell of flips) state.board[cell] = player;
    state.lastMove = index; state.turn++;
    state.current = -player;
    settle(state);
    return { ok: true, index, player, flips: flips.slice(), passed: state.passed };
  }
  function undo(state, count = 1) {
    if (!Number.isInteger(count) || count < 1 || !state.history.length) return false;
    for (let n = 0; n < count && state.history.length; n++) Object.assign(state, state.history.pop());
    return true;
  }
  function next(state, move) {
    const result = { ...state, board: state.board.slice(), history: [] };
    play(result, move.index);
    return result;
  }
  function positional(board, player) {
    let score = 0;
    for (let i = 0; i < 64; i++) {
      if (!board[i]) continue;
      const r = Math.floor(i / 8), c = i % 8;
      let weight = r === 0 || r === 7 || c === 0 || c === 7 ? 6 : 1;
      if (CORNERS.includes(i)) weight = 110;
      for (let k = 0; k < 4; k++) if (!board[CORNERS[k]] && ADJACENT[k].includes(i)) weight = -35;
      score += board[i] === player ? weight : -weight;
    }
    return score;
  }
  function evaluate(state, player) {
    const c = counts(state), own = player === 1 ? c.black : c.white, other = player === 1 ? c.white : c.black;
    if (state.phase === 'finished') return Math.sign(own - other) * 100000 + own - other;
    const mobility = legalMoves(state, player).length - legalMoves(state, -player).length;
    return positional(state.board, player) + mobility * 8 + (own - other) * (c.empty < 14 ? 5 : 0.2);
  }
  function ordered(state, moves) {
    const board = state.board.slice(), player = state.current;
    const choices = moves.map(move => {
      board[move.index] = player;
      for (const cell of move.flips) board[cell] = player;
      const order = positional(board, player);
      board[move.index] = 0;
      for (const cell of move.flips) board[cell] = -player;
      return { ...move, order };
    });
    return choices.sort((a, b) => b.order - a.order || a.index - b.index);
  }
  function chooseMove(state, level = state.level) {
    const moves = legalMoves(state);
    if (!moves.length) return null;
    const player = state.current, depth = level === 'hard' ? 5 : level === 'easy' ? 1 : 3;
    const budget = level === 'hard' ? 6000 : level === 'easy' ? 100 : 1200;
    let nodes = 0;
    function search(node, remaining, alpha, beta) {
      nodes++;
      if (remaining <= 0 || node.phase === 'finished' || nodes >= budget) return evaluate(node, player);
      const maximizing = node.current === player;
      let best = maximizing ? -Infinity : Infinity;
      const choices = ordered(node, legalMoves(node));
      if (!choices.length) return evaluate(node, player);
      for (const move of choices) {
        const score = search(next(node, move), remaining - 1, alpha, beta);
        best = maximizing ? Math.max(best, score) : Math.min(best, score);
        if (maximizing) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
        if (beta <= alpha || nodes >= budget) break;
      }
      return best;
    }
    // Finish an entire depth before accepting it so budget exhaustion does not favour
    // the first branch searched. The first legal move remains a safe fallback.
    const choices = ordered(state, moves);
    let selected = choices[0];
    for (let iteration = 1; iteration <= depth && nodes < budget; iteration++) {
      let best = -Infinity, candidate = selected, completed = true;
      for (const move of choices) {
        const score = search(next(state, move), iteration - 1, -Infinity, Infinity);
        if (nodes >= budget) { completed = false; break; }
        if (score > best) { best = score; candidate = move; }
      }
      if (completed) selected = candidate;
    }
    return { index: selected.index, flips: selected.flips.slice() };
  }
  function coordinate(index) { return `${'ABCDEFGH'[index % 8]}${Math.floor(index / 8) + 1}`; }
  function explainMove(state, move) {
    if (!move || !flipsAt(state.board, move.index, state.current).length) return '';
    const after = next(state, move), replies = legalMoves(after, -state.current);
    let reason;
    if (CORNERS.includes(move.index)) reason = 'Chiếm góc: quân ở góc không thể bị lật.';
    else if (after.phase === 'finished') reason = 'Nước này kết thúc ván; kết quả được tính bằng số quân trên bàn.';
    else if (after.passed === -state.current) reason = 'Đối thủ hết nước hợp lệ nên bạn được đi tiếp.';
    else if (replies.some(reply => CORNERS.includes(reply.index))) reason = 'Cần thận trọng: đối thủ có thể chiếm góc sau nước này.';
    else reason = `Không mở ngay một góc cho đối thủ; họ còn ${replies.length} lựa chọn hợp lệ.`;
    return `${coordinate(move.index)} lật ${move.flips.length} quân. ${reason} Gợi ý dùng tìm kiếm hữu hạn, không bảo đảm thắng.`;
  }
  return Object.freeze({ createGame, flipsAt, legalMoves, counts, play, undo, chooseMove, coordinate, explainMove });
});
