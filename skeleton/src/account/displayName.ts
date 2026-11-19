export const DISPLAY_NAME = { min: 2, max: 30 } as const;

/**
 * R2.2: the name shown in the game. Letters and digits of any script, single spaces, and ' . - _ between them.
 * Returns the trimmed name, or null when it does not fit. Never trusted as HTML: React escapes it on output.
 */
export function cleanDisplayName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input.normalize('NFC').trim().replace(/\s+/gu, ' ');
  const length = [...name].length;
  if (length < DISPLAY_NAME.min || length > DISPLAY_NAME.max) return null;
  return /^[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}' ._-]*[\p{L}\p{N}\p{M}])?$/u.test(name) ? name : null;
}
