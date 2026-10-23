// version v1.0
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');

async function fixture(t, { production = false, args = [] } = {}) {
  const child = spawn(process.execPath, ['scripts/serve.js', ...args], {
    cwd: root,
    env: {
      ...process.env,
      PORT: '0', HOST: '127.0.0.1', ONLINE_ORIGINS: '',
      NODE_ENV: production ? 'production' : 'development',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  });
  let output = '';
  const origin = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${output}`)), 10000);
    function failed(error) { clearTimeout(timeout); reject(error); }
    child.once('error', failed);
    child.once('exit', (code) => failed(new Error(`Server exited ${code}: ${output}`)));
    child.stderr.on('data', (data) => { output += data.toString(); });
    child.stdout.on('data', (data) => {
      output += data.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    });
  });
  return {
    origin,
    request(requestPath, { method = 'GET', headers = {} } = {}) {
      return new Promise((resolve, reject) => {
        const req = http.request(origin + requestPath, { method, headers, agent: false }, (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
          res.on('error', reject);
        });
        req.setTimeout(5000, () => req.destroy(new Error('HTTP request timed out')));
        req.on('error', reject);
        req.end();
      });
    },
  };
}

test('development does not cache pages or assets, including conditional requests', async (t) => {
  const f = await fixture(t);
  for (const pathname of ['/', '/arcade.js', '/styles.css']) {
    const response = await f.request(pathname, { headers: { 'If-None-Match': '*' } });
    assert.equal(response.status, 200, pathname);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers.etag, undefined);
    assert.equal(Number(response.headers['content-length']), response.body.length);
    const head = await f.request(pathname, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.equal(head.headers['content-length'], response.headers['content-length']);
  }
});

test('production serves revalidating HTML, scripts, styles and filenames with spaces', async (t) => {
  const f = await fixture(t, { production: true });
  for (const [pathname, mime] of [
    ['/', 'text/html'], ['/arcade.js', 'text/javascript'], ['/styles.css', 'text/css'],
    ['/Neon%20Survivors.html', 'text/html'],
  ]) {
    const response = await f.request(pathname);
    assert.equal(response.status, 200, pathname);
    assert.equal(response.headers['cache-control'], 'no-cache');
    assert.match(response.headers.etag, /^"[a-f0-9]{64}"$/);
    assert.ok(response.headers['content-type'].startsWith(mime));
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(Number(response.headers['content-length']), response.body.length);
    const head = await f.request(pathname, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.etag, response.headers.etag);
    assert.equal(head.headers['content-length'], response.headers['content-length']);
    assert.equal(head.body.length, 0);
  }
});

test('matching strong, weak, list and wildcard validators return body-free 304 for GET and HEAD', async (t) => {
  const f = await fixture(t, { production: true });
  const first = await f.request('/');
  for (const method of ['GET', 'HEAD']) {
    for (const value of [first.headers.etag, `W/${first.headers.etag}`, `"old", W/${first.headers.etag}`, '*']) {
      const response = await f.request('/', { method, headers: { 'If-None-Match': value } });
      assert.equal(response.status, 304, `${method} ${value}`);
      assert.equal(response.headers.etag, first.headers.etag);
      assert.equal(response.headers['cache-control'], 'no-cache');
      assert.equal(response.headers['content-length'], undefined);
      assert.equal(response.body.length, 0);
    }
  }
  for (const value of ['"old"', 'W/"old"', first.headers.etag.slice(1, -1)]) {
    const response = await f.request('/', { headers: { 'If-None-Match': value } });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, first.body);
  }
});

test('content changes invalidate ETags even with identical file size and timestamp', async (t) => {
  const filename = `cache-fixture-${randomUUID()}.js`;
  const target = path.join(root, filename);
  t.after(() => fs.unlink(target));
  await fs.writeFile(target, 'window.cacheFixture = 1;');
  const originalStat = await fs.stat(target);
  const f = await fixture(t, { production: true });
  const first = await f.request('/' + filename);
  await fs.writeFile(target, 'window.cacheFixture = 2;');
  await fs.utimes(target, originalStat.atime, originalStat.mtime);
  const changed = await f.request('/' + filename, { headers: { 'If-None-Match': first.headers.etag } });
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.etag, first.headers.etag);
  assert.equal(changed.body.toString(), 'window.cacheFixture = 2;');
  assert.equal(changed.headers['content-length'], first.headers['content-length']);
  const cached = await f.request('/' + filename, { headers: { 'If-None-Match': changed.headers.etag } });
  assert.equal(cached.status, 304);
});

test('explicit production flag enables cache without changing the environment', async (t) => {
  const f = await fixture(t, { args: ['--production'] });
  const response = await f.request('/');
  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'no-cache');
  assert.ok(response.headers.etag);
});

test('errors remain uncached and access restrictions apply before conditional handling', async (t) => {
  const f = await fixture(t, { production: true });
  for (const [pathname, status] of [
    ['/server/caro-online.cjs', 403], ['/scripts/serve.js', 403], ['/docs/neon.md', 403],
    ['/tests/http-cache.test.cjs', 403], ['/package.json', 403], ['/%2eenv', 403],
    ['/%2f..%2fpackage.json', 403], ['/x:y', 403], ['/missing-cache-test.html', 404], ['/%ZZ', 400],
  ]) {
    for (const method of ['GET', 'HEAD']) {
      const response = await f.request(pathname, { method, headers: { 'If-None-Match': '*' } });
      assert.equal(response.status, status, `${method} ${pathname}`);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.headers.etag, undefined);
      if (method === 'HEAD') assert.equal(response.body.length, 0);
      else assert.equal(Number(response.headers['content-length']), response.body.length);
    }
  }
  const post = await f.request('/', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
  assert.equal(post.headers['cache-control'], 'no-store');
});

test('production cache leaves Caro WebSocket upgrade and room creation working', async (t) => {
  const f = await fixture(t, { production: true });
  const ws = new WebSocket(f.origin.replace('http:', 'ws:') + '/ws/caro', {
    origin: f.origin,
    handshakeTimeout: 5000,
  });
  t.after(() => ws.terminate());
  await once(ws, 'open');
  const reply = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Caro room creation timed out')), 5000);
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'session') { clearTimeout(timeout); resolve(message); }
      else if (message.type === 'error') { clearTimeout(timeout); reject(new Error(JSON.stringify(message))); }
    });
  });
  ws.send(JSON.stringify({ type: 'create', requestId: 'cache-room', name: 'Cache test' }));
  const session = await reply;
  assert.match(session.code, /^[A-Z2-9]{6}$/);
  assert.ok(session.token);
  ws.close();
  await once(ws, 'close');
  assert.equal((await f.request('/')).status, 200);
});
