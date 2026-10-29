'use strict';
// Run the existing online flow with Edge + Chrome and an owned, temporary backend.
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const { startServer, root, evidence, edge, chrome } = require('./helpers/caro-browser-server.cjs');
(async () => {
  const label = process.env.CARO_EVIDENCE_LABEL || 'two-browsers';
  const server = await startServer(label);
  try {
    const child = spawn(process.execPath, ['tests/browser-online.cjs'], { cwd: root, windowsHide: true, stdio: 'inherit', env: {
      ...process.env, TEST_URL: server.base, ONLINE_BROWSER: 'chromium',
      BROWSER_PATH: edge, PEER_BROWSER_PATH: chrome, ONLINE_TEST_3D: '1',
      ONLINE_WIDTH: '390', ONLINE_HEIGHT: '844',
      SCREENSHOTS: path.join(evidence, label), CARO_REPORT: path.join(evidence, `${label}-browsers.json`),
    } });
    const [code] = await once(child, 'exit');
    if (code !== 0) throw new Error(`Two-browser check exited ${code}`);
  } finally { await server.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
