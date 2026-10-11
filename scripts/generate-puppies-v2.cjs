// version v1.0
'use strict';

const { seededRandom, countSolutions, difficulty, rateOrientations } = require('./generate-puppies.cjs');
const fs = require('node:fs');

const adjacent = (cell, size) => {
  const row = Math.floor(cell / size), column = cell % size;
  return [row ? cell - size : -1, row < size - 1 ? cell + size : -1,
    column ? cell - 1 : -1, column < size - 1 ? cell + 1 : -1].filter(next => next >= 0);
};
function shuffle(values, random) {
  for (let end = values.length - 1; end > 0; end--) {
    const other = Math.floor(random() * (end + 1));
    [values[end], values[other]] = [values[other], values[end]];
  }
  return values;
}
function makeSolution(size, random) {
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
function grow(size, random) {
  const solution = makeSolution(size, random), regions = Array(size * size).fill(-1);
  const areas = Array(size).fill(1), neighbours = regions.map((_, cell) => adjacent(cell, size));
  const weights = Array.from({ length: size }, () => Math.exp(random() * 3));
  solution.forEach((column, row) => { regions[row * size + column] = row; });
  let left = size * size - size;
  while (left) {
    const choices = [];
    regions.forEach((region, cell) => {
      if (region !== -1) return;
      for (const color of new Set(neighbours[cell].map(next => regions[next]).filter(color => color !== -1))) {
        choices.push([cell, color, weights[color] / Math.pow(areas[color], 0.35)]);
      }
    });
    let ticket = random() * choices.reduce((sum, choice) => sum + choice[2], 0), choice = choices.at(-1);
    for (const entry of choices) { if ((ticket -= entry[2]) < 0) { choice = entry; break; } }
    regions[choice[0]] = choice[1]; areas[choice[1]]++; left--;
  }
  return { size, regions, solution, areas, neighbours };
}
function connectedWithout(puzzle, cell) {
  const { regions, neighbours, areas } = puzzle, color = regions[cell];
  const start = neighbours[cell].find(next => regions[next] === color);
  if (start === undefined) return areas[color] === 1;
  const visited = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const next of neighbours[queue[i]]) {
    if (next !== cell && regions[next] === color && !visited.has(next)) { visited.add(next); queue.push(next); }
  }
  return visited.size === areas[color] - 1;
}
function canonical(puzzle) {
  const { size, regions } = puzzle;
  return Array.from({ length: 8 }, (_, transform) => {
    const transformed = Array(size * size);
    regions.forEach((color, cell) => {
      let row = Math.floor(cell / size), column = cell % size;
      if (transform >= 4) column = size - 1 - column;
      for (let turn = 0; turn < transform % 4; turn++) [row, column] = [column, size - 1 - row];
      transformed[row * size + column] = color;
    });
    const colors = new Map();
    return transformed.map(color => {
      if (!colors.has(color)) colors.set(color, colors.size);
      return colors.get(color);
    }).join('');
  }).sort()[0];
}
function optimize(puzzle, random, steps = 1600, solutionLimit = puzzle.size >= 9 ? 100 : 16) {
  const { size, regions, areas, neighbours, solution } = puzzle;
  const fixed = new Set(solution.map((column, row) => row * size + column));
  const penalty = () => areas.reduce((sum, area) => sum + Math.max(0, 3 - area) * 8 + Math.max(0, area - Math.floor(size * size * 0.32)) * 3, 0);
  let solutions = countSolutions(puzzle, solutionLimit).count;
  let score = Math.log(solutions) * 10 + penalty();
  for (let step = 0; step < steps; step++) {
    const cell = Math.floor(random() * regions.length);
    if (fixed.has(cell) || areas[regions[cell]] <= 2) continue;
    const choices = [...new Set(neighbours[cell].map(next => regions[next]).filter(color => color !== regions[cell]))];
    if (!choices.length || !connectedWithout(puzzle, cell)) continue;
    const from = regions[cell], to = choices[Math.floor(random() * choices.length)];
    regions[cell] = to; areas[from]--; areas[to]++;
    const nextSolutions = countSolutions(puzzle, solutionLimit).count;
    const nextScore = Math.log(nextSolutions) * 10 + penalty();
    const temperature = 0.1 + 1.5 * (1 - step / steps);
    if (nextScore <= score || random() < Math.exp((score - nextScore) / temperature)) {
      solutions = nextSolutions; score = nextScore;
      if (solutions === 1 && penalty() === 0) return puzzle;
    } else { regions[cell] = from; areas[from]++; areas[to]--; }
  }
  return null;
}

