import { PUZZLE_TYPES, type Legend } from '../model/schema.ts';
import { cell, type Ctx } from './ctx.ts';
import { readTable, stripTicks, type Line } from './markdown.ts';
import { factKey } from './refs.ts';

export const ANCHOR_RE = /[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?/g;
const VERSION_TOKEN_RE = /\bv-[a-z0-9]+(?:-[a-z0-9]+)*\b/g;
const NONE_RE = /^(none|n\/a)\b/i;

/** Section 5. Fills `c.factByKey` so later sections can resolve fact links. */
export function readFacts(c: Ctx, lines: Line[]): Legend['facts'] {
  const t = readTable(lines);
  const k = c.columns('5', t, { id: /fact_id/, stmt: /statement/, anchor: /^anchor/, ver: /version_id/, types: /puzzle_types/, ans: /^answer/, wrong: /wrong/, diff: /difficulty/ }, 0);
  if (!k || !t) return [];
  return t.rows.map((r) => {
    const raw = stripTicks(cell(r.cells, k.id));
    const key = factKey(raw);
    if (c.factByKey.has(key)) c.err('5', r.n, `fact ${raw}: duplicate id (after normalisation)`);
    c.factByKey.set(key, c.ns(raw));

    let statement = cell(r.cells, k.stmt);
    let confidence: 'D' | 'R' | 'checked' = 'checked';
    const tag = /^\[(D|R)\]\s*/.exec(statement);
    if (tag) {
      confidence = tag[1] as 'D' | 'R';
      statement = statement.slice(tag[0].length);
    }
    const ver = stripTicks(cell(r.cells, k.ver));
    if (ver !== 'all' && !c.versionRaw.has(ver)) c.err('5', r.n, `fact ${raw}: unknown version "${ver}"`);
    const types = stripTicks(cell(r.cells, k.types)).split(',').map((x) => x.trim()).filter(Boolean);
    for (const ty of types) if (!(PUZZLE_TYPES as readonly string[]).includes(ty)) c.err('5', r.n, `fact ${raw}: unknown puzzle type "${ty}"`);
    const anchor = stripTicks(cell(r.cells, k.anchor));
    c.checkAnchor(anchor, '5', r.n, `fact ${raw} anchor`);
    return {
      id: c.ns(raw),
      statement,
      confidence,
      anchor,
      versionId: ver === 'all' ? null : c.ns(ver),
      puzzleTypes: types as Legend['facts'][number]['puzzleTypes'],
      answer: cell(r.cells, k.ans),
      wrongAnswers: cell(r.cells, k.wrong).split(';').map((x) => x.trim()).filter(Boolean),
      difficulty: Number(/\d/.exec(cell(r.cells, k.diff))?.[0] ?? 0),
    };
  });
}

type Entry = { key: string; lines: Line[] };

/** Groups `lead-id:` ... `can be true when:` keyed lines into one list of entries per lead. */
function leadBlocks(lines: Line[]): Entry[][] {
  const keyRe = /^(lead-id|starts from|steps|dead end|contradiction|can be true when):\s*(.*)$/;
  const blocks: Entry[][] = [];
  let cur: Entry[] | null = null;
  for (const l of lines) {
    const m = keyRe.exec(l.t.trim());
    if (m) {
      if (m[1] === 'lead-id') {
        cur = [];
        blocks.push(cur);
      }
      cur?.push({ key: m[1]!, lines: [{ n: l.n, t: m[2]! }] });
    } else if (cur?.length && l.t.trim() && !l.t.startsWith('```')) cur[cur.length - 1]!.lines.push(l);
  }
  return blocks;
}

const field = (b: Entry[], key: string): { text: string; n: number } => {
  const e = b.find((x) => x.key === key);
  return { text: e ? e.lines.map((x) => x.t.trim()).filter(Boolean).join('\n') : '', n: e?.lines[0]?.n ?? 0 };
};

function readSteps(c: Ctx, leadRaw: string, steps: { text: string; n: number }): string[] {
  const parts = steps.text.split(/(?:^|\s)(\d+)[.)]\s+/).slice(1);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (Number(parts[i]) !== out.length + 1) c.err('6', steps.n, `${leadRaw}: step numbers are not 1..n in order`);
    out.push((parts[i + 1] ?? '').trim().replace(/[;\s]+$/, ''));
  }
  if (!out.length) c.err('6', steps.n, `${leadRaw}: no numbered steps`);
  return out;
}

function readContradiction(c: Ctx, leadRaw: string, co: { text: string; n: number }, hasDeadEnd: boolean): Legend['leads'][number]['contradiction'] {
  if (NONE_RE.test(co.text)) {
    if (hasDeadEnd) c.err('6', co.n, `${leadRaw}: has a dead end but no contradiction`);
    return null;
  }
  const factIds = c.resolveFacts(co.text, '6', co.n, `${leadRaw} contradiction`);
  const anchors = co.text.match(ANCHOR_RE) ?? [];
  for (const a of anchors) c.checkAnchor(a, '6', co.n, `${leadRaw} contradiction`);
  if (!factIds.length || !anchors.length) {
    c.err('6', co.n, `${leadRaw}: contradiction needs at least one fact id and one anchor`);
    return null;
  }
  return { factIds, anchors };
}

/** "never" wins, even when the line also names a version; otherwise every v-<id> must exist. */
function readCanBeTrue(c: Ctx, leadRaw: string, cb: { text: string; n: number }): Legend['leads'][number]['canBeTrueFor'] {
  if (/\bnever\b/i.test(cb.text)) return 'never';
  const toks = cb.text.match(VERSION_TOKEN_RE) ?? [];
  for (const tk of toks) if (!c.versionRaw.has(tk)) c.err('6', cb.n, `${leadRaw}: "can be true when" names unknown version "${tk}"`);
  if (!toks.length) c.err('6', cb.n, `${leadRaw}: "can be true when" has no version id and no "never"`);
  return [...new Set(toks)].map((x) => c.ns(x));
}

/** Section 6. */
export function readLeads(c: Ctx, lines: Line[]): Legend['leads'] {
  return leadBlocks(lines).map((b) => {
    const leadRaw = field(b, 'lead-id').text.trim();
    const from = field(b, 'starts from');
    if (!c.versionRaw.has(from.text.trim())) c.err('6', from.n, `${leadRaw}: starts from unknown version "${from.text.trim()}"`);
    const dead = field(b, 'dead end').text;
    const deadEnd = NONE_RE.test(dead) ? null : dead;
    return {
      id: c.ns(leadRaw),
      startsFrom: c.ns(from.text.trim()),
      steps: readSteps(c, leadRaw, field(b, 'steps')),
      deadEnd,
      contradiction: readContradiction(c, leadRaw, field(b, 'contradiction'), deadEnd !== null),
      canBeTrueFor: readCanBeTrue(c, leadRaw, field(b, 'can be true when')),
    };
  });
}
