import { legendSchema, type Legend } from '../model/schema.ts';
import { cell, Ctx } from './ctx.ts';
import { readFacts, readLeads } from './facts.ts';
import { joinText, nonEmpty, readTable, splitSections, stripTicks, type Line, type ParseError } from './markdown.ts';
import { readWorld } from './world.ts';

export type { ParseError } from './markdown.ts';
export type ParseResult = { ok: true; legend: Legend } | { ok: false; errors: ParseError[] };

function readMeta(lines: Line[]): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const r of readTable(lines)?.rows ?? []) meta[(r.cells[0] ?? '').toLowerCase()] = stripTicks(r.cells[1] ?? '');
  return meta;
}

function readChapters(c: Ctx, lines: Line[]): Legend['chapters'] {
  const chapters: Legend['chapters'] = [];
  let cur: { id: string; title: string; n: number; body: Line[] } | null = null;
  const flush = (): void => {
    if (!cur) return;
    const { body } = cur;
    const find = (re: RegExp): string => body.find((l) => re.test(l.t))?.t.replace(re, '').trim() ?? '';
    const anchor = find(/^anchor:\s*/);
    if (anchor !== `${c.id}--${cur.id}`) c.err('2', cur.n, `${cur.id}: anchor "${anchor}" should be "${c.id}--${cur.id}"`);
    chapters.push({
      id: c.ns(cur.id),
      ordinal: Number(/\d+/.exec(cur.id)?.[0] ?? 0),
      anchor,
      title: cur.title,
      sources: find(/^sources:\s*/).match(/S\d+/g) ?? [],
      text: joinText(body.filter((l) => !/^(anchor|sources|Hook):/.test(l.t))),
      hook: find(/^Hook:\s*/),
    });
  };
  for (const l of lines) {
    const m = /^#### (ch-\d+)\s*·\s*(.*)$/.exec(l.t);
    if (m) {
      flush();
      cur = { id: m[1]!, title: m[2]!.trim(), n: l.n, body: [] };
    } else if (/^#{1,4} /.test(l.t)) {
      flush();
      cur = null;
    } else cur?.body.push(l);
  }
  flush();
  return chapters;
}

