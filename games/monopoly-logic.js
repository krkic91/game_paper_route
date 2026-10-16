// version v1.0
/* A compact, original city-property variant. Rules and state are independent of the DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeMonopoly = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  const START_CASH = 1100, SALARY = 160, BAIL = 50, MAX_LEVEL = 2;
  const GROUPS = Object.freeze([
    { name: 'Phố thủ công', color: '#c17b59' }, { name: 'Vườn bên hồ', color: '#67a9b5' },
    { name: 'Khu giao thương', color: '#a789bf' }, { name: 'Miền đồi xanh', color: '#83a765' },
    { name: 'Phố ánh sáng', color: '#ce9b4a' }, { name: 'Vịnh ngọc', color: '#5c92ca' },
    { name: 'Trung tâm mới', color: '#cb7381' },
  ].map((group, index) => Object.freeze({ ...group, code: String.fromCharCode(65 + index) })));
  const property = (name, group, price, rent, upgrade) => ({ type: 'property', name, group, price, rent, upgrade });
  const BOARD = Object.freeze([
    { type: 'start', name: 'Khởi hành' },
    property('Phố Gốm', 0, 100, 14, 70), property('Bến Sách', 0, 120, 18, 70),
    { type: 'chance', name: 'Cơ hội' },
    property('Vườn Mơ', 1, 140, 20, 90), property('Hồ Sen', 1, 160, 24, 90),
    { type: 'jail', name: 'Tạm giữ' },
    property('Chợ Sớm', 2, 180, 28, 110), { type: 'tax', name: 'Phí đô thị', amount: 90 },
    property('Phố Lụa', 2, 200, 32, 110), { type: 'chance', name: 'Cơ hội' },
    property('Bến Gió', 3, 220, 36, 130), { type: 'parking', name: 'Công viên' },
    property('Đồi Trà', 3, 240, 40, 130), property('Vườn Sao', 4, 260, 44, 150),
    { type: 'chance', name: 'Cơ hội' }, property('Phố Đèn', 4, 280, 48, 150),
    { type: 'tax', name: 'Phí dịch vụ', amount: 120 }, { type: 'go-jail', name: 'Về tạm giữ' },
    property('Đảo Ngọc', 5, 300, 52, 170), { type: 'chance', name: 'Cơ hội' },
    property('Cảng Mây', 5, 320, 56, 170), property('Phố Mặt Trời', 6, 340, 60, 190),
    property('Quảng Trường', 6, 360, 64, 190),
  ].map((tile, index) => Object.freeze({ ...tile, index })));
  const CHANCES = Object.freeze([
    { type: 'credit', amount: 100, text: 'Dự án cộng đồng thành công: nhận 100 xu.' },
    { type: 'credit', amount: 70, text: 'Gian hàng đông khách: nhận 70 xu.' },
    { type: 'debit', amount: 60, text: 'Sửa sang cửa hàng: trả 60 xu.' },
    { type: 'debit', amount: 90, text: 'Đóng phí bảo trì: trả 90 xu.' },
    { type: 'start', text: 'Chuyến xe về Khởi hành: nhận 160 xu.' },
    { type: 'jail', text: 'Kiểm tra giấy tờ: về ô Tạm giữ.' },
    { type: 'credit', amount: 120, text: 'Giành giải ý tưởng xanh: nhận 120 xu.' },
    { type: 'repair', text: 'Bảo dưỡng công trình: trả 30 xu cho mỗi cấp đã xây.' },
  ].map(Object.freeze));
  const randomSources = new WeakMap();
  const validPlayer = player => Number.isInteger(player) && player >= 0 && player < 4;
  const fail = error => ({ ok: false, error, events: [] });
  const success = events => ({ ok: true, events });
  function emit(events, type, text, fields = {}) { events.push({ type, text, ...fields }); }
  function unit(random) {
    const number = Number(random());
    return Number.isFinite(number) ? Math.max(0, Math.min(0.9999999999999999, number)) : 0;
  }
  function shuffle(items, random) {
    for (let index = items.length - 1; index > 0; index--) {
      const next = Math.floor(unit(random) * (index + 1));
      [items[index], items[next]] = [items[next], items[index]];
    }
    return items;
  }
  function createGame({ random = Math.random, maxRounds = 30 } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    if (!Number.isInteger(maxRounds) || maxRounds < 1 || maxRounds > 30) throw new RangeError('maxRounds must be 1–30');
    const state = {
      players: ['Bạn', 'Máy 1', 'Máy 2', 'Máy 3'].map((name, id) => ({
        id, name, cash: START_CASH, position: 0, jailed: false, jailAttempts: 0, bankrupt: false,
      })),
      properties: BOARD.map(() => ({ owner: null, level: 0 })),
      current: 0, phase: 'roll', round: 1, maxRounds, turn: 0,
      dice: [0, 0], pending: null, bank: 0,
      chanceDeck: shuffle(CHANCES.map((_, index) => index), random), chanceIndex: 0,
      winner: null, winners: [], reason: null, ranking: [],
    };
    randomSources.set(state, random);
    return state;
  }
  function allowed(state, player, phases) {
    return Boolean(state && validPlayer(player) && state.current === player && phases.includes(state.phase));
  }
  function ownsGroup(state, player, group) {
    return validPlayer(player) && !state.players[player].bankrupt &&
      GROUPS[group] !== undefined && BOARD.filter(tile => tile.group === group)
        .every(tile => state.properties[tile.index].owner === player);
  }
  function rent(state, index) {
    const tile = BOARD[index], deed = state && state.properties[index];
    if (!tile || tile.type !== 'property' || !deed || deed.owner === null || state.players[deed.owner].bankrupt) return 0;
    return tile.rent * (deed.level === 2 ? 7 : deed.level === 1 ? 4 : ownsGroup(state, deed.owner, tile.group) ? 2 : 1);
  }
  function netWorth(state, player) {
    if (!validPlayer(player) || state.players[player].bankrupt) return 0;
    return state.players[player].cash + BOARD.reduce((sum, tile) => {
      const deed = state.properties[tile.index];
      return sum + (deed.owner === player ? tile.price + deed.level * tile.upgrade : 0);
    }, 0);
  }
  function credit(state, player, amount, events, reason) {
    state.players[player].cash += amount;
    state.bank -= amount;
    emit(events, 'credit', `${state.players[player].name} nhận ${amount} xu ${reason}.`, { player, amount });
  }
  // The short variant liquidates improvements first, then land, at half cost.
  // A separate bank balance makes every credit and payment auditable.
  function liquidate(state, player, target, events) {
    const person = state.players[player];
    const owned = BOARD.filter(tile => state.properties[tile.index].owner === player);
    for (const tile of [...owned].reverse()) {
      const deed = state.properties[tile.index];
      while (deed.level > 0 && person.cash < target) {
        deed.level--;
        credit(state, player, tile.upgrade / 2, events, `do bán 1 cấp tại ${tile.name}`);
        emit(events, 'liquidation', `Đã bán 1 cấp tại ${tile.name}.`, { player, tile: tile.index });
      }
    }
    for (const tile of owned) {
      if (person.cash >= target) break;
      // All improvements have been sold before any land needs to be sold.
      state.properties[tile.index] = { owner: null, level: 0 };
      credit(state, player, tile.price / 2, events, `do bán ${tile.name} về ngân hàng`);
      emit(events, 'liquidation', `${tile.name} trở lại ngân hàng.`, { player, tile: tile.index });
    }
  }
  function pay(state, player, amount, recipient, events, reason) {
    const person = state.players[player];
    if (recipient === player || amount <= 0) return;
    liquidate(state, player, amount, events);
    const actual = Math.min(person.cash, amount);
    person.cash -= actual;
    if (recipient === null) state.bank += actual;
    else state.players[recipient].cash += actual;
    emit(events, 'payment', `${person.name} trả ${actual} xu ${reason}${actual < amount ? ` (còn thiếu ${amount - actual} xu)` : ''}.`,
      { player, recipient, amount: actual, required: amount });
    if (actual < amount) {
      person.bankrupt = true;
      person.jailed = false;
      person.jailAttempts = 0;
      emit(events, 'bankrupt', `${person.name} phá sản và rời cuộc chơi.`, { player });
    }
  }
  function finish(state, reason, events) {
    state.phase = 'over';
    state.pending = null;
    state.reason = reason;
    state.ranking = state.players.map(person => ({ player: person.id, worth: netWorth(state, person.id), bankrupt: person.bankrupt }))
      .sort((a, b) => Number(a.bankrupt) - Number(b.bankrupt) || b.worth - a.worth || a.player - b.player);
    const first = state.ranking[0];
    state.winners = state.ranking.filter(entry => !entry.bankrupt && entry.worth === first.worth).map(entry => entry.player);
    state.winner = state.winners[0] ?? null;
    emit(events, 'finished', `${state.winners.map(player => state.players[player].name).join(' và ')} ${state.winners.length > 1 ? 'đồng hạng nhất' : 'thắng ván'}!`, { reason, winners: [...state.winners] });
  }
  function checkSurvivors(state, events) {
    if (state.players.filter(person => !person.bankrupt).length <= 1) finish(state, 'last-player', events);
  }
  function sendToJail(state, player, events) {
    const person = state.players[player];
    person.position = 6;
    person.jailed = true;
    person.jailAttempts = 0;
    state.phase = 'end';
    emit(events, 'jail', `${person.name} về Tạm giữ, không nhận tiền qua Khởi hành.`, { player });
  }
  function move(state, player, steps, events) {
    const person = state.players[player], from = person.position;
    const total = from + steps;
    person.position = total % BOARD.length;
    if (total >= BOARD.length) credit(state, player, SALARY, events, 'khi qua Khởi hành');
    emit(events, 'move', `${person.name} đi ${steps} ô tới ${BOARD[person.position].name}.`, { player, from, to: person.position, steps });
  }
  function land(state, player, events) {
    const person = state.players[player], tile = BOARD[person.position], deed = state.properties[person.position];
    state.phase = 'end';
    if (tile.type === 'property') {
      if (deed.owner === null) {
        state.phase = 'buy';
        state.pending = tile.index;
        emit(events, 'offer', `${tile.name} đang được bán với giá ${tile.price} xu.`, { tile: tile.index });
      } else if (deed.owner !== player) pay(state, player, rent(state, tile.index), deed.owner, events, `tiền thuê ${tile.name} cho ${state.players[deed.owner].name}`);
      else emit(events, 'own-property', `${person.name} ghé đất của mình, không mất tiền thuê.`, { player, tile: tile.index });
    } else if (tile.type === 'tax') pay(state, player, tile.amount, null, events, `cho ${tile.name}`);
    else if (tile.type === 'go-jail') sendToJail(state, player, events);
    else if (tile.type === 'chance') {
      if (state.chanceIndex >= state.chanceDeck.length) {
        shuffle(state.chanceDeck, randomSources.get(state) || Math.random);
        state.chanceIndex = 0;
      }
      const cardIndex = state.chanceDeck[state.chanceIndex++], card = CHANCES[cardIndex];
      emit(events, 'chance', `${person.name}: ${card.text}`, { player, card: cardIndex });
      if (card.type === 'credit') credit(state, player, card.amount, events, 'từ thẻ Cơ hội');
      else if (card.type === 'debit') pay(state, player, card.amount, null, events, 'theo thẻ Cơ hội');
      else if (card.type === 'repair') {
        const levels = state.properties.reduce((sum, item) => sum + (item.owner === player ? item.level : 0), 0);
        pay(state, player, levels * 30, null, events, 'bảo dưỡng công trình');
      } else if (card.type === 'start') {
        person.position = 0;
        credit(state, player, SALARY, events, 'khi về Khởi hành theo thẻ Cơ hội');
      } else if (card.type === 'jail') sendToJail(state, player, events);
    } else emit(events, 'rest', `${person.name} dừng tại ${tile.name}${tile.type === 'jail' ? ' (chỉ ghé thăm)' : ''}.`, { player });
    checkSurvivors(state, events);
  }
  function roll(state, player = state && state.current) {
    if (!allowed(state, player, ['roll']) || state.players[player].bankrupt) return fail('Chưa đến lượt gieo xúc xắc.');
    const events = [], person = state.players[player], random = randomSources.get(state) || Math.random;
    state.dice = [1 + Math.floor(unit(random) * 6), 1 + Math.floor(unit(random) * 6)];
    emit(events, 'dice', `${person.name} gieo ${state.dice[0]} và ${state.dice[1]}.`, { player, dice: [...state.dice] });
    if (person.jailed) {
      if (state.dice[0] === state.dice[1]) {
        person.jailed = false;
        person.jailAttempts = 0;
        emit(events, 'released', `${person.name} gieo đôi và được rời Tạm giữ.`, { player });
      } else {
        person.jailAttempts++;
        if (person.jailAttempts < 2) {
          state.phase = 'end';
          emit(events, 'jail-wait', `${person.name} chưa gieo được đôi, chờ lượt kế tiếp.`, { player });
          return success(events);
        }
        pay(state, player, BAIL, null, events, 'phí rời Tạm giữ sau lần thử thứ hai');
        person.jailed = false;
        person.jailAttempts = 0;
        if (person.bankrupt) {
          state.phase = 'end';
          checkSurvivors(state, events);
          return success(events);
        }
      }
    }
    move(state, player, state.dice[0] + state.dice[1], events);
    land(state, player, events);
    return success(events);
  }
  function buy(state, player = state && state.current) {
    if (!allowed(state, player, ['buy']) || state.players[player].bankrupt) return fail('Không có đất để mua ở lượt này.');
    const tile = BOARD[state.pending], deed = state.properties[state.pending];
    if (!tile || tile.type !== 'property' || deed.owner !== null || state.players[player].cash < tile.price) return fail('Không đủ tiền mua đất.');
    const events = [];
    pay(state, player, tile.price, null, events, `để mua ${tile.name}`);
    deed.owner = player;
    state.phase = 'end';
    state.pending = null;
    emit(events, 'purchase', `${state.players[player].name} sở hữu ${tile.name}.`, { player, tile: tile.index });
    return success(events);
  }
  function decline(state, player = state && state.current) {
    if (!allowed(state, player, ['buy']) || state.players[player].bankrupt) return fail('Không có đề nghị mua đất.');
    const events = [];
    emit(events, 'decline', `${state.players[player].name} bỏ qua mua ${BOARD[state.pending].name}.`, { player, tile: state.pending });
    state.pending = null;
    state.phase = 'end';
    return success(events);
  }
  function legalUpgrades(state, player = state && state.current) {
    if (!allowed(state, player, ['roll', 'end']) || state.players[player].bankrupt) return [];
    return BOARD.filter(tile => tile.type === 'property' && state.properties[tile.index].owner === player &&
      state.properties[tile.index].level < MAX_LEVEL && ownsGroup(state, player, tile.group) && state.players[player].cash >= tile.upgrade).map(tile => tile.index);
  }
  function upgrade(state, player, index) {
    if (!Number.isInteger(index) || !legalUpgrades(state, player).includes(index)) return fail('Cần sở hữu trọn nhóm, đủ tiền và chưa đạt cấp 2.');
    const events = [], tile = BOARD[index];
    pay(state, player, tile.upgrade, null, events, `để nâng cấp ${tile.name}`);
    state.properties[index].level++;
    emit(events, 'upgrade', `${tile.name} lên cấp ${state.properties[index].level}.`, { player, tile: index });
    return success(events);
  }
  function payBail(state, player = state && state.current) {
    if (!allowed(state, player, ['roll']) || state.players[player].bankrupt || !state.players[player].jailed || state.players[player].cash < BAIL) return fail('Chưa thể trả phí rời Tạm giữ.');
    const events = [];
    pay(state, player, BAIL, null, events, 'để rời Tạm giữ');
    state.players[player].jailed = false;
    state.players[player].jailAttempts = 0;
    emit(events, 'released', `${state.players[player].name} đã rời Tạm giữ, có thể gieo xúc xắc.`, { player });
    return success(events);
  }
  function endTurn(state, player = state && state.current) {
    if (!allowed(state, player, ['end'])) return fail('Hãy hoàn thành hành động trong lượt.');
    const events = [];
    checkSurvivors(state, events);
    if (state.phase === 'over') return success(events);
    let next = player, wrapped = false;
    do {
      next = (next + 1) % 4;
      if (next === 0) wrapped = true;
    } while (state.players[next].bankrupt);
    state.turn++;
    if (wrapped && state.round >= state.maxRounds) {
      finish(state, 'round-limit', events);
      return success(events);
    }
    if (wrapped) state.round++;
    state.current = next;
    state.phase = 'roll';
    state.pending = null;
    emit(events, 'turn', `Lượt ${state.players[next].name} · vòng ${state.round}/${state.maxRounds}.`, { player: next });
    return success(events);
  }
  function botAction(state) {
    if (!state || state.phase === 'over') return null;
    const player = state.current, person = state.players[player];
    if (state.phase === 'buy') {
      const tile = BOARD[state.pending];
      const partnerOwned = BOARD.some(other => other.group === tile.group && other.index !== tile.index && state.properties[other.index].owner === player);
      return { type: person.cash >= tile.price + (partnerOwned ? 90 : 160) ? 'buy' : 'decline' };
    }
    const upgrades = legalUpgrades(state, player).filter(index => person.cash >= BOARD[index].upgrade + 260);
    if (upgrades.length) return { type: 'upgrade', tile: upgrades.sort((a, b) => BOARD[b].rent / BOARD[b].upgrade - BOARD[a].rent / BOARD[a].upgrade)[0] };
    if (state.phase === 'roll') {
      if (person.jailed && person.cash > 550 && state.round < 20) return { type: 'bail' };
      return { type: 'roll' };
    }
    return { type: 'end' };
  }
  function act(state, player, action) {
    if (!action || typeof action.type !== 'string') return fail('Hành động không hợp lệ.');
    if (action.type === 'roll') return roll(state, player);
    if (action.type === 'buy') return buy(state, player);
    if (action.type === 'decline') return decline(state, player);
    if (action.type === 'upgrade') return upgrade(state, player, action.tile);
    if (action.type === 'bail') return payBail(state, player);
    if (action.type === 'end') return endTurn(state, player);
    return fail('Hành động không hợp lệ.');
  }
  return Object.freeze({ BOARD, GROUPS, CHANCES, START_CASH, SALARY, BAIL, MAX_LEVEL,
    createGame, ownsGroup, rent, netWorth, legalUpgrades, roll, buy, decline, upgrade, payBail, endTurn, botAction, act });
});
