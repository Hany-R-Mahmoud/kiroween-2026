// Property 14: the local server survives stream errors (Requirement 9.2).
import fc from 'fast-check';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error plain JS script without type declarations
import { isExpectedStreamError, pipeResponse } from '../scripts/pipe-response.mjs';

type Plan = { chunks: number; ending: 'finish' | 'lifetime' | 'other-error'; clientLeaves: boolean };
const enc = new TextEncoder();
const plans = new Map<string, Plan>();
const unexpected: string[] = [];
const uncaught: unknown[] = [];
const onUncaught = (e: unknown) => uncaught.push(e);
let server: Server;
let port = 0;

const bodyFor = (p: Plan) =>
  new ReadableStream<Uint8Array>({
    async start(c) {
      for (let i = 0; i < p.chunks; i++) c.enqueue(enc.encode(`<p>${i}</p>`));
      await new Promise((r) => setTimeout(r, 5));
      if (p.ending === 'finish') c.close();
      else c.error(new Error(p.ending === 'lifetime' ? 'Stream lifetime exceeded' : 'boom'));
    },
  });

/** Sends one request; resolves when the response ends, errors, or the client leaves after the first byte. */
const get = (id: string, leave: boolean) =>
  new Promise<number>((resolve) => {
    const req = request({ port, path: `/${id}` }, (res) => {
      res.once('data', () => {
        if (leave) req.destroy();
      });
      res.on('end', () => resolve(res.statusCode ?? 0));
      res.on('error', () => resolve(res.statusCode ?? 0));
      res.on('close', () => resolve(res.statusCode ?? 0));
    });
    req.on('error', () => resolve(0));
    req.end();
  });

beforeAll(async () => {
  process.on('uncaughtException', onUncaught);
  server = createServer((req, res) => {
    const p = plans.get((req.url ?? '/').slice(1));
    res.writeHead(200, { 'content-type': 'text/html' });
    if (!p) return void pipeResponse(null, res);
    pipeResponse(bodyFor(p), res, (err: Error) => unexpected.push(err.message));
  });
  await new Promise<void>((r) => server.listen(0, 'localhost', () => r()));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => {
  process.off('uncaughtException', onUncaught);
  server.close();
});

describe('pipeResponse', () => {
  it('keeps the server up whatever the stream or the client does', async () => {
    let n = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          chunks: fc.integer({ min: 0, max: 5 }),
          ending: fc.constantFrom('finish', 'lifetime', 'other-error'),
          clientLeaves: fc.boolean(),
        }),
        async (p: Plan) => {
          const id = `r${n++}`;
          plans.set(id, p);
          unexpected.length = 0;
          await get(id, p.clientLeaves);
          await new Promise((r) => setTimeout(r, 20));
          // the server still answers a plain request afterwards
          expect(await get('ping', false)).toBe(200);
          expect(uncaught).toEqual([]);
          // only a real, unexpected error is reported; a lifetime end or a leaving client is quiet
          if (p.ending === 'finish' || p.ending === 'lifetime') expect(unexpected).toEqual([]);
          // a real error while the client is still reading is reported (message only), not swallowed
          if (p.ending === 'other-error' && !p.clientLeaves) expect(unexpected).toEqual(['boom']);
        },
      ),
      { numRuns: 40 },
    );
  });

  it('treats only close, reset and lifetime errors as expected', () => {
    expect(isExpectedStreamError(Object.assign(new Error('x'), { code: 'ERR_STREAM_PREMATURE_CLOSE' }))).toBe(true);
    expect(isExpectedStreamError(Object.assign(new Error('x'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isExpectedStreamError(new Error('Stream lifetime exceeded'))).toBe(true);
    expect(isExpectedStreamError(new Error('boom'))).toBe(false);
    expect(isExpectedStreamError(undefined)).toBe(false);
  });
});
