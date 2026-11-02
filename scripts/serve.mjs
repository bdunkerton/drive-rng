// A tiny static file server for local play. No dependencies.
// Usage: npm start            (port 8080, or the next free one)
//        PORT=3000 npm start
// Files are served with caching off, so a browser reload always picks up edits.

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
});

let port = Number(process.env.PORT) || 8080;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !process.env.PORT && port < 8100) {
    port++;
    server.listen(port);
  } else {
    console.error(err.message);
    process.exit(1);
  }
});
server.on('listening', () => {
  console.log(`\n  Drive RNG is running at  http://localhost:${port}\n`);
  console.log('  In VS Code: Ctrl+Shift+P -> "Simple Browser: Show" -> paste that address.');
  console.log('  Stop with Ctrl+C.\n');
});
server.listen(port);
