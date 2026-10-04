// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const WebSocket = require('ws');
const { attachCaroOnline } = require('../server/caro-online.cjs');

async function fixture(t, options = {}) {
  const server = http.createServer((req, res) => res.end('ok'));
  const online = attachCaroOnline(server, { maxRequests: 1000, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = origin.replace('http:', 'ws:') + '/ws/caro';
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.ws.terminate();
    await online.close();
    await new Promise((resolve) => server.close(resolve));
  });
  async function connect(extra = {}) {
    const ws = new WebSocket(url, { origin, ...extra });
    const client = { ws, messages: [], current: null, session: null, serial: 0 };
    ws.on('message', (buffer) => {
      const message = JSON.parse(buffer.toString());
      client.messages.push(message);
      if (message.type === 'state') client.current = message;
      if (message.type === 'session') client.session = message;
    });
    client.wait = (predicate, after = 0) => {
      const find = () => client.messages.slice(after).find(predicate);
      const found = find();
      if (found) return Promise.resolve(found);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.off('message', check);
          reject(new Error(`Timed out waiting for message; got ${JSON.stringify(client.messages.slice(after))}`));
        }, 2000);
        function check() {
          const message = find();
          if (!message) return;
          clearTimeout(timeout);
          ws.off('message', check);
          resolve(message);
        }
        ws.on('message', check);
      });
    };
    client.request = async (type, fields = {}, expectedError = null) => {
      const requestId = fields.requestId || `r${++client.serial}-${clients.indexOf(client)}`;
      const after = client.messages.length;
      ws.send(JSON.stringify({ ...fields, type, requestId }));
      const reply = await client.wait((m) => m.requestId === requestId && ['ack', 'error'].includes(m.type), after);
      if (expectedError) assert.equal(reply.code, expectedError);
      else assert.equal(reply.type, 'ack', JSON.stringify(reply));
      return after;
    };
    clients.push(client);
    await once(ws, 'open');
    return client;
  }
  async function pair() {
    const a = await connect(), b = await connect();
    await a.request('create', { name: 'An' });
    await a.wait((m) => m.type === 'state');
    await b.request('join', { code: a.session.code.toLowerCase(), name: 'Bình' });
    await Promise.all([a, b].map((c) => c.wait((m) => m.type === 'state' && m.room.players.every(Boolean))));
    return [a, b];
  }
  async function start(a, b) {
    await a.request('ready', { roundId: a.current.room.roundId });
    await b.request('ready', { roundId: b.current.room.roundId });
    await Promise.all([a, b].map((c) => c.wait((m) => m.type === 'state' && m.room.status === 'playing')));
  }
  async function move(player, other, index, fields = {}) {
    const before = player.current.room;
    const marker = other.messages.length;
    const after = await player.request('move', { index, roundId: before.roundId, version: before.version, ...fields });
    const mine = await player.wait((m) => m.type === 'state' && m.room.game.moves === before.game.moves + 1, after);
    await other.wait((m) => m.type === 'state' && m.room.version === mine.room.version, marker);
    return mine;
  }
  return { server, online, url, origin, connect, pair, start, move };
}

test('rooms require two ready players, reject extra seats and never expose tokens', async (t) => {
  const f = await fixture(t);
  const [a, b] = await f.pair();
  assert.match(a.session.code, /^[A-Z2-9]{6}$/);
  assert.ok(a.session.token.length >= 32);
  assert.notEqual(a.session.token, b.session.token);
  assert.deepEqual(a.current.you, { seat: 0, mark: 1 });
  assert.deepEqual(b.current.you, { seat: 1, mark: 2 });
  const c = await f.connect();
  await c.request('join', { code: a.session.code, name: 'Chi' }, 'ROOM_FULL');
  await a.request('move', { index: 0, ...a.current.room }, 'NOT_PLAYING');
  const after = await a.request('ready', { roundId: a.current.room.roundId });
  const ready = await a.wait((m) => m.type === 'state' && m.room.players[0].ready, after);
  assert.equal(ready.room.status, 'waiting');
  await f.start(a, b);
  for (const c of [a, b]) {
    for (const message of c.messages.filter((m) => m.type === 'state')) {
      assert.equal(JSON.stringify(message).includes('token'), false);
      assert.equal(JSON.stringify(message).includes(a.session.token), false);
      assert.equal(JSON.stringify(message).includes(b.session.token), false);
    }
  }
});

