// version v1.0
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeDomino = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const validPlayer = player => Number.isInteger(player) && player >= 0 && player < 4;
  const handPips = hand => hand.reduce((sum, tile) => sum + tile.a + tile.b, 0);
  const fail = error => ({ ok: false, error });

  function createTiles() {
    const tiles = [];
    for (let a = 0; a <= 6; a++) {
      for (let b = a; b <= 6; b++) tiles.push({ id: `${a}-${b}`, a, b });
    }
    return tiles;
  }

  function findOpener(hands) {
    let best = null;
    hands.forEach((hand, player) => hand.forEach(tile => {
      // Any double takes precedence; numeric tie-breaks keep custom deals deterministic.
      const rank = (tile.a === tile.b ? 100 : 0) + (tile.a + tile.b) * 7 + Math.max(tile.a, tile.b);
      if (!best || rank > best.rank) best = { player, tileId: tile.id, rank };
    }));
    return best && { player: best.player, tileId: best.tileId };
  }

  function createGame({ random = Math.random } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    const deck = createTiles();
    for (let i = deck.length - 1; i > 0; i--) {
      const unit = Number(random());
      const j = Math.floor((Number.isFinite(unit) ? Math.max(0, Math.min(0.9999999999999999, unit)) : 0) * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const hands = [[], [], [], []];
    for (let i = 0; i < deck.length; i++) hands[i % 4].push(deck[i]);
    hands.forEach(hand => hand.sort((x, y) => x.a - y.a || x.b - y.b));
    const opener = findOpener(hands);
    return {
      hands, current: opener.player, openingId: opener.tileId, chain: [],
      phase: 'play', passes: 0, winner: null, draw: false, score: 0,
      reason: null, turn: 0, lastAction: null,
    };
  }

  function legalMoves(state, player = state && state.current) {
    if (!state || state.phase !== 'play' || !validPlayer(player) || state.current !== player) return [];
    const moves = [];
    for (const tile of state.hands[player]) {
      if (!state.chain.length) {
        if (tile.id === state.openingId) moves.push({ type: 'play', tileId: tile.id, end: 'right' });
        continue;
      }
      const left = state.chain[0].left, right = state.chain[state.chain.length - 1].right;
      if (tile.a === left || tile.b === left) moves.push({ type: 'play', tileId: tile.id, end: 'left' });
      if (tile.a === right || tile.b === right) moves.push({ type: 'play', tileId: tile.id, end: 'right' });
    }
    return moves;
  }

  function finish(state, winner, reason) {
    state.phase = 'finished';
    state.winner = winner;
    state.draw = winner === null;
    state.reason = reason;
    state.score = winner === null ? 0 : state.hands.reduce((sum, hand, player) => sum + (player === winner ? 0 : handPips(hand)), 0);
  }

  function playTile(state, player, tileId, end) {
    if (!legalMoves(state, player).some(move => move.tileId === tileId && move.end === end)) return fail('Nước đi không hợp lệ.');
    const index = state.hands[player].findIndex(tile => tile.id === tileId);
    const tile = state.hands[player][index];
    let left = tile.a, right = tile.b;
    if (state.chain.length) {
      const target = end === 'left' ? state.chain[0].left : state.chain[state.chain.length - 1].right;
      if ((end === 'left' && right !== target) || (end === 'right' && left !== target)) [left, right] = [right, left];
    }
    state.hands[player].splice(index, 1);
    const placed = { id: tile.id, left, right, player };
    if (end === 'left') state.chain.unshift(placed);
    else state.chain.push(placed);
    state.passes = 0;
    state.turn++;
    state.lastAction = { type: 'play', player, tileId, end, left, right };
    if (!state.hands[player].length) finish(state, player, 'empty');
    else state.current = (player + 1) % 4;
    return { ok: true, action: state.lastAction };
  }

  function passTurn(state, player) {
    if (!state || state.phase !== 'play' || !validPlayer(player) || state.current !== player) return fail('Chưa đến lượt của bạn.');
    if (legalMoves(state, player).length) return fail('Bạn còn quân hợp lệ, không thể bỏ lượt.');
    state.passes++;
    state.turn++;
    state.lastAction = { type: 'pass', player };
    if (state.passes === 4) {
      const totals = state.hands.map(handPips);
      const lowest = Math.min(...totals);
      const winners = totals.map((sum, index) => sum === lowest ? index : -1).filter(index => index >= 0);
      finish(state, winners.length === 1 ? winners[0] : null, 'blocked');
    } else state.current = (player + 1) % 4;
    return { ok: true, action: state.lastAction };
  }

  function applyAction(state, player, action) {
    if (!action || typeof action !== 'object') return fail('Thiếu nước đi.');
    if (action.type === 'play') return playTile(state, player, action.tileId, action.end);
    if (action.type === 'pass') return passTurn(state, player);
    return fail('Nước đi không được hỗ trợ.');
  }

  function chooseBotAction(state, player = state && state.current) {
    if (!state || state.phase !== 'play' || !validPlayer(player) || state.current !== player) return null;
    const moves = legalMoves(state, player);
    if (!moves.length) return { type: 'pass' };
    const hand = state.hands[player];
    // The bot sees only its own hand and the public chain, never opponents' tiles.
    const evaluate = move => {
      const tile = hand.find(item => item.id === move.tileId);
      const target = state.chain.length ? (move.end === 'left' ? state.chain[0].left : state.chain[state.chain.length - 1].right) : tile.a;
      const exposed = tile.a === target ? tile.b : tile.a;
      const support = hand.filter(item => item.id !== tile.id && (item.a === exposed || item.b === exposed)).length;
      return tile.a + tile.b + support * 2 + (tile.a === tile.b ? 2 : 0);
    };
    return moves.reduce((best, move) => evaluate(move) > evaluate(best) ? move : best);
  }

  return { createTiles, findOpener, createGame, handPips, legalMoves, playTile, passTurn, applyAction, chooseBotAction };
});
