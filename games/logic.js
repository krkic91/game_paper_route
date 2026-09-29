/* Shared, DOM-free game rules. Also exported to Node for regression tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeLogic = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const mod = (n, m) => ((n % m) + m) % m;

  function shuffle(items, rng = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Free-style Gomoku: at least five in a row, including an overline, wins.
  function createCaro(size = 15) {
    return {
      size,
      board: Array(size * size).fill(0),
      turn: 1,
      moves: 0,
      ended: false,
      winner: 0,
      line: [],
      last: -1,
    };
  }
  function caroLine(state, index, player) {
    const { size, board } = state;
    const row = Math.floor(index / size),
      col = index % size;
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ]) {
      const line = [index];
      for (const sign of [-1, 1]) {
        let r = row + dr * sign,
          c = col + dc * sign;
        while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === player) {
          line.push(r * size + c);
          r += dr * sign;
          c += dc * sign;
        }
      }
      if (line.length >= 5) return line;
    }
    return [];
  }
  function moveCaro(state, index) {
    if (
      state.ended ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= state.board.length ||
      state.board[index]
    )
      return false;
    state.board[index] = state.turn;
    state.last = index;
    state.moves++;
    state.line = caroLine(state, index, state.turn);
    if (state.line.length) {
      state.ended = true;
      state.winner = state.turn;
    } else if (state.moves === state.board.length) state.ended = true;
    else state.turn = 3 - state.turn;
    return true;
  }
  function caroPotential(state, index, player) {
    const { size, board } = state;
    const row = Math.floor(index / size),
      col = index % size;
    let value = 0;
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ]) {
      let count = 1,
        open = 0;
      for (const sign of [-1, 1]) {
        let r = row + dr * sign,
          c = col + dc * sign;
        while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === player) {
          count++;
          r += dr * sign;
          c += dc * sign;
        }
        if (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === 0) open++;
      }
      if (count >= 5) value += 1000000;
      else if (open) value += [0, 2, 22, 220, 5500][count] * (open === 2 ? 4 : 1);
    }
    return value;
  }
  function chooseCaroMove(state, player = state.turn) {
    if (state.ended) return -1;
    if (!state.moves) return Math.floor(state.size / 2) * state.size + Math.floor(state.size / 2);
    const candidates = new Set();
    state.board.forEach((cell, index) => {
      if (!cell) return;
      const row = Math.floor(index / state.size),
        col = index % state.size;
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
          const r = row + dr,
            c = col + dc;
          if (
            r >= 0 &&
            r < state.size &&
            c >= 0 &&
            c < state.size &&
            !state.board[r * state.size + c]
          )
            candidates.add(r * state.size + c);
        }
    });
    let best = -1,
      bestValue = -Infinity;
    for (const index of candidates) {
      const attack = caroPotential(state, index, player);
      const defend = caroPotential(state, index, 3 - player);
      const center = (state.size - 1) / 2;
      const distance =
        Math.abs(Math.floor(index / state.size) - center) + Math.abs((index % state.size) - center);
      const value =
        attack >= 1000000
          ? 100000000 + attack
          : defend >= 1000000
            ? 10000000 + defend
            : attack * 1.08 + defend - distance * 0.1;
      if (value > bestValue) {
        bestValue = value;
        best = index;
      }
    }
    return best;
  }

  function add2048Tile(board, rng = Math.random) {
    const empty = board.flatMap((n, i) => (n ? [] : [i]));
    if (!empty.length) return false;
    board[empty[Math.floor(rng() * empty.length)]] = rng() < 0.9 ? 2 : 4;
    return true;
  }
  function create2048(rng = Math.random) {
    const board = Array(16).fill(0);
    add2048Tile(board, rng);
    add2048Tile(board, rng);
    return board;
  }
  function move2048(board, direction) {
    const result = [...board];
    let score = 0;
    if (!['left', 'right', 'up', 'down'].includes(direction))
      return { board: result, score, changed: false };
    for (let line = 0; line < 4; line++) {
      const indices = Array.from({ length: 4 }, (_, p) => {
        if (direction === 'left') return line * 4 + p;
        if (direction === 'right') return line * 4 + 3 - p;
        if (direction === 'up') return p * 4 + line;
        return (3 - p) * 4 + line;
      });
      const values = indices.map((i) => board[i]).filter(Boolean),
        merged = [];
      for (let i = 0; i < values.length; i++) {
        if (values[i] === values[i + 1]) {
          const value = values[i] * 2;
          merged.push(value);
          score += value;
          i++;
        } else merged.push(values[i]);
      }
      indices.forEach((index, i) => {
        result[index] = merged[i] || 0;
      });
    }
    return { board: result, score, changed: result.some((n, i) => n !== board[i]) };
  }
  function canMove2048(board) {
    return board.some((n) => !n) || ['left', 'up'].some((dir) => move2048(board, dir).changed);
  }

  const LUDO_STARTS = [0, 13, 26, 39];
  const LUDO_SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  function createLudo(players = [0, 1, 2, 3]) {
    return {
      players: [...players],
      tokens: Array.from({ length: 4 }, () => [-1, -1, -1, -1]),
      turn: 0,
      die: 0,
      winner: null,
      moves: 0,
    };
  }
  function ludoPosition(player, progress) {
    return progress >= 0 && progress < 52 ? (LUDO_STARTS[player] + progress) % 52 : -1;
  }
  function legalLudoMoves(state) {
    if (!state.die || state.winner !== null) return [];
    return state.tokens[state.players[state.turn]].flatMap((progress, i) =>
      (progress === -1 ? state.die === 6 : progress < 57 && progress + state.die <= 57) ? [i] : [],
    );
  }
  function rollLudo(state, rng = Math.random) {
    if (state.die || state.winner !== null) return 0;
    state.die = 1 + Math.floor(rng() * 6);
    return state.die;
  }
  function endLudoTurn(state) {
    if (state.die !== 6) state.turn = (state.turn + 1) % state.players.length;
    state.die = 0;
  }
  function passLudo(state) {
    if (!state.die || legalLudoMoves(state).length || state.winner !== null) return false;
    endLudoTurn(state);
    return true;
  }
  function moveLudo(state, token) {
    if (!legalLudoMoves(state).includes(token)) return null;
    const player = state.players[state.turn];
    const current = state.tokens[player][token];
    const progress = current < 0 ? 0 : current + state.die;
    state.tokens[player][token] = progress;
    const pos = ludoPosition(player, progress);
    let captured = 0;
    if (pos >= 0 && !LUDO_SAFE.has(pos)) {
      for (const opponent of state.players) {
        if (opponent === player) continue;
        state.tokens[opponent].forEach((p, i) => {
          if (ludoPosition(opponent, p) === pos) {
            state.tokens[opponent][i] = -1;
            captured++;
          }
        });
      }
    }
    const extra = state.die === 6;
    state.moves++;
    if (state.tokens[player].every((p) => p === 57)) state.winner = player;
    endLudoTurn(state);
    return { player, token, captured, finished: progress === 57, extra };
  }
  function chooseLudoMove(state) {
    const player = state.players[state.turn];
    let best = -1,
      bestScore = -Infinity;
    for (const token of legalLudoMoves(state)) {
      const current = state.tokens[player][token];
      const next = current < 0 ? 0 : current + state.die;
      const pos = ludoPosition(player, next);
      let score = next + (current < 0 ? 35 : 0) + (next === 57 ? 200 : 0);
      if (pos >= 0 && !LUDO_SAFE.has(pos)) {
        for (const opponent of state.players)
          if (opponent !== player) {
            score +=
              state.tokens[opponent].filter((p) => ludoPosition(opponent, p) === pos).length * 90;
          }
      }
      if (score > bestScore) {
        best = token;
        bestScore = score;
      }
    }
    return best;
  }

  // Ô ăn quan: two royal stones worth 10 each, 50 ordinary stones.
  // Indices 1..5: upper row, 7..11: lower row (right to left).
  const quanSide = (player) => (player === 0 ? [7, 8, 9, 10, 11] : [1, 2, 3, 4, 5]);
  function createQuan() {
    return {
      pits: [0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5],
      royals: [true, true],
      scores: [0, 0],
      turn: 0,
      ended: false,
      winner: null,
      moves: 0,
    };
  }
  function quanValue(state, pit) {
    return (
      state.pits[pit] + ((pit === 0 && state.royals[0]) || (pit === 6 && state.royals[1]) ? 10 : 0)
    );
  }
  function finishQuan(state) {
    for (let player = 0; player < 2; player++)
      for (const pit of quanSide(player)) {
        state.scores[player] += state.pits[pit];
        state.pits[pit] = 0;
      }
    state.ended = true;
    state.winner =
      state.scores[0] === state.scores[1] ? null : state.scores[0] > state.scores[1] ? 0 : 1;
  }
  function moveQuan(state, pit, direction) {
    if (
      state.ended ||
      !quanSide(state.turn).includes(pit) ||
      !state.pits[pit] ||
      ![-1, 1].includes(direction)
    )
      return null;
    const player = state.turn;
    let hand = state.pits[pit],
      cursor = pit,
      captured = 0,
      relays = 0;
    state.pits[pit] = 0;
    while (true) {
      while (hand > 0) {
        cursor = mod(cursor + direction, 12);
        state.pits[cursor]++;
        hand--;
      }
      const next = mod(cursor + direction, 12);
      if (next !== 0 && next !== 6 && state.pits[next] > 0) {
        hand = state.pits[next];
        state.pits[next] = 0;
        cursor = next;
        relays++;
        continue;
      }
      // A chain of captures must alternate an empty pit and an occupied pit.
      let empty = next;
      while (quanValue(state, empty) === 0) {
        const target = mod(empty + direction, 12),
          value = quanValue(state, target);
        if (!value) break;
        captured += value;
        state.scores[player] += value;
        state.pits[target] = 0;
        if (target === 0) state.royals[0] = false;
        if (target === 6) state.royals[1] = false;
        empty = mod(target + direction, 12);
      }
      break;
    }
    state.moves++;
    let refilled = false;
    if (!state.royals[0] && !state.royals[1] && !state.pits[0] && !state.pits[6]) finishQuan(state);
    else {
      state.turn = 1 - state.turn;
      if (quanSide(state.turn).every((i) => !state.pits[i])) {
        // Borrowing is represented by a negative score; it is repaid by future captures.
        state.scores[state.turn] -= 5;
        for (const i of quanSide(state.turn)) state.pits[i] = 1;
        refilled = true;
      }
    }
    return { captured, relays, refilled, player };
  }
  function chooseQuanMove(state) {
    if (state.ended) return null;
    let best = null,
      bestValue = -Infinity;
    const player = state.turn;
    for (const pit of quanSide(player))
      for (const direction of [-1, 1]) {
        if (!state.pits[pit]) continue;
        const copy = {
          ...state,
          pits: [...state.pits],
          royals: [...state.royals],
          scores: [...state.scores],
        };
        const result = moveQuan(copy, pit, direction);
        let worstReply = 0;
        if (!copy.ended) {
          for (const reply of quanSide(copy.turn))
            for (const dir of [-1, 1]) {
              if (!copy.pits[reply]) continue;
              const next = {
                ...copy,
                pits: [...copy.pits],
                royals: [...copy.royals],
                scores: [...copy.scores],
              };
              const response = moveQuan(next, reply, dir);
              worstReply = Math.max(worstReply, response.captured);
            }
        }
        const value = copy.ended
          ? (copy.scores[player] - copy.scores[1 - player]) * 100
          : result.captured - worstReply * 0.75;
        if (value > bestValue) {
          bestValue = value;
          best = { pit, direction };
        }
      }
    return best;
  }

  function snakeFood(state, rng = Math.random) {
    const occupied = new Set(state.snake.map((p) => p.y * state.size + p.x));
    const free = [];
    for (let i = 0; i < state.size ** 2; i++) if (!occupied.has(i)) free.push(i);
    if (!free.length) return null;
    const index = free[Math.floor(rng() * free.length)];
    return { x: index % state.size, y: Math.floor(index / state.size) };
  }
  function createSnake(size = 20, rng = Math.random) {
    const center = Math.floor(size / 2);
    const state = {
      size,
      snake: [
        { x: center, y: center },
        { x: center - 1, y: center },
        { x: center - 2, y: center },
      ],
      dir: { x: 1, y: 0 },
      pending: null,
      food: null,
      score: 0,
      status: 'playing',
    };
    state.food = snakeFood(state, rng);
    return state;
  }
  function turnSnake(state, x, y) {
    if (
      Math.abs(x) + Math.abs(y) !== 1 ||
      state.pending ||
      (x === -state.dir.x && y === -state.dir.y)
    )
      return false;
    state.pending = { x, y };
    return true;
  }
  function stepSnake(state, rng = Math.random) {
    if (state.status !== 'playing') return state;
    if (state.pending) {
      state.dir = state.pending;
      state.pending = null;
    }
    const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };
    const eating = state.food && head.x === state.food.x && head.y === state.food.y;
    const body = eating ? state.snake : state.snake.slice(0, -1);
    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= state.size ||
      head.y >= state.size ||
      body.some((p) => p.x === head.x && p.y === head.y)
    ) {
      state.status = 'lost';
      return state;
    }
    state.snake.unshift(head);
    if (eating) {
      state.score += 10;
      state.food = snakeFood(state, rng);
      if (!state.food) state.status = 'won';
    } else state.snake.pop();
    return state;
  }

  function createMemory(rng = Math.random) {
    return {
      cards: shuffle([...Array(8).keys(), ...Array(8).keys()], rng),
      open: [],
      matched: Array(16).fill(false),
      moves: 0,
      ended: false,
    };
  }
  function flipMemory(state, index) {
    if (
      state.ended ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= 16 ||
      state.open.length === 2 ||
      state.matched[index] ||
      state.open.includes(index)
    )
      return 'ignored';
    state.open.push(index);
    if (state.open.length < 2) return 'first';
    state.moves++;
    const [a, b] = state.open;
    if (state.cards[a] === state.cards[b]) {
      state.matched[a] = state.matched[b] = true;
      state.open = [];
      state.ended = state.matched.every(Boolean);
      return 'match';
    }
    return 'miss';
  }
  function closeMemoryPair(state) {
    state.open = [];
  }

  function createRace(rng = Math.random) {
    return {
      distance: 0,
      length: 1000,
      time: 0,
      x: 1.5,
      speed: 0,
      energy: 100,
      hearts: 3,
      invulnerable: 0,
      status: 'playing',
      place: 4,
      rivals: [0, 1, 2].map((n) => ({
        x: [0.3, 1.7, 2.8][n],
        distance: 4 + n * 4,
        speed: 16.8 + n * 0.9,
      })),
      obstacles: Array.from({ length: 19 }, (_, i) => ({
        x: Math.floor(rng() * 4),
        z: 80 + i * 47,
        type: i % 5 === 3 ? 'water' : i % 3 === 0 ? 'puddle' : 'cone',
        passed: false,
      })),
    };
  }
  function stepRace(state, dt, input = {}) {
    if (state.status !== 'playing') return state;
    dt = clamp(dt, 0, 0.05);
    state.time += dt;
    state.invulnerable = Math.max(0, state.invulnerable - dt);
    state.x = clamp(state.x + (input.steer || 0) * dt * 2.5, 0, 3);
    const sprint = input.sprint && state.energy > 1;
    state.energy = clamp(state.energy + (sprint ? -23 : 12) * dt, 0, 100);
    const target = sprint ? 27 : 17;
    state.speed += (target - state.speed) * Math.min(1, dt * 2);
    const before = state.distance;
    state.distance += state.speed * dt;
    for (const rival of state.rivals)
      rival.distance += (rival.speed + Math.sin(state.time * 0.65 + rival.x) * 1.2) * dt;
    for (const obstacle of state.obstacles) {
      if (obstacle.passed || obstacle.z > state.distance + 2.5 || obstacle.z < before - 2.5)
        continue;
      if (Math.abs(state.x - obstacle.x) < 0.4) {
        if (obstacle.type === 'water') state.energy = Math.min(100, state.energy + 38);
        else if (!state.invulnerable) {
          state.hearts--;
          state.speed = 6;
          state.invulnerable = 1.5;
        }
      }
      if (state.distance >= obstacle.z || Math.abs(state.x - obstacle.x) < 0.4)
        obstacle.passed = true;
    }
    state.place = 1 + state.rivals.filter((rival) => rival.distance > state.distance).length;
    if (state.hearts <= 0) state.status = 'lost';
    else if (state.distance >= state.length) {
      state.distance = state.length;
      state.status = 'won';
    }
    return state;
  }

  const POOL = {
    width: 900,
    height: 500,
    left: 55,
    right: 845,
    top: 55,
    bottom: 445,
    radius: 11,
    pocket: 24,
  };
  const POCKETS = [
    [55, 55],
    [450, 48],
    [845, 55],
    [55, 445],
    [450, 452],
    [845, 445],
  ];
  function createPool() {
    const balls = [{ id: 0, x: 260, y: 250, vx: 0, vy: 0, active: true }];
    let id = 1;
    for (let row = 0; row < 5; row++)
      for (let col = 0; col <= row; col++) {
        balls.push({
          id: id++,
          x: 590 + row * 20,
          y: 250 + (col - row / 2) * 23,
          vx: 0,
          vy: 0,
          active: true,
        });
      }
    return { balls, shots: 0, scratches: 0, potted: 0, status: 'ready' };
  }
  function shootPool(state, angle, power) {
    if (state.status !== 'ready' || !Number.isFinite(angle) || !Number.isFinite(power))
      return false;
    const cue = state.balls[0],
      speed = 100 + clamp(power, 0, 1) * 850;
    cue.vx = Math.cos(angle) * speed;
    cue.vy = Math.sin(angle) * speed;
    state.shots++;
    state.status = 'moving';
    return true;
  }
  function respotCue(state) {
    const cue = state.balls[0];
    for (let x = 260; x >= 100; x -= 30)
      for (let y = 250; y <= 400; y += 30) {
        if (
          state.balls
            .slice(1)
            .every((b) => !b.active || Math.hypot(b.x - x, b.y - y) > POOL.radius * 2 + 2)
        ) {
          Object.assign(cue, { x, y, vx: 0, vy: 0, active: true });
          return;
        }
      }
  }
  function stepPool(state, dt) {
    if (state.status !== 'moving') return state;
    const steps = Math.max(1, Math.ceil(clamp(dt, 0, 0.05) / (1 / 180)));
    const step = clamp(dt, 0, 0.05) / steps;
    for (let n = 0; n < steps; n++) {
      for (const b of state.balls) {
        if (!b.active) continue;
        b.x += b.vx * step;
        b.y += b.vy * step;
        if (POCKETS.some(([x, y]) => Math.hypot(b.x - x, b.y - y) < POOL.pocket)) {
          b.active = false;
          b.vx = b.vy = 0;
          if (b.id === 0) state.scratches++;
          else state.potted++;
          continue;
        }
        const r = POOL.radius;
        if (b.x < POOL.left + r) {
          b.x = POOL.left + r;
          b.vx = Math.abs(b.vx) * 0.88;
        }
        if (b.x > POOL.right - r) {
          b.x = POOL.right - r;
          b.vx = -Math.abs(b.vx) * 0.88;
        }
        if (b.y < POOL.top + r) {
          b.y = POOL.top + r;
          b.vy = Math.abs(b.vy) * 0.88;
        }
        if (b.y > POOL.bottom - r) {
          b.y = POOL.bottom - r;
          b.vy = -Math.abs(b.vy) * 0.88;
        }
        const friction = Math.pow(0.985, step * 60);
        b.vx *= friction;
        b.vy *= friction;
        if (Math.hypot(b.vx, b.vy) < 5) b.vx = b.vy = 0;
      }
      for (let i = 0; i < state.balls.length; i++)
        for (let j = i + 1; j < state.balls.length; j++) {
          const a = state.balls[i],
            b = state.balls[j];
          if (!a.active || !b.active) continue;
          const dx = b.x - a.x,
            dy = b.y - a.y,
            distance = Math.hypot(dx, dy);
          if (distance >= POOL.radius * 2) continue;
          const nx = distance ? dx / distance : 1,
            ny = distance ? dy / distance : 0;
          const overlap = (POOL.radius * 2 - distance) / 2 + 0.01;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          const velocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (velocity < 0) {
            const impulse = -velocity * 0.97;
            a.vx -= impulse * nx;
            a.vy -= impulse * ny;
            b.vx += impulse * nx;
            b.vy += impulse * ny;
          }
        }
    }
    if (state.balls.every((b) => !b.active || Math.hypot(b.vx, b.vy) < 5)) {
      for (const b of state.balls) b.vx = b.vy = 0;
      if (!state.balls[0].active) respotCue(state);
      state.status = state.potted === 15 ? 'won' : 'ready';
    }
    return state;
  }

  function createBreakout() {
    return {
      width: 800,
      height: 500,
      paddle: { x: 400, y: 454, width: 110 },
      ball: { x: 400, y: 442, vx: 190, vy: -285, r: 8 },
      bricks: Array.from({ length: 50 }, (_, i) => ({
        x: 30 + (i % 10) * 75,
        y: 55 + Math.floor(i / 10) * 29,
        w: 66,
        h: 20,
        alive: true,
        row: Math.floor(i / 10),
      })),
      score: 0,
      lives: 3,
      status: 'ready',
    };
  }
  function launchBreakout(state) {
    if (state.status !== 'ready') return false;
    state.ball.vx = 190;
    state.ball.vy = -285;
    state.status = 'playing';
    return true;
  }
  function stepBreakout(state, dt) {
    state.paddle.x = clamp(
      state.paddle.x,
      state.paddle.width / 2 + 8,
      state.width - state.paddle.width / 2 - 8,
    );
    if (state.status === 'ready') {
      state.ball.x = state.paddle.x;
      state.ball.y = state.paddle.y - 12;
      return state;
    }
    if (state.status !== 'playing') return state;
    const steps = Math.max(1, Math.ceil(clamp(dt, 0, 0.05) / (1 / 180))),
      step = clamp(dt, 0, 0.05) / steps;
    const b = state.ball;
    for (let i = 0; i < steps; i++) {
      const oldY = b.y;
      b.x += b.vx * step;
      b.y += b.vy * step;
      if (b.x < b.r) {
        b.x = b.r;
        b.vx = Math.abs(b.vx);
      }
      if (b.x > state.width - b.r) {
        b.x = state.width - b.r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < b.r) {
        b.y = b.r;
        b.vy = Math.abs(b.vy);
      }
      const paddle = state.paddle;
      if (
        b.vy > 0 &&
        oldY + b.r <= paddle.y &&
        b.y + b.r >= paddle.y &&
        Math.abs(b.x - paddle.x) < paddle.width / 2 + b.r
      ) {
        const angle = clamp((b.x - paddle.x) / (paddle.width / 2), -1, 1) * 1.05;
        const speed = Math.min(530, Math.hypot(b.vx, b.vy) * 1.025);
        b.vx = Math.sin(angle) * speed;
        b.vy = -Math.cos(angle) * speed;
        b.y = paddle.y - b.r;
      }
      for (const brick of state.bricks) {
        if (
          !brick.alive ||
          b.x + b.r <= brick.x ||
          b.x - b.r >= brick.x + brick.w ||
          b.y + b.r <= brick.y ||
          b.y - b.r >= brick.y + brick.h
        )
          continue;
        brick.alive = false;
        state.score += 10;
        if (oldY + b.r <= brick.y || oldY - b.r >= brick.y + brick.h) b.vy *= -1;
        else b.vx *= -1;
        break;
      }
      if (state.bricks.every((brick) => !brick.alive)) {
        state.status = 'won';
        break;
      }
      if (b.y > state.height + b.r) {
        state.lives--;
        state.status = state.lives > 0 ? 'ready' : 'lost';
        b.x = paddle.x;
        b.y = paddle.y - 12;
        break;
      }
    }
    return state;
  }

  return {
    clamp,
    shuffle,
    createCaro,
    caroLine,
    moveCaro,
    chooseCaroMove,
    create2048,
    add2048Tile,
    move2048,
    canMove2048,
    createLudo,
    ludoPosition,
    legalLudoMoves,
    rollLudo,
    moveLudo,
    passLudo,
    chooseLudoMove,
    LUDO_SAFE,
    LUDO_STARTS,
    createQuan,
    quanSide,
    quanValue,
    moveQuan,
    chooseQuanMove,
    createSnake,
    turnSnake,
    stepSnake,
    snakeFood,
    createMemory,
    flipMemory,
    closeMemoryPair,
    createRace,
    stepRace,
    createPool,
    shootPool,
    stepPool,
    POOL,
    POCKETS,
    createBreakout,
    launchBreakout,
    stepBreakout,
  };
});
