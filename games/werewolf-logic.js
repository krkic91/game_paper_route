// version v1.0
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeWerewolf = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const ROLES = Object.freeze({ wolf: 'Ma sói', seer: 'Tiên tri', guard: 'Bảo vệ', villager: 'Dân làng' });
  const randoms = new WeakMap();
  const fail = error => ({ ok: false, error });
  const copy = value => JSON.parse(JSON.stringify(value));
  const pick = (items, random) => items[Math.floor(Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * items.length)];

  function createGame({ random = Math.random, maxDays = 12 } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    const roles = ['wolf', 'wolf', 'seer', 'guard', 'villager', 'villager', 'villager', 'villager'];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = pick(Array.from({ length: i + 1 }, (_, index) => index), random);
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    const state = {
      players: roles.map((role, id) => ({ id, name: id ? `Máy ${id}` : 'Bạn', role, alive: true })),
      phase: 'night', day: 1, maxDays: Math.max(1, Math.min(30, Math.floor(Number(maxDays)) || 12)),
      winner: null, reason: '', turn: 0, actions: {}, knowledge: Array.from({ length: 8 }, () => ({})),
      guardLast: null, history: [{ day: 1, text: 'Đêm đầu tiên. Cả làng đi ngủ.' }],
      discussion: [], lastVotes: [],
    };
    randoms.set(state, random);
    return state;
  }

  function view(state, player = 0) {
    const self = state.players[player];
    if (!self) throw new RangeError('Unknown player');
    return {
      self: player, phase: state.phase, day: state.day, maxDays: state.maxDays, turn: state.turn,
      winner: state.winner, reason: state.reason,
      players: state.players.map(person => ({
        id: person.id, name: person.name, alive: person.alive,
        role: state.phase === 'over' || !person.alive || person.id === player || (self.role === 'wolf' && person.role === 'wolf') ? person.role : null,
      })),
      knowledge: copy(state.knowledge[player]),
      guardLast: self.role === 'guard' ? state.guardLast : null,
      submitted: Boolean(state.actions[player]),
      history: copy(state.history), discussion: copy(state.discussion), lastVotes: copy(state.lastVotes),
    };
  }

  function actionType(snapshot) {
    if (!snapshot.players[snapshot.self].alive || snapshot.phase === 'over') return null;
    if (snapshot.phase === 'day') return 'vote';
    return { wolf: 'kill', seer: 'inspect', guard: 'protect' }[snapshot.players[snapshot.self].role] || null;
  }

  function targets(snapshot) {
    const type = actionType(snapshot);
    if (!type || snapshot.submitted) return [];
    return snapshot.players.filter(person => {
      if (!person.alive) return false;
      if (type === 'protect') return person.id !== snapshot.guardLast;
      if (person.id === snapshot.self) return false;
      return type !== 'kill' || person.role !== 'wolf';
    }).map(person => person.id);
  }

  const legalTargets = (state, player = 0) => targets(view(state, player));

  function act(state, player, action) {
    if (!Number.isInteger(player) || !state.players[player]) return fail('Người chơi không hợp lệ.');
    const snapshot = view(state, player);
    if (!action || action.type !== actionType(snapshot) || !targets(snapshot).includes(action.target)) return fail('Hành động hoặc mục tiêu không hợp lệ.');
    state.actions[player] = { type: action.type, target: action.target };
    return { ok: true };
  }

  // This function intentionally accepts ONLY a player's filtered view, never game state.
  function botAction(snapshot, random = Math.random) {
    const type = actionType(snapshot), available = targets(snapshot);
    if (!type || !available.length) return null;
    const role = snapshot.players[snapshot.self].role;
    let choices = available;
    if (type === 'inspect') {
      const unknown = choices.filter(id => snapshot.knowledge[id] === undefined);
      if (unknown.length) choices = unknown;
    } else if (type === 'vote') {
      const scored = choices.map(id => {
        let score = 0;
        if (role === 'wolf' && snapshot.players[id].role === 'wolf') score -= 100;
        if (snapshot.knowledge[id] === true) score += 100;
        if (snapshot.knowledge[id] === false) score -= 20;
        for (const vote of snapshot.lastVotes) {
          const target = snapshot.players[vote.target];
          if (vote.voter === id && target.role === 'wolf' && !target.alive) score -= 3;
        }
        for (const claim of snapshot.discussion) if (claim.target === id && claim.speaker !== snapshot.self) score += 0.25;
        return { id, score };
      });
      const best = Math.max(...scored.map(item => item.score));
      choices = scored.filter(item => item.score === best).map(item => item.id);
    }
    return { type, target: pick(choices, random) };
  }

  function log(state, text) { state.history.push({ day: state.day, text }); }

  function checkWinner(state) {
    const alive = state.players.filter(person => person.alive);
    const wolves = alive.filter(person => person.role === 'wolf').length;
    if (!wolves) { state.winner = 'village'; state.reason = 'Làng đã tìm ra toàn bộ ma sói.'; }
    else if (wolves >= alive.length - wolves) { state.winner = 'wolves'; state.reason = 'Số sói còn sống đã bằng hoặc nhiều hơn dân làng.'; }
    if (state.winner) { state.phase = 'over'; log(state, state.reason); }
    return Boolean(state.winner);
  }

  function eliminate(state, id, cause) {
    const person = state.players[id];
    person.alive = false;
    log(state, `${person.name} bị loại ${cause}. Vai trò được công khai: ${ROLES[person.role]}.`);
  }

  function discuss(state, random) {
    state.discussion = [];
    // Each speaker sees only prior public evidence and their own private information.
    const claims = state.players.filter(person => person.alive && person.id !== 0).map(person => {
      const snapshot = view(state, person.id);
      const action = botAction(snapshot, random);
      const target = action?.target;
      if (target === undefined) return null;
      const evidence = snapshot.knowledge[target] === true
        ? 'Tôi nghi người này là sói. Hãy cân nhắc lá phiếu của tôi.'
        : 'Chưa đủ bằng chứng chắc chắn. Tôi đang nghi người này.';
      return { speaker: person.id, target, text: `${person.name}: Tôi nghi ${state.players[target].name}. ${evidence}` };
    }).filter(Boolean);
    state.discussion = claims;
  }

  function advance(state) {
    if (state.phase === 'over') return fail('Ván chơi đã kết thúc.');
    const human = view(state, 0);
    if (actionType(human) && !human.submitted) return fail('Bạn cần chọn mục tiêu và xác nhận trước.');
    const random = randoms.get(state) || Math.random;
    for (const person of state.players) {
      if (!person.id || !person.alive || state.actions[person.id]) continue;
      const action = botAction(view(state, person.id), random);
      if (action) act(state, person.id, action);
    }
    state.turn++;
    if (state.phase === 'night') {
      const seer = state.players.find(person => person.alive && person.role === 'seer');
      const guard = state.players.find(person => person.alive && person.role === 'guard');
      const protect = guard ? state.actions[guard.id]?.target : null;
      state.guardLast = protect ?? null;
      if (seer && state.actions[seer.id]) {
        const target = state.actions[seer.id].target;
        state.knowledge[seer.id][target] = state.players[target].role === 'wolf';
      }
      // The human wolf leads the pack; otherwise the lowest living wolf seat leads.
      const leader = state.players.find(person => person.alive && person.role === 'wolf');
      const victim = leader ? state.actions[leader.id]?.target : undefined;
      if (victim !== undefined && victim !== protect) eliminate(state, victim, 'trong đêm');
      else log(state, 'Đêm yên bình: không ai bị loại.');
      state.actions = {};
      if (!checkWinner(state)) {
        state.phase = 'day';
        log(state, `Ngày ${state.day}: thảo luận và bỏ phiếu.`);
        discuss(state, random);
      }
    } else {
      const votes = state.players.filter(person => person.alive).map(person => ({ voter: person.id, target: state.actions[person.id].target }));
      state.lastVotes = votes;
      const counts = new Map();
      for (const vote of votes) counts.set(vote.target, (counts.get(vote.target) || 0) + 1);
      const maximum = Math.max(...counts.values());
      const leaders = [...counts].filter(([, amount]) => amount === maximum).map(([id]) => id);
      log(state, `Bỏ phiếu: ${votes.map(vote => `${state.players[vote.voter].name} → ${state.players[vote.target].name}`).join('; ')}.`);
      if (leaders.length === 1) eliminate(state, leaders[0], `do nhận ${maximum} phiếu`);
      else log(state, `Hòa phiếu cao nhất (${maximum} phiếu): hôm nay không loại ai.`);
      state.actions = {};
      state.discussion = [];
      if (!checkWinner(state)) {
        if (state.day >= state.maxDays) {
          state.winner = 'draw'; state.phase = 'over'; state.reason = `Hết ${state.maxDays} ngày mà chưa phân thắng bại: hòa.`;
          log(state, state.reason);
        } else {
          state.day++; state.phase = 'night'; log(state, `Đêm ${state.day}. Cả làng đi ngủ.`);
        }
      }
    }
    return { ok: true };
  }

  return Object.freeze({ ROLES, createGame, view, actionType, legalTargets, act, botAction, advance });
});