/** Version paragraphs sit under `#### versions--v-x`, `##### v-x` or a bold `**v-x**` line. */
function readVersionParagraphs(c: Ctx, lines: Line[], versionIds: string[]): Map<string, Line[]> {
  const marker = /^(?:#{3,6}\s+(?:versions--)?|\*\*)(v-[a-z0-9]+(?:-[a-z0-9]+)*)\**\s*$/;
  const known = new Set([`${c.id}--versions`, ...versionIds.map((v) => `${c.id}--versions--${v}`)]);
  const paragraphs = new Map<string, Line[]>();
  let cur: Line[] | null = null;
  for (const l of lines) {
    if (l.t.trim().startsWith('|')) continue;
    const m = marker.exec(l.t.trim());
    if (m) {
      cur = [];
      paragraphs.set(m[1]!, cur);
    } else if (/^#{1,6} /.test(l.t)) cur = null;
    else if (/^anchor:/.test(l.t)) {
      const a = l.t.replace(/^anchor:\s*/, '').trim();
      if (!known.has(a)) c.err('3', l.n, `anchor "${a}" is not a deep-link target`);
    } else if (cur && l.t.trim()) cur.push(l);
  }
  return paragraphs;
}

function readVersions(c: Ctx, lines: Line[]): Legend['versions'] {
  const t = readTable(lines);
  const k = c.columns('3', t, { id: /version_id/, who: /who tells/, era: /^era/, claim: /what they claim/, conf: /conflict/, src: /^source/ }, 0);
  if (!k || !t) return [];
  const ids = t.rows.map((r) => stripTicks(cell(r.cells, k.id)));
  const paragraphs = readVersionParagraphs(c, lines, ids);
  return t.rows.map((r, i) => {
    const raw = ids[i]!;
    c.versionRaw.add(raw);
    const p = paragraphs.get(raw);
    if (!p?.length) c.err('3', r.n, `version ${raw} has no paragraph`);
    return {
      id: c.ns(raw),
      sourceType: cell(r.cells, k.who),
      era: cell(r.cells, k.era),
      claim: cell(r.cells, k.claim),
      conflicts: cell(r.cells, k.conf),
      sourceId: cell(r.cells, k.src),
      anchor: `${c.id}--versions--${raw}`,
      paragraph: p ? joinText(p) : '',
    };
  });
}

function readDocumentedTold(c: Ctx, lines: Line[]): Legend['documentedTold'] {
  const rows = (readTable(lines)?.rows ?? []).filter((r) => r.cells[0] && r.cells[1]).map((r) => ({ documented: r.cells[0]!, told: r.cells[1]! }));
  if (!rows.length) c.err('4', 0, 'documented/told table is empty');
  return { rows, closing: joinText(nonEmpty(lines).filter((l) => !l.t.trim().startsWith('|'))) };
}

function readTheme(c: Ctx, lines: Line[]): Legend['theme'] {
  const raw = new Map((readTable(lines)?.rows ?? []).map((r) => [(r.cells[0] ?? '').toLowerCase(), r.cells[1] ?? '']));
  const token = (name: string): string => {
    const v = raw.get(name);
    if (v === undefined) c.err('8', 0, `theme pack has no "${name}" token`);
    return v ?? '';
  };
  return {
    palette: token('palette'),
    displayFont: token('display font'),
    bodyFont: token('body font'),
    textures: token('textures'),
    motifs: token('motifs'),
    ambientSound: token('ambient sound'),
    uiAccents: token('ui accents'),
  };
}

function readAssets(c: Ctx, lines: Line[]): Legend['assets'] {
  const t = readTable(lines);
  const k = c.columns('9', t, { id: /asset_id/, usage: /surface and usage/, size: /size/, bg: /background/, prompt: /prompt/, avoid: /avoid/ }, 0);
  if (!k || !t) return [];
  return t.rows.map((r) => ({ id: stripTicks(cell(r.cells, k.id)), usage: cell(r.cells, k.usage), size: cell(r.cells, k.size), background: cell(r.cells, k.bg), prompt: cell(r.cells, k.prompt), mustAvoid: cell(r.cells, k.avoid) }));
}

function readSources(c: Ctx, lines: Line[]): Legend['sources'] {
  const t = readTable(lines);
  const k = c.columns('10', t, { id: /^id$/, title: /title/, author: /author/, year: /year/, url: /url/, pd: /public domain/, supports: /supports/ }, 0);
  if (!k || !t) return [];
  return t.rows.map((r) => ({ id: stripTicks(cell(r.cells, k.id)), title: cell(r.cells, k.title), author: cell(r.cells, k.author), year: cell(r.cells, k.year), url: cell(r.cells, k.url), publicDomain: cell(r.cells, k.pd), supports: cell(r.cells, k.supports) }));
}

function buildMeta(c: Ctx, meta: Record<string, string>): Legend['meta'] {
  const mp = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(meta['map_point'] ?? '');
  if (!mp) c.err('0', 0, 'map_point has no "lat, lng"');
  return {
    title: meta['title'] ?? '',
    region: meta['region'] ?? '',
    countryTheme: meta['country_theme'] ?? '',
    mapPoint: { lat: Number(mp?.[1]), lng: Number(mp?.[2]) },
    era: meta['era'] ?? '',
    scareLevel: Number(meta['scare_level']),
    readingTimeMin: Number(meta['reading_time_min']),
    oneLineHook: meta['one_line_hook'] ?? '',
  };
}

export function parseLegend(text: string, file: string): ParseResult {
  const fileId = /([^/\\]+)\.md$/.exec(file)?.[1] ?? '';
  const sections = splitSections(text);
  const sec = (n: number): Line[] => sections.get(n) ?? [];
  const missing = Array.from({ length: 12 }, (_, n) => n).filter((n) => !sections.has(n));
  if (missing.length) return { ok: false, errors: missing.map((n) => ({ file, section: `${n}`, line: 0, message: `missing section ${n}` })) };

  const metaRaw = readMeta(sec(0));
  const c = new Ctx(file, metaRaw['id'] ?? '');
  if (c.id !== fileId) c.err('0', 0, `meta id "${c.id}" does not match file name "${fileId}"`);

  const chapters = readChapters(c, sec(2));
  const versions = readVersions(c, sec(3));
  const anchors = [...chapters.map((ch) => ch.anchor), `${c.id}--versions`, ...versions.map((v) => v.anchor)];
  anchors.forEach((a) => c.anchorSet.add(a));
  const documentedTold = readDocumentedTold(c, sec(4));
  const facts = readFacts(c, sec(5));
  const leads = readLeads(c, sec(6));
  const world = readWorld(c, sec(7), leads);
  const theme = readTheme(c, sec(8));
  const assets = readAssets(c, sec(9));
  const sources = readSources(c, sec(10));
  const sourceIds = new Set(sources.map((s) => s.id));
  for (const ch of chapters) for (const s of ch.sources) if (!sourceIds.has(s)) c.err('2', 0, `${ch.id}: source ${s} is not defined in the Sources table`);
  const meta = buildMeta(c, metaRaw);

  if (c.errors.length) return { ok: false, errors: c.errors };
  const parsed = legendSchema.safeParse({ id: c.id, meta, coldOpen: joinText(nonEmpty(sec(1))), chapters, versions, documentedTold, facts, leads, world, theme, assets, sources, anchors });
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => ({ file, section: 'schema', line: 0, message: `${i.path.join('.')}: ${i.message}` })) };
  return { ok: true, legend: parsed.data };
}
