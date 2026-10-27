(function (root, factory) {
  'use strict'; const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ArcadePenalty = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function createGame(mode = 'ai') { return { mode: mode === 'local' ? 'local' : 'ai', phase: 'play', current: 0, scores: [0, 0], kicks: [[], []], winner: null, last: null }; }
  function kick(s, shot, save) {
    if (s.phase !== 'play' || ![shot, save].every(v => Number.isInteger(v) && v >= 0 && v < 6)) return false;
    const p = s.current, goal = shot !== save;
    s.kicks[p].push(goal); if (goal) s.scores[p]++;
    s.last = { player: p, shot, save, goal }; s.current = 1 - p;
    const [a, b] = s.kicks.map(k => k.length);
    const [x, y] = s.scores;
    if ((a <= 5 && b <= 5 && (x > y + 5 - b || y > x + 5 - a)) || (a >= 5 && a === b && x !== y)) {
      s.phase = 'finished'; s.winner = x > y ? 0 : 1;
    }
    return true;
  }
  const choose = (rng = Math.random) => Math.min(5, Math.floor(rng() * 6));
  return { createGame, kick, choose };
});
