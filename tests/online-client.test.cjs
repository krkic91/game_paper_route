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

function environment(t, stored = new Map()) {
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
  document.querySelector = () => null;
  const navigator = { onLine: true };
  Object.assign(window, {
    sessionStorage: storage, localStorage: storage, crypto: webcrypto,
    location: new URL('http://localhost:4173/#play/caro?room=ABC234'),
  });
  vm.runInNewContext(source, {
    window, document, navigator, WebSocket: Socket, URL, URLSearchParams,
    setTimeout, clearTimeout, console,
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
