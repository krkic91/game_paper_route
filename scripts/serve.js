// version v1.0
/* Static website and authoritative Caro WebSocket server. Run with npm start. */
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { attachCaroOnline } = require('../server/caro-online.cjs');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const port = Number(process.env.PORT || args.find((arg) => !arg.startsWith('--')) || 4173);
const host = process.env.HOST || '127.0.0.1';
const production = process.env.NODE_ENV === 'production' || args.includes('--production');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
};

function sendError(req, res, status, message, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(message),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(req.method === 'HEAD' ? undefined : message);
}

// GET/HEAD use weak comparison: a browser may return W/"tag" even when our
// content hash was sent as a strong validator. Match complete quoted tags only.
function matchesETag(header, etag) {
  return typeof header === 'string' && (header.trim() === '*' ||
    (header.match(/(?:W\/)?"[^"\r\n]*"/g) || []).some((tag) => tag.replace(/^W\//, '') === etag));
}

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    sendError(req, res, 405, 'Method not allowed.', { Allow: 'GET, HEAD' });
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const parts = pathname.split(/[\\/]/).filter(Boolean);
    if (parts.some((part) => part.startsWith('.')) ||
        ['server', 'scripts', 'tests', 'node_modules', 'test-results', 'docs'].includes((parts[0] || '').toLowerCase()) ||
        ['package.json', 'package-lock.json'].includes(pathname.slice(1).toLowerCase()) ||
        pathname.includes(':')) {
      sendError(req, res, 403, 'Forbidden');
      return;
    }
    let filename = path.resolve(root, `.${pathname}`);
    if (filename !== root && !filename.startsWith(root + path.sep)) {
      sendError(req, res, 403, 'Forbidden');
      return;
    }
    if ((await fs.stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    const data = await fs.readFile(filename);
    const headers = {
      'Content-Type': types[path.extname(filename).toLowerCase()] || 'application/octet-stream',
      'Content-Length': data.length,
      // File names are not content-versioned. Revalidate every use so deploys
      // cannot leave browsers running an old game against new library code.
      'Cache-Control': production ? 'no-cache' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (production) {
      headers.ETag = `"${createHash('sha256').update(data).digest('hex')}"`;
      if (matchesETag(req.headers['if-none-match'], headers.ETag)) {
        delete headers['Content-Length'];
        res.writeHead(304, headers);
        res.end();
        return;
      }
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const status =
      error.code === 'ENOENT' || error.code === 'ENOTDIR'
        ? 404
        : error instanceof URIError
          ? 400
          : 500;
    sendError(req, res, status, status === 404 ? 'Không tìm thấy trang.' : 'Không thể xử lý yêu cầu.');
  }
});
const online = attachCaroOnline(server);
server.on('error', (error) => {
  console.error(`Không thể mở cổng ${port}: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`Trạm Chơi đang chạy tại http://${host}:${server.address().port}`);
  console.log(production ? 'Cache: production (ETag, revalidate).' : 'Cache: development (no-store).');
  console.log('Nhấn Ctrl+C để dừng.');
});
async function shutdown() {
  await online.close();
  server.close();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