test('authoritative moves reject wrong turn, occupied/invalid cells, stale versions and duplicates', async (t) => {
  const f = await fixture(t), [a, b] = await f.pair();
  await f.start(a, b);
  const initial = a.current.room;
  await b.request('move', { index: 0, roundId: initial.roundId, version: initial.version }, 'NOT_YOUR_TURN');
  await a.request('move', { index: 225, roundId: initial.roundId, version: initial.version }, 'INVALID_MOVE');
  await a.request('move', { index: '1', roundId: initial.roundId, version: initial.version }, 'INVALID_MOVE');
  await f.move(a, b, 0, { requestId: 'one-move' });
  const after = await a.request('move', { index: 0, roundId: initial.roundId, version: initial.version, requestId: 'one-move' });
  const replay = await a.wait((m) => m.type === 'state', after);
  assert.equal(replay.room.game.moves, 1);
  assert.equal(replay.room.version, b.current.room.version);
  await b.request('move', { index: 1, roundId: initial.roundId, version: initial.version }, 'STALE_STATE');
  await b.request('move', { index: 0, roundId: initial.roundId, version: b.current.room.version }, 'INVALID_MOVE');
  await f.move(b, a, 1);
  assert.equal(a.current.room.game.moves, 2);
  assert.deepEqual(a.current.room.game, b.current.room.game);
});

test('winning line is authoritative; rematch needs both players, swaps marks and invalidates old rounds', async (t) => {
  const f = await fixture(t), [a, b] = await f.pair();
  await f.start(a, b);
  for (let i = 0; i < 4; i++) { await f.move(a, b, i); await f.move(b, a, 15 + i); }
  await f.move(a, b, 4);
  const oldRound = a.current.room.roundId;
  assert.deepEqual(a.current.room.outcome, { reason: 'line', winner: 1 });
  assert.equal(a.current.room.game.line.length, 5);
  await a.request('rematch', { roundId: oldRound });
  await b.wait((m) => m.type === 'state' && m.room.players[0].rematch);
  assert.equal(a.current.room.status, 'finished');
  await b.request('rematch', { roundId: oldRound });
  await Promise.all([a, b].map((c) => c.wait((m) => m.type === 'state' && m.room.roundId !== oldRound)));
  assert.equal(a.current.you.mark, 2);
  assert.equal(b.current.you.mark, 1);
  assert.equal(a.current.room.game.moves, 0);
  assert.equal(a.current.room.status, 'playing');
  await b.request('move', { index: 80, roundId: oldRound, version: b.current.room.version }, 'STALE_ROUND');
  await f.move(b, a, 80);
  assert.equal(a.current.room.game.board[80], 1);
});

test('disconnect pauses moves; resume preserves seat and request dedup; replacing socket stays connected', async (t) => {
  const f = await fixture(t), [a, b] = await f.pair();
  await f.start(a, b);
  const original = a.current.room;
  await f.move(a, b, 70, { requestId: 'persisted-move' });
  a.ws.close();
  await b.wait((m) => m.type === 'state' && !m.room.players[0].connected);
  await b.request('move', { index: 71, roundId: original.roundId, version: b.current.room.version }, 'OPPONENT_OFFLINE');
  const bad = await f.connect();
  await bad.request('resume', { code: a.session.code, token: b.session.token + 'x' }, 'SESSION_EXPIRED');
  const replacement = await f.connect();
  await replacement.request('resume', { code: a.session.code, token: a.session.token });
  await replacement.wait((m) => m.type === 'state');
  await b.wait((m) => m.type === 'state' && m.room.players[0].connected && m.room.version === replacement.current.room.version);
  const after = await replacement.request('move', { index: 70, roundId: original.roundId, version: original.version, requestId: 'persisted-move' });
  assert.equal((await replacement.wait((m) => m.type === 'state', after)).room.game.moves, 1);
  const newest = await f.connect();
  const oldClosed = once(replacement.ws, 'close');
  await newest.request('resume', { code: a.session.code, token: a.session.token });
  assert.equal((await oldClosed)[0], 4001);
  await newest.wait((m) => m.type === 'state');
  await b.wait((m) => m.type === 'state' && m.room.version === newest.current.room.version);
  await delay(20);
  assert.equal(b.current.room.players[0].connected, true);
  await f.move(b, newest, 71);
});

