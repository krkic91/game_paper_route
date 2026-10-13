// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/logic.js');
function rng(seed = 42) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const sumQuan = (state) =>
  state.pits.reduce((sum, n) => sum + n, 0) +
  state.scores[0] +
  state.scores[1] +
  state.royals.filter(Boolean).length * 10;

for (const [name, indices] of [
  ['horizontal', [30, 31, 32, 33, 34]],
  ['vertical', [2, 17, 32, 47, 62]],
  ['diagonal', [0, 16, 32, 48, 64]],
  ['reverse diagonal', [4, 18, 32, 46, 60]],
])
  test(`caro: detects a ${name} win without accepting more moves`, () => {
    const state = L.createCaro();
    for (const i of indices) {
      state.turn = 1;
      assert.equal(L.moveCaro(state, i), true);
    }
    assert.equal(state.winner, 1);
    assert.equal(state.ended, true);
    assert.equal(state.line.length, 5);
    assert.equal(L.moveCaro(state, 200), false);
  });
test('caro: rejects occupied/out-of-bounds cells and draws on a full small board', () => {
  const state = L.createCaro(3);
  assert.equal(L.moveCaro(state, -1), false);
  assert.equal(L.moveCaro(state, 9), false);
  assert.equal(L.moveCaro(state, 1.5), false);
  L.moveCaro(state, 0);
  assert.equal(L.moveCaro(state, 0), false);
  assert.equal(state.turn, 2);
  for (let i = 1; i < 9; i++) L.moveCaro(state, i);
  assert.equal(state.ended, true);
  assert.equal(state.winner, 0);
});
test('caro: AI takes a win, blocks an immediate loss, and opens in the center', () => {
  const state = L.createCaro();
  assert.equal(L.chooseCaroMove(state), 112);
  for (const i of [0, 1, 2, 3]) state.board[i] = 1;
  state.moves = 4;
  state.turn = 2;
  assert.equal(L.chooseCaroMove(state), 4);
  for (const i of [15, 16, 17, 18]) state.board[i] = 2;
  state.moves = 8;
  assert.equal(L.chooseCaroMove(state), 19);
  assert.equal(state.board[19], 0, 'AI evaluation must not mutate the board');
});
test('caro: six in a row also wins under free-style rules', () => {
  const state = L.createCaro();
  for (const i of [0, 1, 2, 4, 5]) state.board[i] = 1;
  state.moves = 5;
  L.moveCaro(state, 3);
  assert.equal(state.line.length, 6);
});

