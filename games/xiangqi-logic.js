// version v1.0
/* Casual Xiangqi: standard movement; threefold repetition is an automatic draw. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.XiangqiLogic = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  const records = new WeakMap();
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const horseSteps = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];
  const values = { K: 100000, R: 900, C: 450, N: 400, B: 200, A: 200, P: 100 };
  const other = side => side === 'r' ? 'b' : 'r';
  const inside = (row, column) => row >= 0 && row < 10 && column >= 0 && column < 9;
  const palace = (row, column, side) => column >= 3 && column <= 5 && (side === 'r' ? row >= 7 && row <= 9 : row >= 0 && row <= 2);
  const crossed = (row, side) => side === 'r' ? row <= 4 : row >= 5;
  const positionKey = state => state.turn + ':' + state.board.map((piece, i) => (piece || '--') + (state.covered?.[i] ? '?' : '')).join('');

  function create(options = {}) {
    const board = Array(90).fill(null);
    'RNBAKABNR'.split('').forEach((piece, column) => {
      board[column] = 'b' + piece;
      board[81 + column] = 'r' + piece;
    });
    for (const column of [1, 7]) {
      board[18 + column] = 'bC';
      board[63 + column] = 'rC';
    }
    for (const column of [0, 2, 4, 6, 8]) {
      board[27 + column] = 'bP';
      board[54 + column] = 'rP';
    }
    const state = { board, turn: 'r', status: 'playing', winner: null, reason: null, ply: 0, lastMove: null };
    let identities = null;
    if (options.variant === 'hidden') {
      const random = options.random || Math.random;
      identities = Array(90).fill(null);
      state.variant = 'hidden'; state.covered = board.map(p => Boolean(p && p[1] !== 'K'));
      state.revealed = []; state.quiet = 0;
      for (const side of ['r', 'b']) {
        const cells = board.flatMap((p, i) => p?.[0] === side && p[1] !== 'K' ? [i] : []);
        const pieces = cells.map(i => board[i]);
        for (let i = pieces.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor(random() * (i + 1))); [pieces[i], pieces[j]] = [pieces[j], pieces[i]]; }
        cells.forEach((cell, i) => { identities[cell] = pieces[i]; });
      }
    }
    records.set(state, { history: [], positions: [positionKey(state)], identities });
    return state;
  }

  function screens(board, from, to) {
    const row = Math.floor(from / 9), column = from % 9;
    const targetRow = Math.floor(to / 9), targetColumn = to % 9;
    if (row !== targetRow && column !== targetColumn) return -1;
    const step = row === targetRow ? Math.sign(targetColumn - column) : 9 * Math.sign(targetRow - row);
    if (!step) return -1;
    let count = 0;
    for (let index = from + step; index !== to; index += step) if (board[index]) count++;
    return count;
  }

  // Attack geometry includes the opposing king, unlike playable move destinations.
  function attacks(board, from, to, covered) {
    const piece = board[from], side = piece[0], type = piece[1];
    const row = Math.floor(from / 9), column = from % 9;
    const targetRow = Math.floor(to / 9), targetColumn = to % 9;
    const dr = targetRow - row, dc = targetColumn - column;
    if (type === 'R') return screens(board, from, to) === 0;
    if (type === 'C') return screens(board, from, to) === 1;
    if (type === 'N') {
      if (Math.abs(dr) * Math.abs(dc) !== 2) return false;
      const leg = Math.abs(dr) === 2 ? from + Math.sign(dr) * 9 : from + Math.sign(dc);
      return !board[leg];
    }
    if (type === 'B') return Math.abs(dr) === 2 && Math.abs(dc) === 2 && ((covered && !covered[from]) || !crossed(targetRow, side)) && !board[from + dr / 2 * 9 + dc / 2];
    if (type === 'A') return Math.abs(dr) === 1 && Math.abs(dc) === 1 && ((covered && !covered[from]) || palace(targetRow, targetColumn, side));
    if (type === 'K') {
      if (dc === 0 && board[to] === other(side) + 'K' && screens(board, from, to) === 0) return true;
      return Math.abs(dr) + Math.abs(dc) === 1 && palace(targetRow, targetColumn, side);
    }
    if (type === 'P') return (dc === 0 && dr === (side === 'r' ? -1 : 1)) || (dr === 0 && Math.abs(dc) === 1 && crossed(row, side));
    return false;
  }

  function checked(board, side, covered) {
    const king = board.indexOf(side + 'K');
    if (king < 0) return true;
    const enemy = other(side);
    for (let index = 0; index < 90; index++) {
      if (board[index] && board[index][0] === enemy && attacks(board, index, king, covered)) return true;
    }
    return false;
  }

  function inCheck(state, side = state.turn) { return checked(state.board, side, state.covered); }

  function destinations(board, from, covered) {
    const piece = board[from], side = piece[0], type = piece[1];
    const row = Math.floor(from / 9), column = from % 9, result = [];
    const add = (r, c) => {
      if (!inside(r, c)) return;
      const to = r * 9 + c, target = board[to];
      if (!target || (target[0] !== side && target[1] !== 'K')) result.push(to);
    };
    if (type === 'R' || type === 'C') {
      for (const [dr, dc] of directions) {
        let screen = false;
        for (let r = row + dr, c = column + dc; inside(r, c); r += dr, c += dc) {
          const target = board[r * 9 + c];
          if (!screen) {
            if (!target) add(r, c);
            else if (type === 'R') { add(r, c); break; }
            else screen = true;
          } else if (target) { add(r, c); break; }
        }
      }
    } else if (type === 'N') {
      for (const [dr, dc] of horseSteps) {
        const leg = Math.abs(dr) === 2 ? from + Math.sign(dr) * 9 : from + Math.sign(dc);
        if (!board[leg]) add(row + dr, column + dc);
      }
    } else if (type === 'B' || type === 'A') {
      const distance = type === 'B' ? 2 : 1;
      for (const dr of [-distance, distance]) for (const dc of [-distance, distance]) {
        const r = row + dr, c = column + dc;
        if (type === 'B' ? ((covered && !covered[from]) || !crossed(r, side)) && !board[from + dr / 2 * 9 + dc / 2] : (covered && !covered[from]) || palace(r, c, side)) add(r, c);
      }
    } else if (type === 'K') {
      for (const [dr, dc] of directions) if (palace(row + dr, column + dc, side)) add(row + dr, column + dc);
    } else if (type === 'P') {
      add(row + (side === 'r' ? -1 : 1), column);
      if (crossed(row, side)) { add(row, column - 1); add(row, column + 1); }
    }
    return result;
  }

  function boardMoves(board, side, from, firstOnly = false, covered) {
    const result = [];
    const start = from === undefined ? 0 : from, end = from === undefined ? 90 : from + 1;
    for (let index = start; index < end; index++) {
      const piece = board[index];
      if (!piece || piece[0] !== side) continue;
      for (const to of destinations(board, index, covered)) {
        const captured = board[to];
        board[to] = piece; board[index] = null;
        const safe = !checked(board, side, covered);
        board[index] = piece; board[to] = captured;
        if (safe) {
          result.push({ from: index, to });
          if (firstOnly) return result;
        }
      }
    }
    return result;
  }

  function legalMoves(state, from) {
    if (state.status !== 'playing' || (from !== undefined && (!Number.isInteger(from) || from < 0 || from >= 90))) return [];
    return boardMoves(state.board, state.turn, from, false, state.covered);
  }

  function snapshot(state) {
    return { board: state.board.slice(), turn: state.turn, status: state.status, winner: state.winner, reason: state.reason, ply: state.ply, lastMove: state.lastMove && { ...state.lastMove },
      ...(state.covered ? { covered: state.covered.slice(), revealed: state.revealed.slice(), quiet: state.quiet } : {}) };
  }

  function move(state, requested) {
    if (!requested || !legalMoves(state, requested.from).some(candidate => candidate.from === requested.from && candidate.to === requested.to)) return false;
    let record = records.get(state);
    if (!record) { record = { history: [], positions: [positionKey(state)] }; records.set(state, record); }
    record.history.push({ state: snapshot(state), identities: record.identities?.slice() });
    let capture = state.board[requested.to];
    const wasCovered = Boolean(state.covered?.[requested.from]);
    const capturedCovered = Boolean(state.covered?.[requested.to]);
    state.board[requested.to] = state.board[requested.from]; state.board[requested.from] = null;
    if (state.covered) {
      if (capturedCovered) { capture = record.identities[requested.to]; state.revealed.push(capture); }
      if (wasCovered) { state.board[requested.to] = record.identities[requested.from]; state.revealed.push(state.board[requested.to]); }
      record.identities[requested.from] = record.identities[requested.to] = null;
      state.covered[requested.from] = state.covered[requested.to] = false;
      state.quiet = capture || wasCovered ? 0 : state.quiet + 1;
    }
    state.lastMove = { from: requested.from, to: requested.to, capture, ...(state.covered ? { revealed: wasCovered ? state.board[requested.to] : null, capturedCovered } : {}) };
    state.turn = other(state.turn); state.ply++;
    const key = positionKey(state);
    record.positions.push(key);
    if (!boardMoves(state.board, state.turn, undefined, true, state.covered).length) {
      state.status = 'won'; state.winner = other(state.turn);
      state.reason = inCheck(state) ? 'checkmate' : 'stalemate';
    } else if (record.positions.filter(position => position === key).length >= 3) {
      state.status = 'draw'; state.winner = null; state.reason = 'repetition';
    } else if (state.covered && state.quiet >= 120) {
      state.status = 'draw'; state.winner = null; state.reason = 'quiet';
    }
    return true;
  }

  function canUndo(state) { return !!records.get(state)?.history.length; }

  function undo(state) {
    const record = records.get(state);
    if (!record || !record.history.length) return false;
    const previous = record.history.pop();
    Object.assign(state, previous.state); record.identities = previous.identities;
    record.positions.pop();
    return true;
  }

  function evaluate(board, side) {
    let result = 0;
    for (let index = 0; index < 90; index++) {
      const piece = board[index];
      if (!piece) continue;
      const row = Math.floor(index / 9), column = index % 9;
      const progress = piece[0] === 'r' ? 9 - row : row;
      let bonus = 0;
      if (piece[1] === 'P') bonus = progress * 6 + (crossed(row, piece[0]) ? 70 + (4 - Math.abs(4 - column)) * 3 : 0);
      if (piece[1] === 'N' || piece[1] === 'C') bonus = (4 - Math.abs(4 - column)) * 6 + Math.min(progress, 5) * 3;
      if (piece[1] === 'R') bonus = Math.min(progress, 5) * 2;
      result += (piece[0] === side ? 1 : -1) * (values[piece[1]] + bonus);
    }
    return result;
  }

  // The search works only on a copy. Two plies and a node cap keep a browser turn bounded.
  function chooseMove(state, difficulty = 'normal') {
    if (state.covered) return chooseHiddenMove(state, difficulty);
    const candidates = legalMoves(state);
    if (!candidates.length) return null;
    const board = state.board.slice(), depth = difficulty === 'easy' ? 1 : 2;
    let visited = 0;
    const order = moves => moves.sort((a, b) => (board[b.to] ? values[board[b.to][1]] : 0) - (board[a.to] ? values[board[a.to][1]] : 0));
    function search(side, remaining, alpha, beta, distance) {
      visited++;
      const replies = boardMoves(board, side, undefined, remaining === 0 || visited > 12000);
      if (!replies.length) return -1000000 + distance; // Stalemate also loses in Xiangqi.
      if (!remaining || visited > 12000) return evaluate(board, side);
      let best = -Infinity;
      for (const reply of order(replies)) {
        const piece = board[reply.from], capture = board[reply.to];
        board[reply.to] = piece; board[reply.from] = null;
        const score = -search(other(side), remaining - 1, -beta, -alpha, distance + 1);
        board[reply.from] = piece; board[reply.to] = capture;
        best = Math.max(best, score); alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
      }
      return best;
    }
    let best = candidates[0], bestScore = -Infinity;
    for (const candidate of order(candidates)) {
      const piece = board[candidate.from], capture = board[candidate.to];
      board[candidate.to] = piece; board[candidate.from] = null;
      const score = -search(other(state.turn), depth - 1, -Infinity, -bestScore, 1);
      board[candidate.from] = piece; board[candidate.to] = capture;
      if (score > bestScore) { bestScore = score; best = candidate; }
    }
    return { ...best };
  }

  // Only public information enters this evaluator. Unknown identities stay in
  // records; the bot averages possible reveals from the publicly remaining pool.
  function chooseHiddenMove(state, difficulty) {
    const candidates = legalMoves(state), side = state.turn;
    if (!candidates.length) return null;
    const pools = {};
    for (const color of ['r', 'b']) {
      const pool = 'RRNNBBAACCPPPPP'.split('').map(p => color + p);
      for (const piece of state.revealed) { const i = pool.indexOf(piece); if (i >= 0) pool.splice(i, 1); }
      pools[color] = pool.length ? pool : [color + 'P'];
    }
    const average = color => pools[color].reduce((sum, p) => sum + values[p[1]], 0) / pools[color].length;
    const means = { r: average('r'), b: average('b') };
    function material(board, covered) {
      return board.reduce((sum, p, i) => sum + (p ? (p[0] === side ? 1 : -1) * (covered[i] ? means[p[0]] : values[p[1]]) : 0), 0);
    }
    let best = candidates[0], bestScore = -Infinity;
    for (const candidate of candidates) {
      const options = state.covered[candidate.from] ? pools[side] : [state.board[candidate.from]];
      let total = 0;
      for (const piece of options) {
        const board = state.board.slice(), covered = state.covered.slice();
        board[candidate.from] = null; board[candidate.to] = piece;
        covered[candidate.from] = covered[candidate.to] = false;
        const replies = boardMoves(board, other(side), undefined, false, covered);
        let score = replies.length ? material(board, covered) : 1000000;
        if (difficulty !== 'easy' && replies.length) {
          // One opponent reply, with any unknown mover still valued as unknown.
          let replyScore = Infinity;
          for (const reply of replies) {
            const after = board.slice(), masks = covered.slice();
            after[reply.to] = after[reply.from]; after[reply.from] = null;
            masks[reply.to] = masks[reply.from]; masks[reply.from] = false;
            replyScore = Math.min(replyScore, material(after, masks));
          }
          score = replyScore;
        }
        score += state.covered[candidate.from] ? 16 : 0;
        score += (4 - Math.abs(candidate.to % 9 - 4)) * 2;
        if (checked(board, other(side), covered)) score += 12;
        total += score;
      }
      const expected = total / options.length;
      if (expected > bestScore) { bestScore = expected; best = candidate; }
    }
    return { ...best };
  }

  return { create, legalMoves, move, inCheck, undo, canUndo, chooseMove };
});
