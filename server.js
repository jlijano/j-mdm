import http from 'node:http';
import { createRemoteAuth } from './remote-auth.js';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const dist = fileURLToPath(new URL('./dist/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function reply(res, status, text, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(text);
}

export function createServer(options = {}) {
  const auth = createRemoteAuth(options);
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    let pathname;
    try {
      pathname = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      reply(res, 400, 'Bad request\n');
      return;
    }
    if (pathname === '/health') {
      reply(res, 200, JSON.stringify({ status: 'ok' }), {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      return;
    }
    if (await auth.handle(req, res, pathname)) return;
    if (!['GET', 'HEAD'].includes(req.method)) {
      reply(res, 405, 'Method not allowed\n', { Allow: 'GET, HEAD' }); return;
    }
    // Reject hidden files, traversal, Windows separators and alternate streams.
    if (!pathname.startsWith('/') || /[\\\u0000:]/.test(pathname) ||
        pathname.split('/').some(part => part.startsWith('.'))) {
      reply(res, 404, 'Not found\n');
      return;
    }
    try {
      const root = await realpath(dist);
      const filename = await realpath(path.join(root, ['/dashboard', '/index.html', '/assets/scanner'].includes(pathname) ? 'index.html' : pathname === '/login' ? 'login.html' : pathname === '/account-security' ? 'account-security.html' : pathname));
      const relative = path.relative(root, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        reply(res, 404, 'Not found\n');
        return;
      }
      const info = await stat(filename);
      if (!info.isFile()) {
        reply(res, 404, 'Not found\n');
        return;
      }
      if (await auth.deny(req, res, pathname)) return;
      res.writeHead(200, {
        'Content-Type': types[path.extname(filename).toLowerCase()] || 'text/plain; charset=utf-8',
        'Content-Length': info.size
      });
      if (req.method === 'HEAD') res.end();
      else await pipeline(createReadStream(filename), res);
    } catch (error) {
      if (res.headersSent) res.destroy();
      else reply(res, ['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code) ? 404 : 500,
        ['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code) ? 'Not found\n' : 'Server error\n');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = createServer();
  server.listen(port, '0.0.0.0', () => console.log(`Scanner server listening on 0.0.0.0:${port}`));
  server.on('error', error => { console.error(error); process.exitCode = 1; });
  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('Shutting down scanner server');
    const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000);
    deadline.unref();
    server.close(() => { clearTimeout(deadline); process.exit(0); });
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