function sample({ size = 10, attempts = 100, seed = 20261011, steps = 1600, solutionLimit = size >= 9 ? 100 : 16, checkpoint } = {}) {
  if (!Number.isInteger(size) || size < 7 || size > 10 || !Number.isSafeInteger(attempts) || attempts < 1 ||
      !Number.isSafeInteger(steps) || steps < 1 || !Number.isSafeInteger(seed) ||
      !Number.isSafeInteger(solutionLimit) || solutionLimit < 2) throw new RangeError('Invalid generator parameters');
  const random = seededRandom(seed), candidates = [], seen = new Set();
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (checkpoint && attempt % 50 === 0) {
      fs.writeFileSync(checkpoint, JSON.stringify({ size, attempts, seed, steps, completedAttempts: attempt, candidates }));
      process.stderr.write(`${size}x${size}: ${attempt}/${attempts}, ${candidates.length} unique candidates\n`);
    }
    const puzzle = optimize(grow(size, random), random, steps, solutionLimit);
    if (!puzzle) continue;
    const key = canonical(puzzle);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ attempt, size, puzzle: [puzzle.regions.join(''), puzzle.solution.join('')],
      areas: puzzle.areas.slice(), ...difficulty(puzzle) });
    if (process.env.PUPPIES_GENERATOR_PROGRESS) process.stderr.write(`${size}: ${attempt + 1}/${attempts}, accepted ${candidates.length}\n`);
  }
  const result = { size, attempts, seed, steps, solutionLimit, completedAttempts: attempts, candidates };
  if (checkpoint) fs.writeFileSync(checkpoint, JSON.stringify(result));
  return result;
}

// A walk changes region boundaries while checking the complete solution count after
// each accepted change. Freeze answer cells, preserve connectivity, and require a
// substantial change before retaining another candidate from the same starting map.
function expand(candidates, { seed = 20261013, copies = 12, steps = 10000, checkpoint } = {}) {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(copies) || copies < 1 ||
      !Number.isSafeInteger(steps) || steps < 1) throw new RangeError('Invalid expansion parameters');
  const random = seededRandom(seed), results = [], seen = new Set();
  for (const [source, entry] of candidates.entries()) {
    const { size } = entry, regions = Array.from(entry.puzzle[0], Number);
    const solution = Array.from(entry.puzzle[1], Number), areas = Array(size).fill(0);
    regions.forEach(color => areas[color]++);
    const neighbours = regions.map((_, cell) => adjacent(cell, size));
    const puzzle = { size, regions, solution, areas, neighbours };
    const fixed = new Set(solution.map((column, row) => row * size + column));
    let lastMap = regions.slice(), accepted = 0, saved = 0;
    for (let step = 0; step < steps && saved < copies; step++) {
      const cell = Math.floor(random() * regions.length), from = regions[cell];
      if (fixed.has(cell) || areas[from] <= 3) continue;
      const choices = [...new Set(neighbours[cell].map(next => regions[next]).filter(color =>
        color !== from && areas[color] < Math.floor(size * size * 0.32)))];
      if (!choices.length || !connectedWithout(puzzle, cell)) continue;
      const to = choices[Math.floor(random() * choices.length)];
      regions[cell] = to; areas[from]--; areas[to]++;
      if (countSolutions(puzzle, 2).count !== 1) { regions[cell] = from; areas[from]++; areas[to]--; continue; }
      accepted++;
      if (accepted < size * size || regions.filter((color, index) => color !== lastMap[index]).length < size * size * 0.2) continue;
      const key = canonical(puzzle);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ size, source, step, puzzle: [regions.join(''), solution.join('')], areas: areas.slice(), ...rateOrientations(puzzle) });
      lastMap = regions.slice(); accepted = 0; saved++;
    }
    if (checkpoint && source % 10 === 0) {
      fs.writeFileSync(checkpoint, JSON.stringify({ seed, copies, steps, completedSources: source + 1, candidates: results }));
      process.stderr.write(`Expanded ${source + 1}/${candidates.length} sources: ${results.length} candidates\n`);
    }
  }
  const result = { seed, copies, steps, completedSources: candidates.length, candidates: results };
  if (checkpoint) fs.writeFileSync(checkpoint, JSON.stringify(result));
  return result;
}

function answerKey(entry) {
  const size = entry.size;
  const cells = Array.from(entry.puzzle[1], (column, row) => row * size + Number(column));
  return Array.from({ length: 8 }, (_, transform) => cells.map(cell => {
    let row = Math.floor(cell / size), column = cell % size;
    if (transform >= 4) column = size - 1 - column;
    for (let turn = 0; turn < transform % 4; turn++) [row, column] = [column, size - 1 - row];
    return row * size + column;
  }).sort((a, b) => a - b).join(',')).sort()[0];
}

