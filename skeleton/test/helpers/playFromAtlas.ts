// The scripted players for task 2.19 (requirements 13.2, 13.3, 13.4; design "Scripted player").
// `playFromAtlas` sees only what a browser sees: the PlayView of each response and the chapter text at the anchors those views
// gave. It never reads `correctIndex`, a role, `swaps` or the true version, and it does not call `generate`.
// The hotspot ids it taps come from the legend's authored hotspot list (public layout data, the same ids the Game draws).
import type { Visitor } from '../../src/access/canEnter.ts';
import { normalise } from '../../src/generator/normalise.ts';
import type { Legend } from '../../src/index.ts';
import { rawId } from '../../src/play/engine.ts';
import { actInWorld, startWorld, type PlayResponse } from '../../src/play/service.ts';
import type { Action, PlayView, SlotView } from '../../src/play/types.ts';
import { createRng } from '../../src/rng/rng.ts';
import { playSetup } from './play.ts';

const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const NEAR = 80; // design: the option must sit within 80 characters of the longest part of the statement found in the text

/** The text the atlas shows at an anchor: a chapter, one version's account, or the whole versions section. Null if none. */
export function atlasText(legend: Legend, anchor: string): string | null {
  const chapter = legend.chapters.find((c) => c.anchor === anchor);
  if (chapter) return chapter.text;
  const version = (v: Legend['versions'][number]): string => [v.claim, v.conflicts, v.paragraph].join('\n\n');
  const one = legend.versions.find((v) => v.anchor === anchor);
  if (one) return version(one);
  if (anchor === `${legend.id}--versions`) return legend.versions.map(version).join('\n\n');
  return null;
}

const padded = (s: string): string => ` ${normalise(s)} `;
const occurrences = (hay: string, needle: string): number[] => {
  const out: number[] = [];
  if (needle.trim() === '') return out;
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) out.push(at);
  return out;
};

export interface Ranking {
  /** Option indexes, best first. Ties keep option order. */
  order: number[];
  /** How many option texts appear in the chapter text at the anchor. More than one is an ambiguity. */
  appearing: number;
  /** Options whose own statement sentence is in the text verbatim. */
  exact: number;
}

const STOP = new Set(['the', 'that', 'this', 'with', 'from', 'were', 'was', 'for', 'and', 'but', 'are', 'has', 'have', 'had', 'its', 'her', 'his', 'their', 'who', 'which', 'what', 'when', 'where', 'said', 'says', 'into', 'than', 'then', 'one', 'also', 'told', 'named', 'called']);
const contentWords = (s: string): string[] => normalise(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w));

/**
 * Overlap reading, used when the statement is not in the text word for word (the chapter paraphrases it). For each word of
 * the option that occurs in the text, count how many words of the question sit within 80 characters of it; the option's score
 * is its word coverage first, then that closeness. Reads the question, the option texts and the chapter text only.
 */
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

/**
 * Score each option, best first: 3 = `before + option + after` occurs in the text; 2 = the option sits within 80 characters of
 * the longest part of the statement that does occur (both are the design's rules); then, if `reader` is `overlap`, the word
 * overlap reading above; then 1 = the option text occurs in the text; 0 = it does not.
 */
export function rankOptions(question: string, options: readonly string[], text: string, reader: 'design' | 'overlap' = 'overlap'): Ranking {
  const hay = padded(text);
  const parts = question.split('____');
  const longest = [...parts].map((p) => padded(p).trim()).filter((p) => p !== '' && hay.includes(` ${p} `)).sort((a, b) => b.length - a.length)[0];
  const at = longest === undefined ? -1 : hay.indexOf(` ${longest} `) + 1;
  const tiers = options.map((opt) => {
    const o = padded(opt);
    const spots = occurrences(hay, o);
    if (question.includes('____') && hay.includes(padded(question.replace('____', opt)))) return { tier: 3, verbatim: true };
    if (at >= 0 && longest !== undefined && spots.some((p) => p + o.length - 2 >= at - NEAR && p <= at + longest.length + NEAR)) return { tier: 2, verbatim: true };
    return { tier: spots.length ? 1 : 0, verbatim: spots.length > 0 };
  });
  // In `overlap` mode a verbatim hit below tier 2 is not ranked above a close paraphrase: both go by the overlap score.
  const key = options.map((opt, i) => {
    const t = tiers[i]!.tier;
    return reader === 'overlap' ? (t >= 2 ? t * 1_000_000 : overlap(question, opt, hay) + (t === 1 ? 1 : 0)) : t * 1_000_000;
  });
  return {
    order: options.map((_, i) => i).sort((a, b) => key[b]! - key[a]! || a - b),
    appearing: tiers.filter((t) => t.verbatim).length,
    exact: tiers.filter((t) => t.tier === 3).length,
  };
}