test('2048: merges pairs once per move and keeps its input immutable', () => {
  const board = [2, 2, 2, 2, ...Array(12).fill(0)];
  const original = [...board];
  const left = L.move2048(board, 'left');
  assert.deepEqual(left.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(left.score, 8);
  assert.equal(left.changed, true);
  assert.deepEqual(L.move2048(board, 'right').board.slice(0, 4), [0, 0, 4, 4]);
  assert.deepEqual(board, original);
  assert.deepEqual(
    L.move2048([2, 2, 4, 0, ...Array(12).fill(0)], 'left').board.slice(0, 4),
    [4, 4, 0, 0],
  );
});
test('2048: handles both vertical directions and unchanged moves', () => {
  const board = Array(16).fill(0);
  board[0] = 2;
  board[4] = 2;
  board[8] = 4;
  board[12] = 4;
  const up = L.move2048(board, 'up'),
    down = L.move2048(board, 'down');
  assert.deepEqual([up.board[0], up.board[4], up.board[8], up.board[12]], [4, 8, 0, 0]);
  assert.deepEqual([down.board[0], down.board[4], down.board[8], down.board[12]], [0, 0, 4, 8]);
  assert.equal(up.score, 12);
  assert.equal(L.move2048([2, ...Array(15).fill(0)], 'left').changed, false);
  assert.equal(L.move2048(board, 'invalid').changed, false);
});
test('2048: spawns only in an empty cell and identifies terminal boards', () => {
  const random = rng();
  const board = L.create2048(random);
  assert.equal(board.filter(Boolean).length, 2);
  const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(L.canMove2048(full), false);
  assert.equal(L.add2048Tile(full), false);
  full[0] = 4;
  assert.equal(L.canMove2048(full), true);
  const almost = Array(16).fill(2);
  almost[7] = 0;
  L.add2048Tile(almost, () => 0.95);
  assert.equal(almost[7], 4);
});

test('ludo: only a six can leave the yard, a six gets an extra turn', () => {
  const state = L.createLudo([0, 2]);
  L.rollLudo(state, () => 0);
  assert.deepEqual(L.legalLudoMoves(state), []);
  assert.equal(L.passLudo(state), true);
  assert.equal(state.turn, 1);
  L.rollLudo(state, () => 0.99);
  assert.deepEqual(L.legalLudoMoves(state), [0, 1, 2, 3]);
  const result = L.moveLudo(state, 0);
  assert.equal(result.extra, true);
  assert.equal(state.tokens[2][0], 0);
  assert.equal(state.turn, 1);
  assert.equal(state.die, 0);
});
test('ludo: captures outside a star, but a star protects its occupants', () => {
  const state = L.createLudo([0, 1]);
  state.tokens[0][0] = 10;
  state.tokens[1][0] = 51;
  state.die = 2;
  assert.equal(L.moveLudo(state, 0).captured, 1);
  assert.equal(state.tokens[1][0], -1);
  const safe = L.createLudo([0, 1]);
  safe.tokens[0][0] = 6;
  safe.tokens[1][0] = 47;
  safe.die = 2;
  assert.equal(L.moveLudo(safe, 0).captured, 0);
  assert.equal(safe.tokens[1][0], 47);
});
test('ludo: requires exact arrival and ends when the fourth horse reaches home', () => {
  const state = L.createLudo();
  state.tokens[0] = [57, 57, 57, 56];
  state.die = 2;
  assert.deepEqual(L.legalLudoMoves(state), []);
  state.die = 1;
  assert.deepEqual(L.legalLudoMoves(state), [3]);
  const result = L.moveLudo(state, 3);
  assert.equal(result.finished, true);
  assert.equal(state.winner, 0);
  assert.equal(L.rollLudo(state), 0);
  assert.deepEqual(L.legalLudoMoves(state), []);
});
test('ludo: blocks repeated rolls and illegal moves; AI only chooses legal moves', () => {
  const state = L.createLudo();
  assert.equal(L.moveLudo(state, 0), null);
  L.rollLudo(state, () => 0.99);
  assert.equal(
    L.rollLudo(state, () => 0),
    0,
  );
  assert.equal(state.die, 6);
  assert.equal(L.passLudo(state), false);
  assert.ok(L.legalLudoMoves(state).includes(L.chooseLudoMove(state)));
  assert.equal(L.moveLudo(state, 7), null);
});
test('ludo: complete seeded AI matches terminate with four finished horses', () => {
  for (let seed = 1; seed <= 4; seed++) {
    const state = L.createLudo(),
      random = rng(seed);
    for (let move = 0; move < 3000 && state.winner === null; move++) {
      L.rollLudo(state, random);
      const legal = L.legalLudoMoves(state);
      if (legal.length) L.moveLudo(state, L.chooseLudoMove(state));
      else L.passLudo(state);
    }
    assert.notEqual(state.winner, null);
    assert.deepEqual(state.tokens[state.winner], [57, 57, 57, 57]);
  }
});

test('quan: starts with 70 points and rejects the other side and royal pits', () => {
  const state = L.createQuan();
  assert.equal(sumQuan(state), 70);
  assert.equal(L.quanValue(state, 0), 10);
  assert.equal(L.moveQuan(state, 1, 1), null);
  assert.equal(L.moveQuan(state, 0, 1), null);
  assert.equal(L.moveQuan(state, 7, 0), null);
  assert.equal(state.moves, 0);
});
test('quan: chain captures count ordinary and royal stones independently', () => {
  const state = L.createQuan();
  state.pits = Array(12).fill(0);
  state.pits[11] = 1;
  state.pits[2] = 3;
  state.pits[4] = 4;
  state.pits[6] = 2;
  const total = sumQuan(state),
    result = L.moveQuan(state, 11, 1);
  assert.equal(result.captured, 19);
  assert.equal(state.royals[1], false);
  assert.equal(state.royals[0], true);
  assert.equal(state.scores[0], 19);
  assert.equal(result.refilled, true);
  assert.equal(state.scores[1], -5);
  assert.equal(sumQuan(state), total);
});
test('quan: an empty incoming row is refilled using five points, including debt', () => {
  const state = L.createQuan();
  state.pits = Array(12).fill(0);
  state.pits[7] = 1;
  const result = L.moveQuan(state, 7, -1);
  assert.equal(result.refilled, true);
  assert.equal(state.scores[1], -5);
  assert.deepEqual(state.pits.slice(1, 6), [1, 1, 1, 1, 1]);
});
test('quan: the match ends only when both royal pits are completely empty', () => {
  const state = L.createQuan();
  state.royals = [false, false];
  state.pits = [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0];
  L.moveQuan(state, 7, -1);
  assert.equal(state.ended, false, 'remaining ordinary stones in royal pits keep the game going');
});
test('quan: stone/score conservation holds through seeded complete games', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const state = L.createQuan(),
      random = rng(seed);
    for (let move = 0; move < 1200 && !state.ended; move++) {
      const legal = L.quanSide(state.turn).filter((pit) => state.pits[pit]);
      assert.ok(legal.length);
      L.moveQuan(state, legal[Math.floor(random() * legal.length)], random() < 0.5 ? -1 : 1);
      assert.equal(sumQuan(state), 70, `seed ${seed}, move ${move}`);
      assert.ok(state.pits.every((n) => Number.isInteger(n) && n >= 0));
    }
    assert.equal(state.ended, true, `seed ${seed} should finish`);
    assert.equal(state.scores[0] + state.scores[1], 70);
  }
});
test('quan: AI evaluates legal moves without changing the live state', () => {
  const state = L.createQuan(),
    before = JSON.stringify(state),
    choice = L.chooseQuanMove(state);
  assert.ok(L.quanSide(state.turn).includes(choice.pit));
  assert.ok([-1, 1].includes(choice.direction));
  assert.equal(JSON.stringify(state), before);
});

