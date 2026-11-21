// Serves the production build locally: files from dist/client (build files and the copied /media images), everything
// else through the built server's fetch handler. For local checks only (smoke test). Deployment is a later phase.
// It does not read .env: set the variables in the environment.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { pipeResponse } from './pipe-response.mjs';
const clientDir = join(fileURLToPath(new URL('../dist/', import.meta.url)), 'client');
const { default: app } = await import(new URL('../dist/server/server.js', import.meta.url).href);
const port = Number(process.env.PORT ?? 3001);
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };
/** A file inside dist/client for this URL path, or null. Refuses anything that would leave dist/client. */
function staticFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (e) {
    if (e instanceof URIError) return null; // a malformed %-sequence is not a file
    throw e;
  }
  const rel = normalize(decoded).replace(/^[/\\]+/, '');
  if (!rel || rel.startsWith('..') || rel.includes('\0')) return null;
  const file = join(clientDir, rel);
  if (!file.startsWith(clientDir)) return null;
  return statSync(file, { throwIfNoEntry: false })?.isFile() ? file : null;
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
  let response;
  try {
    response = await app.fetch(request);
  } catch {
    // Fixed answer: no error text, and the local server keeps running (same as the game's serve-build.mjs).
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Server error');
    return;
  }
  res.writeHead(response.status, Object.fromEntries(response.headers));
  pipeResponse(response.body, res);
}).listen(port, () => console.log(`build served on http://localhost:${port}/`));
