'use strict';
const fs = require('node:fs'), path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), dir = path.join(root, 'test-results/monopoly-verification');
fs.mkdirSync(dir, { recursive: true });
const ledger = path.join(dir, 'runs.json');
const runs = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : [];
if (!Array.isArray(runs) || runs.some(r => !Number.isFinite(r.durationMs) || r.durationMs < 0)) throw Error('Invalid ledger');
const jobs = {
  unit: { args: ['--test', 'tests/monopoly.test.cjs'], limit: 90000 },
  online: { args: ['--test', '--test-name-pattern=room limit, rate limit', 'tests/online-server.test.cjs'], limit: 45000 },
  browser: { args: ['tests/browser-monopoly.cjs'], limit: 240000 },
  serial: { shell: 'npm.cmd test -- --test-concurrency=1 --test-timeout=250000', limit: 300000 },
  check: { shell: 'npm.cmd run check', limit: 180000 },
};
const [job, label] = process.argv.slice(2);
if (!jobs[job] || !/^[a-z0-9-]+$/.test(label || '') || runs.some(r => r.label === label)) throw Error('Use a valid job and a fresh label');
const remaining = 1800000 - runs.reduce((s, r) => s + r.durationMs, 0) - 6000;
if (remaining <= 0) throw Error('Test budget exhausted');
const config = jobs[job], log = path.join(dir, `${label}.log`), fd = fs.openSync(log, 'wx'), start = Date.now();
let timedOut = false;
const child = spawn(config.shell ? process.env.ComSpec || 'cmd.exe' : process.execPath,
  config.shell ? ['/d', '/s', '/c', config.shell] : config.args,
  { cwd: root, windowsHide: true, env: { ...process.env, MP_EVIDENCE_LABEL: label }, stdio: ['ignore', fd, fd] });
const timeout = setTimeout(() => {
  timedOut = true;
  if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000, stdio: 'ignore' });
  else child.kill('SIGTERM');
}, Math.min(config.limit, remaining));
child.on('error', error => fs.writeSync(fd, `${error.stack}\n`));
child.on('close', (exitCode, signal) => {
  clearTimeout(timeout); fs.closeSync(fd);
  const run = { label, command: config.shell || `node ${config.args.join(' ')}`, startedAt: new Date(start).toISOString(), durationMs: Date.now() - start, exitCode, signal, timedOut };
  runs.push(run); fs.writeFileSync(ledger, JSON.stringify(runs, null, 2) + '\n');
  console.log(JSON.stringify({ ...run, totalMs: runs.reduce((s, r) => s + r.durationMs, 0) }));
  console.log(fs.readFileSync(log, 'utf8').trim().split(/\r?\n/).slice(-12).join('\n'));
  process.exitCode = timedOut ? 124 : exitCode ?? 1;
});
