// version v1.0
/* DOM-free classic Sudoku rules, unique puzzle generation, and save validation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SudokuLogic = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  const SIZE = 81;
  const ALL = 511;
  const difficulties = Object.freeze({ easy: 42, medium: 34, hard: 28 });
  const history = new WeakMap();
  const rows = [], columns = [], boxes = [], peers = [];
  for (let i = 0; i < SIZE; i++) {
    rows[i] = Math.floor(i / 9);
    columns[i] = i % 9;
    boxes[i] = Math.floor(rows[i] / 3) * 3 + Math.floor(columns[i] / 3);
  }
  for (let i = 0; i < SIZE; i++) {
    peers[i] = [];
    for (let j = 0; j < SIZE; j++) {
      if (i !== j && (rows[i] === rows[j] || columns[i] === columns[j] || boxes[i] === boxes[j])) {
        peers[i].push(j);
      }
    }
  }

  function validBoard(board) {
    return Array.isArray(board) && board.length === SIZE &&
      Array.from(board).every(value => Number.isInteger(value) && value >= 0 && value <= 9);
  }

  function bitCount(bits) {
    let count = 0;
    while (bits) { bits &= bits - 1; count++; }
    return count;
  }

  // A negative result means the work budget was reached; generation must retain that clue.
  function solveCount(input, limit, budget = Infinity) {
    if (!validBoard(input)) return 0;
    const board = input.slice();
    const rowMasks = Array(9).fill(0), colMasks = Array(9).fill(0), boxMasks = Array(9).fill(0);
    for (let i = 0; i < SIZE; i++) {
      if (!board[i]) continue;
      const bit = 1 << (board[i] - 1);
      if ((rowMasks[rows[i]] | colMasks[columns[i]] | boxMasks[boxes[i]]) & bit) return 0;
      rowMasks[rows[i]] |= bit;
      colMasks[columns[i]] |= bit;
      boxMasks[boxes[i]] |= bit;
    }
    let found = 0, visited = 0, exhausted = false;
    function search() {
      if (found >= limit || exhausted) return;
      if (++visited > budget) { exhausted = true; return; }
      let selected = -1, candidates = 0, minimum = 10;
      for (let i = 0; i < SIZE; i++) {
        if (board[i]) continue;
        const available = ALL & ~(rowMasks[rows[i]] | colMasks[columns[i]] | boxMasks[boxes[i]]);
        const count = bitCount(available);
        if (!count) return;
        if (count < minimum) {
          selected = i;
          candidates = available;
          minimum = count;
          if (count === 1) break;
        }
      }
      if (selected === -1) { found++; return; }
      const row = rows[selected], column = columns[selected], box = boxes[selected];
      while (candidates && found < limit && !exhausted) {
        const bit = candidates & -candidates;
        candidates &= candidates - 1;
        board[selected] = 32 - Math.clz32(bit);
        rowMasks[row] |= bit;
        colMasks[column] |= bit;
        boxMasks[box] |= bit;
        search();
        rowMasks[row] &= ~bit;
        colMasks[column] &= ~bit;
        boxMasks[box] &= ~bit;
        board[selected] = 0;
      }
    }
    search();
    return exhausted ? -1 : found;
  }

  function countSolutions(board, limit = 2) {
    const maximum = Number.isInteger(limit) && limit > 0 ? limit : 2;
    return solveCount(board, maximum);
  }

  function shuffled(items, rng) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const random = Number(rng());
      const bounded = Number.isFinite(random) ? Math.max(0, Math.min(0.9999999999999999, random)) : 0;
      const j = Math.floor(bounded * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function fullGrid(rng) {
    const groups = [0, 1, 2];
    const rowOrder = shuffled(groups, rng).flatMap(group => shuffled(groups, rng).map(row => group * 3 + row));
    const colOrder = shuffled(groups, rng).flatMap(group => shuffled(groups, rng).map(col => group * 3 + col));
    const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    return rowOrder.flatMap(row => colOrder.map(col => digits[(row * 3 + Math.floor(row / 3) + col) % 9]));
  }

  function makeState(difficulty, givens, solution) {
    return { difficulty, givens: givens.slice(), solution: solution.slice(), board: givens.slice(),
      notes: Array(SIZE).fill(0), hints: 0, checks: 0, ended: false };
  }

  function create(difficulty = 'easy', rng = Math.random) {
    if (!Object.hasOwn(difficulties, difficulty)) difficulty = 'easy';
    if (typeof rng !== 'function') rng = Math.random;
    const target = difficulties[difficulty];
    let best = null, bestClues = SIZE + 1;
    // Fixed attempt and search budgets keep puzzle creation bounded on phones and tablets.
    for (let attempt = 0; attempt < 4; attempt++) {
      const solution = fullGrid(rng);
      const givens = solution.slice();
      let clues = SIZE;
      for (const index of shuffled(Array.from({ length: SIZE }, (_, i) => i), rng)) {
        const value = givens[index];
        givens[index] = 0;
        if (solveCount(givens, 2, 12000) === 1) clues--;
        else givens[index] = value;
        if (clues <= target) break;
      }
      if (clues < bestClues) {
        best = makeState(difficulty, givens, solution);
        bestClues = clues;
      }
      if (bestClues <= target) break;
    }
    return best;
  }

  function conflicts(board) {
    if (!validBoard(board)) return [];
    const found = new Set();
    for (let i = 0; i < SIZE; i++) {
      if (!board[i]) continue;
      for (const j of peers[i]) {
        if (board[j] === board[i]) { found.add(i); found.add(j); }
      }
    }
    return [...found].sort((a, b) => a - b);
  }

  function isComplete(board) {
    return validBoard(board) && board.every(value => value !== 0) && conflicts(board).length === 0;
  }

  function validState(state) {
    return state && validBoard(state.board) && validBoard(state.givens) &&
      Array.isArray(state.notes) && state.notes.length === SIZE;
  }

  function remember(state) {
    let moves = history.get(state);
    if (!moves) { moves = []; history.set(state, moves); }
    // Assistance is already used even when the resulting move is undone.
    moves.push({ board: state.board.slice(), notes: state.notes.slice(), ended: state.ended });
    if (moves.length > 200) moves.shift();
  }

  function applyValue(state, index, value) {
    state.board[index] = value;
    state.notes[index] = 0;
    if (value) {
      const mask = ~(1 << (value - 1));
      for (const peer of peers[index]) state.notes[peer] &= mask;
    }
    state.ended = isComplete(state.board);
  }

  function setValue(state, index, value, options = {}) {
    if (!validState(state) || state.ended || !Number.isInteger(index) || index < 0 || index >= SIZE ||
      !Number.isInteger(value) || value < 0 || value > 9 || state.givens[index]) return false;
    if (options && options.notes) {
      if (state.board[index]) return false;
      const next = value ? state.notes[index] ^ (1 << (value - 1)) : 0;
      if (next === state.notes[index]) return false;
      remember(state);
      state.notes[index] = next;
      return true;
    }
    if (state.board[index] === value && !state.notes[index]) return false;
    remember(state);
    applyValue(state, index, value);
    return true;
  }

  function hint(state, index) {
    if (!validState(state) || state.ended || !isComplete(state.solution)) return -1;
    const unresolved = i => !state.givens[i] && state.board[i] !== state.solution[i];
    if (!Number.isInteger(index) || index < 0 || index >= SIZE || !unresolved(index)) {
      index = state.board.findIndex((_, i) => unresolved(i));
    }
    if (index < 0) return -1;
    remember(state);
    applyValue(state, index, state.solution[index]);
    state.hints++;
    return index;
  }

  function undo(state) {
    if (!validState(state)) return false;
    const moves = history.get(state);
    if (!moves || !moves.length) return false;
    Object.assign(state, moves.pop());
    return true;
  }

  function check(state) {
    if (!validState(state) || !isComplete(state.solution)) return [];
    state.checks++;
    return state.board.flatMap((value, i) => value && value !== state.solution[i] ? [i] : []);
  }

  function restore(raw) {
    if (!raw || typeof raw !== 'object' || !Object.hasOwn(difficulties, raw.difficulty) ||
      !validBoard(raw.givens) || !validBoard(raw.board) || !isComplete(raw.solution) ||
      !Array.isArray(raw.notes) || raw.notes.length !== SIZE ||
      !Array.from(raw.notes).every(note => Number.isInteger(note) && note >= 0 && note <= ALL) ||
      !Number.isSafeInteger(raw.hints) || raw.hints < 0 ||
      !Number.isSafeInteger(raw.checks) || raw.checks < 0) return null;
    for (let i = 0; i < SIZE; i++) {
      if (raw.givens[i] && (raw.givens[i] !== raw.solution[i] || raw.board[i] !== raw.givens[i])) return null;
      if (raw.board[i] && raw.notes[i]) return null;
    }
    if (solveCount(raw.givens, 2, 100000) !== 1) return null;
    const state = makeState(raw.difficulty, raw.givens, raw.solution);
    state.board = raw.board.slice();
    state.notes = raw.notes.slice();
    state.hints = raw.hints;
    state.checks = raw.checks;
    state.ended = isComplete(state.board);
    return state;
  }

  return { create, countSolutions, conflicts, isComplete, setValue, hint, undo, check, restore, difficulties };
});
