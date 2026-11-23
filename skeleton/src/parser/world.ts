import { PUZZLE_TYPES, type Legend, type Link } from '../model/schema.ts';
import { cell, type Ctx } from './ctx.ts';
import { ANCHOR_RE } from './facts.ts';
import { joinText, nonEmpty, readTable, stripTicks, type Line } from './markdown.ts';
import { parseLinks } from './refs.ts';

type World = Legend['world'];
const HOTSPOT_TOKEN_RE = /\bhs?-[a-z0-9]+(?:-[a-z0-9]+)*\b/g;

/** Text after a heading, with the heading word and its markup removed. */
const afterHeading = (rest: string): string => rest.replace(/^[:*\s]+/, '').trim();

/** Splits section 7 on both heading styles: `### Hotspots` and `**Hotspots**`. */
function splitBlocks(lines: Line[]): Map<string, Line[]> {
  const head = /^(?:#{3,4}\s+|\*\*)(Setting|Scenes|Hotspots|Spirit encounter|Puzzles|Breaking the curse|Fear events|Hints)\b(.*)$/i;
  const blocks = new Map<string, Line[]>();
  let cur: Line[] | null = null;
  for (const l of lines) {
    const m = head.exec(l.t.trim());
    if (m) {
      cur = [];
      blocks.set(m[1]!.toLowerCase(), cur);
      const rest = afterHeading(m[2]!);
      if (rest) cur.push({ n: l.n, t: rest });
    } else if (/^---\s*$/.test(l.t)) cur = null;
    else cur?.push(l);
  }
  return blocks;
}

function readScenes(c: Ctx, lines: Line[]): World['scenes'] {
  const scenes: World['scenes'] = [];
  for (const l of nonEmpty(lines)) {
    const m = /^\*\*([\w-]+):\s*(.+?)\*\*\s*(.*)$/.exec(l.t.trim()) ?? /^[-*]\s*`([\w-]+)`\s*\(([^)]*)\):?\s*(.*)$/.exec(l.t.trim());
    if (m) scenes.push({ id: c.ns(m[1]!), name: m[2]!.replace(/\.$/, ''), description: m[3]!.trim() });
    else if (scenes.length) scenes[scenes.length - 1]!.description += ` ${l.t.trim()}`;
  }
  if (!scenes.length) c.err('7', 0, 'no scenes parsed');
  return scenes;
}

function swappableFromSentence(lines: Line[]): Set<string> {
  const out = new Set<string>();
  for (const l of lines) {
    if (l.t.trim().startsWith('|')) continue;
    const m = /^swappable hotspots?:\s*(.*)$/i.exec(l.t.trim());
    // every id in the sentence counts: draugr names its swap partners (decoys h-10, h-15) in the same sentence
    if (m) for (const tk of m[1]!.match(HOTSPOT_TOKEN_RE) ?? []) out.add(tk);
  }
  return out;
}

function readLinks(c: Ctx, text: string, raw: string, n: number, leads: Legend['leads']): Link[] {
  const pl = parseLinks(text);
  const links: Link[] = c.resolveFacts(pl.factKeys.join(' '), '7', n, `hotspot ${raw}`).map((f) => ({ kind: 'fact', factId: f }));
  for (const ld of pl.leads) {
    const lead = leads.find((x) => x.id === c.ns(ld.leadRaw));
    if (!lead) c.err('7', n, `hotspot ${raw}: unknown lead "${ld.leadRaw}"`);
    else if (ld.step !== null && ld.step > lead.steps.length) c.err('7', n, `hotspot ${raw}: ${ld.leadRaw} has no step ${ld.step}`);
    else links.push({ kind: 'leadStep', leadId: lead.id, step: ld.step });
  }
  return links;
}

function readHotspots(c: Ctx, lines: Line[], sceneRaw: Set<string>, leads: Legend['leads']): World['hotspots'] {
  const t = readTable(lines);
  const k = c.columns('7', t, { id: /hotspot_id/, scene: /scene_id/, obj: /object/, role: /meaningful or decoy/, link: /linked/, tap: /on tap/ }, lines[0]?.n ?? 0);
  if (!k || !t) return [];
  const extraSwappable = swappableFromSentence(lines);
  return t.rows.map((r) => {
    const raw = stripTicks(cell(r.cells, k.id));
    const sceneId = stripTicks(cell(r.cells, k.scene));
    if (!sceneRaw.has(sceneId)) c.err('7', r.n, `hotspot ${raw}: unknown scene "${sceneId}"`);
    const roleCell = cell(r.cells, k.role);
    c.hotspotRaw.add(raw);
    return {
      id: c.ns(raw),
      sceneId: c.ns(sceneId),
      object: cell(r.cells, k.obj),
      role: /decoy/i.test(roleCell) ? 'decoy' : 'meaningful',
      swappable: /swappable/i.test(roleCell) || extraSwappable.has(raw),
      links: readLinks(c, cell(r.cells, k.link), raw, r.n, leads),
      onTap: cell(r.cells, k.tap),
    };
  });
}

type HintRow = { h1: string; h2: string; n: number };

