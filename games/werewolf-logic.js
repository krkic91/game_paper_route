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
      discussion: [], lastVotes: [], voteHistory: [], statements: [],
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
      voteHistory: copy(state.voteHistory), statements: copy(state.statements),
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

  // Public facts only. A claimed role or inspection is never verified against hidden roles.
  function evidence(snapshot, id) {
    const facts = [];
    for (const round of snapshot.voteHistory || []) {
      const vote = round.votes.find(item => item.voter === id);
      const target = vote && snapshot.players[vote.target];
      if (!target || target.alive || !target.role) continue;
      const wolf = target.role === 'wolf';
      facts.push({ id: `vote-${round.day}`, kind: wolf ? 'defend' : 'suspect', weight: wolf ? -3 : 1,
        text: `Ngày ${round.day}, người này bỏ phiếu cho ${target.name}, nay đã lộ vai ${ROLES[target.role]}. Một lá phiếu chưa đủ kết luận phe.` });
    }
    const claims = (snapshot.statements || []).filter(item => item.speaker === id && item.kind === 'claim');
    const last = claims[claims.length - 1];
    if (last) {
      const changed = claims.find(item => item.role !== last.role);
      const reports = claims.filter(item => item.role === 'seer' && Number.isInteger(item.target));
      const conflict = reports.find((item, index) => reports.slice(0, index).some(old => old.target === item.target && old.verdict !== item.verdict));
      const disproved = reports.find(item => {
        const person = snapshot.players[item.target];
        return person && !person.alive && person.role && item.verdict !== (person.role === 'wolf');
      });
      const text = changed ? `Lời nhận vai đã đổi từ ${ROLES[changed.role]} sang ${ROLES[last.role]}.`
        : conflict ? `Hai lời công bố soi về ${snapshot.players[conflict.target].name} mâu thuẫn nhau.`
          : disproved ? `Lời công bố soi về ${snapshot.players[disproved.target].name} trái với vai ${ROLES[snapshot.players[disproved.target].role]} đã công khai.` : '';
      if (text) facts.push({ id: 'contradiction', kind: 'suspect', weight: 5, text });
      if (last.role !== 'villager') {
        const others = snapshot.players.filter(person => person.alive && person.id !== id).filter(person => {
          const list = (snapshot.statements || []).filter(item => item.speaker === person.id && item.kind === 'claim');
          return list[list.length - 1]?.role === last.role;
        });
        if (others.length) facts.push({ id: 'counterclaim', kind: 'suspect', weight: 1,
          text: `${others.map(person => person.name).join(', ')} cũng nhận vai ${ROLES[last.role]}; bàn chỉ có một vai này. Chưa biết ai nói thật.` });
      }
    }
    return facts;
  }

  function speechReasons(snapshot, kind, target) {
    if (!['suspect', 'defend'].includes(kind) || !snapshot.players[target]) return [];
    return [{ id: 'intuition', text: kind === 'suspect' ? 'Cảm nhận cá nhân, chưa có bằng chứng chắc chắn.' : 'Tạm tin người này; vẫn cần thêm bằng chứng.' },
      ...evidence(snapshot, target).filter(item => item.kind === kind)];
  }

  function speechesLeft(snapshot) {
    if (snapshot.phase !== 'day' || !snapshot.players[snapshot.self].alive || snapshot.submitted) return 0;
    return Math.max(0, 2 - (snapshot.statements || []).filter(item => item.day === snapshot.day && item.speaker === snapshot.self).length);
  }

  function statementText(snapshot, item) {
    const name = snapshot.players[item.speaker].name, target = snapshot.players[item.target]?.name;
    if (item.kind === 'claim') return `${name}: Tôi nhận vai ${ROLES[item.role]}.${item.role === 'seer' && target ? ` Tôi công bố đã soi ${target}: ${item.verdict ? 'là sói' : 'không phải sói'}.` : ''} (Lời tự nhận, chưa xác thực.)`;
    return `${name}: Tôi ${item.kind === 'defend' ? 'tạm bênh vực' : 'nghi'} ${target}. ${item.reasonText}`;
  }

  function recordStatement(state, item) {
    const entry = { ...item, day: state.day };
    entry.text = statementText(view(state, item.speaker), entry);
    state.statements.push(entry); state.discussion.push(copy(entry)); log(state, entry.text);
  }

  function voteScore(snapshot, id) {
    const role = snapshot.players[snapshot.self].role;
    // Private knowledge outranks all public claims and peer pressure.
    if (role === 'wolf' && snapshot.players[id].role === 'wolf') return -10000;
    if (snapshot.knowledge[id] === true) return 10000;
    if (snapshot.knowledge[id] === false) return -5000;
    let score = evidence(snapshot, id).reduce((sum, item) => sum + item.weight, 0);
    const opinions = new Map();
    for (const item of snapshot.discussion || []) {
      if (item.speaker !== snapshot.self && ['suspect', 'defend'].includes(item.kind)) opinions.set(item.speaker, item);
    }
    for (const item of opinions.values()) if (item.target === id) score += item.kind === 'suspect' ? 0.75 : -0.5;
    // At most one report per speaker/target; repeated claims cannot stack influence.
    for (const person of snapshot.players) {
      if (person.id === snapshot.self) continue;
      const claims = (snapshot.statements || []).filter(item => item.speaker === person.id && item.kind === 'claim');
      if (claims[claims.length - 1]?.role !== 'seer' || evidence(snapshot, person.id).some(item => item.id === 'contradiction')) continue;
      if (!person.alive && person.role !== 'seer') continue;
      const reports = claims.filter(item => item.role === 'seer' && item.target === id);
      const last = reports[reports.length - 1];
      if (last) score += (last.verdict ? 2 : -1) * (!person.alive && person.role === 'seer' ? 2 : 1);
    }
    return score;
  }

  function speak(state, player, statement) {
    if (!Number.isInteger(player) || !state.players[player]) return fail('Người phát biểu không hợp lệ.');
    const snapshot = view(state, player);
    if (!speechesLeft(snapshot)) return fail('Chỉ phát biểu khi còn sống, vào ban ngày và trước khi bỏ phiếu; tối đa 2 lần mỗi ngày.');
    if (!statement || !['suspect', 'defend', 'claim'].includes(statement.kind)) return fail('Chọn một cách phát biểu.');
    const item = { speaker: player, kind: statement.kind };
    if (item.kind === 'claim') {
      if (!['villager', 'seer', 'guard'].includes(statement.role)) return fail('Vai tự nhận không hợp lệ.');
      item.role = statement.role;
      if (statement.target != null) {
        if (item.role !== 'seer' || !Number.isInteger(statement.target) || !snapshot.players[statement.target] || statement.target === player || typeof statement.verdict !== 'boolean') return fail('Lời công bố soi không hợp lệ.');
        item.target = statement.target; item.verdict = statement.verdict;
      }
    } else {
      if (!Number.isInteger(statement.target) || !snapshot.players[statement.target]?.alive || statement.target === player) return fail('Chọn một người khác còn sống.');
      const reason = speechReasons(snapshot, item.kind, statement.target).find(option => option.id === statement.reason);
      if (!reason) return fail('Lý do này chưa có bằng chứng công khai.');
      item.target = statement.target; item.reason = reason.id; item.reasonText = reason.text;
    }
    if (snapshot.statements.some(old => old.day === snapshot.day && old.speaker === player && old.kind === item.kind && old.target === item.target && old.role === item.role && old.verdict === item.verdict && old.reason === item.reason)) return fail('Bạn đã phát biểu ý này hôm nay.');
    recordStatement(state, item);
    // Two replies keep the exchange readable; replies do not amplify voting influence.
    const listeners = state.players.filter(person => person.alive && person.id !== player && person.id !== 0);
    listeners.sort((a, b) => Number(b.id === item.target) - Number(a.id === item.target) || a.id - b.id);
    for (const listener of listeners.slice(0, 2)) {
      const own = view(state, listener.id);
      const facts = evidence(own, item.kind === 'claim' ? player : item.target);
      let response;
      if (item.kind === 'claim') {
        response = facts.find(fact => fact.id === 'contradiction' || fact.id === 'counterclaim')?.text || 'Tôi ghi nhận lời nhận vai, nhưng cần đối chiếu với kết quả công khai; chưa thể coi đó là sự thật.';
      } else if (item.target === listener.id) {
        response = facts.find(fact => fact.kind === 'defend')?.text || (item.kind === 'suspect' ? 'Tôi phản đối kết luận vội. Hãy đối chiếu các lá phiếu và vai đã công khai.' : 'Cảm ơn, nhưng vẫn nên kiểm tra tôi qua các lá phiếu tiếp theo.');
      } else {
        const fact = facts.find(f => f.id === item.reason);
        response = fact ? `${fact.text} Tôi sẽ cân nhắc điều này khi bỏ phiếu.` : 'Đó mới là nhận định cá nhân. Tôi cần thêm bằng chứng công khai trước khi kết luận.';
      }
      const reply = { speaker: listener.id, kind: 'reply', day: state.day, text: `${listener.name}: ${response}` };
      state.discussion.push(reply); log(state, reply.text);
    }
    return { ok: true };
  }

  // This function intentionally accepts ONLY a player's filtered view, never game state.
  function botAction(snapshot, random = Math.random) {
    const type = actionType(snapshot), available = targets(snapshot);
    if (!type || !available.length) return null;
    let choices = available;
    if (type === 'inspect') {
      const unknown = choices.filter(id => snapshot.knowledge[id] === undefined);
      if (unknown.length) choices = unknown;
    } else if (type === 'vote') {
      const scored = choices.map(id => ({ id, score: voteScore(snapshot, id) }));
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
      if (snapshot.players[person.id].role === 'seer' && snapshot.knowledge[target] === true) return { speaker: person.id, kind: 'claim', role: 'seer', target, verdict: true };
      const reason = speechReasons(snapshot, 'suspect', target).slice(1).sort((a, b) => b.weight - a.weight)[0];
      return { speaker: person.id, kind: 'suspect', target, reason: reason?.id || 'intuition', reasonText: reason?.text || 'Chưa đủ bằng chứng công khai. Đây mới là phỏng đoán, tôi có thể đổi ý sau thảo luận.' };
    }).filter(Boolean);
    for (const claim of claims) recordStatement(state, claim);
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
      state.voteHistory.push({ day: state.day, votes: copy(votes), eliminated: leaders.length === 1 ? leaders[0] : null, maximum });
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

  return Object.freeze({ ROLES, createGame, view, actionType, legalTargets, act, botAction, advance, speak, speechReasons, speechesLeft, evidence });
});
