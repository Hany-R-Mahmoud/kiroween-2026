/** `f07`, `f-07`, `f-007` all become `f7`, so links match fact ids across format variants. */
export const factKey = (raw: string): string => {
  const m = /^f-?0*(\d+)$/i.exec(raw.trim());
  return m ? `f${m[1]}` : raw.trim().toLowerCase();
};

/** Fact tokens in free text, with `f-21 to f-24` ranges expanded. Returns normalised keys. */
export function factRefs(text: string): string[] {
  const keys: string[] = [];
  const re = /\bf-?0*(\d+)\b(?:\s+(?:to|–|-)\s+f-?0*(\d+)\b)?/gi;
  for (const m of text.matchAll(re)) {
    const lo = Number(m[1]);
    const hi = m[2] ? Number(m[2]) : lo;
    for (let i = lo; i <= hi; i++) keys.push(`f${i}`);
  }
  return keys;
}

export interface RawLink {
  factKeys: string[];
  leads: { leadRaw: string; step: number | null }[];
}

/** Links in a hotspot cell: facts, `lead-n step k`, bare `lead-n`. `lead-n (false trail)` is not a link. */
export function parseLinks(cell: string): RawLink {
  const leads: RawLink['leads'] = [];
  const re = /\b(lead-\d+)(?:\s+steps?\s+(\d+(?:\s*(?:,|and|to|-|–)\s*\d+)*))?/gi;
  for (const m of cell.matchAll(re)) {
    const after = cell.slice((m.index ?? 0) + m[0].length);
    if (/^\s*\(false trail/i.test(after)) continue;
    if (!m[2]) {
      leads.push({ leadRaw: m[1]!, step: null });
      continue;
    }
    const nums = m[2].split(/\D+/).filter(Boolean).map(Number);
    const isRange = /to|-|–/.test(m[2]) && nums.length === 2;
    const steps = isRange ? Array.from({ length: nums[1]! - nums[0]! + 1 }, (_, i) => nums[0]! + i) : nums;
    for (const s of steps) leads.push({ leadRaw: m[1]!, step: s });
  }
  // lead ids contain digits, so strip them before looking for facts
  const factKeys = factRefs(cell.replace(/\blead-\d+/gi, ''));
  return { factKeys, leads };
}
