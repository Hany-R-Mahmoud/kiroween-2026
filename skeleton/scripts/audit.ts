import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auditLegend, type LegendAudit } from '../src/generator/audit.ts';
import { allVersionProblems, type VersionProblem } from '../src/generator/coverage.ts';
import { candidateVersions } from '../src/generator/slots.ts';
import { loadLegends } from '../src/parser/loadLegends.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { legends, errors } = loadLegends(`${root}content/legends`);
if (errors.length) {
  for (const e of errors) console.error(`${e.file}:${e.line} [${e.section}] ${e.message}`);
  process.exit(1);
}

const rows = legends.map((l) => {
  const audit = auditLegend(l);
  return { l, audit, problems: allVersionProblems(l, audit) };
});
const short = (id: string): string => id.slice(id.indexOf(':') + 1);
const badVersions = (p: VersionProblem[]): number => new Set(p.map((x) => x.versionId)).size;

/** One legend, in the three groups the owner works from. */
function detail(legendId: string, a: LegendAudit, problems: VersionProblem[]): string {
  const noFact = problems.filter((p) => p.kind === 'no-fact' || p.kind === 'no-distinct');
  const out = [`### ${legendId}`, ''];
  out.push('**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)', '');
  if (a.gaps.length) {
    out.push('| fact | puzzle type | answer | anchor |', '|---|---|---|---|');
    for (const g of a.gaps) out.push(`| ${short(g.factId)} | ${g.puzzleType} | ${g.answer.replace(/\|/g, '/')} | ${g.anchor} |`);
  } else out.push('None.');
  out.push('', '**2. Slots or lead steps with no meaningful hotspot**', '');
  out.push(`- Slots with no meaningful hotspot linked to any of their facts: ${a.uncoveredSlots.length ? a.uncoveredSlots.map(short).join(', ') : 'none'}`);
  out.push(`- Lead steps with no meaningful hotspot: ${a.uncoveredLeadSteps.length ? a.uncoveredLeadSteps.map((s) => `${short(s.leadId)} step ${s.step}`).join(', ') : 'none'}`);
  out.push('', '**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)', '');
  if (noFact.length) for (const p of noFact) out.push(`- \`${short(p.versionId)}\`: ${p.problem.replace(new RegExp(`${legendId}:`, 'g'), '')}`);
  else out.push('None.');
  out.push('');
  return out.join('\n');
}

const md = [
  '# Content gaps',
  '',
  'Written by `pnpm --filter @kiroween/skeleton audit:content`. Legend files are never edited by this tool; the owner fixes content outside the spec.',
  '',
  'Rules applied (R5.10 matcher, owner decision): a fact only fills a slot type that needs its answer in the story (every type except `true-or-told` and `ritual-order`) if its answer is written in the linked text. The label `documented:`, `told:` or `proposed:` is dropped, the answer is split on commas, " and " and parentheses, and a part passes when all its content words (ignoring a, an, the, of, and, or, to, in, on, at, with, near, about) are whole words of one paragraph. All parts must pass. `who-said-it` passes when the surname appears in the text. A trailing "-ed" on words over four letters is folded ("dressed" matches "dress"). A bare `<id>--versions` anchor is a valid target and is checked against the whole versions section.',
  '',
  'Every filled slot needs a meaningful hotspot linked to one of its candidate facts, and the true lead needs a meaningful hotspot on every step (R5.7).',
  '',
  '| legend | answers not found | slots with no hotspot | lead steps with no hotspot | versions that cannot be generated (of total) |',
  '|---|---|---|---|---|',
  ...rows.map(({ l, audit, problems }) => `| ${l.id} | ${audit.gaps.length} | ${audit.uncoveredSlots.length} | ${audit.uncoveredLeadSteps.length} | ${badVersions(problems)} of ${candidateVersions(l).length} |`),
  '',
  '## Details',
  '',
  ...rows.map(({ l, audit, problems }) => detail(l.id, audit, problems)),
].join('\n');

writeFileSync(`${root}docs/content-gaps.md`, md);
for (const { l, audit, problems } of rows) {
  console.log(l.id.padEnd(20), 'answersNotFound', audit.gaps.length, 'slotsNoHotspot', audit.uncoveredSlots.length, 'leadStepsNoHotspot', audit.uncoveredLeadSteps.length, 'versionsFailing', badVersions(problems), '/', candidateVersions(l).length);
}
