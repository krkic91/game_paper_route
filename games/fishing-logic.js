(function (root, factory) {
  'use strict'; const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ArcadeFishing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FISH = [
    { name: 'Cá rô', color: '#7ba99a', weight: 30, points: 40, speed: 0.6 },
    { name: 'Cá diếc', color: '#c6c9ab', weight: 25, points: 60, speed: 0.7 },
    { name: 'Cá chép', color: '#dca66c', weight: 20, points: 90, speed: 0.8 },
    { name: 'Cá trê', color: '#8f91a8', weight: 13, points: 120, speed: 0.9 },
    { name: 'Cá lóc', color: '#748f6b', weight: 9, points: 170, speed: 1.0 },
    { name: 'Cá koi vàng', color: '#efca65', weight: 3, points: 300, speed: 1.15 },
  ];
  function createGame() { return { phase: 'ready', meter: 0, time: 0, wait: 0, tension: 0.4, progress: 0, fish: null, score: 0, catches: 0, casts: 0, message: 'Chạm Thả câu để bắt đầu.' }; }
  function action(s, rng = Math.random) {
    if (s.phase === 'ready' || s.phase === 'caught' || s.phase === 'escaped') {
      s.phase = 'aim'; s.meter = 0; s.time = 0; s.message = 'Chạm lần nữa khi vạch vào vùng xanh.'; return true;
    }
    if (s.phase === 'aim') {
      s.casts++; s.quality = Math.max(0, 1 - Math.abs(s.meter - 0.65) / 0.65);
      let roll = rng() * 100, fish = FISH.length - 1;
      for (let i = 0; i < FISH.length; i++) { roll -= FISH[i].weight; if (roll < 0) { fish = i; break; } }
      s.fish = fish; s.wait = 1.5 + rng() * 2.5; s.phase = 'waiting'; s.time = 0; s.message = 'Phao đang trôi… chờ cá cắn câu.'; return true;
    }
    if (s.phase === 'bite') {
      s.phase = 'reeling'; s.tension = 0.4; s.progress = 0.15 + s.quality * 0.15; s.time = 0;
      s.message = 'Giữ để kéo, thả để giảm lực. Giữ kim trong vùng xanh!'; return true;
    }
    return false;
  }
  function tick(s, dt, held = false) {
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, 0.1); s.time += dt;
    if (s.phase === 'aim') s.meter = (Math.sin(s.time * 2.4 - Math.PI / 2) + 1) / 2;
    if (s.phase === 'waiting' && s.time >= s.wait) { s.phase = 'bite'; s.time = 0; s.message = 'Cá cắn! Chạm Giật cần!'; }
    if (s.phase === 'bite' && s.time > 2.5) { s.phase = 'escaped'; s.message = 'Cá đã nhả mồi. Thả câu để thử lại nhé.'; }
    if (s.phase === 'reeling') {
      const fish = FISH[s.fish];
      s.tension += ((held ? 0.43 : -0.29) + Math.sin(s.time * 3.2) * 0.13 * fish.speed) * dt;
      if (s.tension >= 0.23 && s.tension <= 0.78) s.progress += dt * 0.16 / fish.speed;
      else s.progress = Math.max(0, s.progress - dt * 0.07);
      if (s.tension <= 0 || s.tension >= 1) { s.phase = 'escaped'; s.message = s.tension >= 1 ? 'Dây quá căng, cá đã thoát!' : 'Dây chùng quá, cá đã thoát!'; }
      else if (s.progress >= 1) {
        s.phase = 'caught'; s.catches++; s.score += fish.points; s.message = `Bắt được ${fish.name.toLowerCase()}! +${fish.points} điểm.`;
        return { caught: s.fish };
      }
    }
    return null;
  }
  return { FISH, createGame, action, tick };
});
