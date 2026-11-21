import { z } from 'zod';
import { PlayError } from './errors.ts';

// All play input is validated here. `.strict()` everywhere: a client that sends a user id, score, count, status or
// seed is refused, not silently stripped. A failure throws the fixed `invalid` error and never repeats input.

/** Legend, hotspot, slot and lead ids (raw content ids, no legend prefix). */
export const ID_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
/** A play, tutorial or receipt token. */
export const TOKEN_RE = /^v1\.[A-Za-z0-9_-]{20,4000}$/;

const id = z.string().regex(ID_RE);
const token = z.string().regex(TOKEN_RE).nullable();
const option = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const actionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('tap'), hotspotId: id }).strict(),
  z.object({ kind: z.literal('hint1'), slotId: id }).strict(),
  z.object({ kind: z.literal('hint2'), slotId: id }).strict(),
  z.object({ kind: z.literal('answer'), slotId: id, option }).strict(),
  z.object({ kind: z.literal('follow'), leadId: id }).strict(),
]);

export const startWorldSchema = z.object({ legendId: id, token }).strict();
export const worldActSchema = z.object({ legendId: id, token, action: actionSchema }).strict();

export const startTutorialSchema = z.object({ token }).strict();
export const tutorialActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('drawer') }).strict(),
  z.object({ kind: z.literal('hint2') }).strict(),
  // 1 to 40 characters after trimming.
  z.object({ kind: z.literal('answer'), value: z.string().trim().min(1).max(40) }).strict(),
]);
export const tutorialActSchema = z.object({ token, action: tutorialActionSchema }).strict();
export const redeemSchema = z.object({ receipt: z.string().regex(TOKEN_RE) }).strict();

export type StartWorldInput = z.infer<typeof startWorldSchema>;
export type WorldActInput = z.infer<typeof worldActSchema>;
export type StartTutorialInput = z.infer<typeof startTutorialSchema>;
export type TutorialActInput = z.infer<typeof tutorialActSchema>;
export type TutorialAction = z.infer<typeof tutorialActionSchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;

export function parsePlay<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new PlayError('invalid');
  return r.data;
}