function readHintRows(c: Ctx, lines: Line[]): Map<string, HintRow> {
  const t = readTable(lines);
  const k = c.columns('7', t, { slot: /slot/, h1: /hint 1/, h2: /hint 2/ }, lines[0]?.n ?? 0);
  const rows = new Map<string, HintRow>();
  if (k && t) for (const r of t.rows) rows.set(/^\S+/.exec(cell(r.cells, k.slot))?.[0]?.replace(/`/g, '') ?? '', { h1: cell(r.cells, k.h1), h2: cell(r.cells, k.h2), n: r.n });
  return rows;
}

function makeHint(c: Ctx, text: string, n: number): { text: string; highlight: string[] } {
  // some files append `Highlight h-07 and h-03.` after a quoted hint; the quotes belong to the hint only
  const clean = text.replace(/["”]\s*(?=Highlight\b)/, ' ').replace(/^["“]|["”]$/g, '').trim();
  const highlight: string[] = [];
  for (const tk of clean.match(HOTSPOT_TOKEN_RE) ?? []) {
    if (c.hotspotRaw.has(tk)) highlight.push(c.ns(tk));
    else c.err('7', n, `hint highlights unknown hotspot "${tk}"`);
  }
  // the ids are read above; the trailing `Highlight …` sentence is not shown to the player
  return { text: clean.replace(/\s*\bHighlight\b[\s\S]*$/, '').trim(), highlight: [...new Set(highlight)] };
}

function hint2Anchor(c: Ctx, text: string, n: number, what: string): string {
  const a = (stripTicks(text).match(ANCHOR_RE) ?? [])[0] ?? '';
  c.checkAnchor(a, '7', n, `${what} hint 2`);
  return a;
}

function readSlots(c: Ctx, lines: Line[], hints: Map<string, HintRow>): { slots: World['slots']; used: Set<string> } {
  const t = readTable(lines);
  const k = c.columns('7', t, { slot: /slot/, type: /puzzle_type/, facts: /fact/ }, lines[0]?.n ?? 0);
  const used = new Set<string>();
  if (!k || !t) return { slots: [], used };
  const slots = t.rows.map((r) => {
    const slotCell = cell(r.cells, k.slot);
    const raw = /^\S+/.exec(slotCell)?.[0]?.replace(/`/g, '') ?? '';
    const type = stripTicks(cell(r.cells, k.type));
    if (!(PUZZLE_TYPES as readonly string[]).includes(type)) c.err('7', r.n, `slot ${raw}: unknown puzzle type "${type}"`);
    const hr = hints.get(raw);
    if (!hr) c.err('7', r.n, `slot ${raw}: no hint row`);
    used.add(raw);
    return {
      id: c.ns(raw),
      label: slotCell.slice(raw.length).replace(/\(final\)/i, '').trim(),
      type: type as World['slots'][number]['type'],
      isFinal: /\(final\)/i.test(slotCell),
      candidateFactIds: c.resolveFacts(cell(r.cells, k.facts), '7', r.n, `slot ${raw}`),
      hint1: hr ? makeHint(c, hr.h1, hr.n) : { text: '', highlight: [] },
      hint2Anchor: hr ? hint2Anchor(c, hr.h2, hr.n, `slot ${raw}`) : '',
    };
  });
  return { slots, used };
}

/** A hint row that matches no slot belongs to the final puzzle ("Breaking the curse"). */
function readFinalPuzzle(c: Ctx, description: string, hints: Map<string, HintRow>, used: Set<string>): World['finalPuzzle'] {
  const out: World['finalPuzzle'] = { description, hint1: null, hint2Anchor: null };
  for (const [raw, hr] of hints) {
    if (used.has(raw)) continue;
    if (/final/i.test(raw)) {
      out.hint1 = makeHint(c, hr.h1, hr.n);
      out.hint2Anchor = hint2Anchor(c, hr.h2, hr.n, 'final puzzle');
    } else c.err('7', hr.n, `hint row "${raw}" matches no puzzle slot`);
  }
  return out;
}

function readFearEvents(c: Ctx, lines: Line[]): World['fearEvents'] {
  const events: World['fearEvents'] = [];
  for (const l of nonEmpty(lines)) {
    const m = /^(\d+)\.\s+(.*)$/.exec(l.t.trim());
    if (m) {
      const body = m[2]!.replace(/\*\*/g, '');
      const idm = /^(fe-\d+)\b\s*/.exec(body);
      events.push({ id: c.ns(idm?.[1] ?? `fe-${m[1]}`), description: idm ? body.slice(idm[0].length) : body, reducedMotion: null });
    } else if (events.length && !/^\(/.test(l.t.trim())) events[events.length - 1]!.description += ` ${l.t.trim()}`;
  }
  for (const fe of events) {
    const m = /Reduced motion:\s*(.*)$/i.exec(fe.description);
    if (m) {
      fe.reducedMotion = m[1]!.trim();
      fe.description = fe.description.slice(0, m.index).trim();
    }
  }
  return events;
}

/** Section 7. Needs facts, leads and the anchor set from earlier sections. */
export function readWorld(c: Ctx, lines: Line[], leads: Legend['leads']): World {
  const blocks = splitBlocks(lines);
  const block = (name: string): Line[] => {
    const b = blocks.get(name);
    if (!b) c.err('7', 0, `missing "${name}" block`);
    return b ?? [];
  };
  const scenes = readScenes(c, block('scenes'));
  const sceneRaw = new Set(scenes.map((s) => s.id.slice(c.id.length + 1)));
  const hotspots = readHotspots(c, block('hotspots'), sceneRaw, leads);
  const hints = readHintRows(c, block('hints'));
  const { slots, used } = readSlots(c, block('puzzles'), hints);
  return {
    setting: joinText(block('setting')),
    scenes,
    hotspots,
    spirit: joinText(block('spirit encounter')),
    slots,
    finalPuzzle: readFinalPuzzle(c, joinText(block('breaking the curse')), hints, used),
    fearEvents: readFearEvents(c, block('fear events')),
  };
}
