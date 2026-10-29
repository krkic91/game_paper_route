'use strict';

// Bounded runner for the approved 2048 verification. Does not start a dev server.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'test-results', '2048');
fs.mkdirSync(dir, { recursive: true });
const ledger = path.join(dir, 'runs.json');
const runs = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : [];
const jobs = {
  test: ['npm test', 'npm.cmd test'],
  check: ['npm run check', 'npm.cmd run check'],
  unit: ['node --test --test-name-pattern=2048 tests/arcade.test.js', null,
    ['--test', '--test-name-pattern=2048', 'tests/arcade.test.js']],
  browser: ['node tests/browser-2048.cjs', null, ['tests/browser-2048.cjs']],
};
const [job, label = job] = process.argv.slice(2);
if (!jobs[job] || !/^[a-z0-9-]+$/.test(label)) throw new Error('Expected test|check|unit|browser and a simple evidence label');
const remaining = 30 * 60 * 1000 - runs.reduce((sum, run) => sum + run.durationMs, 0);
if (remaining <= 0) throw new Error('Approved test budget exhausted');
const timeout = Math.min(remaining, job === 'browser' ? 240000 : 180000);
const [command, shellCommand, args] = jobs[job];
const logFile = path.join(dir, `${label}.log`);
const fd = fs.openSync(logFile, 'w');
const start = Date.now();
let timedOut = false;
const child = shellCommand
  ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', shellCommand], { cwd: root, windowsHide: true, stdio: ['ignore', fd, fd] })
  : spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: ['ignore', fd, fd] });
const timer = setTimeout(() => {
  timedOut = true;
  if (process.platform === 'win32') {
    spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } else child.kill('SIGTERM');
}, timeout);
child.on('error', error => fs.writeSync(fd, `${error.stack}\n`));
child.on('close', (code, signal) => {
  clearTimeout(timer);
  fs.closeSync(fd);
  const run = { label, command, startedAt: new Date(start).toISOString(), endedAt: new Date().toISOString(),
    durationMs: Date.now() - start, exitCode: code, signal, timedOut, log: path.relative(root, logFile) };
  runs.push(run);
  fs.writeFileSync(ledger, JSON.stringify(runs, null, 2) + '\n');
  console.log(JSON.stringify({ ...run, totalTestMs: runs.reduce((sum, item) => sum + item.durationMs, 0) }, null, 2));
  console.log(fs.readFileSync(logFile, 'utf8').trim().split(/\r?\n/).slice(-18).join('\n'));
  process.exitCode = timedOut ? 124 : code ?? 1;
});
