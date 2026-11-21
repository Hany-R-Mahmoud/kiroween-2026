import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { KEEPERS_NOTE_ANCHOR, parseKeepersNote, type KeepersDetail, type KeepersNote } from '../src/keepers/parse.ts';
import { keepersContentHash, planKeepersNote } from '../src/keepers/plan.ts';
import { keepersDetailsFromRows, keepersNoteViewFromRow } from '../src/keepers/read.ts';

const realText = readFileSync(new URL('../../content/keepers-note.md', import.meta.url), 'utf8');
const count = (needle: string, hay: string) => hay.split(needle).length - 1;
const parseOk = (text: string): { note: KeepersNote; details: KeepersDetail[] } => {
  const r = parseKeepersNote(text);
  if (!r.ok) throw new Error(r.errors.map((e) => `${e.line}: ${e.message}`).join('; '));
  return r;
};

// Generated documents keep the real file's shape. Filler is lowercase letters only, so a phrase (which starts with
// an upper-case marker) and the anchor can occur only where the generator puts them.
const word = fc.stringMatching(/^[a-z]{2,9}$/);
const text = (min: number, max: number) => fc.array(word, { minLength: min, maxLength: max }).map((w) => w.join(' '));
const cell = text(1, 5); // no `|`, no newline, no edge spaces
const detailArb = (id: string) =>
  fc.record({ phrase: text(1, 4).map((t) => `PHRASE ${id} ${t}`), question: cell, answer: cell, also: fc.array(cell, { maxLength: 2 }) });

const docArb = fc
  .record({
    title: cell,
    label: cell,
    hook1: cell,
    rt: fc.integer({ min: 1, max: 30 }),
    chTitle: cell,
    hook: cell,
    paras: fc.array(text(3, 12), { minLength: 3, maxLength: 6 }),
    year: detailArb('d-year'),
    keys: detailArb('d-keys'),
    rooms: detailArb('d-rooms'),
    spots: fc.shuffledSubarray([0, 1, 2, 3, 4, 5], { minLength: 3, maxLength: 3 }),
  })
  .map((g) => {
    const ds = [
      ['d-year', g.year],
      ['d-keys', g.keys],
      ['d-rooms', g.rooms],
    ] as const;
    const paras = g.paras.map((p) => p);
    ds.forEach(([, d], i) => {
      const at = g.spots[i]! % paras.length;
      paras[at] = `${paras[at]} ${d.phrase}`;
    });
    const rows = ds.map(([id, d]) => `| ${id} | ${d.phrase} | ${d.question} | ${d.answer} | ${d.also.length ? d.also.join(', ') : 'none'} |`);
    const doc = [
      '# The Keeper\'s Note (`keepers-note`)',
      'Intro line.',
      '## 0. Meta',
      '| Field | Value |',
      '|---|---|',
      '| id | keepers-note |',
      `| title | ${g.title} |`,
      `| label | ${g.label} |`,
      `| reading_time_min | ${g.rt} |`,
      `| one_line_hook | ${g.hook1} |`,
      '## 1. Chapter',
      `#### ch-1 · ${g.chTitle}`,
      `anchor: ${KEEPERS_NOTE_ANCHOR}`,
      ...paras.flatMap((p) => [p, '']),
      `Hook: ${g.hook}`,
      '## 2. Drawer code details',
      'Intro.',
      '| detail_id | Phrase in the chapter | Question at the drawer | Answer | Also accept |',
      '|---|---|---|---|---|',
      ...rows,
      '',
    ].join('\n');
    return { g, doc, ds, paras };
  });

