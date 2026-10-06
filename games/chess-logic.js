// version v1.0
/* DOM-free chess rules. Threefold repetition and 50 moves are automatic casual draws. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChessLogic = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  const history = new WeakMap();
  const KNIGHT = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const DIAGONAL = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const STRAIGHT = [[-1,0],[1,0],[0,-1],[0,1]];
  const ALL = DIAGONAL.concat(STRAIGHT);
  const VALUE = { P: 100, N: 320, B: 335, R: 500, Q: 900, K: 0 };
  const other = side => side === 'w' ? 'b' : 'w';
  const row = index => Math.floor(index / 8);
  const col = index => index % 8;
  const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  function attacked(board, square, by) {
    const r = row(square), c = col(square), pawnRow = r + (by === 'w' ? 1 : -1);
    for (const dc of [-1, 1]) {
      if (inside(pawnRow, c + dc) && board[pawnRow * 8 + c + dc] === by + 'P') return true;
    }
    for (const [dr, dc] of KNIGHT) {
      if (inside(r + dr, c + dc) && board[(r + dr) * 8 + c + dc] === by + 'N') return true;
    }
    for (const [dr, dc] of ALL) {
      let distance = 1;
      for (let nr = r + dr, nc = c + dc; inside(nr, nc); nr += dr, nc += dc, distance++) {
        const piece = board[nr * 8 + nc];
        if (!piece) continue;
        if (piece[0] === by && (piece[1] === 'Q' ||
          (dr && dc ? piece[1] === 'B' : piece[1] === 'R') ||
          (distance === 1 && piece[1] === 'K'))) return true;
        break;
      }
    }
    return false;
  }

  function inCheck(state, side = state.turn) {
    const king = state.board.indexOf(side + 'K');
    return king < 0 || attacked(state.board, king, other(side));
  }

  function snapshot(state) {
    return { ...state, board: state.board.slice(), positions: state.positions.slice(),
      lastMove: state.lastMove ? { ...state.lastMove } : null };
  }

  // Internal move application assumes legality; it does not alter history or classify the result.
  function apply(state, action) {
    const { from, to } = action, piece = state.board[from], side = piece[0];
    let captured = state.board[to], captureSquare = to;
    if (piece[1] === 'P' && to === state.enPassant && !captured && col(from) !== col(to)) {
      captureSquare = to + (side === 'w' ? 8 : -8);
      captured = state.board[captureSquare];
      state.board[captureSquare] = null;
    }
    state.board[from] = null;
    state.board[to] = action.promotion ? side + action.promotion : piece;
    if (piece[1] === 'K' && Math.abs(to - from) === 2) {
      const rookFrom = to > from ? from + 3 : from - 4;
      const rookTo = to > from ? from + 1 : from - 1;
      state.board[rookTo] = state.board[rookFrom];
      state.board[rookFrom] = null;
    }
    if (piece[1] === 'K') state.castling = state.castling.replace(side === 'w' ? /[KQ]/g : /[kq]/g, '');
    const corners = { 0: 'q', 7: 'k', 56: 'Q', 63: 'K' };
    if (corners[from]) state.castling = state.castling.replace(corners[from], '');
    if (corners[captureSquare]) state.castling = state.castling.replace(corners[captureSquare], '');
    state.enPassant = piece[1] === 'P' && Math.abs(to - from) === 16 ? (from + to) / 2 : null;
    state.halfmove = piece[1] === 'P' || captured ? 0 : state.halfmove + 1;
    state.ply++;
    state.turn = other(side);
    state.lastMove = { from, to, ...(action.promotion ? { promotion: action.promotion } : {}),
      ...(captured ? { capture: captured } : {}) };
  }

  function candidates(state, onlyFrom) {
    const moves = [], board = state.board, side = state.turn;
    const add = (from, to) => {
      const target = board[to];
      if (target && (target[0] === side || target[1] === 'K')) return false;
      if (board[from][1] === 'P' && (row(to) === 0 || row(to) === 7)) {
        for (const promotion of ['Q','R','B','N']) moves.push({ from, to, promotion });
      } else moves.push({ from, to });
      return !target;
    };
    for (let from = 0; from < 64; from++) {
      if (onlyFrom !== undefined && from !== onlyFrom) continue;
      const piece = board[from];
      if (!piece || piece[0] !== side) continue;
      const r = row(from), c = col(from), kind = piece[1];
      if (kind === 'P') {
        const dr = side === 'w' ? -1 : 1, nr = r + dr;
        if (!inside(nr, c)) continue;
        if (!board[nr * 8 + c]) {
          add(from, nr * 8 + c);
          if (r === (side === 'w' ? 6 : 1) && !board[(r + 2 * dr) * 8 + c]) add(from, (r + 2 * dr) * 8 + c);
        }
        for (const dc of [-1, 1]) {
          if (!inside(nr, c + dc)) continue;
          const to = nr * 8 + c + dc, target = board[to];
          if ((target && target[0] !== side) || (to === state.enPassant && !target &&
            board[r * 8 + c + dc] === other(side) + 'P')) add(from, to);
        }
      } else if (kind === 'N' || kind === 'K') {
        for (const [dr, dc] of kind === 'N' ? KNIGHT : ALL) {
          if (inside(r + dr, c + dc)) add(from, (r + dr) * 8 + c + dc);
        }
        if (kind === 'K' && from === (side === 'w' ? 60 : 4) && !inCheck(state, side)) {
          for (const kingside of [true, false]) {
            const right = side === 'w' ? (kingside ? 'K' : 'Q') : (kingside ? 'k' : 'q');
            const direction = kingside ? 1 : -1, rook = from + (kingside ? 3 : -4);
            const empty = kingside ? [from + 1, from + 2] : [from - 1, from - 2, from - 3];
            if (!state.castling.includes(right) || board[rook] !== side + 'R' || empty.some(i => board[i])) continue;
            // Remove the king before checking transit so it cannot hide a sliding attack.
            const transitBoard = board.slice();
            transitBoard[from] = null;
            if (!attacked(transitBoard, from + direction, other(side)) &&
              !attacked(transitBoard, from + 2 * direction, other(side))) add(from, from + 2 * direction);
          }
        }
      } else {
        const directions = kind === 'B' ? DIAGONAL : kind === 'R' ? STRAIGHT : ALL;
        for (const [dr, dc] of directions) {
          for (let nr = r + dr, nc = c + dc; inside(nr, nc); nr += dr, nc += dc) {
            if (!add(from, nr * 8 + nc)) break;
          }
        }
      }
    }
    return moves;
  }

  function legalMoves(state, from) {
    if (state.status !== 'playing' || (from !== undefined && (!Number.isInteger(from) || from < 0 || from > 63))) return [];
    const side = state.turn;
    return candidates(state, from).filter(action => {
      const trial = snapshot(state);
      apply(trial, action);
      return !inCheck(trial, side);
    });
  }

  function positionKey(state) {
    // An unusable en-passant square does not distinguish repeated positions (including pinned pawns).
    let ep = '-';
    if (state.enPassant !== null) {
      for (const action of candidates(state)) {
        if (action.to !== state.enPassant || state.board[action.from][1] !== 'P' || col(action.from) === col(action.to)) continue;
        const trial = snapshot(state);
        apply(trial, action);
        if (!inCheck(trial, state.turn)) { ep = state.enPassant; break; }
      }
    }
    return state.board.map(piece => piece || '.').join('') + ':' + state.turn + ':' + state.castling + ':' + ep;
  }

  function insufficientMaterial(state) {
    const pieces = state.board.flatMap((piece, index) => piece && piece[1] !== 'K' ? [{ piece, index }] : []);
    if (!pieces.length) return true;
    if (pieces.length === 1) return ['B', 'N'].includes(pieces[0].piece[1]);
    // Multiple bishops are dead only when every bishop is on the same square color.
    return pieces.every(item => item.piece[1] === 'B') &&
      new Set(pieces.map(item => (row(item.index) + col(item.index)) % 2)).size === 1;
  }

  function classify(state, available) {
    const moves = available || legalMoves(state);
    if (!moves.length) {
      const check = inCheck(state);
      state.status = check ? 'won' : 'draw';
      state.winner = check ? other(state.turn) : null;
      state.reason = check ? 'checkmate' : 'stalemate';
      return;
    }
    let reason = null;
    if (insufficientMaterial(state)) reason = 'insufficient-material';
    else if (state.halfmove >= 100) reason = 'fifty-move';
    else if (state.positions.filter(key => key === state.positions[state.positions.length - 1]).length >= 3) reason = 'threefold-repetition';
    if (reason) { state.status = 'draw'; state.winner = null; state.reason = reason; }
  }

  function fromFEN(fen) {
    if (typeof fen !== 'string') throw new TypeError('Invalid FEN');
    const fields = fen.trim().split(/\s+/), ranks = fields[0].split('/'), board = [];
    if (ranks.length !== 8 || !['w', 'b'].includes(fields[1])) throw new TypeError('Invalid FEN');
    for (const rank of ranks) {
      const start = board.length;
      for (const symbol of rank) {
        if (/^[1-8]$/.test(symbol)) board.push(...Array(Number(symbol)).fill(null));
        else if (/^[prnbqkPRNBQK]$/.test(symbol)) board.push((symbol === symbol.toUpperCase() ? 'w' : 'b') + symbol.toUpperCase());
        else throw new TypeError('Invalid FEN');
      }
      if (board.length - start !== 8) throw new TypeError('Invalid FEN');
    }
    const castling = fields[2] === '-' ? '' : fields[2];
    const ep = fields[3] || '-', halfmove = Number(fields[4] || 0), fullmove = Number(fields[5] || 1);
    if (typeof castling !== 'string' || !/^K?Q?k?q?$/.test(castling) ||
      !(ep === '-' || /^[a-h][36]$/.test(ep)) ||
      !Number.isSafeInteger(halfmove) || halfmove < 0 || !Number.isSafeInteger(fullmove) || fullmove < 1 ||
      board.filter(piece => piece === 'wK').length !== 1 || board.filter(piece => piece === 'bK').length !== 1) throw new TypeError('Invalid FEN');
    const state = { board, turn: fields[1], status: 'playing', winner: null, reason: null,
      ply: (fullmove - 1) * 2 + (fields[1] === 'b' ? 1 : 0), lastMove: null,
      castling, enPassant: ep === '-' ? null : (8 - Number(ep[1])) * 8 + ep.charCodeAt(0) - 97,
      halfmove, positions: [] };
    state.positions.push(positionKey(state));
    classify(state);
    history.set(state, []);
    return state;
  }

  function create() { return fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); }

  function move(state, requested) {
    if (!requested || typeof requested !== 'object' || !Number.isInteger(requested.from) || !Number.isInteger(requested.to)) return false;
    const action = legalMoves(state, requested.from).find(item => item.to === requested.to &&
      (item.promotion ? item.promotion === (requested.promotion || 'Q') : requested.promotion === undefined));
    if (!action) return false;
    const past = history.get(state) || [];
    past.push(snapshot(state));
    history.set(state, past);
    apply(state, action);
    state.positions.push(positionKey(state));
    classify(state);
    return true;
  }

  function canUndo(state) { return Boolean(history.get(state)?.length); }
  function undo(state) {
    const past = history.get(state);
    if (!past || !past.length) return false;
    Object.assign(state, past.pop());
    return true;
  }

  function evaluate(state) {
    let result = 0;
    for (let index = 0; index < 64; index++) {
      const piece = state.board[index];
      if (!piece) continue;
      const side = piece[0], kind = piece[1], advance = side === 'w' ? 6 - row(index) : row(index) - 1;
      const center = 3.5 - (Math.abs(3.5 - row(index)) + Math.abs(3.5 - col(index))) / 2;
      const positional = kind === 'P' ? advance * 9 + center * 4 :
        kind === 'N' || kind === 'B' ? center * 12 : kind === 'K' ? -center * 5 : center * 3;
      result += (VALUE[kind] + positional) * (side === 'w' ? 1 : -1);
    }
    return result * (state.turn === 'w' ? 1 : -1);
  }

  function chooseMove(state, difficulty = 'normal') {
    const available = legalMoves(state);
    if (!available.length) return null;
    let nodes = 0;
    const budget = difficulty === 'easy' ? 1200 : difficulty === 'hard' ? 16000 : 6000;
    const maxDepth = difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2;
    const priority = (position, action) => {
      const target = position.board[action.to], piece = position.board[action.from];
      return (target ? VALUE[target[1]] * 10 - VALUE[piece[1]] : 0) + (action.promotion ? VALUE[action.promotion] : 0);
    };
    function search(position, depth, alpha, beta, distance) {
      nodes++;
      const moves = legalMoves(position);
      if (!moves.length) return inCheck(position) ? -100000 + distance : 0;
      if (insufficientMaterial(position) || position.halfmove >= 100 ||
        position.positions.filter(key => key === position.positions[position.positions.length - 1]).length >= 3) return 0;
      if (depth === 0 || nodes >= budget) return evaluate(position);
      moves.sort((a, b) => priority(position, b) - priority(position, a));
      let best = -Infinity;
      for (const action of moves) {
        const trial = snapshot(position);
        apply(trial, action);
        trial.positions.push(positionKey(trial));
        const score = -search(trial, depth - 1, -beta, -alpha, distance + 1);
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
        if (alpha >= beta || nodes >= budget) break;
      }
      return best;
    }
    // Iterative deepening keeps a complete shallower result if the deeper search runs out of budget.
    let selected = available[0];
    for (let depth = 1; depth <= maxDepth; depth++) {
      let best = -Infinity, next = selected, complete = true;
      const ordered = available.slice().sort((a, b) => (a === selected ? -1 : b === selected ? 1 : priority(state, b) - priority(state, a)));
      for (const action of ordered) {
        if (nodes >= budget) { complete = false; break; }
        const trial = snapshot(state);
        apply(trial, action);
        trial.positions.push(positionKey(trial));
        const score = -search(trial, depth - 1, -Infinity, -best, 1);
        if (score > best) { best = score; next = action; }
      }
      if (complete) selected = next;
      else break;
    }
    return { ...selected };
  }

  return { create, fromFEN, legalMoves, move, inCheck, undo, canUndo, chooseMove };
});
