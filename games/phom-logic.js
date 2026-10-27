(function (root, factory) {
  'use strict'; const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ArcadePhom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SUITS = ['♠', '♣', '♦', '♥'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const rank = id => id % 13 + 1, suit = id => Math.floor(id / 13);
  const cardName = id => `${RANKS[rank(id) - 1]}${SUITS[suit(id)]}`;
  function isMeld(cards) {
    if (cards.length < 3 || new Set(cards).size !== cards.length) return false;
    if (cards.length <= 4 && cards.every(c => rank(c) === rank(cards[0]))) return true;
    const sorted = cards.slice().sort((a, b) => rank(a) - rank(b));
    return sorted.every((c, i) => suit(c) === suit(sorted[0]) && (!i || rank(c) === rank(sorted[i - 1]) + 1));
  }
  // Exact set packing over at most ten cards; every eaten card must belong to
  // a separate meld. Greedy grouping fails when a run overlaps a three-of-a-kind.
  function layout(hand, eaten = []) {
    const n = hand.length, all = (1 << n) - 1, required = hand.reduce((m, c, i) => m | (eaten.includes(c) ? 1 << i : 0), 0);
    if (eaten.some(c => !hand.includes(c))) return null;
    const groups = [];
    for (let mask = 1; mask <= all; mask++) {
      const cards = hand.filter((_, i) => mask & (1 << i));
      if (cards.length >= 3 && cards.filter(c => eaten.includes(c)).length <= 1 && isMeld(cards)) groups.push({ mask, cards });
    }
    const memo = new Map();
    function solve(mask) {
      if (memo.has(mask)) return memo.get(mask);
      const rest = hand.filter((_, i) => mask & (1 << i));
      let best = mask & required ? null : { melds: [], deadwood: rest, points: rest.reduce((sum, c) => sum + rank(c), 0) };
      for (const group of groups) {
        if ((mask & group.mask) !== group.mask) continue;
        const tail = solve(mask ^ group.mask); if (!tail) continue;
        const candidate = { melds: [group.cards, ...tail.melds], deadwood: tail.deadwood, points: tail.points };
        if (!best || candidate.points < best.points || (candidate.points === best.points && candidate.deadwood.length < best.deadwood.length)) best = candidate;
      }
      memo.set(mask, best); return best;
    }
    return solve(all);
  }
  function createGame(rng = Math.random) {
    const deck = Array.from({ length: 52 }, (_, i) => i);
    for (let i = deck.length - 1; i; i--) { const j = Math.min(i, Math.floor(rng() * (i + 1))); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const hands = Array.from({ length: 4 }, () => deck.splice(0, 9)); hands[0].push(deck.shift());
    return { hands, stock: deck, eaten: [[], [], [], []], discards: [[], [], [], []], melds: [[], [], [], []],
      laid: [false, false, false, false], turns: [0, 0, 0, 0], current: 0, phase: 'discard', last: null, winner: null, results: null, turn: 0, sent: [] };
  }
  function canTake(s) {
    if (s.phase !== 'draw' || !s.last || s.last.player !== (s.current + 3) % 4) return false;
    return Boolean(layout([...s.hands[s.current], s.last.card], [...s.eaten[s.current], s.last.card]));
  }
  function checkU(s) {
    const best = layout(s.hands[s.current], s.eaten[s.current]);
    if (best && !best.deadwood.length) {
      s.winner = s.current; s.phase = 'finished'; s.results = { type: 'u', ranking: [s.current] }; return true;
    }
    return false;
  }
  function draw(s, take = false) {
    if (s.phase !== 'draw' || (take ? !canTake(s) : !s.stock.length)) return false;
    const p = s.current;
    if (take) { s.hands[p].push(s.last.card); s.eaten[p].push(s.last.card); s.discards[s.last.player].pop(); }
    else s.hands[p].push(s.stock.pop());
    s.last = null; s.phase = 'discard'; checkU(s); return true;
  }
  function discards(s, player = s.current) {
    if (s.phase !== 'discard' || player !== s.current) return [];
    return s.hands[player].filter(card => !s.eaten[player].includes(card) && layout(s.hands[player].filter(c => c !== card), s.eaten[player]));
  }
  function lay(s, p) {
    const best = layout(s.hands[p], s.eaten[p]);
    s.melds[p] = best.melds.map(m => m.slice()); s.hands[p] = best.deadwood.slice(); s.laid[p] = true;
    // Sending is automatic to earlier exposed melds, only after making a meld.
    if (!best.melds.length) return;
    let changed = true;
    while (changed) {
      changed = false;
      for (const card of s.hands[p].slice()) {
        let target = null;
        for (let other = 0; other < 4; other++) if (other !== p && s.laid[other]) {
          const group = s.melds[other].find(m => isMeld([...m, card]));
          if (group) { target = { other, group }; break; }
        }
        if (target) { target.group.push(card); s.hands[p].splice(s.hands[p].indexOf(card), 1); s.sent.push({ from: p, to: target.other, card }); changed = true; }
      }
    }
  }
  function finish(s) {
    const scores = s.hands.map(h => h.reduce((sum, card) => sum + rank(card), 0));
    const ranking = [0, 1, 2, 3].sort((a, b) => Number(!s.melds[a].length) - Number(!s.melds[b].length) || scores[a] - scores[b] || a - b);
    s.winner = ranking[0]; s.phase = 'finished'; s.results = { type: 'points', scores, ranking };
  }
  function discard(s, card) {
    if (!discards(s).includes(card)) return false;
    const p = s.current;
    s.hands[p].splice(s.hands[p].indexOf(card), 1); s.discards[p].push(card); s.turns[p]++; s.turn++;
    s.last = { player: p, card };
    if (checkU(s)) return true;
    if (s.turns[p] === 4) {
      lay(s, p);
      if (!s.hands[p].length && s.melds[p].length) {
        s.winner = p; s.phase = 'finished'; s.results = { type: 'u', ranking: [p] }; return true;
      }
    }
    if (s.turns.every(n => n === 4)) finish(s);
    else { s.current = (p + 1) % 4; s.phase = 'draw'; }
    return true;
  }
  function chooseMove(s) {
    if (s.phase === 'draw') return { type: 'draw', take: canTake(s) };
    if (s.phase !== 'discard') return null;
    const p = s.current, hand = s.hands[p]; let chosen = null, best = Infinity;
    for (const card of discards(s)) {
      const next = hand.filter(c => c !== card), result = layout(next, s.eaten[p]);
      let connections = 0;
      for (let i = 0; i < result.deadwood.length; i++) for (let j = i + 1; j < result.deadwood.length; j++) {
        const a = result.deadwood[i], b = result.deadwood[j];
        if (rank(a) === rank(b) || (suit(a) === suit(b) && Math.abs(rank(a) - rank(b)) <= 2)) connections++;
      }
      // Public discard piles are safe information; opponent hands/stock are never read.
      const seenRank = s.discards.flat().filter(c => rank(c) === rank(card)).length;
      const value = result.points - connections * 7 - seenRank * 2;
      if (value < best) { best = value; chosen = card; }
    }
    return { type: 'discard', card: chosen };
  }
  return { SUITS, RANKS, rank, suit, cardName, isMeld, layout, createGame, canTake, checkU, draw, discards, discard, chooseMove };
});
