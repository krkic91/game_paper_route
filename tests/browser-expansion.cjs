// version v1.0
'use strict';
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const games = ['battleship', 'minesweeper', 'tower', 'onet', 'blocks', 'reversi', 'jungle'];
const selected = (process.env.EXPANSION_GAMES || games.join(',')).split(',');
try {
  execFileSync(process.execPath, [join(__dirname, 'browser-expansion-library.cjs')], { stdio: 'inherit' });
  for (const id of selected) {
    if (!games.includes(id)) throw new Error(`Unknown expansion game: ${id}`);
    execFileSync(process.execPath, [join(__dirname, `browser-${id}.cjs`)], {
      stdio: 'inherit',
      env: { ...process.env, ...(process.env.SCREENSHOTS ? { SCREENSHOTS: join(process.env.SCREENSHOTS, id) } : {}) },
    });
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
