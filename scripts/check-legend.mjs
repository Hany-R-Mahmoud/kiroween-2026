#!/usr/bin/env node
// Validates content/legends/*.md against content/legend-format.md.
// Reports problems only. Never modifies story files.
// Usage: node scripts/check-legend.mjs <file...> | --all
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const DIR = 'content/legends';
const PUZZLE_TYPES = new Set(['weakness','ritual-order','true-or-told','original-name','symbol','date-or-number','who-said-it','object-match']);
const words = (s) => (s.match(/\S+/g) || []).length;

function tableRows(lines) {
  // returns data rows (arrays of cells) of the first markdown table in lines
  const rows = [];
  let seenSep = false;
  for (const l of lines) {
    if (!l.trim().startsWith('|')) { if (seenSep) break; else continue; }
    if (/^\|\s*:?-{3,}/.test(l.trim())) { seenSep = true; continue; }
    if (!seenSep) continue;
    rows.push(l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  }
  return rows;
}

function sectionLines(lines, num) {
  const start = lines.findIndex((l) => new RegExp(`^## ${num}\\.`).test(l));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^## \d+\./.test(lines[i])) { end = i; break; }
  return lines.slice(start + 1, end);
}

export function check(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  const errors = [];
  const stats = {};

  // 1. required sections 0..11
  const missing = [];
  for (let n = 0; n <= 11; n++) if (!sectionLines(lines, n)) missing.push(n);
  if (missing.length) errors.push(`missing sections: ${missing.join(', ')}`);
  stats.sections = 12 - missing.length;

  const id = (path.match(/([^/]+)\.md$/) || [])[1];

  // 2. chapters
  const sec2 = sectionLines(lines, 2) || [];
  const chapters = [];
  let cur = null;
  for (const l of sec2) {
    const m = l.match(/^#### (ch-\d+)\s*·\s*(.*)$/);
    if (m) { cur = { id: m[1], title: m[2], body: [] }; chapters.push(cur); continue; }
    if (/^#{1,4} /.test(l)) { cur = null; continue; }
    if (cur) cur.body.push(l);
  }
  stats.chapters = chapters.length;
  if (chapters.length < 5 || chapters.length > 7) errors.push(`chapters: found ${chapters.length}, need 5-7`);
  const anchors = new Set();
  const chapterSources = [];
  chapters.forEach((c, i) => {
    const a = c.body.find((l) => /^anchor:/.test(l));
    const s = c.body.find((l) => /^sources:/.test(l));
    const hook = c.body.find((l) => /^Hook:/.test(l));
    const anchor = a && a.replace(/^anchor:\s*/, '').trim();
    if (!anchor) errors.push(`${c.id}: no anchor`);
    else {
      anchors.add(anchor);
      if (id && anchor !== `${id}--${c.id}`) errors.push(`${c.id}: anchor "${anchor}" should be "${id}--${c.id}"`);
    }
    if (s) chapterSources.push(...(s.match(/S\d+/g) || [])); else errors.push(`${c.id}: no sources line`);
    if (!hook) errors.push(`${c.id}: no Hook line`);
    const narration = c.body.filter((l) => !/^(anchor|sources|Hook):/.test(l)).join('\n');
    const w = words(narration);
    (stats.chapterWords ||= []).push(w);
    if (w < 400 || w > 700) errors.push(`${c.id}: ${w} words (need 400-700, Hook line excluded)`);
    if (i === chapters.length - 1 && !/documented/i.test(c.title)) errors.push(`${c.id}: last chapter title should be "What is documented, and what is told"`);
  });

  // versions anchors (anchor for versions subsections is a heading; collect ids)
  const sec3 = sectionLines(lines, 3) || [];
  const versionRows = tableRows(sec3);
  stats.versions = versionRows.length;
  if (versionRows.length < 3 || versionRows.length > 5) errors.push(`versions: found ${versionRows.length}, need 3-5`);
  const versionIds = new Set(versionRows.map((r) => r[0].replace(/`/g, '')));
  for (const v of versionIds) anchors.add(`${id}--versions--${v}`);

  // 3. facts
  const sec5 = sectionLines(lines, 5) || [];
  const facts = tableRows(sec5);
  stats.facts = facts.length;
  if (facts.length < 24) errors.push(`facts: found ${facts.length}, need at least 24`);
  const seen = new Set();
  let versionSpecific = 0;
  for (const f of facts) {
    const [fid, stmt, anchor, ver, types, , wrong] = f;
    if (seen.has(fid)) errors.push(`fact ${fid}: duplicate id`);
    seen.add(fid);
    const t = (types || '').split(',').map((x) => x.trim()).filter(Boolean);
    for (const x of t) if (!PUZZLE_TYPES.has(x)) errors.push(`fact ${fid}: unknown puzzle type "${x}"`);
    if (/^\s*\[R\]/.test(stmt) && t.includes('true-or-told')) errors.push(`fact ${fid}: [R] fact in a true-or-told slot`);
    if (anchor && !anchors.has(anchor.trim())) errors.push(`fact ${fid}: anchor "${anchor}" does not exist`);
    if (ver && ver.replace(/`/g, '') !== 'all') {
      versionSpecific++;
      if (!versionIds.has(ver.replace(/`/g, ''))) errors.push(`fact ${fid}: version "${ver}" not in versions table`);
    }
    const wc = (wrong || '').split(';').filter((x) => x.trim()).length;
    if (wc < 3) errors.push(`fact ${fid}: ${wc} wrong answers (need 3+)`);
  }
  stats.versionSpecificFacts = versionSpecific;
  if (versionSpecific < 6) errors.push(`version-specific facts: ${versionSpecific}, need at least 6`);

  // 4. leads
  const sec6 = sectionLines(lines, 6) || [];
  const leads = sec6.filter((l) => /^lead-id:/.test(l)).length;
  stats.leads = leads;
  if (leads < 3) errors.push(`leads: found ${leads}, need at least 3`);

  // 5. hotspots
  const sec7 = sectionLines(lines, 7) || [];
  const hi = sec7.findIndex((l) => /^(### |\*\*)Hotspots/.test(l));
  let hotspots = [];
  if (hi >= 0) hotspots = tableRows(sec7.slice(hi + 1));
  const decoys = hotspots.filter((r) => /decoy/i.test(r[3] || '')).length;
  stats.hotspots = hotspots.length;
  stats.decoys = decoys;
  if (hotspots.length < 12) errors.push(`hotspots: found ${hotspots.length}, need at least 12`);
  if (decoys < 5) errors.push(`decoys: found ${decoys}, need at least 5`);

  // 6. sources
  const sec10 = sectionLines(lines, 10) || [];
  const srcRows = tableRows(sec10);
  const defined = new Set(srcRows.map((r) => r[0]));
  stats.sources = defined.size;
  if (defined.size < 6) errors.push(`sources: defined ${defined.size}, need at least 6`);
  const used = new Set(chapterSources);
  const outside = lines.filter((_, i) => { const s = lines.findIndex((l) => /^## 10\./.test(l)); const e = lines.findIndex((l, j) => j > s && /^## 11\./.test(l)); return i < s || (e >= 0 && i >= e); });
  for (const l of outside) for (const m of l.match(/\bS\d+\b/g) || []) used.add(m);
  const undefinedTags = [...used].filter((s) => !defined.has(s));
  if (undefinedTags.length) errors.push(`source tags used but not defined: ${undefinedTags.sort().join(', ')}`);

  return { path, errors, stats };
}

const args = process.argv.slice(2);
const files = args.includes('--all')
  ? readdirSync(DIR).filter((f) => f.endsWith('.md')).sort().map((f) => join(DIR, f))
  : args;
if (!files.length) { console.error('usage: check-legend.mjs <file...> | --all'); process.exit(2); }

let failed = 0;
const out = [];
for (const f of files) {
  const r = check(f);
  if (r.errors.length) failed++;
  out.push(`## ${basename(f)}: ${r.errors.length ? `FAIL (${r.errors.length})` : 'PASS'}`);
  const s = r.stats;
  out.push(`chapters ${s.chapters} (words ${(s.chapterWords || []).join('/')}), facts ${s.facts} (version-specific ${s.versionSpecificFacts}), leads ${s.leads}, hotspots ${s.hotspots} (decoys ${s.decoys}), versions ${s.versions}, sources ${s.sources}`);
  for (const e of r.errors) out.push(`- ${e}`);
  out.push('');
}
console.log(out.join('\n'));
process.exit(failed ? 1 : 0);
