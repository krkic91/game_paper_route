// version v1.0
'use strict';

// Offline, deterministic puzzle builder. It prints candidates; it never edits the game.
const { performance } = require('node:perf_hooks');

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  for (let end = values.length - 1; end > 0; end--) {
    const other = Math.floor(random() * (end + 1));
    [values[end], values[other]] = [values[other], values[end]];
  }
  return values;
}

function solutionColumns(size, random) {
  const columns = [];
  function visit() {
    if (columns.length === size) return true;
    for (const column of shuffle(Array.from({ length: size }, (_, i) => i), random)) {
      if (columns.includes(column) || (columns.length && Math.abs(column - columns.at(-1)) <= 1)) continue;
      columns.push(column);
      if (visit()) return true;
      columns.pop();
    }
    return false;
  }
  visit();
  return columns;
}

function neighbours(cell, size) {
  const row = Math.floor(cell / size), column = cell % size;
  return [row ? cell - size : -1, row < size - 1 ? cell + size : -1,
    column ? cell - 1 : -1, column < size - 1 ? cell + 1 : -1].filter(index => index >= 0);
}

function generate(size, random) {
  const solution = solutionColumns(size, random);
  const regions = Array(size * size).fill(-1);
  const frontier = [];
  // Different growth rates make compact clue regions beside larger open regions.
  // Uniform growth creates almost exclusively ambiguous Voronoi-like boards.
  const weights = Array.from({ length: size }, () => Math.exp(random() * 7));
  solution.forEach((column, row) => { regions[row * size + column] = row; });
  for (const row of shuffle(Array.from({ length: size }, (_, i) => i), random)) {
    const available = neighbours(row * size + solution[row], size).filter(cell => regions[cell] === -1);
    if (available.length) regions[available[Math.floor(random() * available.length)]] = row;
  }
  function extend(cell) {
    for (const next of neighbours(cell, size)) if (regions[next] === -1) frontier.push([next, regions[cell]]);
  }
  regions.forEach((region, cell) => { if (region !== -1) extend(cell); });
  while (frontier.length) {
    const total = frontier.reduce((sum, entry) => sum + weights[entry[1]], 0);
    let ticket = random() * total, choice = 0;
    while (choice < frontier.length - 1 && (ticket -= weights[frontier[choice][1]]) >= 0) choice++;
    const [cell, region] = frontier[choice];
    frontier[choice] = frontier.at(-1);
    frontier.pop();
    if (regions[cell] !== -1) continue;
    regions[cell] = region;
    extend(cell);
  }
  return { size, regions, solution };
}

function countSolutions({ size, regions }, limit = 2) {
  let count = 0, nodes = 0;
  function visit(row, columns, colors, previous) {
    nodes++;
    if (row === size) { count++; return; }
    for (let column = 0; column < size && count < limit; column++) {
      const colBit = 1 << column, colorBit = 1 << regions[row * size + column];
      if ((columns & colBit) || (colors & colorBit) || Math.abs(column - previous) <= 1) continue;
      visit(row + 1, columns | colBit, colors | colorBit, column);
    }
  }
  visit(0, 0, 0, -3);
  return { count, nodes };
}

