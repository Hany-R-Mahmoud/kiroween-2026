import { describe, expect, it } from 'vitest';
import { cleanDisplayName, DISPLAY_NAME } from '../src/account/displayName.ts';

describe('cleanDisplayName', () => {
  it.each(['Hany', 'Ann Fanshawe', "O'Brien", 'night.archivist', 'Jean-Luc', 'player_2', 'هاني', 'Zoë', 'Ab'])('accepts %s', (n) => {
    expect(cleanDisplayName(n)).toBe(n);
  });

  it('trims and collapses spaces', () => {
    expect(cleanDisplayName('  Ann   Fanshawe ')).toBe('Ann Fanshawe');
  });

  it.each([
    ['too short', 'A'],
    ['too long', 'x'.repeat(DISPLAY_NAME.max + 1)],
    ['empty', '   '],
    ['markup', '<script>x</script>'],
    ['angle bracket', 'Ann<b>'],
    ['quote mark at the end', "Ann'"],
    ['starts with punctuation', '-Ann'],
    ['control character', 'Ann\u0000x'],
    ['zero-width joiner trick', 'An\u200Bn'],
    ['emoji', 'Ann 👻'],
    ['not a string', 42],
  ])('rejects %s', (_label, n) => {
    expect(cleanDisplayName(n)).toBeNull();
  });

  it('counts characters, not UTF-16 units', () => {
    expect(cleanDisplayName('ه'.repeat(DISPLAY_NAME.max))).not.toBeNull();
  });
});