// Builds an otherwise empty board so each rule can be checked in isolation.
function quanBoard(pits, rules, extra = {}) {
  const state = L.createQuan(rules);
  state.pits = Array(12).fill(0);
  for (const [pit, count] of Object.entries(pits)) state.pits[pit] = count;
  return Object.assign(state, extra);
}
test('quan: sowing twelve or more stones laps the board, including both royal pits and the start pit', () => {
  const state = quanBoard({ 7: 13, 2: 1 });
  const total = sumQuan(state);
  const result = L.moveQuan(state, 7, 1, { trace: true });
  const drops = result.steps.filter((step) => step.type === 'drop').map((step) => step.pit);
  assert.deepEqual(drops.slice(0, 12), [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(sumQuan(state), total);
});
test('quan: the turn stops when the next pit is a royal pit', () => {
  const state = quanBoard({ 10: 1, 1: 3 });
  const result = L.moveQuan(state, 10, 1);
  assert.equal(result.relays, 0);
  assert.equal(result.captured, 0);
  assert.equal(state.pits[0], 0);
  assert.equal(state.pits[1], 3, 'stones behind a royal pit holding its quan are safe');
  assert.equal(state.turn, 1);
});
test('quan: two empty pits in a row end the turn without a capture', () => {
  const state = quanBoard({ 7: 1, 11: 4, 2: 1 });
  const result = L.moveQuan(state, 7, 1);
  assert.equal(result.captured, 0);
  assert.equal(state.pits[11], 4);
  assert.deepEqual(state.scores, [0, 0]);
  assert.equal(state.turn, 1);
});
test('quan rules: normalisation falls back to the basic rules', () => {
  assert.deepEqual(L.quanRules(), { youngQuan: false, youngMin: 5, debt: 'negative', emptyQuan: 'empty' });
  assert.deepEqual(L.quanRules({ youngQuan: 1, debt: 'steal', emptyQuan: 'block', youngMin: 'x' }), {
    youngQuan: true,
    youngMin: 5,
    debt: 'negative',
    emptyQuan: 'block',
  });
  assert.deepEqual(L.createQuan({ debt: 'borrow' }).rules.debt, 'borrow');
});
test('quan rules: quan non protects a royal pit with fewer than five stones and stops the chain', () => {
  const pits = { 11: 1, 2: 3, 4: 4, 6: 2 };
  const young = quanBoard(pits, { youngQuan: true });
  const result = L.moveQuan(young, 11, 1, { trace: true });
  assert.equal(result.captured, 7);
  assert.equal(result.blocked, 6);
  assert.equal(young.royals[1], true);
  assert.equal(young.pits[6], 2);
  assert.ok(result.steps.some((step) => step.type === 'young' && step.pit === 6));
  const grown = quanBoard({ ...pits, 6: 5 }, { youngQuan: true });
  assert.equal(L.moveQuan(grown, 11, 1).captured, 22, 'five stones are enough to take the quan');
});
test('quan rules: debt handling — negative, borrow, and end of match', () => {
  const setup = (debt, scores) => quanBoard({ 7: 1 }, { debt }, { scores });
  const negative = setup('negative', [12, 2]);
  L.moveQuan(negative, 7, -1);
  assert.deepEqual(negative.scores, [12, -3]);
  assert.deepEqual(negative.pits.slice(1, 6), [1, 1, 1, 1, 1]);

  const borrow = setup('borrow', [12, 2]);
  const before = sumQuan(borrow);
  const loan = L.moveQuan(borrow, 7, -1);
  assert.deepEqual(loan.refill, { player: 1, source: 'borrow', lender: 0 });
  assert.deepEqual(borrow.scores, [7, 2]);
  assert.deepEqual(borrow.debts, [0, 5]);
  assert.equal(sumQuan(borrow), before, 'borrowing moves stones, never creates them');

  const paysSelf = setup('borrow', [12, 8]);
  L.moveQuan(paysSelf, 7, -1);
  assert.deepEqual(paysSelf.scores, [12, 3], 'with enough points a player pays for itself');
  assert.deepEqual(paysSelf.debts, [0, 0]);

  const bankrupt = setup('borrow', [3, 2]);
  L.moveQuan(bankrupt, 7, -1);
  assert.equal(bankrupt.ended, true, 'nobody can lend, so the match ends');

  const end = setup('end', [12, 2]);
  const finish = L.moveQuan(end, 7, -1, { trace: true });
  assert.equal(end.ended, true);
  assert.equal(end.endReason, 'debt');
  assert.equal(end.winner, 0);
  assert.equal(finish.steps.at(-1).type, 'finish');
  assert.equal(finish.steps.at(-1).player, 1);
});
test('quan rules: borrowed points are returned before the final comparison', () => {
  const last = quanBoard({ 2: 1 }, { debt: 'borrow' }, {
    royals: [false, false],
    scores: [20, 30],
    debts: [0, 5],
    turn: 1,
  });
  // Pit 2 → 1, then 0 is empty and 11 is empty: nothing captured, both royal pits empty → finish.
  L.moveQuan(last, 2, -1);
  assert.equal(last.ended, true);
  assert.deepEqual(last.debts, [0, 0]);
  assert.deepEqual(last.scores, [25, 26]);
});
test('quan rules: an empty captured royal pit acts as empty or blocks, depending on the rule', () => {
  const extra = { royals: [false, true] };
  const open = quanBoard({ 10: 1, 1: 3, 4: 1 }, { emptyQuan: 'empty' }, extra);
  assert.equal(L.moveQuan(open, 10, 1).captured, 3);
  const blocked = quanBoard({ 10: 1, 1: 3, 4: 1 }, { emptyQuan: 'block' }, { royals: [false, true] });
  assert.equal(L.moveQuan(blocked, 10, 1).captured, 0);
  assert.equal(blocked.pits[1], 3);
});
test('quan: replaying the recorded steps rebuilds the board exactly', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const random = rng(seed);
    const rules = {
      youngQuan: seed % 2 === 0,
      debt: ['negative', 'borrow', 'end'][seed % 3],
      emptyQuan: seed % 5 === 0 ? 'block' : 'empty',
    };
    const state = L.createQuan(rules);
    for (let move = 0; move < 1000 && !state.ended; move++) {
      const legal = L.legalQuanMoves(state);
      const choice = legal[Math.floor(random() * legal.length)];
      const replay = L.cloneQuan(state);
      const result = L.moveQuan(state, choice.pit, choice.direction, { trace: true });
      let hand = 0;
      for (const step of result.steps) {
        if (step.type === 'pick' || step.type === 'relay') {
          hand = replay.pits[step.pit];
          replay.pits[step.pit] = 0;
          assert.equal(step.hand, hand);
        } else if (step.type === 'drop') {
          replay.pits[step.pit]++;
          assert.equal(step.hand, --hand);
        } else if (step.type === 'capture') {
          replay.scores[step.player] += step.value;
          replay.pits[step.pit] = 0;
          if (step.pit === 0) replay.royals[0] = false;
          if (step.pit === 6) replay.royals[1] = false;
        } else {
          // Refill and final collection are whole-board updates; adopt their snapshot.
          Object.assign(replay, { pits: [...step.pits], scores: [...step.scores], royals: [...step.royals] });
        }
        assert.deepEqual(replay.pits, step.pits, `seed ${seed}, ${step.type}`);
        assert.deepEqual(replay.scores, step.scores);
        assert.deepEqual(replay.royals, step.royals);
      }
      const last = result.steps.at(-1);
      assert.deepEqual(last.pits, state.pits);
      assert.deepEqual(last.scores, state.scores);
      assert.deepEqual(last.royals, state.royals);
      assert.equal(sumQuan(state), 70, `seed ${seed}, move ${move}`);
    }
    assert.equal(state.ended, true, `seed ${seed} should finish`);
  }
});
test('quan AI: every level plays legal moves under every rule set without touching the live state', () => {
  const ruleSets = [{}, { youngQuan: true, debt: 'borrow' }, { debt: 'end', emptyQuan: 'block' }];
  for (const rules of ruleSets)
    for (const level of ['easy', 'normal', 'hard']) {
      const state = L.createQuan(rules),
        random = rng(3);
      for (let move = 0; move < 6 && !state.ended; move++) {
        const before = JSON.stringify(state);
        const choice = L.chooseQuanMove(state, level, random);
        assert.equal(JSON.stringify(state), before);
        assert.ok(
          L.legalQuanMoves(state).some((m) => m.pit === choice.pit && m.direction === choice.direction),
          `${level} must choose a legal move`,
        );
        L.moveQuan(state, choice.pit, choice.direction);
      }
    }
  assert.equal(L.chooseQuanMove({ ...L.createQuan(), ended: true }, 'hard'), null);
});
test('quan AI: equal moves are chosen at random rather than always the first', () => {
  const picks = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    const choice = L.chooseQuanMove(L.createQuan(), 'normal', rng((seed * 2654435761) >>> 0));
    picks.add(`${choice.pit}:${choice.direction}`);
  }
  assert.ok(picks.size > 1);
});
test('quan AI: hard beats normal, and normal beats easy, in most games', () => {
  const play = (a, b, games) => {
    let wins = 0;
    for (let game = 0; game < games; game++) {
      const state = L.createQuan(),
        random = rng(game + 11),
        side = game % 2;
      for (let move = 0; move < 2000 && !state.ended; move++) {
        const choice = L.chooseQuanMove(state, state.turn === side ? a : b, random);
        L.moveQuan(state, choice.pit, choice.direction);
      }
      if (state.winner === side) wins++;
    }
    return wins;
  };
  assert.ok(play('hard', 'normal', 16) >= 12);
  assert.ok(play('normal', 'easy', 16) >= 12);
});