function difficulty({ size, regions }) {
  const bits = Array.from({ length: size * size }, (_, i) => 1n << BigInt(i));
  const all = (1n << BigInt(size * size)) - 1n;
  const units = Array.from({ length: size * 3 }, () => 0n);
  const conflicts = bits.map((bit, cell) => {
    const row = Math.floor(cell / size), column = cell % size;
    units[row] |= bit;
    units[size + column] |= bit;
    units[size * 2 + regions[cell]] |= bit;
    let mask = 0n;
    bits.forEach((otherBit, other) => {
      if (cell === other) return;
      const otherRow = Math.floor(other / size), otherColumn = other % size;
      if (row === otherRow || column === otherColumn || regions[cell] === regions[other] ||
          (Math.abs(row - otherRow) <= 1 && Math.abs(column - otherColumn) <= 1)) mask |= otherBit;
    });
    return mask;
  });
  const statistics = { singles: 0, lockedSteps: 0, lockedEliminations: 0, contradictions: 0, trials: 0, depth: 0 };
  const popcount = value => { let count = 0; while (value) { value &= value - 1n; count++; } return count; };
  const singleton = value => value && !(value & value - 1n);
  function propagate(initial, stats) {
    let candidates = initial, previous;
    do {
      previous = candidates;
      for (const unit of units) {
        const options = unit & candidates;
        if (!options) return null;
        let attacked = all;
        for (let cell = 0; cell < bits.length; cell++) if (options & bits[cell]) attacked &= conflicts[cell];
        const removed = candidates & attacked;
        if (!removed) continue;
        if (stats) {
          if (singleton(options)) stats.singles++;
          else { stats.lockedSteps++; stats.lockedEliminations += popcount(removed); }
        }
        candidates &= ~removed;
      }
    } while (candidates !== previous);
    return candidates;
  }
  function solve(initial, depth) {
    statistics.depth = Math.max(statistics.depth, depth);
    let candidates = propagate(initial, statistics);
    if (candidates === null || popcount(candidates) === size) return candidates;
    let advanced;
    do {
      advanced = false;
      for (let cell = 0; cell < bits.length; cell++) {
        if (!(candidates & bits[cell])) continue;
        if (units.some(unit => (unit & candidates) === bits[cell])) continue;
        statistics.trials++;
        if (propagate(candidates & ~conflicts[cell]) === null) {
          statistics.contradictions++;
          candidates = propagate(candidates & ~bits[cell], statistics);
          if (candidates === null || popcount(candidates) === size) return candidates;
          advanced = true;
          break;
        }
      }
    } while (advanced);
    let smallest = null;
    for (const unit of units) {
      const options = unit & candidates, count = popcount(options);
      if (count > 1 && (smallest === null || count < popcount(smallest))) smallest = options;
    }
    for (let cell = 0; cell < bits.length; cell++) {
      if (!(smallest & bits[cell])) continue;
      const solved = solve(candidates & ~conflicts[cell], depth + 1);
      if (solved !== null) return solved;
    }
    return null;
  }
  solve(all, 0);
  statistics.score = statistics.lockedSteps * 10 + statistics.lockedEliminations +
    statistics.contradictions * 100 + statistics.depth * 1000;
  return statistics;
}

// Average over every board orientation so the offline rating does not depend on
// which corner the deterministic logical solver happens to scan first.
function rateOrientations({ size, regions }) {
  const ratings = Array.from({ length: 8 }, (_, transform) => {
    const rotated = Array(size * size);
    regions.forEach((region, cell) => {
      let row = Math.floor(cell / size), column = cell % size;
      if (transform >= 4) column = size - 1 - column;
      for (let turn = 0; turn < transform % 4; turn++) [row, column] = [column, size - 1 - row];
      rotated[row * size + column] = region;
    });
    return difficulty({ size, regions: rotated });
  });
  return {
    score: ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length,
    minScore: Math.min(...ratings.map(rating => rating.score)),
    maxScore: Math.max(...ratings.map(rating => rating.score)),
    minContradictions: Math.min(...ratings.map(rating => rating.contradictions)),
    maxDepth: Math.max(...ratings.map(rating => rating.depth))
  };
}

function run({ size = 8, attempts = 10000, seed = 20261009, minArea = 2 } = {}) {
  if (!Number.isInteger(size) || size < 5 || size > 10) throw new RangeError('size must be an integer from 5 to 10');
  if (!Number.isSafeInteger(attempts) || attempts < 1) throw new RangeError('attempts must be a positive safe integer');
  if (!Number.isSafeInteger(seed)) throw new RangeError('seed must be a safe integer');
  if (!Number.isInteger(minArea) || minArea < 1 || minArea > size) throw new RangeError('minArea must be an integer from 1 to size');
  const started = performance.now(), random = seededRandom(seed), candidates = [];
  let areaAccepted = 0, unique = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const puzzle = generate(size, random);
    const areas = Array(size).fill(0);
    puzzle.regions.forEach(region => areas[region]++);
    if (Math.min(...areas) < minArea) continue;
    areaAccepted++;
    const solutions = countSolutions(puzzle);
    if (solutions.count !== 1) continue;
    unique++;
    const rating = difficulty(puzzle);
    candidates.push({ attempt, puzzle: [size, puzzle.regions.join(''), puzzle.solution.join('')],
      areas, searchNodes: solutions.nodes, ...rating });
  }
  candidates.sort((a, b) => a.score - b.score || a.attempt - b.attempt);
  return { size, attempts, seed, minArea, areaAccepted, unique,
    seconds: Math.round((performance.now() - started) / 10) / 100, candidates };
}

