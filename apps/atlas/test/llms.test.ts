import { describe, expect, it } from 'vitest';
import { buildLlmsTxt } from '../src/seo/llms';
import { LEGEND_IDS } from '../src/seo/legendIds.gen';

// Requirements 6.1, 6.3: llms.txt lists every legend as one markdown link line with its hook
const ORIGIN = 'https://example.test';

describe('buildLlmsTxt', () => {
  it('emits one `- [Title](<origin>/legends/<id>): hook` line per legend', () => {
    const legends = LEGEND_IDS.map((id) => ({ id, title: `Title ${id}`, oneLineHook: `Hook for ${id}` }));
    const lines = buildLlmsTxt(ORIGIN, legends).split('\n');
    const legendLines = lines.filter((l) => l.includes('/legends/'));

    expect(LEGEND_IDS).toHaveLength(12);
    expect(legendLines).toHaveLength(12);
    for (const id of LEGEND_IDS) {
      expect(legendLines).toContain(`- [Title ${id}](${ORIGIN}/legends/${id}): Hook for ${id}`);
    }
  });
});
