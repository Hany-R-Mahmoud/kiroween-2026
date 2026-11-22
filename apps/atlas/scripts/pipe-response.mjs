// Copies a fetch Response body into a Node response without letting a stream error end the process.
// Start ends an SSR stream that has not finished after its lifetime (2 x 60 s) with "Stream lifetime exceeded"; a
// client that stops reading, or leaves early, causes that or a premature close. `pipe` forwards none of these errors,
// so the process used to exit on an unhandled 'error' event. `pipeline` handles them and destroys both sides.
import { Readable, pipeline } from 'node:stream';

/** Errors that only mean the client or the stream went away; the server keeps running. */
export const isExpectedStreamError = (err) =>
  err?.code === 'ERR_STREAM_PREMATURE_CLOSE' || err?.message === 'Stream lifetime exceeded' || err?.code === 'ECONNRESET';

/**
 * @param {ReadableStream | null} body web stream from `app.fetch`
 * @param {import('node:http').ServerResponse} res
 * @param {(err: Error) => void} [onUnexpected] called with any other error (default: one line, message only)
 */
export function pipeResponse(body, res, onUnexpected = (err) => console.error(`response stream error: ${err.message}`)) {
  if (!body) {
    res.end();
    return;
  }
  const source = Readable.fromWeb(body);
  // the client left before the body started: `pipeline` would throw ERR_STREAM_UNABLE_TO_PIPE synchronously
  if (res.destroyed) {
    source.destroy();
    return;
  }
  // a client that leaves early: stop reading the body so Start can clean up
  res.on('close', () => {
    if (!res.writableFinished) source.destroy();
  });
  pipeline(source, res, (err) => {
    if (err && !isExpectedStreamError(err)) onUnexpected(err);
  });
}
