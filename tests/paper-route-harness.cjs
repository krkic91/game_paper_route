'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'test-results/paper-route-verification');
fs.mkdirSync(dir, { recursive: true });
const ledger = path.join(dir, 'runs.json');
const runs = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : [];
if (!Array.isArray(runs) || runs.some(r => !Number.isFinite(r.durationMs))) throw Error('Invalid ledger');
const jobs = {
  unit: { args: ['--test', 'tests/core.test.js', 'tests/race.test.cjs', 'tests/arcade.test.js', 'tests/lifecycle.test.js'], limit: 120000 },
  test: { shell: 'npm.cmd test', limit: 360000 },
  serial: { shell: 'npm.cmd test -- --test-concurrency=1 --test-timeout=250000', limit: 280000 },
  check: { shell: 'npm.cmd run check', limit: 180000 },
  browser: { args: ['tests/browser-paper-route.cjs'], limit: 300000 },
};
const [job, label] = process.argv.slice(2);
if (!jobs[job] || !/^[a-z0-9-]+$/.test(label || '') || runs.some(r => r.label === label)) throw Error('Use a valid job and a fresh evidence label');
const remaining = 1800000 - runs.reduce((s, r) => s + r.durationMs, 0) - 6000;
if (remaining <= 0) throw Error('Test budget exhausted');
const config = jobs[job], log = path.join(dir, `${label}.log`), fd = fs.openSync(log, 'wx'), start = Date.now();
let timedOut = false;
const child = spawn(config.shell ? process.env.ComSpec || 'cmd.exe' : process.execPath,
  config.shell ? ['/d', '/s', '/c', config.shell] : config.args,
  { cwd: root, windowsHide: true, env: { ...process.env, PAPER_EVIDENCE_LABEL: label }, stdio: ['ignore', fd, fd] });
const timeout = setTimeout(() => {
  timedOut = true;
  if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000, stdio: 'ignore' });
  else child.kill('SIGTERM');
}, Math.min(config.limit, remaining));
child.on('error', error => fs.writeSync(fd, `${error.stack}\n`));
child.on('close', (exitCode, signal) => {
  clearTimeout(timeout); fs.closeSync(fd);
  const run = { label, command: config.shell || `node ${config.args.join(' ')}`, startedAt: new Date(start).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - start, exitCode, signal, timedOut, log: path.relative(root, log) };
  runs.push(run); fs.writeFileSync(ledger, JSON.stringify(runs, null, 2) + '\n');
  console.log(JSON.stringify({ ...run, totalMs: runs.reduce((s, r) => s + r.durationMs, 0) }));
  console.log(fs.readFileSync(log, 'utf8').trim().split(/\r?\n/).slice(-12).join('\n'));
  process.exitCode = timedOut ? 124 : exitCode ?? 1;
});
