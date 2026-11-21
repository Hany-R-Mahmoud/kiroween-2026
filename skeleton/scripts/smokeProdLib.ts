// Pure parts of the production smoke (task 10.2, Requirement 27): no network, no files, no environment. Tested without a server
// in test/smoke-prod-lib.test.ts. The runner is scripts/smoke-prod.ts.
import { normalise } from '../src/generator/normalise.ts';
import type { AtlasLegend } from '../src/atlas/view.ts';

// ---- arguments ---------------------------------------------------------------------------------------------------------
export const STEP_NAMES = ['headers', 'guest', 'user', 'anchor', 'leak', 'burst'] as const;
export type StepName = (typeof STEP_NAMES)[number];
export type ParsedArgs = { ok: true; base: string; skipBurst: boolean; only: StepName | null } | { ok: false; error: string };

/** `<https base> [--skip-burst] [--only <step name or number 1-6>]`. Plain http is accepted for localhost only. */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  let base: string | null = null;
  let skipBurst = false;
  let only: StepName | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--skip-burst') skipBurst = true;
    else if (a === '--only') {
      const v = argv[++i];
      const byNumber = v !== undefined && /^[1-6]$/.test(v) ? STEP_NAMES[Number(v) - 1] : undefined;
      const byName = STEP_NAMES.find((s) => s === v);
      only = byNumber ?? byName ?? null;
      if (only === null) return { ok: false, error: `--only needs one of: ${STEP_NAMES.join(', ')} (or 1-${STEP_NAMES.length})` };
    } else if (a.startsWith('--')) return { ok: false, error: `unknown flag ${a}` };
    else if (base === null) base = a;
    else return { ok: false, error: 'only one base address is allowed' };
  }
  if (base === null) return { ok: false, error: 'the base address is required, for example https://your-alias.vercel.app' };
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return { ok: false, error: 'the base address is not a valid URL' };
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return { ok: false, error: 'the base address must be https (http only for localhost)' };
  return { ok: true, base: url.origin, skipBurst, only };
}

/** Whether a step runs: with `--only`, that step alone; `--skip-burst` drops the burst step. */
export function stepEnabled(step: StepName, args: { only: StepName | null; skipBurst: boolean }): boolean {
  if (args.only !== null) return args.only === step;
  return !(step === 'burst' && args.skipBurst);
}

// ---- headers (names and yes/no only; a value is never returned) ----------------------------------------------------------
export interface SecurityHeaders {
  'X-Content-Type-Options nosniff': boolean;
  'Referrer-Policy': boolean;
  'Frame blocking (X-Frame-Options or CSP frame-ancestors)': boolean;
  'Content-Security-Policy': boolean;
}
export function securityHeaders(h: Headers): SecurityHeaders {
  const csp = h.get('content-security-policy') ?? '';
  const xfo = (h.get('x-frame-options') ?? '').toLowerCase();
  return {
    'X-Content-Type-Options nosniff': (h.get('x-content-type-options') ?? '').toLowerCase().includes('nosniff'),
    'Referrer-Policy': (h.get('referrer-policy') ?? '') !== '',
    'Frame blocking (X-Frame-Options or CSP frame-ancestors)': xfo === 'deny' || xfo === 'sameorigin' || /frame-ancestors\s+('none'|'self')/i.test(csp),
    'Content-Security-Policy': csp !== '',
  };
}
export const cacheImmutable = (h: Headers): boolean => /\bimmutable\b/i.test(h.get('cache-control') ?? '');
export const hasContentEncoding = (h: Headers): boolean => (h.get('content-encoding') ?? '') !== '';
/** `Name yes; Name no` for a headers record. */
export const yesNo = (r: object): string => Object.entries(r).map(([k, v]) => `${k} ${v ? 'yes' : 'no'}`).join('; ');

