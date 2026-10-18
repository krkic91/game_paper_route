// version v1.0
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/werewolf-logic.js');

function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function fixture(roles = ['villager', 'wolf', 'wolf', 'seer', 'guard', 'villager', 'villager', 'villager']) {
  const state = L.createGame({ random: seeded(27) });
  state.players.forEach((person, index) => { person.role = roles[index]; });
  return state;
}

function submit(state, player, type, target) {
  assert.equal(L.act(state, player, { type, target }).ok, true, `${player} ${type} ${target}`);
}

function tieVotes(state) {
  state.phase = 'day'; state.actions = {};
  const living = state.players.filter(person => person.alive);
  living.forEach((person, index) => submit(state, person.id, 'vote', living[(index + 1) % living.length].id));
}

test('each shuffled deal has eight distinct seats and the exact role distribution', () => {
  const layouts = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const state = L.createGame({ random: seeded(seed) });
    const roles = state.players.map(person => person.role);
    assert.deepEqual(roles.slice().sort(), ['guard', 'seer', 'villager', 'villager', 'villager', 'villager', 'wolf', 'wolf']);
    assert.equal(new Set(state.players.map(person => person.id)).size, 8);
    assert.equal(state.players.every(person => person.alive), true);
    assert.equal(state.phase, 'night');
    layouts.add(roles.join(','));
  }
  assert.ok(layouts.size > 70);
});

test('public views hide all unknown living roles and other players private information', () => {
  const state = fixture();
  state.knowledge[3][1] = true;
  state.guardLast = 6;
  state.actions[1] = { type: 'kill', target: 0 };
  const snapshot = L.view(state, 0);
  assert.equal(snapshot.players[0].role, 'villager');
  assert.equal(snapshot.players.slice(1).every(person => person.role === null), true);
  assert.deepEqual(snapshot.knowledge, {});
  assert.equal(snapshot.guardLast, null);
  assert.equal(snapshot.actions, undefined);
  assert.equal(snapshot.submitted, false);
  assert.equal(L.view(state, 3).knowledge[1], true);
  assert.equal(L.view(state, 4).guardLast, 6);
  snapshot.players[1].alive = false;
  snapshot.history[0].text = 'mutated';
  snapshot.knowledge[1] = true;
  assert.equal(state.players[1].alive, true);
  assert.notEqual(state.history[0].text, 'mutated');
  assert.deepEqual(state.knowledge[0], {});
});

test('wolves recognize only their teammate; dead roles and final roles become public', () => {
  const state = fixture();
  const wolf = L.view(state, 1);
  assert.equal(wolf.players[2].role, 'wolf');
  assert.equal(wolf.players[3].role, null);
  assert.equal(L.legalTargets(state, 1).includes(2), false);
  state.players[3].alive = false;
  assert.equal(L.view(state).players[3].role, 'seer');
  state.phase = 'over'; state.winner = 'village';
  assert.deepEqual(L.view(state).players.map(person => person.role), state.players.map(person => person.role));
});

test('invalid actions and missing human decisions do not change game state', () => {
  const state = fixture(['seer', 'wolf', 'wolf', 'guard', 'villager', 'villager', 'villager', 'villager']);
  for (const [player, action] of [[0, null], [0, { type: 'vote', target: 1 }], [0, { type: 'inspect', target: 0 }], [0, { type: 'inspect', target: 99 }], [1, { type: 'kill', target: 2 }], [8, { type: 'inspect', target: 1 }]]) {
    const before = JSON.stringify(state);
    assert.equal(L.act(state, player, action).ok, false);
    assert.equal(JSON.stringify(state), before);
  }
  const before = JSON.stringify(state);
  assert.equal(L.advance(state).ok, false);
  assert.equal(JSON.stringify(state), before);
  submit(state, 0, 'inspect', 1);
  assert.equal(L.act(state, 0, { type: 'inspect', target: 2 }).ok, false);
});

test('guard saves the attacked player, can protect self, and cannot repeat next night', () => {
  const state = fixture(['guard', 'wolf', 'wolf', 'seer', 'villager', 'villager', 'villager', 'villager']);
  assert.ok(L.legalTargets(state, 0).includes(0));
  submit(state, 0, 'protect', 0);
  submit(state, 1, 'kill', 0);
  submit(state, 2, 'kill', 0);
  submit(state, 3, 'inspect', 1);
  assert.equal(L.advance(state).ok, true);
  assert.equal(state.players.every(person => person.alive), true);
  assert.equal(state.guardLast, 0);
  assert.equal(state.knowledge[3][1], true);
  assert.equal(state.phase, 'day');
  tieVotes(state); L.advance(state);
  assert.equal(state.phase, 'night');
  assert.equal(L.legalTargets(state, 0).includes(0), false);
  assert.equal(L.act(state, 0, { type: 'protect', target: 0 }).ok, false);
  submit(state, 0, 'protect', 4);
});

test('night powers resolve simultaneously, including the seer killed that night', () => {
  const state = fixture(['seer', 'wolf', 'wolf', 'guard', 'villager', 'villager', 'villager', 'villager']);
  submit(state, 0, 'inspect', 2);
  submit(state, 1, 'kill', 0);
  submit(state, 2, 'kill', 0);
  submit(state, 3, 'protect', 3);
  assert.equal(L.advance(state).ok, true);
  assert.equal(state.players[0].alive, false);
  assert.equal(L.view(state, 0).knowledge[2], true);
  assert.deepEqual(L.view(state, 4).knowledge, {});
  assert.equal(state.phase, 'day');
});