test('snake: prevents reversal and two direction changes within the same tick', () => {
  const state = L.createSnake();
  assert.equal(L.turnSnake(state, -1, 0), false);
  assert.equal(L.turnSnake(state, 0, -1), true);
  assert.equal(L.turnSnake(state, -1, 0), false);
  L.stepSnake(state);
  assert.deepEqual(state.dir, { x: 0, y: -1 });
  assert.equal(L.turnSnake(state, -1, 0), true);
});
test('snake: eats, grows, and never spawns food inside its body', () => {
  const state = L.createSnake();
  state.food = { x: 11, y: 10 };
  L.stepSnake(state, rng());
  assert.equal(state.score, 10);
  assert.equal(state.snake.length, 4);
  assert.ok(!state.snake.some((p) => p.x === state.food.x && p.y === state.food.y));
});
test('snake: can enter a vacated tail cell but loses against a wall', () => {
  const state = L.createSnake();
  state.snake = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 1 },
  ];
  state.food = { x: 0, y: 0 };
  L.stepSnake(state);
  assert.equal(state.status, 'playing');
  state.snake[0] = { x: 19, y: 5 };
  L.stepSnake(state);
  assert.equal(state.status, 'lost');
});
test('snake: eating the final free cell wins without trying to spawn food', () => {
  const state = {
    size: 2,
    snake: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    dir: { x: 1, y: 0 },
    pending: null,
    food: { x: 1, y: 0 },
    score: 0,
    status: 'playing',
  };
  L.stepSnake(state);
  assert.equal(state.status, 'won');
  assert.equal(state.food, null);
  assert.equal(state.snake.length, 4);
});