export type PlayerStatus = 'won' | 'restarted' | 'stuck';

export interface PlayerResult {
  legendId: string;
  seed: string;
  status: PlayerStatus;
  /** Why a Run did not end `won`, in plain words with the slot ids; empty when won. */
  problem: string[];
  slotInstances: number;
  ambiguous: number;
  wrongPaid: number;
  hint2Paid: number;
  deadEndsFollowed: number;
  peakFear: number;
  /** Slots (id and puzzle type) in which the player paid at least one wrong answer. */
  costlySlots: string[];
  /** Contradiction anchors the views gave for followed dead ends, and whether the atlas has text at each. */
  deadEndAnchors: { anchor: string; found: boolean }[];
}

/** Seeds for the restarts a losing player triggers; distinct from the Run's own seed. */
const restartSeeds = (seed: string): string[] => [seed, ...Array.from({ length: 12 }, (_, i) => `${seed}~r${i + 1}`)];

export async function playFromAtlas(legend: Legend, seed: string, reader: 'design' | 'overlap' = 'overlap'): Promise<PlayerResult> {
  const { deps } = playSetup(legend.id, restartSeeds(seed));
  const id = legend.id;
  const result: PlayerResult = {
    legendId: id,
    seed,
    status: 'stuck',
    problem: [],
    slotInstances: 0,
    ambiguous: 0,
    wrongPaid: 0,
    hint2Paid: 0,
    deadEndsFollowed: 0,
    peakFear: 0,
    costlySlots: [],
    deadEndAnchors: [],
  };
  let view: PlayView = (await startWorld(deps, alice, { legendId: id, token: null })).view;
  let lost = false;

  /** One action. Returns false when the Run ended, and records how. */
  const act = async (action: Action): Promise<PlayResponse | null> => {
    const r = await actInWorld(deps, alice, { legendId: id, token: null, action });
    result.peakFear = Math.max(result.peakFear, r.view.fear);
    if (r.ended?.status === 'restarted') {
      result.peakFear = 100;
      result.status = 'restarted';
      lost = true;
      return null;
    }
    view = r.view;
    return r;
  };

  for (const h of legend.world.hotspots) {
    if (!(await act({ kind: 'tap', hotspotId: rawId(id, h.id) }))) return result;
  }

  // Slots in the order the view lists them, the final one last (it is locked until the others are solved).
  const slotOrder = [...view.slots].sort((a, b) => Number(a.final) - Number(b.final)).map((s) => s.slotId);
  const slotNow = (slotId: string): SlotView => view.slots.find((s) => s.slotId === slotId)!;

  for (const slotId of slotOrder) {
    if (slotNow(slotId).state !== 'open') {
      result.problem.push(`${slotId}: not open after tapping every hotspot (${slotNow(slotId).state})`);
      return result;
    }
    const h2 = await act({ kind: 'hint2', slotId });
    if (!h2) return result;
    if (h2.reply?.kind !== 'hint2') throw new Error('hint2 reply expected');
    if (h2.reply.charged) result.hint2Paid += 1;
    const text = atlasText(legend, h2.reply.anchor);
    if (text === null) {
      result.problem.push(`${slotId}: no atlas text at the Hint 2 anchor ${h2.reply.anchor}`);
      return result;
    }
    const sv = slotNow(slotId);
    const { question, options } = sv;
    if (question === undefined || options === undefined) throw new Error('an open slot carries its question and options');
    const ranking = rankOptions(question, options, text, reader);
    result.slotInstances += 1;
    if (ranking.appearing > 1) result.ambiguous += 1;

    let solved = false;
    for (const option of ranking.order) {
      if ((slotNow(slotId).tried ?? []).includes(option)) continue;
      const r = await act({ kind: 'answer', slotId, option: option as 0 | 1 | 2 | 3 });
      if (!r) return result;
      if (r.reply?.kind === 'answer' && r.reply.correct) {
        solved = true;
        break;
      }
      result.wrongPaid += 1;
      const label = `${slotId} [${sv.type}]`;
      if (!result.costlySlots.includes(label)) result.costlySlots.push(label);
    }
    if (!solved) {
      result.problem.push(`${slotId}: no option accepted`);
      return result;
    }
  }

  // Leads: every collected lead the view lets the player follow, in an order drawn from the seed, until the true one confirms.
  const order = createRng(`player/${seed}`).shuffle(view.leads.filter((l) => l.canFollow).map((l) => l.leadId));
  for (const leadId of order) {
    const r = await act({ kind: 'follow', leadId });
    if (!r) return result;
    if (r.reply?.kind === 'follow' && r.reply.result === 'dead') {
      result.deadEndsFollowed += 1;
      // The contradiction anchors are read from the view (the lead's `followed` field), which is what the browser draws.
      const followed = view.leads.find((l) => l.leadId === leadId)?.followed;
      const anchors = followed?.kind === 'dead' ? followed.anchors : [];
      if (!anchors.length) result.deadEndAnchors.push({ anchor: '(none given)', found: false });
      for (const anchor of anchors) result.deadEndAnchors.push({ anchor, found: atlasText(legend, anchor) !== null });
    }
    if (r.ended?.status === 'won') {
      result.status = 'won';
      return result;
    }
  }
  if (!lost) result.problem.push(`no lead confirmed after following ${order.length} of ${view.leads.length} visible leads`);
  return result;
}

