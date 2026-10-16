// version v1.0
// Tiến lên miền Nam: one round, four seats, documented casual house rules.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeTienLen = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const RANKS = Object.freeze(['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']);
  const SUITS = Object.freeze(['♠', '♣', '♦', '♥']);
  const SUIT_NAMES = Object.freeze(['bích', 'tép', 'rô', 'cơ']);
  const validPlayer = player => Number.isInteger(player) && player >= 0 && player < 4;
  const order = (a, b) => a.rank - b.rank || a.suit - b.suit;
  const failure = error => ({ ok: false, error, events: [] });

  function createDeck() {
    return RANKS.flatMap((_, rank) => SUITS.map((__, suit) => Object.freeze({ id: `tl-${rank}-${suit}`, rank, suit })));
  }
  function cardName(card) {
    return `${RANKS[card.rank]} ${SUIT_NAMES[card.suit]}`;
  }
  function validCard(card) {
    return card && Number.isInteger(card.rank) && card.rank >= 0 && card.rank < 13 &&
      Number.isInteger(card.suit) && card.suit >= 0 && card.suit < 4 && card.id === `tl-${card.rank}-${card.suit}`;
  }
  function classify(cards) {
    if (!Array.isArray(cards) || !cards.length || cards.length > 13 || cards.some(card => !validCard(card)) || new Set(cards.map(card => card.id)).size !== cards.length) return null;
    const sorted = cards.slice().sort(order), size = sorted.length, top = sorted[size - 1];
    const result = type => ({ type, size, topRank: top.rank, topSuit: top.suit });
    if (size === 1) return result('single');
    if (sorted.every(card => card.rank === top.rank)) {
      return size <= 4 ? result(['', '', 'pair', 'triple', 'quad'][size]) : null;
    }
    // Twos never form a straight or a sequence of pairs in this variant.
    if (top.rank === 12) return null;
    if (size >= 3 && sorted.every((card, i) => !i || card.rank === sorted[i - 1].rank + 1)) return result('straight');
    if (size >= 6 && size % 2 === 0 && sorted.every((card, i) => !i || card.rank === sorted[i - 1].rank + (i % 2 ? 0 : 1))) return result('pairs');
    return null;
  }
  function comboName(combo) {
    if (!combo) return 'Chưa thành bộ';
    return ({ single: 'Lẻ', pair: 'Đôi', triple: 'Bộ ba', quad: 'Tứ quý', straight: `Sảnh ${combo.size} lá`, pairs: `${combo.size / 2} đôi thông` })[combo.type];
  }
  function beats(combo, previous) {
    if (!combo) return false;
    if (!previous) return true;
    if (combo.type === previous.type && combo.size === previous.size) {
      return combo.topRank > previous.topRank || (combo.topRank === previous.topRank && combo.topSuit > previous.topSuit);
    }
    const singleTwo = previous.type === 'single' && previous.topRank === 12;
    const pairTwo = previous.type === 'pair' && previous.topRank === 12;
    const threePairs = previous.type === 'pairs' && previous.size === 6;
    if (combo.type === 'pairs' && combo.size === 6) return singleTwo;
    if (combo.type === 'quad') return singleTwo || pairTwo || threePairs;
    if (combo.type === 'pairs' && combo.size === 8) return singleTwo || pairTwo || threePairs || previous.type === 'quad';
    return false;
  }
  function createGame({ random = Math.random } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    const deck = createDeck();
    for (let i = deck.length - 1; i > 0; i--) {
      const value = Number(random());
      const j = Math.floor((Number.isFinite(value) ? Math.max(0, Math.min(0.9999999999999999, value)) : 0) * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const hands = [[], [], [], []];
    deck.forEach((card, i) => hands[i % 4].push(card));
    hands.forEach(hand => hand.sort(order));
    return {
      hands, current: hands.findIndex(hand => hand.some(card => card.id === 'tl-0-0')),
      trick: null, passed: [false, false, false, false], opening: true,
      phase: 'play', winner: null, played: [], turn: 0, trickNumber: 1,
    };
  }
  function canAct(state, player) {
    return state && state.phase === 'play' && validPlayer(player) && player === state.current && !state.passed[player];
  }
  function choices(items, count) {
    const result = [];
    function visit(start, taken) {
      if (taken.length === count) { result.push(taken); return; }
      for (let i = start; i <= items.length - (count - taken.length); i++) visit(i + 1, taken.concat(items[i]));
    }
    visit(0, []);
    return result;
  }
  function combinations(hand) {
    const groups = Array.from({ length: 13 }, () => []), result = [];
    for (const card of hand) groups[card.rank].push(card);
    const add = cards => {
      const sorted = cards.slice().sort(order);
      result.push({ cards: sorted, cardIds: sorted.map(card => card.id), combo: classify(sorted) });
    };
    for (const group of groups) {
      for (let count = 1; count <= group.length; count++) for (const cards of choices(group, count)) add(cards);
    }
    for (const width of [1, 2]) {
      const rankChoices = groups.slice(0, 12).map(group => choices(group, width));
      for (let start = 0; start < 12; start++) {
        function extend(rank, cards) {
          if (rank >= 12) return;
          for (const next of rankChoices[rank]) {
            const joined = cards.concat(next);
            if (rank - start >= 2) add(joined);
            extend(rank + 1, joined);
          }
        }
        extend(start, []);
      }
    }
    return result;
  }
  function legalMoves(state, player = state && state.current) {
    if (!canAct(state, player)) return [];
    return combinations(state.hands[player]).filter(move =>
      (!state.opening || move.cardIds.includes('tl-0-0')) && beats(move.combo, state.trick && state.trick.combo));
  }
  function advance(state, actor, events) {
    if (state.passed.every((passed, player) => player === state.trick.player || passed)) {
      state.current = state.trick.player;
      state.trick = null;
      state.passed.fill(false);
      state.trickNumber++;
      events.push({ type: 'new-trick', player: state.current });
      return;
    }
    for (let distance = 1; distance <= 4; distance++) {
      const next = (actor + distance) % 4;
      if (!state.passed[next]) { state.current = next; return; }
    }
  }
  function play(state, player, cardIds) {
    if (!canAct(state, player)) return failure('Chưa đến lượt của bạn.');
    if (!Array.isArray(cardIds) || !cardIds.length || new Set(cardIds).size !== cardIds.length) return failure('Hãy chọn các lá bài khác nhau.');
    const hand = state.hands[player];
    const cards = cardIds.map(id => hand.find(card => card.id === id));
    if (cards.some(card => !card)) return failure('Lá bài không có trên tay.');
    const combo = classify(cards);
    if (!combo) return failure('Các lá đã chọn chưa tạo thành bộ hợp lệ.');
    if (state.opening && !cardIds.includes('tl-0-0')) return failure('Lượt đầu phải có 3 bích.');
    if (!beats(combo, state.trick && state.trick.combo)) return failure('Bộ bài này chưa chặn được bài trên bàn.');
    cards.sort(order);
    const selected = new Set(cardIds);
    state.hands[player] = hand.filter(card => !selected.has(card.id));
    state.played.push(...cards);
    state.trick = { player, cards, combo };
    state.opening = false;
    state.turn++;
    const events = [{ type: 'play', player, cards, combo }];
    if (!state.hands[player].length) {
      state.winner = player;
      state.phase = 'finished';
      events.push({ type: 'win', player });
    } else advance(state, player, events);
    return { ok: true, events };
  }
  function pass(state, player) {
    if (!canAct(state, player)) return failure('Chưa đến lượt của bạn.');
    if (!state.trick) return failure('Người mở vòng phải đánh bài.');
    state.passed[player] = true;
    state.turn++;
    const events = [{ type: 'pass', player }];
    advance(state, player, events);
    return { ok: true, events };
  }
  function chooseMove(state, player = state && state.current) {
    // Only this seat's cards and the public trick enter the move ranking.
    const moves = legalMoves(state, player);
    if (!moves.length) return { type: 'pass' };
    const hand = state.hands[player];
    const counts = Array(13).fill(0);
    hand.forEach(card => counts[card.rank]++);
    function cost(move) {
      if (move.cards.length === hand.length) return -10000;
      let split = 0;
      const used = Array(13).fill(0);
      move.cards.forEach(card => used[card.rank]++);
      used.forEach((count, rank) => { if (count && count < counts[rank]) split += (counts[rank] - count) * 5; });
      const power = move.combo.topRank * 0.8 + move.combo.topSuit * 0.08;
      const bomb = move.combo.type === 'quad' || move.combo.type === 'pairs';
      if (!state.trick) return -move.cards.length * 14 + split + power;
      const chop = move.combo.type !== state.trick.combo.type || move.combo.size !== state.trick.combo.size;
      return power + split + (chop ? 35 : 0) + (bomb ? 4 : 0) - move.cards.length;
    }
    moves.sort((a, b) => cost(a) - cost(b) || a.cardIds.join(',').localeCompare(b.cardIds.join(',')));
    return { type: 'play', cardIds: moves[0].cardIds.slice() };
  }
  return Object.freeze({ RANKS, SUITS, SUIT_NAMES, createDeck, createGame, cardName, order, classify, comboName, beats, legalMoves, play, pass, chooseMove });
});