test('the human wolf leads the pack and protection reveals no target to villagers', () => {
  const state = fixture(['wolf', 'wolf', 'seer', 'guard', 'villager', 'villager', 'villager', 'villager']);
  submit(state, 0, 'kill', 4);
  submit(state, 1, 'kill', 5);
  submit(state, 2, 'inspect', 0);
  submit(state, 3, 'protect', 4);
  L.advance(state);
  assert.ok(state.players[4].alive && state.players[5].alive);
  const publicEvent = state.history.find(event => event.text.includes('Đêm yên bình'));
  assert.ok(publicEvent);
  assert.equal(publicEvent.text.includes('Máy 4'), false);
  assert.equal(L.view(state, 6).guardLast, null);
});

test('a unique highest vote eliminates that player and all votes are then public', () => {
  const state = fixture(); state.phase = 'day';
  for (const person of state.players) submit(state, person.id, 'vote', person.id === 1 ? 0 : 1);
  L.advance(state);
  assert.equal(state.players[1].alive, false);
  assert.equal(state.phase, 'night');
  assert.equal(state.day, 2);
  assert.equal(state.lastVotes.length, 8);
  assert.equal(L.view(state, 0).players[1].role, 'wolf');
  assert.ok(state.history.some(event => event.text.includes('7 phiếu')));
});

test('tied highest votes eliminate nobody; day limit produces a defined draw', () => {
  const state = fixture(); state.maxDays = 1;
  tieVotes(state);
  L.advance(state);
  assert.equal(state.players.every(person => person.alive), true);
  assert.equal(state.phase, 'over');
  assert.equal(state.winner, 'draw');
  assert.ok(state.history.some(event => event.text.includes('Hòa phiếu')));
  const before = JSON.stringify(state);
  assert.equal(L.advance(state).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('village wins immediately when voting out the last living wolf', () => {
  const state = fixture();
  state.players.forEach(person => { person.alive = [0, 1, 5].includes(person.id); });
  state.phase = 'day';
  submit(state, 0, 'vote', 1); submit(state, 1, 'vote', 0); submit(state, 5, 'vote', 1);
  L.advance(state);
  assert.equal(state.phase, 'over');
  assert.equal(state.winner, 'village');
});

test('wolves win immediately when a night elimination reaches parity', () => {
  const state = fixture();
  state.players.forEach(person => { person.alive = [0, 1, 2, 5, 6].includes(person.id); });
  submit(state, 1, 'kill', 5); submit(state, 2, 'kill', 5);
  L.advance(state);
  assert.equal(state.players.filter(person => person.alive).length, 4);
  assert.equal(state.phase, 'over');
  assert.equal(state.winner, 'wolves');
});

test('bot choices are invariant under unseen role swaps and respect private seer evidence', () => {
  const first = fixture(); first.phase = 'day';
  const second = fixture(); second.phase = 'day';
  [second.players[1].role, second.players[7].role] = [second.players[7].role, second.players[1].role];
  assert.deepEqual(L.view(first, 0), L.view(second, 0));
  assert.deepEqual(L.botAction(L.view(first, 0), seeded(3)), L.botAction(L.view(second, 0), seeded(3)));
  first.knowledge[3][1] = true; first.knowledge[3][2] = false;
  assert.deepEqual(L.botAction(L.view(first, 3), seeded(3)), { type: 'vote', target: 1 });
  const wolf = L.botAction(L.view(first, 1), seeded(3));
  assert.notEqual(wolf.target, 2);
});

test('dead humans have no actions and the remaining game progresses without human input', () => {
  const state = fixture(); state.players[0].alive = false;
  assert.deepEqual(L.legalTargets(state, 0), []);
  assert.equal(L.actionType(L.view(state, 0)), null);
  assert.equal(L.act(state, 0, { type: 'vote', target: 1 }).ok, false);
  let steps = 0;
  while (state.phase !== 'over') {
    assert.equal(L.advance(state).ok, true);
    assert.ok(++steps <= 24);
  }
  assert.ok(['village', 'wolves', 'draw'].includes(state.winner));
});

test('300 seeded complete games preserve roles, legal actions, privacy and bounded termination', () => {
  const outcomes = new Set(), humanRoles = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const random = seeded(seed), state = L.createGame({ random });
    const roles = state.players.map(person => person.role);
    humanRoles.add(roles[0]);
    let steps = 0;
    while (state.phase !== 'over') {
      const beforeLiving = state.players.filter(person => person.alive).length;
      for (const person of state.players) {
        const snapshot = L.view(state, person.id);
        const action = L.botAction(snapshot, random);
        if (action) {
          assert.ok(L.legalTargets(state, person.id).includes(action.target));
          assert.equal(L.act(state, person.id, action).ok, true);
        }
        for (const visible of snapshot.players) {
          if (visible.id !== person.id && visible.alive && !(person.role === 'wolf' && roles[visible.id] === 'wolf')) assert.equal(visible.role, null);
        }
      }
      assert.equal(L.advance(state).ok, true);
      assert.ok(++steps <= 24);
      const afterLiving = state.players.filter(person => person.alive).length;
      assert.ok(afterLiving === beforeLiving || afterLiving === beforeLiving - 1);
      assert.deepEqual(state.players.map(person => person.role), roles);
      assert.equal(state.players.length, 8);
    }
    outcomes.add(state.winner);
    const living = state.players.filter(person => person.alive), wolves = living.filter(person => person.role === 'wolf').length;
    if (state.winner === 'village') assert.equal(wolves, 0);
    if (state.winner === 'wolves') assert.ok(wolves >= living.length - wolves);
    if (state.winner === 'draw') assert.equal(state.day, state.maxDays);
  }
  assert.equal(humanRoles.size, 4);
  assert.ok(outcomes.has('village') && outcomes.has('wolves'));
});
