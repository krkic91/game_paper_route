'use strict';
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const root = path.resolve(__dirname, '../..');
const evidence = path.join(root, 'test-results', 'caro-online-verification');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const chrome = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

async function startServer(label) {
  fs.mkdirSync(evidence, { recursive: true });
  const child = spawn(process.execPath, ['scripts/serve.js'], {
    cwd: root, env: { ...process.env, HOST: '127.0.0.1', PORT: '0' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exit = once(child, 'exit');
  let output = '';
  const log = path.join(evidence, `${label}-server.log`);
  const save = bytes => { output += bytes.toString(); fs.appendFileSync(log, bytes); };
  child.stdout.on('data', save);
  child.stderr.on('data', save);
  let base;
  try {
    base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => done(new Error('Caro server startup timed out')), 15000);
      const inspect = () => {
        const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) done(null, match[0]);
      };
      const ended = () => done(new Error(`Caro server exited during startup: ${output}`));
      const done = (error, value) => {
        clearTimeout(timer); child.stdout.off('data', inspect); child.off('exit', ended); child.off('error', done);
        error ? reject(error) : resolve(value);
      };
      child.stdout.on('data', inspect); child.once('exit', ended); child.once('error', done); inspect();
    });
  } catch (error) { child.kill(); throw error; }
  return { base, pid: child.pid, async stop() {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await exit;
    const closed = await new Promise(resolve => {
      const socket = net.connect({ host: '127.0.0.1', port: Number(new URL(base).port) });
      socket.once('error', () => { socket.destroy(); resolve(true); });
      socket.once('connect', () => { socket.destroy(); resolve(false); });
      socket.setTimeout(2000, () => { socket.destroy(); resolve(false); });
    });
    fs.writeFileSync(path.join(evidence, `${label}-cleanup.json`), JSON.stringify({ base, pid: child.pid, serverExited: true, portClosed: closed }, null, 2) + '\n');
    if (!closed) throw new Error('Owned Caro server port is still listening');
  } };
}
module.exports = { startServer, root, evidence, edge, chrome };
