// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { webcrypto } = require('node:crypto');
const { createCaro } = require('../games/logic.js');
const source = readFileSync(join(__dirname, '../games/online.js'), 'utf8');
const key = 'tram-choi.caro.online.session';
const flush = () => new Promise((resolve) => setImmediate(resolve));

function environment(t, stored = new Map(), options = {}) {
  const storage = {
    getItem: (name) => stored.get(name) ?? null,
    setItem: (name, value) => stored.set(name, String(value)),
    removeItem: (name) => stored.delete(name),
  };
  const sockets = [];
  class Socket extends EventTarget {
    constructor(url) { super(); this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); }
    send(bytes) { assert.equal(this.readyState, 1); this.sent.push(JSON.parse(bytes)); }
    open() { this.readyState = 1; this.dispatchEvent(new Event('open')); }
    receive(message) { this.dispatchEvent(Object.assign(new Event('message'), { data: JSON.stringify(message) })); }
    close(code = 1000) {
      this.readyState = 3;
      this.dispatchEvent(Object.assign(new Event('close'), { code }));
    }
  }
  const window = new EventTarget();
  const document = new EventTarget();
  document.hidden = false;
  document.querySelector = () => options.endpoint ? { content: options.endpoint } : null;
  const navigator = { onLine: true };
  Object.assign(window, {
    sessionStorage: storage, localStorage: storage, crypto: webcrypto,
    location: new URL(options.url || 'http://localhost:4173/#play/caro?room=ABC234'),
  });
  vm.runInNewContext(source, {
    window, document, navigator, WebSocket: Socket, URL, URLSearchParams,
    setTimeout, clearTimeout, console, ...options.clock?.timers,
  });
  const api = window.CaroOnline;
  t.after(() => api.leave());
  return { api, window, document, navigator, sockets, stored };
}

function snapshot(version = 1) {
  return {
    code: 'ABC234', roundId: 'round-one', version, status: 'playing', game: createCaro(), outcome: null,
    players: [0, 1].map((seat) => ({
      seat, name: seat ? 'Bình' : 'An', mark: seat + 1, ready: true,
      connected: true, rematch: false, left: false, disconnectedUntil: null,
    })),
  };
}
function accept(socket, request, room = snapshot()) {
  if (['create', 'join', 'resume'].includes(request.type))
    socket.receive({ type: 'session', code: room.code, token: 'private-seat-token', seat: 0 });
  socket.receive({ type: 'ack', requestId: request.requestId });
  socket.receive({ type: 'state', room, you: { seat: 0, mark: 1 } });
}
async function create(env) {
  const promise = env.api.create('An');
  const socket = env.sockets.at(-1);
  socket.open();
  await flush();
  accept(socket, socket.sent.at(-1));
  await promise;
  return socket;
}

test('online client persists only its seat and keeps invite links free of the private token', async (t) => {
  const env = environment(t);
  await create(env);
  const state = env.api.getState();
  assert.equal(state.connection, 'connected');
  assert.equal(state.room.code, 'ABC234');
  assert.equal(state.you.mark, 1);
  assert.equal(JSON.parse(env.stored.get(key)).token, 'private-seat-token');
  assert.equal(env.api.getInviteCode(), 'ABC234');
  const link = env.api.inviteLink('ABC234');
  assert.equal(new URL(link).hash, '#play/caro?room=ABC234');
  assert.equal(link.includes('private-seat-token'), false);
});

test('online client waits for authority, locks duplicate clicks and rejects older snapshots', async (t) => {
  const env = environment(t), socket = await create(env);
  const move = env.api.move(112);
  const request = socket.sent.at(-1);
  assert.equal(env.api.getState().pendingIndex, 112);
  assert.equal(env.api.getState().room.game.board[112], 0);
  const sentCount = socket.sent.length;
  await assert.rejects(env.api.move(113), /Đang chờ/);
  assert.equal(socket.sent.length, sentCount);
  assert.equal(request.roundId, 'round-one');
  assert.equal(request.version, 1);
  const newer = snapshot(2);
  newer.game.board[112] = 1;
  newer.game.moves = 1;
  newer.game.turn = 2;
  accept(socket, request, newer);
  await move;
  socket.receive({ type: 'state', room: snapshot(1), you: { seat: 0, mark: 1 } });
  assert.equal(env.api.getState().room.game.moves, 1);
  assert.equal(env.api.getState().pending, false);
});