/** The fear-filling player (requirement 13.3). Plays wrong options in order, then Hint 2, then dead ends, until the meter fills. */
export async function playAsGuesser(legend: Legend, seed: string) {
  const setup = playSetup(legend.id, [seed, `${seed}~g1`, `${seed}~g2`]);
  const { deps, store } = setup;
  const id = legend.id;
  let view: PlayView = (await startWorld(deps, alice, { legendId: id, token: null })).view;
  const first = await store.current('alice', id);
  const act = async (action: Action): Promise<PlayResponse | null> => {
    const r = await actInWorld(deps, alice, { legendId: id, token: null, action });
    if (r.ended) return r;
    view = r.view;
    return null;
  };
  const tryAct = async (action: Action): Promise<PlayResponse | null> => {
    try {
      return await act(action);
    } catch {
      return null; // a refused action costs nothing; move on
    }
  };

  for (const h of legend.world.hotspots) {
    const end = await tryAct({ kind: 'tap', hotspotId: rawId(id, h.id) });
    if (end) return { end, oldSeed: seed, first, setup };
  }
  // A player who wants the meter full asks Hint 2 on every open slot first, then guesses.
  for (const s of view.slots.filter((x) => x.state === 'open')) {
    const end = await tryAct({ kind: 'hint2', slotId: s.slotId });
    if (end) return { end, oldSeed: seed, first, setup };
  }
  for (let pass = 0; pass < legend.world.slots.length; pass++) {
    for (const s of [...view.slots].sort((a, b) => Number(a.final) - Number(b.final))) {
      if (s.state !== 'open') continue;
      for (const option of [0, 1, 2, 3] as const) {
        if ((s.tried ?? []).includes(option)) continue;
        const end = await tryAct({ kind: 'answer', slotId: s.slotId, option });
        if (end) return { end, oldSeed: seed, first, setup };
        if (view.slots.find((x) => x.slotId === s.slotId)?.state === 'solved') break;
      }
      const end = await tryAct({ kind: 'hint2', slotId: s.slotId });
      if (end) return { end, oldSeed: seed, first, setup };
    }
  }
  for (const l of view.leads.filter((x) => x.canFollow)) {
    const end = await tryAct({ kind: 'follow', leadId: l.leadId });
    if (end) return { end, oldSeed: seed, first, setup };
  }
  return { end: null, oldSeed: seed, first, setup };
}