test('memory: duplicate flips and a third card during mismatch are ignored', () => {
  const state = L.createMemory(rng());
  assert.equal(L.flipMemory(state, 0), 'first');
  assert.equal(L.flipMemory(state, 0), 'ignored');
  const different = state.cards.findIndex((n) => n !== state.cards[0]);
  assert.equal(L.flipMemory(state, different), 'miss');
  assert.equal(L.flipMemory(state, 15), 'ignored');
  assert.equal(state.moves, 1);
  L.closeMemoryPair(state);
  assert.deepEqual(state.open, []);
});
test('memory: every deck has eight pairs and matching all of them finishes', () => {
  const state = L.createMemory(rng());
  for (let n = 0; n < 8; n++) {
    const pair = state.cards.flatMap((value, i) => (value === n ? [i] : []));
    assert.equal(pair.length, 2);
    assert.equal(L.flipMemory(state, pair[0]), 'first');
    assert.equal(L.flipMemory(state, pair[1]), 'match');
  }
  assert.equal(state.ended, true);
  assert.equal(state.moves, 8);
  assert.equal(L.flipMemory(state, 0), 'ignored');
});

test('race: steering is bounded and sprint trades energy for speed', () => {
  const state = L.createRace(rng());
  state.obstacles = [];
  state.rivals = [];
  const normal = structuredClone(state);
  for (let i = 0; i < 40; i++) L.stepRace(normal, 0.05, { steer: 1 });
  for (let i = 0; i < 40; i++) L.stepRace(state, 0.05, { steer: 1, sprint: true });
  assert.equal(state.x, 3);
  assert.ok(state.energy < 60);
  assert.ok(state.speed > normal.speed);
  assert.ok(state.speed < 12, 'starting from rest takes time to reach racing speed');
  assert.ok(state.distance > 0);
  const energy = state.energy;
  for (let i = 0; i < 20; i++) L.stepRace(state, 0.05, {});
  assert.ok(state.energy > energy);
});
test('race: collisions consume one heart and respect invulnerability', () => {
  const state = L.createRace();
  state.x = 0;
  state.obstacles = [
    { x: 0, z: 1, type: 'cone', passed: false },
    { x: 0, z: 1, type: 'cone', passed: false },
  ];
  L.stepRace(state, 0.05);
  assert.equal(state.hearts, 2);
  assert.ok(state.invulnerable > 0);
});
test('race: reaches exactly 1 km and ignores updates after finishing', () => {
  const state = L.createRace();
  state.obstacles = [];
  for (let i = 0; i < 2000 && state.status === 'playing'; i++) L.stepRace(state, 0.05);
  assert.equal(state.status, 'won');
  assert.equal(state.distance, 1000);
  const time = state.time;
  L.stepRace(state, 0.05);
  assert.equal(state.time, time);
  assert.ok(state.place >= 1 && state.place <= 4);
});

