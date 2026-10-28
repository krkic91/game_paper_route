(function (root, factory) {
  'use strict'; const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ArcadeJigsaw = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SCENES = [{ id: 'lotus', title: 'Hồ sen buổi sớm' }, { id: 'lanterns', title: 'Phố đèn lồng' }, { id: 'ocean', title: 'Dưới lòng đại dương' }];
  function createGame(options = {}, random = Math.random) {
    const size = [3,4,5].includes(options.size) ? options.size : 3;
    const scene = SCENES.some(s => s.id === options.scene) ? options.scene : 'lotus';
    const order = Array.from({ length: size * size }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor(random() * (i + 1))); [order[i], order[j]] = [order[j], order[i]]; }
    if (order.every((v,i) => v === i)) order.push(order.shift());
    return { size, scene, order, placed: Array(size * size).fill(false), count: 0, mistakes: 0, hints: 0, seconds: 0, phase: 'play', score: 0 };
  }
  function place(s, piece, slot) {
    if (s.phase !== 'play' || !Number.isInteger(piece) || !Number.isInteger(slot) || piece < 0 || slot < 0 || piece >= s.placed.length || slot >= s.placed.length || s.placed[piece]) return { ok: false };
    if (piece !== slot) { s.mistakes++; return { ok: false, mismatch: true }; }
    s.placed[piece] = true; s.count++;
    if (s.count === s.placed.length) { s.phase = 'finished'; s.score = Math.max(100, 1000 - s.mistakes * 10 - s.hints * 50); }
    return { ok: true };
  }
  function hint(s) { if (s.phase !== 'play') return null; const id = s.placed.indexOf(false); if (id < 0) return null; s.hints++; return id; }
  function tick(s, dt) { if (s.phase === 'play' && Number.isFinite(dt) && dt > 0) s.seconds += dt; }
  // Normalized edge signs, shared across neighbors. Positive bulges out of a
  // clockwise outline; a neighboring edge has exactly the opposite sign.
  function edges(size, id) {
    const r = Math.floor(id / size), c = id % size, direction = (a,b) => (a + b) % 2 ? -1 : 1;
    return [r ? -direction(r - 1,c) : 0, c < size - 1 ? direction(r,c) : 0, r < size - 1 ? direction(r,c) : 0, c ? -direction(r,c - 1) : 0];
  }
  function path(size, id) {
    const signs = edges(size, id), corners = [[0,0],[100,0],[100,100],[0,100],[0,0]];
    let d = 'M0 0';
    for (let edge = 0; edge < 4; edge++) {
      const [x,y] = corners[edge], [ex,ey] = corners[edge+1], ux = (ex-x)/100, uy = (ey-y)/100, sign = signs[edge];
      const pt = (t,n) => `${x+ux*t+uy*n} ${y+uy*t-ux*n}`;
      if (!sign) { d += ` L${ex} ${ey}`; continue; }
      d += ` L${pt(38,0)} C${pt(43,0)} ${pt(42,5*sign)} ${pt(38,9*sign)} C${pt(25,29*sign)} ${pt(75,29*sign)} ${pt(62,9*sign)} C${pt(58,5*sign)} ${pt(57,0)} ${pt(62,0)} L${ex} ${ey}`;
    }
    return d + ' Z';
  }
  return { SCENES, createGame, place, hint, tick, edges, path };
});
