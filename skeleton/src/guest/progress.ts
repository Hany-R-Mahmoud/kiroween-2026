// Guest progress lives only in the browser (R4.12). This module takes a storage object and imports nothing that can
// reach the network; a test reads this file and fails if that ever changes.

export interface GuestRun {
  legendId: string;
  status: 'won' | 'restarted' | 'abandoned';
  slotsSolved: number;
  score: number;
  finishedAt: string; // ISO date
}

/** The subset of the Web Storage API this module uses, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const GUEST_KEY = 'kiroween.guest.runs.v1';
export const GUEST_MAX_RUNS = 20;

function isGuestRun(x: unknown): x is GuestRun {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r['legendId'] === 'string' &&
    (r['status'] === 'won' || r['status'] === 'restarted' || r['status'] === 'abandoned') &&
    Number.isInteger(r['slotsSolved']) &&
    Number.isInteger(r['score']) &&
    typeof r['finishedAt'] === 'string'
  );
}

/** Newest first. Anything unreadable (another tab, an old format, a hand edit) is dropped, never thrown. */
export function readGuestRuns(storage: KeyValueStore): GuestRun[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(GUEST_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isGuestRun) : [];
  } catch {
    return [];
  }
}

/** Keeps the newest GUEST_MAX_RUNS. */
export function addGuestRun(storage: KeyValueStore, run: GuestRun): GuestRun[] {
  const runs = [run, ...readGuestRuns(storage)].slice(0, GUEST_MAX_RUNS);
  storage.setItem(GUEST_KEY, JSON.stringify(runs));
  return runs;
}