test('pool: has one cue ball, fifteen non-overlapping targets, and a single shot at a time', () => {
  const state = L.createPool();
  assert.equal(state.balls.length, 16);
  for (let i = 0; i < 16; i++)
    for (let j = i + 1; j < 16; j++)
      assert.ok(
        Math.hypot(state.balls[i].x - state.balls[j].x, state.balls[i].y - state.balls[j].y) >= 22,
      );
  assert.equal(L.shootPool(state, 0, 0.7), true);
  assert.equal(L.shootPool(state, 0, 0.7), false);
  assert.equal(state.shots, 1);
  for (let i = 0; i < 1800 && state.status === 'moving'; i++) L.stepPool(state, 1 / 60);
  assert.notEqual(state.status, 'moving');
  assert.ok(state.balls.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y)));
});
test('pool: a scratch is counted and the cue is respotted without overlapping targets', () => {
  const state = L.createPool();
  Object.assign(state.balls[0], { x: 55, y: 55, vx: 1, vy: 0 });
  state.status = 'moving';
  L.stepPool(state, 1 / 60);
  assert.equal(state.scratches, 1);
  assert.equal(state.balls[0].active, true);
  assert.equal(state.status, 'ready');
  assert.ok(
    state.balls
      .slice(1)
      .every((b) => Math.hypot(b.x - state.balls[0].x, b.y - state.balls[0].y) > 22),
  );
});
test('pool: potting the final object ball wins the practice table', () => {
  const state = L.createPool();
  state.potted = 14;
  state.balls.slice(2).forEach((b) => {
    b.active = false;
  });
  Object.assign(state.balls[1], { x: 55, y: 55, vx: 1, vy: 0 });
  state.status = 'moving';
  L.stepPool(state, 1 / 60);
  assert.equal(state.potted, 15);
  assert.equal(state.status, 'won');
  assert.equal(L.shootPool(state, 0, 1), false);
});
test('pool: wall collisions bounce inwards and never produce non-finite velocities', () => {
  const state = L.createPool();
  state.balls.slice(1).forEach((b) => {
    b.active = false;
  });
  Object.assign(state.balls[0], { x: 68, y: 250, vx: -100, vy: 0 });
  state.status = 'moving';
  L.stepPool(state, 0.05);
  assert.ok(state.balls[0].vx > 0);
  assert.ok(state.balls[0].x >= 66);
});