function selectCatalog(pools) {
  const levels = [], seen = new Set(), report = [];
  const bands = [[7, 10, 120, 330], [8, 15, 340, 680], [9, 15, 690, 1100], [10, 60, 1120, Infinity]];
  for (const [size, count, minimum, maximum] of bands) {
    const pool = pools[size].filter(entry => entry.score >= minimum && entry.score <= maximum)
      .sort((a, b) => a.score - b.score || a.puzzle[0].localeCompare(b.puzzle[0]));
    const unique = pool.filter(entry => {
      const key = `${size}:${canonical({ size, regions: Array.from(entry.puzzle[0], Number) })}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    let groups = [];
    while (unique.length >= 5) {
      const first = unique.shift(), chosen = [first], answers = new Set([answerKey(first)]);
      for (let index = 0; index < unique.length && chosen.length < 5; index++) {
        const candidate = unique[index];
        if (candidate.score > first.score * 1.3) break;
        const key = answerKey(candidate);
        if (answers.has(key)) continue;
        answers.add(key); chosen.push(candidate); unique.splice(index--, 1);
      }
      if (chosen.length === 5) groups.push(chosen);
      else unique.push(...chosen.slice(1));
      unique.sort((a, b) => a.score - b.score || a.puzzle[0].localeCompare(b.puzzle[0]));
    }
    const mean = group => group.reduce((sum, entry) => sum + entry.score, 0) / group.length;
    groups.sort((a, b) => mean(a) - mean(b));
    groups = groups.filter((group, index) => index === 0 || mean(group) > mean(groups[index - 1]));
    if (groups.length < count) throw new Error(`Need ${count} groups for size ${size}; found ${groups.length}`);
    // Spread the retained levels across the available difficulty range, keeping
    // each level's five alternatives close and their answer patterns different.
    for (let index = 0; index < count; index++) {
      const chosen = groups[Math.round(index * (groups.length - 1) / (count - 1))];
      const level = levels.length + 1;
      const difficulty = level <= 10 ? 'Khó' : level <= 25 ? 'Rất khó' : level <= 40 ? 'Chuyên gia' :
        level <= 60 ? 'Bậc thầy' : level <= 80 ? 'Siêu khó' : 'Thử thách tối thượng';
      levels.push({ size, difficulty, puzzles: chosen.map(entry => entry.puzzle) });
      report.push({ level, size, scores: chosen.map(entry => entry.score),
        minArea: Math.min(...chosen.flatMap(entry => entry.areas)), maxArea: Math.max(...chosen.flatMap(entry => entry.areas)) });
    }
  }
  for (let i = 1; i < report.length; i++) {
    const mean = entry => entry.scores.reduce((sum, score) => sum + score, 0) / 5;
    if (mean(report[i]) <= mean(report[i - 1])) throw new Error('Difficulty must increase between levels');
  }
  return { catalog: { version: 2, levels }, report };
}

function catalogSource(catalog) {
  return '// version v1.0\n/* Generated offline by scripts/generate-puppies-v2.cjs. */\n' +
    '(function (root, factory) {\n  const data = factory();\n  if (typeof module === "object" && module.exports) module.exports = data;\n' +
    '  else root.PuppiesCatalog = data;\n})(typeof globalThis === "undefined" ? this : globalThis, function () {\n  "use strict";\n' +
    '  return ' + JSON.stringify(catalog, null, 2) + ';\n});\n';
}

// Reproduce the catalog from fixed seeds. No files are modified by this function.
function buildRelease() {
  const pools = {};
  for (const size of [7, 8, 9, 10]) {
    const base = sample({ size, attempts: size === 10 ? 200 : 600, solutionLimit: size === 10 ? 100 : 16 });
    if (size <= 8) for (const entry of base.candidates) Object.assign(entry,
      rateOrientations({ size, regions: Array.from(entry.puzzle[0], Number) }));
    const copies = size === 7 ? 0 : size === 8 ? 2 : size === 9 ? 8 : 20;
    const sources = size === 10 ? base.candidates.slice(0, 41) : base.candidates;
    const extras = copies ? expand(sources, { copies, steps: size === 8 ? 12000 : 24000 }).candidates : [];
    pools[size] = size <= 8 ? base.candidates.concat(extras) : extras;
  }
  return selectCatalog(pools);
}
if (require.main === module) {
  try {
    if (process.argv.length === 3 && process.argv[2] === '--release') {
      process.stdout.write(catalogSource(buildRelease().catalog));
    } else {
      const args = {};
      for (let i = 2; i < process.argv.length; i += 2) {
        const name = process.argv[i].replace(/^--/, '');
        if (!['size', 'attempts', 'seed', 'steps', 'solutionLimit'].includes(name) || process.argv[i + 1] === undefined) throw new Error('Invalid generator option');
        args[name] = Number(process.argv[i + 1]);
      }
      process.stdout.write(`${JSON.stringify(sample(args), null, 2)}\n`);
    }
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
module.exports = { grow, optimize, canonical, sample, expand, answerKey, selectCatalog, catalogSource, buildRelease };
