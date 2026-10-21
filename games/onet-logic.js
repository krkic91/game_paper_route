// version v1.0
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeOnet = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const randoms = new WeakMap();
  const ANIMALS = ['🐶', '🐱', '🐰', '🐻', '🦊', '🐼', '🐸', '🐯', '🐷', '🐨', '🦁', '🐵'];
  const NAMES = ['Cún', 'Mèo', 'Thỏ', 'Gấu', 'Cáo', 'Gấu trúc', 'Ếch', 'Hổ', 'Heo', 'Koala', 'Sư tử', 'Khỉ'];
  function config(level) {
    level = Math.min(24, Math.max(1, Math.floor(Number(level) || 1)));
    const band = Math.floor((level - 1) / 8), step = (level - 1) % 8;
    return { level, rows: band === 2 ? 8 : 6, cols: band ? 8 : 6,
      types: Math.min(12, 4 + Math.floor((level - 1) / 2)), seconds: 180 + band * 30 - step * 7,
      lockCount: level < 5 ? 0 : Math.min(12, 4 + Math.floor((level - 5) / 4) * 2),
      unlock: level < 17 ? 3 : 5, hints: level < 13 ? 3 : 2, shuffles: level < 17 ? 2 : 1 };
  }
  function shuffled(array, random) {
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
    return array;
  }
  function inside(s, index) { const w = s.cols + 2, r = Math.floor(index / w), c = index % w; return Number.isInteger(index) && r >= 1 && r <= s.rows && c >= 1 && c <= s.cols; }
  // An independent segment search: all <=2-turn paths are straight, L-shaped,
  // or have their middle segment on one padded row/column.
  function route(s, a, b) {
    if (a === b || !inside(s, a) || !inside(s, b)) return null;
    const w = s.cols + 2, h = s.rows + 2, ar = Math.floor(a / w), ac = a % w, br = Math.floor(b / w), bc = b % w;
    function clear(x, y) {
      if (x === y) return true;
      const xr = Math.floor(x / w), xc = x % w, yr = Math.floor(y / w), yc = y % w;
      if (xr !== yr && xc !== yc) return false;
      const step = xr === yr ? Math.sign(y - x) : Math.sign(y - x) * w;
      for (let p = x; ; p += step) {
        if (p !== a && p !== b && s.board[p] !== 0) return false;
        if (p === y) return true;
      }
    }
    function test(points) {
      const compact = points.filter((p, i) => !i || p !== points[i - 1]);
      for (let i = 1; i < compact.length; i++) if (!clear(compact[i - 1], compact[i])) return null;
      // Repeated collinear segments can be represented by one straight segment.
      for (let i = compact.length - 2; i > 0; i--) {
        const p = compact[i - 1], q = compact[i], r = compact[i + 1];
        if ((Math.floor(p / w) === Math.floor(q / w) && Math.floor(q / w) === Math.floor(r / w)) || (p % w === q % w && q % w === r % w)) compact.splice(i, 1);
      }
      return compact;
    }
    if (ar === br || ac === bc) { const p = test([a, b]); if (p) return p; }
    for (const corner of [ar * w + bc, br * w + ac]) { const p = test([a, corner, b]); if (p) return p; }
    for (let r = 0; r < h; r++) { const p = test([a, r * w + ac, r * w + bc, b]); if (p) return p; }
    for (let c = 0; c < w; c++) { const p = test([a, ar * w + c, br * w + c, b]); if (p) return p; }
    return null;
  }
  const isLocked = (s, index) => (s.locks[index] || 0) > s.matched;
  function findPath(s, a, b) {
    if (!inside(s, a) || !inside(s, b) || !(s.board[a] > 0) || s.board[a] !== s.board[b] || isLocked(s, a) || isLocked(s, b)) return null;
    return route(s, a, b);
  }
  function findMatches(s, limit = Infinity) {
    const moves = [];
    for (let a = 0; a < s.board.length; a++) {
      if (!(s.board[a] > 0) || isLocked(s, a)) continue;
      for (let b = a + 1; b < s.board.length; b++) {
        if (s.board[a] !== s.board[b] || isLocked(s, b)) continue;
        const path = route(s, a, b);
        if (path) { moves.push({ a, b, path }); if (moves.length >= limit) return moves; }
      }
    }
    return moves;
  }
  function slots(s) { return s.board.map((value, index) => value > 0 ? index : -1).filter(index => index >= 0); }
  // Remove geometrically connectable pairs from the occupied shape, then assign
  // matching animals. Thus the recorded order is a complete solution witness.
  function rebuild(s, random, animalPairs, lockCount, unlockAt) {
    const occupied = slots(s), copy = { ...s, board: s.board.slice() }, sequence = [];
    let remaining = occupied.slice();
    while (remaining.length) {
      shuffled(remaining, random);
      let pair = null;
      for (let i = 0; i < Math.min(32, remaining.length * 2); i++) {
        const a = remaining[Math.floor(random() * remaining.length)], b = remaining[Math.floor(random() * remaining.length)];
        if (route(copy, a, b)) { pair = [a, b]; break; }
      }
      if (!pair) {
        // Rightmost tile of each occupied row reaches the outside right edge;
        // any two such tiles connect in two turns. A single row is straight.
        const rightmost = new Map();
        for (const p of remaining) { const row = Math.floor(p / (s.cols + 2)); rightmost.set(row, Math.max(rightmost.get(row) || 0, p)); }
        const ends = [...rightmost.values()];
        pair = ends.length > 1 ? ends.slice(0, 2) : remaining.slice().sort((a, b) => a - b).slice(0, 2);
      }
      sequence.push(pair); copy.board[pair[0]] = copy.board[pair[1]] = 0;
      remaining = remaining.filter(p => !pair.includes(p));
    }
    shuffled(animalPairs, random);
    sequence.forEach(([a, b], i) => { s.board[a] = s.board[b] = animalPairs[i]; });
    s.locks.fill(0);
    const protectedCount = Math.max(0, unlockAt - s.matched);
    const eligible = sequence.slice(protectedCount).flat();
    for (const p of shuffled(eligible, random).slice(0, lockCount)) s.locks[p] = unlockAt;
    s.solution = sequence;
  }
  function createGame({ level = 1, random = Math.random } = {}) {
    const c = config(level), w = c.cols + 2;
    const s = { level: c.level, rows: c.rows, cols: c.cols, board: Array(w * (c.rows + 2)).fill(0), locks: Array(w * (c.rows + 2)).fill(0), matched: 0, remaining: 0, phase: 'play', time: c.seconds, hints: c.hints, shuffles: c.shuffles, rescues: 0, solution: [], notice: '' };
    randoms.set(s, random);
    for (let r = 1; r <= c.rows; r++) for (let col = 1; col <= c.cols; col++) {
      const shape = (c.level - 1) % 4;
      const corner = (r === 1 || r === c.rows) && (col === 1 || col === c.cols);
      const center = (r === c.rows / 2 || r === c.rows / 2 + 1) && (col === c.cols / 2 || col === c.cols / 2 + 1);
      if ((shape === 1 && corner) || (shape === 2 && center) || (shape === 3 && (corner || center))) continue;
      s.board[r * w + col] = 1;
    }
    s.remaining = slots(s).length;
    const animals = Array.from({ length: s.remaining / 2 }, (_, i) => i % c.types + 1);
    rebuild(s, random, animals, c.lockCount, c.unlock);
    return s;
  }
  function rearrange(s) {
    const counts = new Map();
    for (const value of s.board) if (value > 0) counts.set(value, (counts.get(value) || 0) + 1);
    const pairs = [];
    for (const [value, count] of counts) for (let n = 0; n < count / 2; n++) pairs.push(value);
    const lockCount = s.locks.filter(value => value > s.matched).length;
    rebuild(s, randoms.get(s) || Math.random, pairs, lockCount, config(s.level).unlock);
  }
  function rescue(s) {
    if (s.phase !== 'play' || !s.remaining || findMatches(s, 1).length) return false;
    rearrange(s); s.rescues++;
    s.notice = 'Không còn cặp nối được: đã sắp lại bàn miễn phí, giữ nguyên thời gian và số thú.';
    return true;
  }
  function match(s, a, b) {
    if (s.phase !== 'play') return { ok: false, error: 'Ván đã kết thúc.' };
    const path = findPath(s, a, b);
    if (!path) return { ok: false, error: 'Cần hai thú giống nhau, đã mở khóa và đường nối tối đa hai lần rẽ.' };
    s.board[a] = s.board[b] = 0; s.locks[a] = s.locks[b] = 0; s.matched++; s.remaining -= 2; s.notice = '';
    if (!s.remaining) s.phase = 'won';
    else rescue(s);
    return { ok: true, path, rescued: Boolean(s.notice) };
  }
  function hint(s) {
    if (s.phase !== 'play' || s.hints <= 0) return { ok: false, error: 'Đã dùng hết gợi ý.' };
    rescue(s); const move = findMatches(s, 1)[0];
    if (!move) return { ok: false, error: 'Không còn thú trên bàn.' };
    s.hints--; return { ok: true, ...move };
  }
  function shuffle(s) {
    if (s.phase !== 'play' || s.shuffles <= 0) return { ok: false, error: 'Đã dùng hết lượt xáo trộn.' };
    s.shuffles--; rearrange(s); s.notice = 'Đã xáo trộn các thú còn lại; ô đóng băng được sắp lại cùng bàn.';
    return { ok: true };
  }
  function tick(s, seconds) {
    if (s.phase !== 'play' || !(seconds > 0) || !Number.isFinite(seconds)) return;
    s.time = Math.max(0, s.time - seconds);
    if (s.time === 0) s.phase = 'lost';
  }
  return Object.freeze({ ANIMALS, NAMES, config, createGame, findPath, findMatches, isLocked, match, hint, shuffle, rescue, tick });
});