describe("Property 25: Keeper's Note import round trip", () => {
  /** **Validates: Requirements 3.2, 3.9** */
  it('parse, plan and read give back the same note and three detail rows', () => {
    fc.assert(
      fc.property(docArb, ({ g, doc, ds, paras }) => {
        const { note, details } = parseOk(doc);
        const plan = planKeepersNote(note, details, keepersContentHash(doc));
        // Database-shaped rows, as the importer writes them and the readers get them.
        const noteRow = {
          id: plan.note.id,
          title: plan.note.title,
          label: plan.note.label,
          reading_time_min: plan.note.readingTimeMin,
          one_line_hook: plan.note.oneLineHook,
          chapter_title: plan.note.chapterTitle,
          anchor: plan.note.anchor,
          body: plan.note.body,
          hook: plan.note.hook,
        };
        const detailRows = [...plan.details].reverse().map((d) => ({
          detail_id: d.detailId,
          ordinal: d.ordinal,
          phrase: d.phrase,
          question: d.question,
          answer: d.answer,
          also_accept: d.alsoAccept,
        }));
        const view = keepersNoteViewFromRow(noteRow);
        const back = keepersDetailsFromRows(detailRows);

        expect(view.title).toBe(g.title);
        expect(view.label).toBe(g.label);
        expect(view.oneLineHook).toBe(g.hook1);
        expect(view.readingTimeMin).toBe(g.rt);
        expect(view.chapterTitle).toBe(g.chTitle);
        expect(view.hook).toBe(g.hook);
        expect(view.anchor).toBe(KEEPERS_NOTE_ANCHOR);
        expect(view.paragraphs).toEqual(paras);
        expect(back).toEqual(ds.map(([id, d], i) => ({ detailId: id, ordinal: i + 1, phrase: d.phrase, question: d.question, answer: d.answer, alsoAccept: d.also })));
        for (const d of back) expect(count(d.phrase, noteRow.body)).toBe(1);
        expect(count(KEEPERS_NOTE_ANCHOR, doc)).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects a document whose phrase appears twice in the chapter', () => {
    fc.assert(
      fc.property(docArb, ({ doc, ds }) => {
        const phrase = ds[0][1].phrase;
        const bad = doc.replace('Hook:', `${phrase}\n\nHook:`);
        const r = parseKeepersNote(bad);
        expect(r.ok).toBe(false);
      }),
      { numRuns: 25 },
    );
  });
});

describe("Keeper's Note parse examples (content/keepers-note.md)", () => {
  const { note, details } = parseOk(realText);
  it('reads the meta, chapter and three rows', () => {
    expect(note.id).toBe('keepers-note');
    expect(note.title).toBe("The Keeper's Note");
    expect(note.readingTimeMin).toBe(2);
    expect(details.map((d) => d.detailId)).toEqual(['d-year', 'd-keys', 'd-rooms']);
    expect(details[1]!.alsoAccept).toEqual(['eleven']);
    expect(details[0]!.alsoAccept).toEqual([]);
  });
  it('has the anchor exactly once in the file', () => {
    expect(note.anchor).toBe('keepers-note--ch-1');
    expect(count(note.anchor, realText)).toBe(1);
  });
  it('rejects a second occurrence of the anchor', () => {
    const r = parseKeepersNote(`${realText}\nSee keepers-note--ch-1.\n`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => /exactly once/.test(e.message))).toBe(true);
  });
  it('has each of the three phrases exactly once in the chapter', () => {
    for (const d of details) expect(count(d.phrase, note.body)).toBe(1);
  });
  it('has no other year or count that matches an answer', () => {
    for (const d of details) {
      // The accepted forms (digits and spelled out) together occur once: only the phrase carries the answer.
      const total = [d.answer, ...d.alsoAccept].reduce((n, a) => n + (note.body.match(new RegExp(`\\b${a}\\b`, 'gi'))?.length ?? 0), 0);
      expect(total, d.detailId).toBe(1);
    }
    // Digits in the chapter: only the year answer.
    expect(note.body.match(/\d+/g)).toEqual(['1887']);
    // Number words (2 to 20): only the two count answers.
    const words = note.body.match(/\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi);
    expect(words).toEqual(['eleven', 'fourteen']);
  });
  it('reports line numbers for broken input', () => {
    const r = parseKeepersNote(realText.replace('anchor: keepers-note--ch-1', 'anchor: wrong'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.every((e) => e.line > 0)).toBe(true);
  });
});
