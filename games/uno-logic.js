// version v1.0
/* Four-player, single-round UNO rules; independent of the DOM and bot timers. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeUno = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  const COLORS = Object.freeze(['red', 'yellow', 'green', 'blue']);
  const randomSources = new WeakMap();
  const validPlayer = player => Number.isInteger(player) && player >= 0 && player < 4;
  const isWild = card => card.value === 'wild' || card.value === 'wild4';
  const fail = error => ({ ok: false, error, events: [] });
  const success = events => ({ ok: true, events });

  function shuffle(cards, random) {
    for (let i = cards.length - 1; i > 0; i--) {
      const value = Number(random());
      const unit = Number.isFinite(value) ? Math.max(0, Math.min(0.9999999999999999, value)) : 0;
      const j = Math.floor(unit * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function createGame({ random = Math.random } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    const deck = [], hands = [[], [], [], []];
    const add = (color, value) => deck.push({ id: `uno-${deck.length}`, color, value });
    for (const color of COLORS) {
      add(color, '0');
      for (const value of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2']) {
        add(color, value);
        add(color, value);
      }
    }
    for (let i = 0; i < 4; i++) { add(null, 'wild'); add(null, 'wild4'); }
    shuffle(deck, random);
    for (let round = 0; round < 7; round++) {
      for (let player = 0; player < 4; player++) hands[player].push(deck.pop());
    }
    // A numeric opening keeps the first turn predictable in this casual variant.
    let opening = deck.length - 1;
    while (!/^\d$/.test(deck[opening].value)) opening--;
    const first = deck.splice(opening, 1)[0];
    const state = {
      hands, deck, discard: [first], color: first.color,
      current: 0, direction: 1, phase: 'play', drawnId: null,
      winner: null, score: 0, turn: 0,
      unoPending: null, unoCalled: [false, false, false, false], blockedTurns: 0,
    };
    randomSources.set(state, random);
    return state;
  }

  function active(state) {
    return !!state && (state.phase === 'play' || state.phase === 'drawn');
  }

  function matches(state, player, card) {
    if (card.value === 'wild4') return !state.hands[player].some(item => item.color === state.color);
    if (card.value === 'wild') return true;
    const top = state.discard[state.discard.length - 1];
    return card.color === state.color || card.value === top.value;
  }

  function legalCards(state, player = state && state.current) {
    if (!active(state) || !validPlayer(player) || player !== state.current) return [];
    return state.hands[player]
      .filter(card => (state.phase !== 'drawn' || card.id === state.drawnId) && matches(state, player, card))
      .map(card => card.id);
  }

  function expireUno(state, events) {
    if (state.unoPending !== null) {
      events.push({ type: 'uno-expired', player: state.unoPending });
      state.unoPending = null;
    }
  }

  function takeCards(state, player, amount, reason, events) {
    const drawn = [];
    for (let i = 0; i < amount; i++) {
      if (!state.deck.length && state.discard.length > 1) {
        const top = state.discard.pop();
        state.deck.push(...shuffle(state.discard.splice(0), randomSources.get(state) || Math.random));
        state.discard.push(top);
        events.push({ type: 'reshuffle', count: state.deck.length });
      }
      if (!state.deck.length) break;
      const card = state.deck.pop();
      state.hands[player].push(card);
      drawn.push(card);
    }
    if (drawn.length) {
      state.unoCalled[player] = false;
      state.blockedTurns = 0;
    }
    events.push({ type: 'draw', player, count: drawn.length, reason });
    return drawn;
  }

  function nextPlayer(state, player, steps = 1) {
    return (player + state.direction * steps + 8) % 4;
  }

  function advance(state, player, steps, events) {
    state.current = nextPlayer(state, player, steps);
    state.phase = 'play';
    state.drawnId = null;
    state.turn++;
    events.push({ type: 'turn', player: state.current, turn: state.turn });
  }

  function cardPoints(card) {
    if (isWild(card)) return 50;
    if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2') return 20;
    return Number(card.value);
  }

  function finish(state, player, events) {
    state.phase = 'finished';
    state.drawnId = null;
    state.unoPending = null;
    state.winner = player;
    state.score = player < 0 ? 0 : state.hands.reduce((total, hand, index) =>
      total + (index === player ? 0 : hand.reduce((sum, card) => sum + cardPoints(card), 0)), 0);
    state.turn++;
    events.push({ type: 'finish', player, score: state.score });
  }

  function play(state, player, cardId, options = {}) {
    if (!active(state)) return fail('Ván chơi đã kết thúc.');
    if (!validPlayer(player) || player !== state.current) return fail('Chưa đến lượt người chơi này.');
    if (!options || typeof options !== 'object') return fail('Lựa chọn lá bài không hợp lệ.');
    const index = state.hands[player].findIndex(card => card.id === cardId);
    if (index < 0 || !legalCards(state, player).includes(cardId)) return fail('Lá bài này chưa thể đánh.');
    const card = state.hands[player][index];
    if (isWild(card) && !COLORS.includes(options.color)) return fail('Hãy chọn màu cho lá đổi màu.');

    const events = [];
    expireUno(state, events);
    state.hands[player].splice(index, 1);
    state.discard.push(card);
    state.color = isWild(card) ? options.color : card.color;
    state.drawnId = null;
    state.blockedTurns = 0;
    state.unoCalled[player] = false;
    events.push({ type: 'play', player, cardId: card.id, value: card.value, color: state.color });

    let steps = 1;
    if (card.value === 'reverse') {
      state.direction *= -1;
      events.push({ type: 'reverse', player, direction: state.direction });
    } else if (card.value === 'skip') {
      events.push({ type: 'skip', player: nextPlayer(state, player) });
      steps = 2;
    } else if (card.value === 'draw2' || card.value === 'wild4') {
      const target = nextPlayer(state, player);
      takeCards(state, target, card.value === 'draw2' ? 2 : 4, card.value, events);
      events.push({ type: 'skip', player: target });
      steps = 2;
    }

    // The final +2/+4 penalty is part of the opponents' hands before scoring.
    if (!state.hands[player].length) {
      finish(state, player, events);
      return success(events);
    }
    if (state.hands[player].length === 1) {
      if (options.uno === true) {
        state.unoCalled[player] = true;
        events.push({ type: 'uno', player });
      } else {
        state.unoPending = player;
        events.push({ type: 'uno-pending', player });
      }
    }
    advance(state, player, steps, events);
    return success(events);
  }

  function draw(state, player) {
    if (!active(state)) return fail('Ván chơi đã kết thúc.');
    if (!validPlayer(player) || player !== state.current) return fail('Chưa đến lượt người chơi này.');
    if (state.phase !== 'play') return fail('Bạn đã rút bài trong lượt này.');
    const blocked = legalCards(state, player).length === 0;
    const events = [];
    expireUno(state, events);
    const cards = takeCards(state, player, 1, 'turn', events);
    if (cards.length && matches(state, player, cards[0])) {
      state.phase = 'drawn';
      state.drawnId = cards[0].id;
      return success(events);
    }
    if (!cards.length) state.blockedTurns = blocked ? state.blockedTurns + 1 : 0;
    if (state.blockedTurns >= 4) finish(state, -1, events);
    else advance(state, player, 1, events);
    return success(events);
  }

  function pass(state, player) {
    if (!active(state)) return fail('Ván chơi đã kết thúc.');
    if (!validPlayer(player) || player !== state.current) return fail('Chưa đến lượt người chơi này.');
    if (state.phase !== 'drawn') return fail('Chỉ có thể giữ bài sau khi rút được lá có thể đánh.');
    const events = [];
    expireUno(state, events);
    events.push({ type: 'pass', player });
    advance(state, player, 1, events);
    return success(events);
  }

  function callUno(state, player) {
    if (!active(state)) return fail('Ván chơi đã kết thúc.');
    if (!validPlayer(player) || state.unoPending !== player || state.hands[player].length !== 1) {
      return fail('Chỉ hô UNO ngay khi vừa còn một lá.');
    }
    state.unoPending = null;
    state.unoCalled[player] = true;
    return success([{ type: 'uno', player }]);
  }

  function catchUno(state, catcher) {
    if (!active(state)) return fail('Ván chơi đã kết thúc.');
    const offender = state.unoPending;
    if (!validPlayer(catcher) || offender === null || offender === catcher || state.hands[offender].length !== 1) {
      return fail('Không có người chơi nào đang quên hô UNO.');
    }
    const events = [{ type: 'catch-uno', player: catcher, target: offender }];
    state.unoPending = null;
    state.unoCalled[offender] = false;
    takeCards(state, offender, 2, 'uno', events);
    return success(events);
  }

  function preferredColor(hand, excludedId, fallback) {
    const weights = Object.fromEntries(COLORS.map(color => [color, 0]));
    for (const card of hand) {
      if (card.id !== excludedId && card.color) weights[card.color] += 1;
    }
    let best = COLORS.includes(fallback) ? fallback : COLORS[0];
    for (const color of COLORS) if (weights[color] > weights[best]) best = color;
    return best;
  }

  function chooseBotAction(state, player = state && state.current) {
    if (!active(state) || !validPlayer(player) || player !== state.current) return null;
    const legal = new Set(legalCards(state, player));
    if (!legal.size) return { type: state.phase === 'drawn' ? 'pass' : 'draw' };
    const hand = state.hands[player];
    const nextCount = state.hands[nextPlayer(state, player)].length;
    let selected = null, bestScore = -Infinity;
    for (const card of hand) {
      if (!legal.has(card.id)) continue;
      const color = preferredColor(hand, card.id, state.color);
      const matching = hand.filter(item => item.id !== card.id && item.color === (card.color || color)).length;
      let score = matching * 4 + cardPoints(card) / 10;
      if (card.value === 'wild') score -= 16;
      if (card.value === 'wild4') score -= 22;
      if (nextCount <= 2 && ['skip', 'reverse', 'draw2', 'wild4'].includes(card.value)) score += 35;
      if (hand.length <= 2 && isWild(card)) score += 12;
      if (score > bestScore) { bestScore = score; selected = card; }
    }
    const action = { type: 'play', cardId: selected.id, uno: true };
    if (isWild(selected)) action.color = preferredColor(hand, selected.id, state.color);
    return action;
  }

  return Object.freeze({ COLORS, createGame, legalCards, play, draw, pass, callUno, catchUno, chooseBotAction, cardPoints });
});
