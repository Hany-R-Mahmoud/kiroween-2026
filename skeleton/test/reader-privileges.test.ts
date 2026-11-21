import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EXPECTED_GRANTS, READABLE_TABLES, REFUSED } from '../scripts/reader-checks.ts';

// The reader role's privilege list is kept as hand-run SQL in docs/tech-decisions.md and, for Phase 4, as one line
// appended to migration 0003. This test holds both to the exact list the `db:check-reader` script verifies.
// **Validates: Requirements 3.8, 13.11**
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const norm = (s: string) => s.replace(/"/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

function grantsIn(text: string): string[] {
  return [...text.matchAll(/^\s*GRANT\s+(.+?)\s+TO\s+(\S+?);/gim)].map((m) => `${norm(m[1]!)} => ${norm(m[2]!)}`);
}
const docText = readFileSync(here('../../docs/tech-decisions.md'), 'utf8');
const migrationGrants = readdirSync(here('../drizzle/'))
  .filter((f) => f.endsWith('.sql'))
  .flatMap((f) => grantsIn(readFileSync(here(`../drizzle/${f}`), 'utf8')));
const docGrants = grantsIn(docText);

describe('reader role privilege list', () => {
  it('holds exactly the expected SELECT grants, all to atlas_reader', () => {
    const selects = [...new Set(docGrants.filter((g) => g.startsWith('select')))].sort();
    expect(selects).toEqual(EXPECTED_GRANTS.map((g) => `${g} => atlas_reader`).sort());
  });

  it('grants nothing else: only CONNECT and USAGE besides SELECT, and no default privileges', () => {
    const others = docGrants.filter((g) => !g.startsWith('select'));
    expect(others.sort()).toEqual(['connect on database neondb => atlas_reader', 'usage on schema public => atlas_reader']);
    expect(docText).not.toMatch(/^\s*ALTER DEFAULT PRIVILEGES/im);
  });

  it('the migrations carry the keepers_note grant and no other grant', () => {
    expect(migrationGrants).toEqual(['select on keepers_note => atlas_reader']);
  });

  it('never grants the details, flags or runs tables', () => {
    expect(docGrants.length, 'no grants parsed, nothing to check').toBeGreaterThan(0);
    expect(migrationGrants.length).toBeGreaterThan(0);
    for (const g of [...docGrants, ...migrationGrants]) expect(g).not.toMatch(/keepers_note_details|player_flags|\bruns\b/);
  });
});

describe('db:check-reader coverage', () => {
  const sqls = REFUSED.map(([, s]) => s);
  it('reads keepers_note and refuses the details, flags and runs tables', () => {
    expect(READABLE_TABLES).toContain('keepers_note');
    for (const t of ['keepers_note_details', 'player_flags', 'runs']) expect(sqls.some((s) => new RegExp(`^select .* from ${t}\\b`).test(s)), t).toBe(true);
  });
  it('refuses INSERT, UPDATE and DELETE on keepers_note', () => {
    for (const verb of ['insert into', 'update', 'delete from']) expect(sqls.some((s) => s.startsWith(`${verb} keepers_note `)), verb).toBe(true);
  });
  it('every readable table is a granted one', () => {
    const granted = EXPECTED_GRANTS.filter((g) => !g.includes('(')).flatMap((g) => g.replace('select on ', '').split(', '));
    for (const t of READABLE_TABLES) expect(granted).toContain(t);
  });
});