test('reload resumes the same seat with fresh request IDs; renderer remount does not resume twice', async (t) => {
  const stored = new Map();
  const first = environment(t, stored), old = await create(first);
  const firstID = old.sent[0].requestId;
  first.window.dispatchEvent(new Event('pagehide'));
  assert.equal(old.sent.some((m) => m.type === 'leave'), false);
  const second = environment(t, stored);
  assert.equal(second.api.resumeSaved(), true);
  const socket = second.sockets.at(-1);
  socket.open();
  await flush();
  const resume = socket.sent.at(-1);
  assert.equal(resume.type, 'resume');
  assert.equal(resume.token, 'private-seat-token');
  assert.notEqual(resume.requestId, firstID);
  accept(socket, resume, snapshot(3));
  await flush();
  const count = socket.sent.length;
  assert.equal(second.api.resumeSaved(), true);
  assert.equal(socket.sent.length, count);
  const retry = second.api.retry();
  assert.equal(socket.sent.at(-1).type, 'sync');
  accept(socket, socket.sent.at(-1), snapshot(3));
  await retry;
});

test('offline recovery never resends an uncertain move and accepts the resumed authoritative board', async (t) => {
  const env = environment(t), old = await create(env);
  const pending = env.api.move(112);
  const rejected = assert.rejects(pending, /mất kết nối/);
  env.navigator.onLine = false;
  env.window.dispatchEvent(new Event('offline'));
  await rejected;
  assert.equal(env.api.getState().pending, false);
  assert.equal(env.api.getState().connection, 'reconnecting');
  assert.ok(env.stored.has(key));
  env.navigator.onLine = true;
  env.window.dispatchEvent(new Event('online'));
  const socket = env.sockets.at(-1);
  socket.open();
  await flush();
  assert.deepEqual(socket.sent.map((m) => m.type), ['resume']);
  const room = snapshot(4);
  room.game.board[112] = 1;
  room.game.moves = 1;
  accept(socket, socket.sent[0], room);
  await flush();
  assert.equal(env.api.getState().room.game.moves, 1);
  old.receive({ type: 'state', room: snapshot(99), you: { seat: 0, mark: 1 } });
  assert.equal(env.api.getState().room.version, 4);
});

test('leaving offline forgets the room and prevents reconnect when the network returns', async (t) => {
  const env = environment(t);
  await create(env);
  env.window.dispatchEvent(new Event('offline'));
  await env.api.leave();
  assert.equal(env.api.getState().session, null);
  assert.equal(env.stored.has(key), false);
  env.window.dispatchEvent(new Event('online'));
  assert.equal(env.sockets.length, 1);
  assert.equal(env.api.getState().room, null);
});

test('expired room clears saved credentials so the player can create a new room', async (t) => {
  const stored = new Map([[key, JSON.stringify({ code: 'ABC234', token: 'old', seat: 0 })]]);
  const env = environment(t, stored);
  env.api.resumeSaved();
  const socket = env.sockets.at(-1);
  socket.open();
  await flush();
  socket.receive({ type: 'error', requestId: socket.sent[0].requestId, code: 'ROOM_NOT_FOUND', message: 'Phòng không còn tồn tại.' });
  await flush();
  assert.equal(env.api.getState().session, null);
  assert.equal(env.api.getState().pending, false);
  const creating = env.api.create('An');
  await flush();
  assert.equal(socket.sent.at(-1).type, 'create');
  accept(socket, socket.sent.at(-1));
  await creating;
  assert.equal(env.api.getState().room.code, 'ABC234');
});

test('cancelled initial connection cannot enter a room after the view has left', async (t) => {
  const env = environment(t);
  const entering = env.api.create('An');
  const rejected = assert.rejects(entering, /rời phòng/);
  const socket = env.sockets[0];
  await env.api.leave();
  socket.open();
  await rejected;
  assert.equal(socket.sent.length, 0);
  assert.equal(env.api.getState().pending, false);
});

