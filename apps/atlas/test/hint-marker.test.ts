import { describe, expect, it } from 'vitest';
import { parseHintSearch } from '../src/lib/hintMarker';

describe('parseHintSearch', () => {
  it('accepts the number 1 and the string "1"', () => {
    expect(parseHintSearch({ hint: 1 })).toEqual({ hint: 1 });
    expect(parseHintSearch({ hint: '1' })).toEqual({ hint: 1 });
  });

  it('drops a missing marker', () => {
    expect(parseHintSearch({})).toEqual({});
  });

  it('drops 0, other strings and other types', () => {
    for (const hint of [0, '0', '', 'true', 'yes', '2', 2, true, false, null, [1], { a: 1 }]) {
      expect(parseHintSearch({ hint })).toEqual({});
    }
  });
});
