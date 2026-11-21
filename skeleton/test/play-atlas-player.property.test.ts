import { writeFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { FEAR } from '../src/play/fear.ts';
import { playableLegends } from './helpers/play.ts';
import { playFromAtlas, rankOptions, type PlayerResult } from './helpers/playFromAtlas.ts';

// Mutations that must fail this file (requirement 13.13): `hint2Anchor` in generator/hints.ts returning a different anchor
// than the fact's (the player then reads the wrong text); `endStatus` in play/engine.ts never restarting is covered in
// play-guessing-anchors.test.ts.
vi.setConfig({ testTimeout: 900_000 });

const SEEDS = Array.from({ length: 40 }, (_, i) => `fair-${i}`);

/**
 * KNOWN CONTENT FINDINGS (owner rule, task 2.19): legends the scripted player cannot win on every one of the 40 seeds under
 * the real fear budget. The constants and the player are not loosened. The exact set is asserted, so a legend that starts
 * failing, or one that is fixed, fails the test below and must be noticed. Details: docs/phase-4-notes/fairness.md.
 */
const KNOWN_CONTENT_FINDINGS: readonly string[] = ['banshee', 'chupacabra', 'draugr', 'el-coco', 'gumiho', 'naddaha', 'spring-heeled-jack', 'vetala'];

const results = new Map<string, PlayerResult[]>();
async function resultsFor(id: string): Promise<PlayerResult[]> {
  let r = results.get(id);
  if (!r) {
    const legend = playableLegends.find((l) => l.id === id)!;
    r = [];
    for (const seed of SEEDS) r.push(await playFromAtlas(legend, seed));
    results.set(id, r);
  }
  return r;
}

/** The design-only reader (no overlap tier), reported for comparison. Never asserted. */
async function designReaderWins(id: string): Promise<number> {
  const legend = playableLegends.find((l) => l.id === id)!;
  let won = 0;
  for (const seed of SEEDS) if ((await playFromAtlas(legend, seed, 'design')).status === 'won') won += 1;
  return won;
}

const legendsThatLose = async (): Promise<string[]> => {
  const out: string[] = [];
  for (const l of playableLegends) if ((await resultsFor(l.id)).some((r) => r.status !== 'won')) out.push(l.id);
  return out.sort();
};

describe('rankOptions (the reading rule)', () => {
  const text = 'The banshee is heard before a death. Some tellers say she wails at night, others say she combs her hair by the stream.';
  it('prefers the option whose own statement is in the text', () => {
    const r = rankOptions('others say she ____ by the stream', ['sings', 'combs her hair', 'weeps', 'runs'], text);
    expect(r.order[0]).toBe(1);
    expect(r.exact).toBe(1);
  });
  it('counts more than one option text in the chapter as an ambiguity', () => {
    const r = rankOptions('She is heard before a ____', ['death', 'night', 'storm', 'wedding'], text);
    expect(r.appearing).toBe(2);
    expect(r.order[0]).toBe(0);
  });
  it('falls back to nearness to the longest matching part of the statement', () => {
    const r = rankOptions('Heard before the ____ of a banshee', ['night', 'death', 'hair', 'stream'], text);
    expect(r.exact).toBe(0);
    expect(r.order.slice(0, 2)).toContain(1);
  });
});

describe('Property 14: A player who reads only the atlas wins', () => {
  it('all 12 legends are loaded and playable', () => {
    expect(playableLegends).toHaveLength(12);
  });

  it('the legends that lose on some seed are exactly the known content findings', async () => {
    expect(await legendsThatLose()).toEqual([...KNOWN_CONTENT_FINDINGS].sort());
  });

  for (const legend of playableLegends) {
    const known = KNOWN_CONTENT_FINDINGS.includes(legend.id);
    // A known finding is listed as a test that must fail; if the content is fixed this test fails and the entry is removed.
    (known ? it.fails : it)(`${legend.id}: the scripted player wins on all 40 seeds${known ? ' (KNOWN CONTENT FINDING)' : ''}`, async () => {
      const bad = (await resultsFor(legend.id)).filter((r) => r.status !== 'won').map((r) => `${r.seed}: ${r.status} ${r.problem.join('; ')}`);
      expect(bad).toEqual([]);
    });
  }

  it('Feature: game-play, Property 14: A player who reads only the atlas wins', async () => {
    // **Validates: Requirements 13.2**
    const winnable = playableLegends.filter((l) => !KNOWN_CONTENT_FINDINGS.includes(l.id));
    const seedArb = fc.stringMatching(/^[a-z0-9]{6,12}$/).map((s) => `p14-${s}`);
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...winnable), seedArb, async (legend, seed) => {
        const r = await playFromAtlas(legend, seed);
        expect(r.status, `${legend.id} ${seed}: ${r.problem.join('; ')}`).toBe('won');
        expect(r.peakFear).toBeLessThan(FEAR.max);
      }),
      { numRuns: 100, seed: 14 }, // pinned: a legend found winnable on the 40 fixed seeds must not turn the suite flaky; the exact-set test above is the guard
    );
  });

  it('the player follows leads in a seeded order, not all dead ends first (same seed, same order; seeds differ)', async () => {
    const all = (await Promise.all(playableLegends.map((l) => resultsFor(l.id)))).flat();
    expect(all.some((r) => r.deadEndsFollowed > 0), 'some Run follows a dead end before the true lead').toBe(true);
    const again = await playFromAtlas(playableLegends[0]!, SEEDS[3]!);
    expect(again).toEqual((await resultsFor(playableLegends[0]!.id))[3]);
  });

  it('writes the fairness report', async () => {
    const rows = await Promise.all(playableLegends.map(async (l) => ({ id: l.id, rs: await resultsFor(l.id), strict: await designReaderWins(l.id) })));
    const sum = (rs: PlayerResult[], f: (r: PlayerResult) => number): number => rs.reduce((a, r) => a + f(r), 0);
    const table = [
      '| Legend | Seeds | Won | Win rate | Win rate, design-rule reader only | Slot-instances | Ambiguous (more than one option text in the chapter at the anchor) | Wrong answers paid | Restarts | Peak fear (max over seeds) |',
      '|---|---|---|---|---|---|---|---|---|---|',
      ...rows.map(({ id, rs, strict }) => {
        const won = rs.filter((r) => r.status === 'won').length;
        const restarts = rs.filter((r) => r.status === 'restarted').length;
        const peak = Math.max(...rs.map((r) => r.peakFear));
        const amb = sum(rs, (r) => r.ambiguous);
        const inst = sum(rs, (r) => r.slotInstances);
        return `| ${id} | ${rs.length} | ${won} | ${Math.round((100 * won) / rs.length)}% | ${Math.round((100 * strict) / SEEDS.length)}% | ${inst} | ${amb} (${inst ? Math.round((100 * amb) / inst) : 0}%) | ${sum(rs, (r) => r.wrongPaid)} | ${restarts} | ${peak} |`;
      }),
    ].join('\n');
    const findings = rows
      .filter(({ rs }) => rs.some((r) => r.status !== 'won'))
      .map(({ id, rs }) => {
        const lost = rs.filter((r) => r.status !== 'won');
        const slots = [...new Set(lost.flatMap((r) => [...r.costlySlots, ...r.problem.map((p) => p.split(':')[0]!)]))];
        return `- **${id}**: ${lost.length} of ${rs.length} seeds not won (${[...new Set(lost.map((r) => r.status))].join(', ')}). Slots involved: ${slots.join(', ') || 'none recorded'}. First: ${lost[0]!.seed} ${lost[0]!.problem.join('; ') || lost[0]!.status}`;
      });
    const costly = rows.map(({ id, rs }) => {
      const per = new Map<string, number>();
      for (const r of rs) for (const s of r.costlySlots) per.set(s, (per.get(s) ?? 0) + 1);
      return per.size ? `- ${id}: ${[...per].map(([s, n]) => `${s} (${n} seeds)`).join(', ')}` : null;
    });
    const doc = [
      '# Fairness report (task 2.19)',
      '',
      `The scripted player reads only the views and the atlas text at the anchors the views gave. It runs under the real fear constants (max ${FEAR.max}, wrong answer ${FEAR.wrongAnswer}, Hint 2 ${FEAR.hint2}, dead end ${FEAR.deadEnd}). ${SEEDS.length} fixed seeds per legend.`,
      'Generated by `skeleton/test/play-atlas-player.property.test.ts` when `FAIRNESS_WRITE=1`. Ambiguity is a finding, not a failure; a lost Run is a failure unless listed under known content findings.',
      '',
      table,
      '',
      '## Content findings (legends not won on every seed)',
      '',
      ...(findings.length ? findings : ['None. Every legend was won on every seed.']),
      '',
      '## Reading of the findings',
      '',
      '- Legends listed above are the **known content findings**. The test keeps their win test as `it.fails` and asserts the exact set, so a newly failing or newly fixed legend is noticed. The constants, the fear budget and the player were not loosened to hide them.',
      '- The wrong answers cluster on `true-or-told` slots (the last slot, `p-5`/`pz-5`, in most legends). That puzzle type is exempt from "the answer is written in the linked text" (`TEXT_EXEMPT` in `generator/audit.ts`), and its options ("told", "documented by ...") are mostly not sentences in the chapter. A player who reads only the atlas has nothing to match, so it guesses and pays fear. `date-or-number`, `object-match`, `original-name` and `who-said-it` slots add the rest when the chapter paraphrases the statement.',
      '- The reader has two layers: the design rules (statement sentence in the chapter; option within 80 characters of the longest matching part) and, below them, a word-overlap reading for paraphrased statements. The "design-rule reader only" column shows the win rate without the overlap layer. See docs/phase-4-notes/decisions.md.',
      '- Owner decision needed (content, not code): add the answer wording to the chapter for `true-or-told` slots, or accept that this slot type is a guess under the budget.',
      '',
      '## Slots where the player paid a wrong answer (seeds out of ' + SEEDS.length + ')',
      '',
      ...(costly.filter((x) => x !== null) as string[]),
      '',
    ].join('\n');
    console.log(table);
    if (process.env.FAIRNESS_WRITE === '1') writeFileSync(new URL('../../docs/phase-4-notes/fairness.md', import.meta.url), doc);
    expect(rows).toHaveLength(12);
  });
});
