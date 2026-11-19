import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { addGuestRun, GUEST_KEY, GUEST_MAX_RUNS, readGuestRuns, type GuestRun, type KeyValueStore } from '../src/guest/progress.ts';

const memory = (initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } => {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};
const run = (n: number): GuestRun => ({ legendId: 'banshee', status: 'won', slotsSolved: 5, score: n, finishedAt: '2026-11-19T00:00:00.000Z' });

describe('guest progress (browser only)', () => {
  it('stores runs newest first and reads them back', () => {
    const s = memory();
    addGuestRun(s, run(1));
    addGuestRun(s, run(2));
    expect(readGuestRuns(s).map((r) => r.score)).toEqual([2, 1]);
  });

  it(`keeps only the newest ${GUEST_MAX_RUNS}`, () => {
    const s = memory();
    for (let i = 0; i < GUEST_MAX_RUNS + 5; i++) addGuestRun(s, run(i));
    const runs = readGuestRuns(s);
    expect(runs).toHaveLength(GUEST_MAX_RUNS);
    expect(runs[0]!.score).toBe(GUEST_MAX_RUNS + 4);
  });

  it('drops unreadable data instead of throwing', () => {
    expect(readGuestRuns(memory({ [GUEST_KEY]: '{not json' }))).toEqual([]);
    expect(readGuestRuns(memory({ [GUEST_KEY]: '{"a":1}' }))).toEqual([]);
    expect(readGuestRuns(memory({ [GUEST_KEY]: JSON.stringify([run(1), { legendId: 7 }, { ...run(2), status: 'hacked' }]) })).map((r) => r.score)).toEqual([1]);
  });

  it('the module imports nothing and calls nothing that can reach the network or the server (R4.12)', () => {
    const src = readFileSync(fileURLToPath(new URL('../src/guest/progress.ts', import.meta.url)), 'utf8');
    expect(src).not.toMatch(/^\s*import\s/m);
    for (const word of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'createServerFn', 'node:http', 'node:net'])
      expect(src.includes(word), word).toBe(false);
  });
});
