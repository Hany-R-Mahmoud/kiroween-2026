import { describe, expect, it, vi } from 'vitest';
import { resolveAnchor } from '../src/server/anchor.ts';

const stored = new Map([['banshee--ch-3', 'banshee'], ['flying-dutchman--versions--v-log', 'flying-dutchman']]);
const lookupSpy = () => vi.fn(async (a: string) => stored.get(a) ?? null);

describe('resolveAnchor (/anchor/<anchor>)', () => {
  it.each([
    ['banshee--ch-3', '/legends/banshee#banshee--ch-3'],
    ['flying-dutchman--versions--v-log', '/legends/flying-dutchman#flying-dutchman--versions--v-log'],
  ])('redirects the stored anchor %s', async (anchor, href) => {
    expect(await resolveAnchor(anchor, lookupSpy())).toEqual({ kind: 'redirect', href });
  });

  it('gives not found for a well-formed anchor that is not stored, after looking it up', async () => {
    const lookup = lookupSpy();
    expect(await resolveAnchor('banshee--ch-99', lookup)).toEqual({ kind: 'notFound' });
    expect(lookup).toHaveBeenCalledWith('banshee--ch-99');
  });

  it.each(['', 'banshee', 'BANSHEE--ch-3', '../banshee--ch-3', 'banshee--ch-3/x', "banshee--ch-3' or '1'='1", 'banshee--ch-3%00', 'x'.repeat(200)])(
    'gives not found for the malformed %j without any lookup',
    async (anchor) => {
      const lookup = lookupSpy();
      expect(await resolveAnchor(anchor, lookup)).toEqual({ kind: 'notFound' });
      expect(lookup).not.toHaveBeenCalled();
    },
  );
});