// Reproduce the shipped additions without replacing the first 24 saved-game templates.
// The approximate rating combines logical eliminations and contradiction deductions,
// averaged over all eight symmetries. It is a selection aid, not a human difficulty guarantee.
const releaseSelection = [
  [8, 43349], // Level 25; mean logical score 140
  [8, 36606], // Level 26; mean logical score 160
  [8, 76263], // Level 27; mean logical score 180
  [8, 83226], // Level 28; mean logical score 212.25
  [8, 44864], // Level 29; mean logical score 230.75
  [8, 43609], // Level 30; mean logical score 247.375
  [8, 29853], // Level 31; mean logical score 270.875
  [8, 36991], // Level 32; mean logical score 290.25
  [9, 59704], // Level 33; mean logical score 297
  [9, 48225], // Level 34; mean logical score 313.5
  [9, 59525], // Level 35; mean logical score 319.75
  [9, 82023], // Level 36; mean logical score 325.125
  [9, 72843], // Level 37; mean logical score 345.25
  [9, 94257], // Level 38; mean logical score 351.875
  [9, 75106], // Level 39; mean logical score 361.5
  [9, 34549], // Level 40; mean logical score 367.875
  [9, 8366], // Level 41; mean logical score 386.375
  [9, 42849], // Level 42; mean logical score 387.25
  [10, 71324], // Level 43; mean logical score 392.75
  [10, 98053], // Level 44; mean logical score 419.5
  [10, 64481], // Level 45; mean logical score 431.5
  [10, 10696], // Level 46; mean logical score 443.125
  [10, 49691], // Level 47; mean logical score 452.125
  [10, 35006], // Level 48; mean logical score 528
  [10, 4442], // Level 49; mean logical score 565.375
  [10, 52966], // Level 50; mean logical score 726.5
];

function buildRelease() {
  const selected = new Map();
  for (const size of [8, 9, 10]) {
    const attempts = releaseSelection.filter(entry => entry[0] === size).map(entry => entry[1]);
    const wanted = new Set(attempts), random = seededRandom(20261009);
    for (let attempt = 0; attempt <= Math.max(...attempts); attempt++) {
      const puzzle = generate(size, random);
      if (!wanted.has(attempt)) continue;
      const areas = Array(size).fill(0);
      puzzle.regions.forEach(region => areas[region]++);
      if (Math.min(...areas) < 2 || countSolutions(puzzle).count !== 1) throw new Error('Invalid release puzzle');
      selected.set(`${size}:${attempt}`, {
        puzzle: [size, puzzle.regions.join(''), puzzle.solution.join('')],
        seed: 20261009, attempt, areas, ...rateOrientations(puzzle)
      });
    }
  }
  return releaseSelection.map(([size, attempt], index) => ({ level: index + 25, ...selected.get(`${size}:${attempt}`) }));
}

if (require.main === module) {
  try {
    const args = {};
    const release = process.argv.length === 3 && process.argv[2] === '--release';
    if (!release) for (let i = 2; i < process.argv.length; i += 2) {
      const name = process.argv[i].replace(/^--/, '');
      if (!['size', 'attempts', 'seed', 'minArea'].includes(name) || process.argv[i + 1] === undefined) {
        throw new Error('Use --release or --size N --attempts N --seed N --minArea N');
      }
      args[name] = Number(process.argv[i + 1]);
    }
    process.stdout.write(`${JSON.stringify(release ? buildRelease() : run(args), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { seededRandom, generate, countSolutions, difficulty, rateOrientations, run, buildRelease };
