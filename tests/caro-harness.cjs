'use strict';

// Sequential, bounded checks for the approved Caro task. Evidence is never reset.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'test-results', 'caro-online-verification');
fs.mkdirSync(dir, { recursive: true });
const ledger = path.join(dir, 'runs.json');
const runs = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : [];
const jobs = {
  test: { command: 'npm test', shell: 'npm.cmd test', limit: 360000 },
  check: { command: 'npm run check', shell: 'npm.cmd run check', limit: 180000 },
  online: { args: ['--test', 'tests/online-server.test.cjs', 'tests/online-client.test.cjs'], limit: 120000 },
  browser: { args: ['tests/browser-online-pair.cjs'], limit: 240000 },
};
const [job, label = job] = process.argv.slice(2);
if (!jobs[job] || !/^[a-z0-9-]+$/.test(label)) throw new Error('Expected test|check|online|browser and evidence label');
if (runs.some(run => run.label === label)) throw new Error('Use a new label; preserve existing evidence');
const remaining = 1800000 - runs.reduce((sum, run) => sum + run.durationMs, 0);
if (remaining <= 0) throw new Error('Approved 30-minute budget exhausted');
const config = jobs[job];
const logFile = path.join(dir, `${label}.log`);
const fd = fs.openSync(logFile, 'wx');
const started = Date.now();
let timedOut = false;
const child = config.shell
  ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', config.shell], { cwd: root, windowsHide: true, stdio: ['ignore', fd, fd] })
  : spawn(process.execPath, config.args, { cwd: root, windowsHide: true, env: { ...process.env, CARO_EVIDENCE_LABEL: label }, stdio: ['ignore', fd, fd] });
const timer = setTimeout(() => {
  timedOut = true;
  if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000, stdio: 'ignore' });
  else child.kill('SIGTERM');
}, Math.min(remaining, config.limit));
child.on('error', error => fs.writeSync(fd, `${error.stack}\n`));
child.on('close', (exitCode, signal) => {
  clearTimeout(timer);
  fs.closeSync(fd);
  const run = { label, command: config.command || `node ${config.args.join(' ')}`, startedAt: new Date(started).toISOString(),
    endedAt: new Date().toISOString(), durationMs: Date.now() - started, exitCode, signal, timedOut, log: path.relative(root, logFile) };
  runs.push(run);
  fs.writeFileSync(ledger, JSON.stringify(runs, null, 2) + '\n');
  console.log(JSON.stringify({ ...run, totalTestMs: runs.reduce((sum, item) => sum + item.durationMs, 0) }, null, 2));
  console.log(fs.readFileSync(logFile, 'utf8').trim().split(/\r?\n/).slice(-22).join('\n'));
  process.exitCode = timedOut ? 124 : exitCode ?? 1;
});