// ---- burst (Requirement 27.10) -----------------------------------------------------------------------------------------
export const BURST_ANSWERS = 40;
export type BurstOutcome = { kind: 'pass'; at: number } | { kind: 'finding' };
/** Pass: a 429 among the first 40 statuses (`at` is its 1-based position). None: a finding, never a failure. */
export function classifyBurst(statuses: readonly number[], limit = BURST_ANSWERS): BurstOutcome {
  const i = statuses.slice(0, limit).indexOf(429);
  return i >= 0 ? { kind: 'pass', at: i + 1 } : { kind: 'finding' };
}
export const BURST_FINDING = 'limit is per instance, burst can spread over instances';
export function countStatuses(statuses: readonly number[]): string {
  const m = new Map<number, number>();
  for (const s of statuses) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}x${n}`).join(' ');
}

// ---- results ---------------------------------------------------------------------------------------------------------------
export type Verdict = 'PASS' | 'FAIL' | 'FINDING' | 'SKIP';
export const resultLine = (v: Verdict, step: string, note = ''): string => `${v}  ${step}${note ? `  (${note})` : ''}`;
export function summarise(lines: readonly string[]): string {
  const n = (v: Verdict): number => lines.filter((l) => l.startsWith(`${v}  `)).length;
  return `summary: ${n('PASS')} PASS, ${n('FAIL')} FAIL, ${n('FINDING')} FINDING, ${n('SKIP')} SKIP`;
}

// ---- leak check (Requirement 27, design step 5) ---------------------------------------------------------------------
/** Quoted keys or values that must never appear in a response of an unfinished run. */
export const FORBIDDEN_KEYS = ['correctIndex', 'trueVersionId', 'true_version_id', 'trueLead', 'true_lead', 'seed'] as const;
export function findLeaks(body: string): string[] {
  return FORBIDDEN_KEYS.filter((k) => body.includes(`"${k}"`));
}

// ---- server function ids ------------------------------------------------------------------------------------------------------
/** The createServerFn exports of apps/game/src/server/functions.ts in source order (a test keeps this list equal to the file). */
export const SERVER_FN_ORDER = ['getShell', 'getHall', 'enterWorld', 'getWorldInfo', 'getAccount', 'startWorld', 'worldAct', 'startTutorial', 'tutorialAct', 'redeemTutorialReceipt', 'listMyRunsFn', 'myCompletedWorldsFn'] as const;
/**
 * A production build hides the function names. The client chunk that holds the functions lists their ids in source order
 * (`.handler(X(`<64 hex>`))`). Returns name -> id, or null if the count is not exactly the number of functions.
 */
export function serverFnIds(chunk: string, names: readonly string[] = SERVER_FN_ORDER): Map<string, string> | null {
  const ids = [...chunk.matchAll(/\.handler\(\s*[\w$]+\(\s*[`'"]([0-9a-f]{64})[`'"]\s*\)\s*\)/g)].map((m) => m[1]!);
  if (ids.length !== names.length) return null;
  return new Map(names.map((n, i) => [n, ids[i]!]));
}
/** Script paths named in a page (`src` or `href` ending in `.js`), in order, without duplicates. */
export function scriptPaths(html: string): string[] {
  return [...new Set([...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => m[1]!))];
}
/** Chunk files a built JS file imports (`./name.js`). */
export function chunkImports(js: string): string[] {
  return [...new Set([...js.matchAll(/["'`]\.\/([\w.-]+\.js)["'`]/g)].map((m) => m[1]!))];
}
export function firstMediaPath(html: string): string | null {
  return /\/media\/[A-Za-z0-9._\-/%]+\.(?:webp|png|jpe?g|avif)/.exec(html)?.[0] ?? null;
}
export const countId = (html: string, id: string): number => html.split(`id="${id}"`).length - 1;

// ---- the reading rule (a copy of the one in smoke-play.ts and rankOptions in test/helpers/playFromAtlas.ts, overlap reader) ----
const NEAR = 80;
const padded = (s: string): string => ` ${normalise(s)} `;
const occurrences = (hay: string, needle: string): number[] => {
  const out: number[] = [];
  if (needle.trim() === '') return out;
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) out.push(at);
  return out;
};
const STOP = new Set(['the', 'that', 'this', 'with', 'from', 'were', 'was', 'for', 'and', 'but', 'are', 'has', 'have', 'had', 'its', 'her', 'his', 'their', 'who', 'which', 'what', 'when', 'where', 'said', 'says', 'into', 'than', 'then', 'one', 'also', 'told', 'named', 'called']);
export const contentWords = (s: string): string[] => normalise(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
function overlap(question: string, option: string, hay: string): number {
  const optWords = [...new Set(contentWords(option))];
  const qWords = [...new Set(contentWords(question.replace('____', ' ')))];
  if (!optWords.length) return 0;
  let covered = 0;
  let close = 0;
  for (const w of optWords) {
    const spots = occurrences(hay, ` ${w} `);
    if (!spots.length) continue;
    covered += 1;
    for (const p of spots) {
      const win = hay.slice(Math.max(0, p - NEAR), p + w.length + 2 + NEAR);
      close = Math.max(close, qWords.filter((q) => q !== w && win.includes(` ${q} `)).length);
    }
  }
  return (covered / optWords.length) * 1000 + close;
}
export function rankOptions(question: string, options: readonly string[], text: string): number[] {
  const hay = padded(text);
  const parts = question.split('____');
  const longest = [...parts].map((p) => padded(p).trim()).filter((p) => p !== '' && hay.includes(` ${p} `)).sort((a, b) => b.length - a.length)[0];
  const at = longest === undefined ? -1 : hay.indexOf(` ${longest} `) + 1;
  const key = options.map((opt) => {
    const o = padded(opt);
    const spots = occurrences(hay, o);
    let tier = spots.length ? 1 : 0;
    if (question.includes('____') && hay.includes(padded(question.replace('____', opt)))) tier = 3;
    else if (at >= 0 && longest !== undefined && spots.some((p) => p + o.length - 2 >= at - NEAR && p <= at + longest.length + NEAR)) tier = 2;
    return tier >= 2 ? tier * 1_000_000 : overlap(question, opt, hay) + (tier === 1 ? 1 : 0);
  });
  return options.map((_, i) => i).sort((a, b) => key[b]! - key[a]! || a - b);
}
/** The text the atlas shows at an anchor: a chapter, one version, or the whole versions section. */
export function atlasText(legend: AtlasLegend, anchor: string): string | null {
  const chapter = legend.chapters.find((c) => c.anchor === anchor);
  if (chapter) return chapter.text;
  const version = (v: AtlasLegend['versions'][number]): string => [v.claim, v.conflicts, v.paragraph].join('\n\n');
  const one = legend.versions.find((v) => v.anchor === anchor);
  if (one) return version(one);
  if (anchor === legend.versionsAnchor) return legend.versions.map(version).join('\n\n');
  return null;
}
const NUMBER_WORDS = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
const NUMERIC = new RegExp(`\\b(\\d{1,4}|${NUMBER_WORDS.join('|')})\\b`, 'gi');
/** Candidate drawer answers: numbers in the sentences of the note that share the most words with the question, best first. */
export function numberCandidates(question: string, paragraphs: string[]): string[] {
  const q = new Set(contentWords(question));
  const sentences = paragraphs.flatMap((p) => p.split(/(?<=[.!?])\s+/));
  const scored = sentences.map((s) => ({ s, n: contentWords(s).filter((w) => q.has(w)).length })).sort((a, b) => b.n - a.n);
  const out: string[] = [];
  for (const { s } of scored) for (const m of s.matchAll(NUMERIC)) if (!out.includes(m[1]!)) out.push(m[1]!);
  return out.slice(0, 12);
}
