// version v1.0
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeMinesweeper = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const LEVELS = Object.freeze({
    easy: Object.freeze({ name: 'Dễ', size: 8, mines: 10, multiplier: 1 }),
    medium: Object.freeze({ name: 'Vừa', size: 10, mines: 18, multiplier: 2 }),
    hard: Object.freeze({ name: 'Khó', size: 12, mines: 30, multiplier: 3 }),
  });
  const MAX_ATTEMPTS = 60;
  const fail = error => ({ ok: false, error });
  function randomFrom(seed) {
    let x = 2166136261;
    for (const char of String(seed)) { x ^= char.charCodeAt(0); x = Math.imul(x, 16777619); }
    return () => { x += 0x6d2b79f5; let t = Math.imul(x ^ (x >>> 15), 1 | x); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function neighbors(index, size) {
    const row = Math.floor(index / size), col = index % size, result = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = col + dc;
      if ((dr || dc) && r >= 0 && r < size && c >= 0 && c < size) result.push(r * size + c);
    }
    return result;
  }
  function clues(mines, size) {
    return mines.map((mine, index) => mine ? -1 : neighbors(index, size).filter(i => mines[i]).length);
  }
  function createGame({ difficulty = 'easy', seed, daily = false, date = dateKey() } = {}) {
    if (!LEVELS[difficulty]) throw new RangeError('Unknown difficulty');
    const level = LEVELS[difficulty], total = level.size ** 2;
    return {
      difficulty, size: level.size, mineCount: level.mines, daily: Boolean(daily), date,
      seed: daily ? `daily-v1:${date}:${difficulty}` : String(seed ?? `${Date.now()}:${Math.random()}`),
      mines: Array(total).fill(false), numbers: Array(total).fill(0),
      revealed: Array(total).fill(false), flagged: Array(total).fill(false),
      phase: 'ready', first: null, exploded: null, elapsed: 0, moves: 0,
      verified: false, generationAttempts: 0, fallback: false,
    };
  }
  const validCell = (state, index) => Number.isInteger(index) && index >= 0 && index < state.size ** 2;
  function flood(mines, numbers, size, revealed, flagged, initial) {
    const queue = [...initial];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor];
      if (revealed[index] || flagged[index] || mines[index]) continue;
      revealed[index] = true;
      if (numbers[index] === 0) for (const next of neighbors(index, size)) if (!revealed[next]) queue.push(next);
    }
  }
  // This deduction routine receives ONLY visible numbers, board dimensions and flags.
  // In particular it never receives the actual mine map or unopened clue values.
  function deduce(size, mineCount, visible, flagged) {
    const safe = new Set(), mines = new Set(), constraints = [], unique = new Set();
    let contradiction = false;
    const add = (cells, count) => {
      if (count < 0 || count > cells.length) { contradiction = true; return; }
      if (!cells.length) return;
      const key = cells.join(',') + ':' + count;
      if (!unique.has(key)) { unique.add(key); constraints.push({ cells, count }); }
    };
    for (let i = 0; i < visible.length; i++) {
      if (visible[i] === null) continue;
      const adjacent = neighbors(i, size);
      add(adjacent.filter(j => visible[j] === null && !flagged[j]), visible[i] - adjacent.filter(j => flagged[j]).length);
    }
    const unknown = visible.map((value, index) => value === null && !flagged[index] ? index : -1).filter(i => i >= 0);
    add(unknown, mineCount - flagged.filter(Boolean).length);
    for (const constraint of constraints) {
      if (constraint.count === 0) constraint.cells.forEach(i => safe.add(i));
      if (constraint.count === constraint.cells.length) constraint.cells.forEach(i => mines.add(i));
    }
    // A\B has exactly count(A)-count(B) mines when B is a subset of A.
    for (const a of constraints) for (const b of constraints) {
      if (a.cells.length <= b.cells.length || !b.cells.every(i => a.cells.includes(i))) continue;
      const difference = a.cells.filter(i => !b.cells.includes(i)), count = a.count - b.count;
      if (count < 0 || count > difference.length) { contradiction = true; continue; }
      if (count === 0) difference.forEach(i => safe.add(i));
      if (count === difference.length) difference.forEach(i => mines.add(i));
    }
    if ([...safe].some(i => mines.has(i))) contradiction = true;
    return { safe: [...safe], mines: [...mines], contradiction };
  }
  function solve(layout, size, first) {
    if (!Array.isArray(layout) || layout.length !== size ** 2 || !Number.isInteger(first) || first < 0 || first >= layout.length || layout[first]) return { solved: false, steps: 0 };
    const numbers = clues(layout, size), revealed = layout.map(() => false), flagged = [...revealed];
    const mineCount = layout.filter(Boolean).length;
    flood(layout, numbers, size, revealed, flagged, [first]);
    let steps = 0;
    while (steps++ <= layout.length * 2) {
      if (revealed.filter(Boolean).length === layout.length - mineCount) return { solved: true, steps, revealed, flagged };
      const visible = numbers.map((number, i) => revealed[i] ? number : null);
      const deduction = deduce(size, mineCount, visible, flagged);
      if (deduction.contradiction || (!deduction.safe.length && !deduction.mines.length)) break;
      if (deduction.safe.some(i => layout[i]) || deduction.mines.some(i => !layout[i])) throw new Error('Unsound deduction');
      deduction.mines.forEach(i => { flagged[i] = true; });
      flood(layout, numbers, size, revealed, flagged, deduction.safe);
    }
    return { solved: false, steps, revealed, flagged };
  }
  function fallbackLayout(size, mineCount, first, random) {
    const reverseRows = Math.floor(first / size) < size / 2, reverseCols = random() < .5;
    const result = Array(size ** 2).fill(false);
    for (let n = 0; n < mineCount; n++) {
      const row = Math.floor(n / size), col = n % size;
      result[(reverseRows ? size - 1 - row : row) * size + (reverseCols ? size - 1 - col : col)] = true;
    }
    return result;
  }
  // One candidate per iteration lets the UI yield between expensive verification attempts.
  function* generate(state, first, maxAttempts = MAX_ATTEMPTS) {
    if (state.phase !== 'ready' || !validCell(state, first) || state.flagged[first]) return fail('Không thể mở ô này.');
    state.phase = 'generating';
    const random = randomFrom(`${state.seed}:first:${first}`), excluded = new Set([first, ...neighbors(first, state.size)]);
    const pool = state.mines.map((_, i) => i).filter(i => !excluded.has(i));
    let layout = null;
    const limit = Math.max(0, Math.min(MAX_ATTEMPTS, Math.floor(maxAttempts) || 0));
    for (let attempt = 0; attempt < limit; attempt++) {
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      const candidate = state.mines.map(() => false);
      shuffled.slice(0, state.mineCount).forEach(i => { candidate[i] = true; });
      state.generationAttempts++;
      if (solve(candidate, state.size, first).solved) { layout = candidate; break; }
      yield state.generationAttempts;
    }
    if (!layout) {
      layout = fallbackLayout(state.size, state.mineCount, first, random);
      if (!solve(layout, state.size, first).solved) throw new Error('Fallback did not pass the no-guess verifier');
      state.fallback = true;
    }
    state.mines = layout;
    state.numbers = clues(layout, state.size);
    state.first = first;
    state.verified = true;
    state.phase = 'play';
    return reveal(state, first);
  }
  function reveal(state, index) {
    if (!validCell(state, index)) return fail('Ô không hợp lệ.');
    if (!['ready', 'play'].includes(state.phase) || state.flagged[index] || state.revealed[index]) return fail('Ô này không thể mở.');
    if (state.phase === 'ready') {
      const iterator = generate(state, index);
      let result;
      do { result = iterator.next(); } while (!result.done);
      return result.value;
    }
    state.moves++;
    if (state.mines[index]) { state.phase = 'lost'; state.exploded = index; return { ok: true, hit: true }; }
    flood(state.mines, state.numbers, state.size, state.revealed, state.flagged, [index]);
    checkWin(state);
    return { ok: true };
  }
  function checkWin(state) {
    if (state.revealed.filter(Boolean).length === state.size ** 2 - state.mineCount) {
      state.phase = 'won';
      state.flagged = state.mines.slice();
    }
  }
  function toggleFlag(state, index) {
    if (!validCell(state, index) || !['ready', 'play'].includes(state.phase) || state.revealed[index]) return fail('Không thể cắm cờ ở ô này.');
    if (!state.flagged[index] && state.flagged.filter(Boolean).length >= state.mineCount) return fail('Đã dùng hết cờ. Bỏ cờ sai để cắm lại.');
    state.flagged[index] = !state.flagged[index];
    return { ok: true };
  }
  function chord(state, index) {
    if (!validCell(state, index) || state.phase !== 'play' || !state.revealed[index] || state.numbers[index] === 0) return fail('Chọn ô số đã mở để mở nhanh.');
    const adjacent = neighbors(index, state.size);
    if (adjacent.filter(i => state.flagged[i]).length !== state.numbers[index]) return fail('Số cờ xung quanh phải bằng số trên ô.');
    const hidden = adjacent.filter(i => !state.flagged[i] && !state.revealed[i]);
    if (!hidden.length) return fail('Không còn ô để mở nhanh.');
    // Wrong flags can cause a loss, just like opening an individual mine.
    const mine = hidden.find(i => state.mines[i]);
    if (mine !== undefined) return reveal(state, mine);
    for (const next of hidden) if (state.phase === 'play' && !state.revealed[next]) reveal(state, next);
    return { ok: true };
  }
  function score(state) { return state.phase === 'won' ? Math.max(100, 2000 - Math.floor(state.elapsed) * 3) * LEVELS[state.difficulty].multiplier : 0; }
  return Object.freeze({ LEVELS, MAX_ATTEMPTS, randomFrom, dateKey, neighbors, clues, createGame, deduce, solve, generate, reveal, toggleFlag, chord, score });
});
