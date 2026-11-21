import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// No YAML package is a dependency of this workspace (js-yaml is only a transitive dev tool). The agent file keeps its
// front matter as one `key: value` per line, with JSON-style values, which is valid YAML and parses with JSON.parse.
const FILE = resolve(import.meta.dirname, '../../.kiro/agents/game-balance-reviewer.md');
const FINDINGS = 'docs/phase-4-notes/balance.md';

function parse(text: string): { meta: Record<string, unknown>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error('no front matter');
  const meta: Record<string, unknown> = {};
  for (const line of m[1]!.split('\n')) {
    const kv = /^([A-Za-z][A-Za-z0-9]*): (.*)$/.exec(line);
    if (!kv) throw new Error(`bad front matter line: ${line}`);
    meta[kv[1]!] = /^[[{"]/.test(kv[2]!) ? JSON.parse(kv[2]!) : kv[2];
  }
  return { meta, body: m[2]! };
}

type Rule = { capability: string; match: string[]; exclude?: string[]; effect: string };

describe('game-balance-reviewer agent file', () => {
  const { meta, body } = parse(readFileSync(FILE, 'utf8'));
  const rules = (meta.permissions as { rules: Rule[] }).rules;

  it('exists, parses and is named game-balance-reviewer', () => {
    expect(meta.name).toBe('game-balance-reviewer');
    expect(typeof meta.description).toBe('string');
  });

  it('uses no legacy fields', () => {
    for (const k of ['allowedTools', 'toolsSettings', 'toolAliases', 'keyboardShortcut']) {
      expect(meta).not.toHaveProperty(k);
    }
  });

  it('allows writes only to balance.md and denies every other write, shell and web', () => {
    const writes = rules.filter((r) => r.capability === 'fs_write');
    expect(writes.filter((r) => r.effect === 'allow').map((r) => r.match)).toEqual([[FINDINGS]]);
    const deny = writes.find((r) => r.effect === 'deny');
    expect(deny?.match).toEqual(['**']);
    expect(deny?.exclude).toEqual([FINDINGS]);
    for (const cap of ['shell', 'web_fetch']) {
      expect(rules.some((r) => r.capability === cap && r.effect === 'deny' && r.match.includes('*'))).toBe(true);
    }
  });

  it('prompt carries the hard rules', () => {
    expect(body).toMatch(/Never edit anything under `content\/` or `assets\/`/);
    expect(body).toMatch(/Never print secrets/);
    expect(body).toMatch(/legend id/);
    expect(body).toMatch(/severity/);
    expect(body).toMatch(/suggested fix/);
    expect(body).toMatch(/FEAR/);
  });
});