test('resume checks elapsed grace even before sweep; opponent wins timeout and expired token cannot reclaim seat', async (t) => {
  const f = await fixture(t, { graceMs: 40, sweepMs: 60000 }), [a, b] = await f.pair();
  await f.start(a, b);
  a.ws.close();
  await b.wait((m) => m.type === 'state' && !m.room.players[0].connected);
  await delay(65);
  const replacement = await f.connect();
  await replacement.request('resume', { code: a.session.code, token: a.session.token }, 'SESSION_EXPIRED');
  const finished = await b.wait((m) => m.type === 'state' && m.room.status === 'finished');
  assert.deepEqual(finished.room.outcome, { reason: 'timeout', winner: 2 });
  assert.equal(finished.room.players[0].left, true);
});

test('two disconnected players produce a draw; second seat can reconnect within its own grace', async (t) => {
  const f = await fixture(t, { graceMs: 180, sweepMs: 60000 }), [a, b] = await f.pair();
  await f.start(a, b);
  a.ws.close();
  await b.wait((m) => m.type === 'state' && !m.room.players[0].connected);
  await delay(120);
  b.ws.close();
  await once(b.ws, 'close');
  await delay(90);
  const resumed = await f.connect();
  await resumed.request('resume', { code: b.session.code, token: b.session.token });
  const snapshot = await resumed.wait((m) => m.type === 'state');
  assert.deepEqual(snapshot.room.outcome, { reason: 'timeout', winner: 0 });
});

test('explicit leave forfeits, invalidates token, and waiting seats can be filled again', async (t) => {
  const f = await fixture(t), [a, b] = await f.pair();
  const former = { ...a.session };
  await a.request('leave');
  await a.wait((m) => m.type === 'left');
  await b.wait((m) => m.type === 'state' && m.room.players[0] === null);
  const c = await f.connect();
  await c.request('resume', former, 'SESSION_EXPIRED');
  await c.request('join', { code: former.code, name: 'Chi' });
  await c.wait((m) => m.type === 'state');
  await b.wait((m) => m.type === 'state' && m.room.players[0]?.name === 'Chi');
  await f.start(c, b);
  await c.request('leave');
  const finish = await b.wait((m) => m.type === 'state' && m.room.status === 'finished');
  assert.deepEqual(finish.room.outcome, { reason: 'leave', winner: 2 });
  assert.equal(finish.room.players[0].left, true);
  await b.request('rematch', { roundId: finish.room.roundId }, 'OPPONENT_OFFLINE');
});

test('origins are checked, explicit cross-origin allowlist works, and malformed messages do not crash server', async (t) => {
  const f = await fixture(t, { allowedOrigins: ['https://play.example.test'] });
  for (const origin of [undefined, 'https://evil.example.test']) {
    const ws = new WebSocket(f.url, origin ? { origin } : {});
    ws.on('error', () => {});
    const response = await new Promise((resolve) => ws.once('unexpected-response', (request, res) => { resolve(res.statusCode); request.destroy(); }));
    assert.equal(response, 403);
  }
  const client = await f.connect({ origin: 'https://play.example.test' });
  client.ws.send('{bad json');
  await client.wait((m) => m.code === 'BAD_REQUEST');
  await client.request('create', { name: '<b>Safe text</b>' });
  await client.wait((m) => m.type === 'state');
  assert.equal(client.current.room.players[0].name, '<b>Safe text</b>');
});

test('room limit, rate limit, payload limit and idle expiry bound resource usage', async (t) => {
  const f = await fixture(t, { maxRooms: 1, maxRequests: 3, maxPayload: 256, idleMs: 100, sweepMs: 10 });
  const a = await f.connect(), b = await f.connect();
  await a.request('create', { name: 'An' });
  await b.request('create', { name: 'Bình' }, 'SERVER_BUSY');
  const closed = once(b.ws, 'close');
  b.ws.send('bad'); b.ws.send('bad'); b.ws.send('bad');
  assert.equal((await closed)[0], 1008);
  const large = await f.connect();
  const largeClosed = once(large.ws, 'close');
  large.ws.send('x'.repeat(257));
  assert.equal((await largeClosed)[0], 1009);
  const expired = await a.wait((m) => m.code === 'ROOM_EXPIRED');
  assert.equal(expired.type, 'error');
  const replacement = await f.connect();
  await replacement.request('create', { name: 'An' });
});