// Deterministic network deadlines without sleeping eight real seconds per case.
function controlledClock() {
  let now = 0, serial = 0;
  const pending = new Map();
  return {
    timers: {
      setTimeout(fn, delay) { const id = ++serial; pending.set(id, { at: now + delay, fn }); return id; },
      clearTimeout(id) { pending.delete(id); },
    },
    advance(ms) {
      const target = now + ms;
      for (;;) {
        const next = [...pending].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        pending.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = target;
    },
    get size() { return pending.size; },
  };
}

test('initial connection timeout unlocks the lobby and a new attempt can enter', async (t) => {
  const clock = controlledClock(), env = environment(t, new Map(), { clock });
  const entering = env.api.create('An');
  const rejected = assert.rejects(entering, /Không kết nối/);
  clock.advance(8000);
  await rejected;
  assert.equal(env.api.getState().pending, false);
  assert.equal(env.api.getState().connection, 'unavailable');
  assert.equal(env.sockets[0].readyState, 3);
  await create(env);
  assert.equal(env.api.getState().connection, 'connected');
  assert.equal(env.sockets.length, 2);
});

test('request timeout resumes authority without replaying a move whose ACK was lost', async (t) => {
  const clock = controlledClock(), env = environment(t, new Map(), { clock });
  const old = await create(env);
  const moving = env.api.move(112);
  const rejected = assert.rejects(moving, /chưa phản hồi/);
  clock.advance(8000);
  await rejected;
  assert.equal(env.api.getState().connection, 'reconnecting');
  assert.equal(env.api.getState().pending, false);
  assert.equal(old.readyState, 3);
  clock.advance(500);
  const socket = env.sockets.at(-1);
  socket.open(); await flush();
  assert.deepEqual(socket.sent.map(request => request.type), ['resume']);
  const authoritative = snapshot(5);
  authoritative.game.board[112] = 1;
  authoritative.game.moves = 1;
  authoritative.game.turn = 2;
  accept(socket, socket.sent[0], authoritative);
  await flush();
  old.receive({ type: 'state', room: snapshot(999), you: { seat: 0, mark: 1 } });
  assert.equal(env.api.getState().room.version, 5);
  assert.equal(env.api.getState().room.game.moves, 1);
  assert.equal(env.api.getState().pending, false);
  await env.api.leave();
  assert.equal(clock.size, 0);
});

test('failed reconnect backs off and later restores the same seat', async (t) => {
  const clock = controlledClock(), env = environment(t, new Map(), { clock });
  const old = await create(env);
  old.close(1006);
  clock.advance(499); assert.equal(env.sockets.length, 1);
  clock.advance(1); assert.equal(env.sockets.length, 2);
  clock.advance(8000); await flush();
  assert.equal(env.api.getState().connection, 'reconnecting');
  clock.advance(999); assert.equal(env.sockets.length, 2);
  clock.advance(1); assert.equal(env.sockets.length, 3);
  const current = env.sockets.at(-1);
  current.open(); await flush();
  assert.equal(current.sent[0].type, 'resume');
  accept(current, current.sent[0], snapshot(8));
  await flush();
  assert.equal(env.api.getState().connection, 'connected');
  assert.equal(env.api.getState().room.version, 8);
  assert.equal(env.api.getState().session.token, 'private-seat-token');
});

test('replaced session stays stopped until the player explicitly retries', async (t) => {
  const clock = controlledClock(), env = environment(t, new Map(), { clock });
  const old = await create(env);
  old.close(4001);
  clock.advance(30000);
  env.window.dispatchEvent(new Event('online'));
  env.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(env.sockets.length, 1);
  assert.equal(env.api.getState().connection, 'replaced');
  const retry = env.api.retry(), socket = env.sockets.at(-1);
  socket.open(); await flush();
  assert.equal(socket.sent[0].type, 'resume');
  accept(socket, socket.sent[0], snapshot(9));
  await retry;
  assert.equal(env.api.getState().room.version, 9);
});

test('online endpoint rejects file and mixed content, and maps HTTPS to WSS', async (t) => {
  for (const options of [
    { url: 'file:///D:/games/index.html' },
    { url: 'https://play.example.test', endpoint: 'ws://play.example.test/ws/caro' },
    { endpoint: 'ftp://play.example.test/ws/caro' },
  ]) {
    const env = environment(t, new Map(), options);
    await assert.rejects(env.api.create('An'), /HTTP|WSS|hợp lệ/);
    assert.equal(env.sockets.length, 0);
    assert.equal(env.api.getState().pending, false);
  }
  const env = environment(t, new Map(), { url: 'https://play.example.test/#play/caro' });
  await create(env);
  assert.equal(env.sockets[0].url, 'wss://play.example.test/ws/caro');
});
