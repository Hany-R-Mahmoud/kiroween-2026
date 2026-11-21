import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { PlayError } from './errors.ts';
import { ID_RE, TOKEN_RE } from './validate.ts';

// Guest token codec: AES-256-GCM. Format `v1.` + base64url(iv(12) | ciphertext | tag(16)).
// Additional authenticated data is `v1|<kind>|<legendId>`, so a token for another legend or kind fails authentication.
// Every failure throws the same PlayError('session'); the reason is never returned or logged.

export type TokenKind = 'play' | 'tutorial' | 'receipt';

/** Tutorial and receipt tokens carry no legend; this fixed id is used in their AAD and payload. */
export const TUTORIAL_LEGEND_ID = 'tutorial';

export const PLAY_TOKEN_TTL_SECONDS = 6 * 60 * 60;
export const RECEIPT_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export interface TokenPayload {
  legendId: string;
  seed: string;
  /** Opaque here. The caller validates it (for example with `playStateSchema`). */
  state: unknown;
}

export interface TokenCodec {
  encode(kind: TokenKind, payload: TokenPayload): string;
  /** Throws PlayError('session') for any failure. `legendId` is the legend the caller expects. */
  decode(kind: TokenKind, legendId: string, token: string): TokenPayload;
}

export interface TokenCodecOptions {
  /** 32 raw bytes. */
  key: Uint8Array;
  /** Current time in milliseconds. Injected for tests. */
  now: () => number;
}

const payloadSchema = z
  .object({
    v: z.literal(1),
    exp: z.number().int(),
    legendId: z.string().regex(ID_RE),
    seed: z.string().min(1).max(200),
    state: z.unknown(),
  })
  .strict();

const ttlSeconds = (kind: TokenKind): number => (kind === 'receipt' ? RECEIPT_TOKEN_TTL_SECONDS : PLAY_TOKEN_TTL_SECONDS);
/** The one failure path of `decode`; the caller never learns which check failed. */
const reject = (): never => {
  throw new PlayError('session');
};
const aad = (kind: TokenKind, legendId: string): Buffer => Buffer.from(`v1|${kind}|${legendId}`, 'utf8');

/** Decode a base64 key string to 32 bytes. Throws a plain Error that never includes the value. */
export function parseTokenKey(value: string | undefined): Buffer {
  const key = value ? Buffer.from(value.trim(), 'base64') : Buffer.alloc(0);
  if (key.length !== KEY_BYTES) throw new Error('The token key must be 32 bytes, base64 encoded.');
  return key;
}

export function createTokenCodec(options: TokenCodecOptions): TokenCodec {
  if (options.key.length !== KEY_BYTES) throw new Error('The token key must be 32 bytes.');
  const key = Buffer.from(options.key);

  return {
    encode(kind, payload) {
      const exp = Math.floor(options.now() / 1000) + ttlSeconds(kind);
      const plain = Buffer.from(
        JSON.stringify({ v: 1, exp, legendId: payload.legendId, seed: payload.seed, state: payload.state }),
        'utf8',
      );
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
      cipher.setAAD(aad(kind, payload.legendId));
      const body = Buffer.concat([cipher.update(plain), cipher.final()]);
      const tag = cipher.getAuthTag();
      return 'v1.' + Buffer.concat([iv, body, tag]).toString('base64url');
    },

    decode(kind, legendId, token) {
      try {
        if (typeof token !== 'string' || !TOKEN_RE.test(token)) reject();
        const raw = Buffer.from(token.slice(3), 'base64url');
        if (raw.length < IV_BYTES + TAG_BYTES + 1) reject();
        const iv = raw.subarray(0, IV_BYTES);
        const tag = raw.subarray(raw.length - TAG_BYTES);
        const body = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);
        if (tag.length !== TAG_BYTES) reject();
        const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
        decipher.setAAD(aad(kind, legendId));
        decipher.setAuthTag(tag);
        const plain = Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
        const parsed = payloadSchema.parse(JSON.parse(plain));
        if (parsed.legendId !== legendId) reject();
        if (parsed.exp <= Math.floor(options.now() / 1000)) reject();
        return { legendId: parsed.legendId, seed: parsed.seed, state: parsed.state };
      } catch {
        throw new PlayError('session');
      }
    },
  };
}