test('breakout: ball follows the paddle until launch and cannot launch twice', () => {
  const state = L.createBreakout();
  state.paddle.x = 150;
  L.stepBreakout(state, 0.016);
  assert.equal(state.ball.x, 150);
  assert.equal(L.launchBreakout(state), true);
  assert.equal(L.launchBreakout(state), false);
});
test('breakout: dropping the ball takes exactly one life and resets to ready', () => {
  const state = L.createBreakout();
  state.status = 'playing';
  state.ball.y = 520;
  state.ball.vy = 200;
  L.stepBreakout(state, 0.016);
  assert.equal(state.lives, 2);
  assert.equal(state.status, 'ready');
  for (let i = 0; i < 50; i++) L.stepBreakout(state, 0.016);
  assert.equal(state.lives, 2);
});
test('breakout: losing the third life ends the game', () => {
  const state = L.createBreakout();
  state.lives = 1;
  state.status = 'playing';
  state.ball.y = 520;
  L.stepBreakout(state, 0.016);
  assert.equal(state.status, 'lost');
  assert.equal(state.lives, 0);
});
test('breakout: hitting the last brick awards points and wins', () => {
  const state = L.createBreakout();
  state.bricks.forEach((b, i) => {
    b.alive = i === 0;
  });
  state.status = 'playing';
  Object.assign(state.ball, { x: 60, y: 40, vx: 0, vy: 300 });
  L.stepBreakout(state, 0.05);
  assert.equal(state.score, 10);
  assert.equal(state.status, 'won');
});
