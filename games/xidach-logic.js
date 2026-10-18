// version v1.0
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeXiDach = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const SUITS = Object.freeze(['spades', 'clubs', 'diamonds', 'hearts']);
  const fail = error => ({ ok: false, error });

  function createDeck() {
    return SUITS.flatMap(suit => Array.from({ length: 13 }, (_, index) => ({
      id: `${suit}-${index + 1}`, suit, rank: index + 1,
    })));
  }

  function evaluate(hand) {
    let totals = [0];
    for (const card of hand) {
      const values = card.rank === 1 ? [1, 10, 11] : [Math.min(card.rank, 10)];
      totals = [...new Set(totals.flatMap(total => values.map(value => total + value)))].sort((a, b) => a - b);
    }
    const validTotals = totals.filter(total => total <= 21);
    const bust = !validTotals.length;
    const total = bust ? totals[0] : validTotals[validTotals.length - 1];
    const aceCount = hand.filter(card => card.rank === 1).length;
    let type = bust ? 'bust' : total >= 16 ? 'normal' : 'under';
    let rank = type === 'normal' ? 1 : 0;
    let points = total;
    if (!bust && hand.length === 2 && aceCount === 2) { type = 'xiban'; rank = 4; }
    else if (!bust && hand.length === 2 && aceCount === 1 && hand.some(card => card.rank >= 10)) { type = 'xidach'; rank = 3; }
    else if (!bust && hand.length === 5) { type = 'ngulinh'; rank = 2; points = validTotals[0]; }
    return { type, rank, total, points, totals, validTotals, bust, soft: !bust && aceCount > 0 && total > totals[0] };
  }

  // Positive means the player wins. A player bust is an immediate loss.
  function compareHands(player, dealer) {
    const a = evaluate(player), b = evaluate(dealer);
    if (a.bust) return -1;
    if (b.bust) return 1;
    if (a.rank !== b.rank) return Math.sign(a.rank - b.rank);
    if (a.rank >= 3) return 0;
    return a.type === 'ngulinh' ? Math.sign(b.points - a.points) : Math.sign(a.points - b.points);
  }

  function settle(state, reason) {
    const comparison = compareHands(state.hands.player, state.hands.dealer);
    state.phase = 'done';
    state.outcome = comparison > 0 ? 'win' : comparison < 0 ? 'loss' : 'push';
    state.reason = reason;
    state.score = state.outcome === 'win' ? 100 : 0;
  }

  function createGame({ random = Math.random } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    const deck = createDeck();
    for (let i = deck.length - 1; i > 0; i--) {
      const unit = Number(random());
      const j = Math.floor((Number.isFinite(unit) ? Math.max(0, Math.min(0.9999999999999999, unit)) : 0) * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const hands = { player: [], dealer: [] };
    for (let i = 0; i < 2; i++) { hands.player.push(deck.pop()); hands.dealer.push(deck.pop()); }
    const state = { hands, deck, phase: 'player', outcome: null, reason: '', score: 0 };
    if (evaluate(hands.player).rank >= 3 || evaluate(hands.dealer).rank >= 3) settle(state, 'natural');
    return state;
  }

  function canHit(state) {
    return !!state && state.phase === 'player' && state.deck.length > 0 && state.hands.player.length < 5 && evaluate(state.hands.player).total < 21;
  }

  function canStand(state) {
    if (!state || state.phase !== 'player') return false;
    const value = evaluate(state.hands.player);
    return !value.bust && (value.total >= 16 || value.type === 'ngulinh');
  }

  function hit(state) {
    if (!canHit(state)) return fail('Không thể rút bài lúc này.');
    const card = state.deck.pop();
    state.hands.player.push(card);
    const value = evaluate(state.hands.player);
    if (value.bust) settle(state, 'player-bust');
    else if (state.hands.player.length === 5 || value.total === 21) state.phase = 'dealer';
    return { ok: true, card, phase: state.phase };
  }

  function stand(state) {
    if (!canStand(state)) return fail('Cần ít nhất 16 điểm để dừng.');
    state.phase = 'dealer';
    return { ok: true, phase: state.phase };
  }

  function dealerStep(state) {
    if (!state || state.phase !== 'dealer') return fail('Chưa đến lượt nhà cái.');
    // The fixed policy uses only the dealer hand, never the player's cards.
    const before = evaluate(state.hands.dealer);
    let card = null;
    if (!before.bust && before.total < 17 && state.hands.dealer.length < 5 && state.deck.length) {
      card = state.deck.pop();
      state.hands.dealer.push(card);
    }
    const after = evaluate(state.hands.dealer);
    if (!card || after.bust || after.total >= 17 || state.hands.dealer.length === 5 || !state.deck.length) settle(state, after.bust ? 'dealer-bust' : 'compare');
    return { ok: true, card, phase: state.phase };
  }

  function publicState(state) {
    const hidden = state.phase === 'player';
    return {
      hands: {
        player: state.hands.player.map(card => ({ ...card })),
        dealer: state.hands.dealer.map((card, index) => hidden && index > 0 ? null : { ...card }),
      },
      playerValue: evaluate(state.hands.player),
      dealerValue: hidden ? null : evaluate(state.hands.dealer),
      deckCount: state.deck.length,
      phase: state.phase, outcome: state.outcome, reason: state.reason, score: state.score,
      canHit: canHit(state), canStand: canStand(state),
    };
  }

  return Object.freeze({ SUITS, createDeck, createGame, evaluate, compareHands, canHit, canStand, hit, stand, dealerStep, publicState });
});
