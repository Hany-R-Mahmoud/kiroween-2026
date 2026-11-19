// Serves the production build locally: files from dist/client under /game/, everything else through the built
// server's fetch handler. For local checks only (smoke test, base-path proof). Deployment is set up in a later phase.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const clientDir = join(root, 'client');
const { default: app } = await import(new URL('../dist/server/server.js', import.meta.url).href);
const port = Number(process.env.PORT ?? 3000);
const BASE = '/game/';
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

/** A file inside dist/client for this URL path, or null. Refuses anything that would leave dist/client. */
function staticFile(pathname) {
  if (!pathname.startsWith(BASE)) return null;
  const rel = normalize(decodeURIComponent(pathname.slice(BASE.length)));
  if (rel.startsWith('..') || rel.includes('\0')) return null;
  const file = join(clientDir, rel);
  if (!file.startsWith(clientDir)) return null;
  try {
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const file = staticFile(url.pathname);
  if (file) {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
    return;
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const request = new Request(url, {
    method: req.method,
    headers: Object.entries(req.headers).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v === undefined ? [] : [[k, v]])),
    ...(hasBody ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
  });
  const response = await app.fetch(request);
  // keep every Set-Cookie separate: joining them corrupts cookie dates
  const headers = {};
  for (const [k, v] of response.headers) if (k !== 'set-cookie') headers[k] = v;
  const cookies = response.headers.getSetCookie();
  if (cookies.length) headers['set-cookie'] = cookies;
  res.writeHead(response.status, headers);
  if (response.body) Readable.fromWeb(response.body).pipe(res);
  else res.end();
}).listen(port, () => console.log(`build served on http://localhost:${port}${BASE}`));
