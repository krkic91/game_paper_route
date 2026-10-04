// version v1.0
'use strict';

const { randomBytes, randomInt, randomUUID, timingSafeEqual } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { createCaro, moveCaro } = require('../games/logic.js');

// One process owns all rooms. Restarting this server intentionally clears v1 rooms.
function attachCaroOnline(server, options = {}) {
  const graceMs = options.graceMs ?? 90000;
  const idleMs = options.idleMs ?? 30 * 60 * 1000;
  const heartbeatMs = options.heartbeatMs ?? 30000;
  const maxRooms = options.maxRooms ?? 1000;
  const maxClients = options.maxClients ?? 2500;
  const maxRequests = options.maxRequests ?? 80;
  const rateWindowMs = options.rateWindowMs ?? 10000;
  const allowedOrigins = new Set(
    options.allowedOrigins ?? (process.env.ONLINE_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  );
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: options.maxPayload ?? 4096, perMessageDeflate: false });
  let closed = false;
  let closing;

  function send(socket, data) {
    if (socket?.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > 1024 * 1024) return socket.terminate();
    socket.send(JSON.stringify(data));
  }
  function roomState(room) {
    return {
      code: room.code, roundId: room.roundId, version: room.version,
      status: room.status, game: room.game, outcome: room.outcome,
      players: room.players.map((p) => p && ({
        seat: p.seat, name: p.name, mark: p.mark, ready: p.ready,
        connected: Boolean(p.socket?.readyState === WebSocket.OPEN),
        rematch: p.rematch, left: p.left, disconnectedUntil: p.disconnectedUntil,
      })),
    };
  }
  function state(socket, room, player) {
    send(socket, { type: 'state', room: roomState(room), you: { seat: player.seat, mark: player.mark } });
  }
  function broadcast(room) {
    for (const player of room.players) if (player?.socket) state(player.socket, room, player);
  }
  function changed(room) {
    room.version++;
    room.lastActivity = Date.now();
    broadcast(room);
  }
  function finish(room, reason, winner) {
    room.status = 'finished';
    room.outcome = { reason, winner };
    room.game.ended = true;
    room.game.winner = winner;
    if (reason !== 'line') room.game.line = [];
  }
  function expire(room, now = Date.now()) {
    let dirty = false;
    for (const player of room.players) {
      if (!player || player.left || player.socket || player.disconnectedUntil === null || player.disconnectedUntil > now) continue;
      if (room.status === 'playing') {
        const opponent = room.players[1 - player.seat];
        finish(room, 'timeout', opponent?.socket?.readyState === WebSocket.OPEN ? opponent.mark : 0);
      }
      player.left = true;
      player.token = null;
      player.ready = false;
      player.rematch = false;
      player.disconnectedUntil = null;
      if (room.status === 'waiting') room.players[player.seat] = null;
      dirty = true;
    }
    if (dirty) changed(room);
    if (room.players.every((p) => !p || p.left)) rooms.delete(room.code);
  }
  function removeRoom(room) {
    rooms.delete(room.code);
    for (const player of room.players) {
      if (!player?.socket) continue;
      const socket = player.socket;
      socket.session = null;
      player.socket = null;
      send(socket, { type: 'error', code: 'ROOM_EXPIRED', message: 'Phòng đã hết hạn do không hoạt động.' });
      socket.close(4004, 'Room expired');
    }
  }
  function nameOf(value) {
    if (typeof value !== 'string') return null;
    const name = value.trim();
    return name.length >= 1 && name.length <= 24 && !/[\u0000-\u001f\u007f]/.test(name) ? name : null;
  }
  function codeOf(value) {
    return typeof value === 'string' && /^[A-Z2-9]{6}$/.test(value.trim().toUpperCase()) ? value.trim().toUpperCase() : null;
  }
  function remember(map, requestId, replies) {
    map.set(requestId, replies);
    if (map.size > 128) map.delete(map.keys().next().value);
  }
  function bind(socket, room, player) {
    const oldSocket = player.socket;
    socket.session = { room, player };
    player.socket = socket;
    player.disconnectedUntil = null;
    if (oldSocket && oldSocket !== socket) {
      oldSocket.session = null;
      oldSocket.close(4001, 'Session replaced');
    }
  }
  function tokenMatches(expected, actual) {
    if (!expected || typeof actual !== 'string' || actual.length !== expected.length) return false;
    const a = Buffer.from(expected), b = Buffer.from(actual);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  function processMessage(socket, message) {
    const { requestId, type } = message;
    let room = socket.session?.room;
    let player = socket.session?.player;
    if (room) expire(room);
    const previous = player?.requests.get(requestId) || socket.requests.get(requestId);
    if (previous) {
      for (const reply of previous) send(socket, reply);
      if (room && player) state(socket, room, player);
      return;
    }
    const replies = [];
    const reply = (data) => { replies.push(data); send(socket, data); };
    const fail = (code, text, withState = false) => {
      reply({ type: 'error', requestId, code, message: text });
      if (withState && room && player) state(socket, room, player);
    };
    const acknowledge = () => reply({ type: 'ack', requestId });
    const session = () => reply({ type: 'session', code: room.code, token: player.token, seat: player.seat });
    const doRequest = () => {
      if (['create', 'join', 'resume'].includes(type)) {
        if (room) return fail('ALREADY_IN_ROOM', 'Hãy rời phòng hiện tại trước.');
        if (type === 'create' || type === 'join') {
          const name = nameOf(message.name);
          if (!name) return fail('INVALID_NAME', 'Tên cần có từ 1 đến 24 ký tự.');
          if (type === 'create') {
            if (rooms.size >= maxRooms) return fail('SERVER_BUSY', 'Máy chủ đang đầy. Vui lòng thử lại sau.');
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
            let code;
            do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code));
            room = { code, roundId: randomUUID(), version: 0, status: 'waiting', game: createCaro(), players: [null, null], outcome: null, lastActivity: Date.now() };
            rooms.set(code, room);
          } else {
            room = rooms.get(codeOf(message.code));
            if (room) expire(room);
            if (!room || !rooms.has(room.code)) return fail('ROOM_NOT_FOUND', 'Không tìm thấy phòng này.');
            if (room.players.every(Boolean)) return fail('ROOM_FULL', 'Phòng đã có đủ hai người.');
            if (room.status !== 'waiting') return fail('ROOM_STARTED', 'Phòng đã bắt đầu chơi.');
          }
          const seat = room.players.findIndex((p) => !p);
          player = { seat, name, mark: seat + 1, ready: false, rematch: false, left: false, disconnectedUntil: null, token: randomBytes(32).toString('base64url'), requests: new Map(), socket: null };
          room.players[seat] = player;
        } else {
          room = rooms.get(codeOf(message.code));
          if (room) expire(room);
          if (!room || !rooms.has(room.code)) return fail('ROOM_NOT_FOUND', 'Phòng không còn tồn tại.');
          player = room.players.find((p) => p && !p.left && tokenMatches(p.token, message.token));
          if (!player) return fail('SESSION_EXPIRED', 'Phiên chơi không hợp lệ hoặc đã hết hạn.');
        }
        bind(socket, room, player);
        session();
        acknowledge();
        changed(room);
        return;
      }
      if (!room || !player || player.left || player.socket !== socket) return fail('NOT_IN_ROOM', 'Bạn chưa tham gia phòng.');
      room.lastActivity = Date.now();
      if (type === 'sync') {
        acknowledge();
        state(socket, room, player);
        return;
      }
      if (type === 'leave') {
        if (room.status === 'playing') finish(room, 'leave', room.players[1 - player.seat]?.mark || 0);
        player.left = true;
        player.token = null;
        player.ready = false;
        player.rematch = false;
        player.disconnectedUntil = null;
        player.socket = null;
        socket.session = null;
        if (room.status === 'waiting') room.players[player.seat] = null;
        reply({ type: 'left' });
        acknowledge();
        changed(room);
        if (room.players.every((p) => !p || p.left)) rooms.delete(room.code);
        return;
      }
      if (!['ready', 'move', 'rematch'].includes(type)) return fail('UNKNOWN_COMMAND', 'Yêu cầu không được hỗ trợ.');
      if (message.roundId !== room.roundId) return fail('STALE_ROUND', 'Ván đấu đã thay đổi. Đang đồng bộ lại.', true);
      if (type === 'ready') {
        if (room.status !== 'waiting') return fail('NOT_WAITING', 'Ván đấu đã bắt đầu.', true);
        player.ready = true;
        if (room.players.every((p) => p?.ready && !p.left && p.socket?.readyState === WebSocket.OPEN)) room.status = 'playing';
      } else if (type === 'move') {
        if (room.status !== 'playing') return fail('NOT_PLAYING', 'Ván đấu chưa bắt đầu hoặc đã kết thúc.', true);
        if (room.players.some((p) => !p || p.left || p.socket?.readyState !== WebSocket.OPEN)) return fail('OPPONENT_OFFLINE', 'Chờ đối thủ kết nối lại.', true);
        if (message.version !== room.version) return fail('STALE_STATE', 'Bàn cờ đã thay đổi. Đang đồng bộ lại.', true);
        if (room.game.turn !== player.mark) return fail('NOT_YOUR_TURN', 'Chưa đến lượt của bạn.', true);
        if (!moveCaro(room.game, message.index)) return fail('INVALID_MOVE', 'Ô này không hợp lệ hoặc đã được đánh.', true);
        if (room.game.ended) finish(room, room.game.winner ? 'line' : 'draw', room.game.winner);
      } else {
        if (room.status !== 'finished') return fail('NOT_FINISHED', 'Ván đấu chưa kết thúc.', true);
        if (room.players.some((p) => !p || p.left || p.socket?.readyState !== WebSocket.OPEN)) return fail('OPPONENT_OFFLINE', 'Cần cả hai người kết nối để chơi tiếp.', true);
        player.rematch = true;
        if (room.players.every((p) => p.rematch)) {
          room.roundId = randomUUID();
          room.game = createCaro();
          room.status = 'playing';
          room.outcome = null;
          for (const p of room.players) { p.mark = 3 - p.mark; p.rematch = false; p.ready = true; }
        }
      }
      acknowledge();
      changed(room);
    };
    doRequest();
    remember(socket.requests, requestId, replies);
    // A failed join/resume must never write request IDs into another player's seat.
    if (player && socket.session?.player === player) remember(player.requests, requestId, replies);
  }

  function onUpgrade(request, socket, head) {
    const deny = (status) => socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    if (closed) return deny('503 Service Unavailable');
    let url, origin;
    try { url = new URL(request.url, 'http://localhost'); origin = new URL(request.headers.origin); }
    catch { return deny('403 Forbidden'); }
    if (url.pathname !== '/ws/caro') return deny('404 Not Found');
    if (!['http:', 'https:'].includes(origin.protocol) || (!allowedOrigins.has(origin.origin) && origin.host !== request.headers.host)) return deny('403 Forbidden');
    if (wss.clients.size >= maxClients) return deny('503 Service Unavailable');
    wss.handleUpgrade(request, socket, head, (client) => wss.emit('connection', client, request));
  }
  wss.on('connection', (socket) => {
    socket.alive = true;
    socket.requests = new Map();
    socket.session = null;
    socket.rateStart = Date.now();
    socket.rateCount = 0;
    socket.on('pong', () => { socket.alive = true; });
    socket.on('error', () => {}); // Malformed WebSocket frames close this client, not the process.
    socket.on('message', (data, binary) => {
      if (closed) return;
      const now = Date.now();
      if (now - socket.rateStart >= rateWindowMs) { socket.rateStart = now; socket.rateCount = 0; }
      if (++socket.rateCount > maxRequests) { socket.close(1008, 'Rate limit'); return; }
      let message;
      try { message = binary ? null : JSON.parse(data.toString()); } catch { message = null; }
      if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.type !== 'string' || typeof message.requestId !== 'string' || !message.requestId.length || message.requestId.length > 80) {
        send(socket, { type: 'error', code: 'BAD_REQUEST', message: 'Yêu cầu không hợp lệ.' });
        return;
      }
      processMessage(socket, message);
    });
    socket.on('close', () => {
      const session = socket.session;
      socket.session = null;
      if (closed || !session || session.player.socket !== socket) return;
      const { room, player } = session;
      player.socket = null;
      player.disconnectedUntil = Date.now() + graceMs;
      if (room.status === 'waiting') player.ready = false;
      player.rematch = false;
      changed(room);
    });
  });
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.alive) { socket.terminate(); continue; }
      socket.alive = false;
      socket.ping();
    }
  }, heartbeatMs);
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (now - room.lastActivity >= idleMs) removeRoom(room);
      else expire(room, now);
    }
  }, options.sweepMs ?? Math.max(10, Math.min(1000, graceMs, idleMs)));
  heartbeat.unref();
  sweep.unref();
  server.on('upgrade', onUpgrade);
  function close() {
    if (closing) return closing;
    closed = true;
    clearInterval(heartbeat);
    clearInterval(sweep);
    server.off('upgrade', onUpgrade);
    server.off('close', close);
    for (const socket of wss.clients) socket.terminate();
    rooms.clear();
    closing = new Promise((resolve) => wss.close(resolve));
    return closing;
  }
  server.on('close', close);
  return { close };
}

module.exports = { attachCaroOnline };
