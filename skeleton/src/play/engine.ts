// The only place game rules live. Pure: no I/O, no clock, no ambient randomness. Every random choice was made by `generate()`
// from the Seed. The restart (a new Seed) is made by the service, not here.
import type { Run, RunSlot } from '../generator/generate.ts';
import type { LeadRun } from '../generator/versions.ts';
import type { Legend } from '../model/schema.ts';
import { score } from '../score/score.ts';
import { PlayError } from './errors.ts';
import { FEAR } from './fear.ts';
import { HOTSPOT_FEAR } from './fearTable.ts';
import type { PlayState } from './state.ts';
import type { Action, EndInfo, Reply } from './types.ts';

export interface StepResult {
  state: PlayState;
  reply: Reply;
  ended: null | EndInfo;
}

/** A content id without its `<legend-id>:` prefix (state and wire ids are raw). */
export const rawId = (legendId: string, id: string): string => (id.startsWith(`${legendId}:`) ? id.slice(legendId.length + 1) : id);

export function initState(_run: Run): PlayState {
  return { v: 1, fear: 0, highestFear: 0, hint2Uses: 0, wrongAnswers: 0, opened: [], solved: [], tried: {}, hint2Used: [], tapped: [], collected: {}, followed: [] };
}

/** The slot flagged `isFinal`, else the last slot. */
export function finalSlot(run: Run): RunSlot {
  return run.slots.find((s) => s.isFinal) ?? run.slots[run.slots.length - 1]!;
}

/** The ended status a state is already in, or null. Restart is checked first, then win. */
export function endStatus(run: Run, state: PlayState): 'restarted' | 'won' | null {
  if (state.fear >= FEAR.max) return 'restarted';
  const lead = rawId(run.legendId, run.trueLead.id);
  const allSolved = run.slots.every((s) => state.solved.includes(rawId(run.legendId, s.slotId)));
  return allSolved && state.followed.includes(lead) ? 'won' : null;
}

const addOnce = (list: readonly string[], v: string): string[] => (list.includes(v) ? [...list] : [...list, v]);

function withFear(state: PlayState, delta: number): PlayState {
  const fear = Math.min(FEAR.max, Math.max(0, state.fear + delta));
  return { ...state, fear, highestFear: Math.max(state.highestFear, fear) };
}

function leadsOf(run: Run): LeadRun[] {
  return [run.trueLead, ...run.deadEnds];
}

function slotById(run: Run, id: string): RunSlot | undefined {
  return run.slots.find((s) => rawId(run.legendId, s.slotId) === id);
}

function othersSolved(run: Run, state: PlayState, slot: RunSlot): boolean {
  return run.slots.every((s) => s === slot || state.solved.includes(rawId(run.legendId, s.slotId)));
}

/** The final slot stays locked until every other slot is solved. */
function isLocked(run: Run, state: PlayState, slot: RunSlot): boolean {
  return slot === finalSlot(run) && !othersSolved(run, state, slot);
}

export function endInfo(legend: Legend, run: Run, state: PlayState, status: 'restarted' | 'won'): EndInfo {
  const slotsSolved = state.solved.length;
  const won = status === 'won';
  return {
    status,
    score: score({ slotsSolved, curseBroken: won, hint2Uses: state.hint2Uses, wrongAnswers: state.wrongAnswers }),
    slotsSolved,
    seed: run.seed,
    ...(won ? { curseText: run.finalPuzzle.description } : {}),
  };
}

function tap(legend: Legend, run: Run, state: PlayState, hotspotId: string): { state: PlayState; reply: Reply } {
  const id = legend.id;
  const hs = run.hotspots.find((h) => rawId(id, h.id) === hotspotId);
  if (!hs) throw new PlayError('refused');
  const authored = legend.world.hotspots.find((h) => h.id === hs.id);
  const sameRole = authored?.role === hs.role;
  let next: PlayState = { ...state, tapped: addOnce(state.tapped, hotspotId) };

  const opened: string[] = [];
  let collectedNow = 0;
  if (hs.role === 'meaningful') {
    for (const s of run.slots) {
      const sid = rawId(id, s.slotId);
      if (s.hotspotIds.some((h) => rawId(id, h) === hotspotId) && !next.opened.includes(sid)) {
        next = { ...next, opened: [...next.opened, sid] };
        opened.push(sid);
      }
    }
    const collected = { ...next.collected };
    for (const link of hs.links) {
      if (link.kind !== 'leadStep') continue;
      const lead = leadsOf(run).find((l) => l.id === link.leadId);
      if (!lead) continue; // a lead that is neither the true lead nor one of its dead ends does nothing
      const key = rawId(id, lead.id);
      const have = new Set(collected[key] ?? []);
      const steps = link.step === null ? lead.steps.map((_, i) => i + 1) : link.step <= lead.steps.length ? [link.step] : [];
      for (const n of steps) {
        if (!have.has(n)) {
          have.add(n);
          collectedNow += 1;
        }
      }
      collected[key] = [...have].sort((a, b) => a - b);
    }
    next = { ...next, collected };
  }

  // A fear effect applies once per Hotspot per Run, and only when the served role equals the authored role.
  const delta = HOTSPOT_FEAR[`${id}:${hotspotId}`] ?? 0;
  if (delta !== 0 && sameRole && !state.tapped.includes(hotspotId)) next = withFear(next, delta);

  const reply: Reply =
    sameRole && authored
      ? { kind: 'tap', text: authored.onTap, opened, collected: collectedNow }
      : { kind: 'tap', key: opened.length || collectedNow ? 'tap.something' : 'tap.nothing', opened, collected: collectedNow };
  return { state: next, reply };
}

function hint(legend: Legend, run: Run, state: PlayState, slotId: string, second: boolean): { state: PlayState; reply: Reply } {
  const slot = slotById(run, slotId);
  if (!slot || isLocked(run, state, slot)) throw new PlayError('refused');
  if (!second) return { state, reply: { kind: 'hint1', text: slot.hint1.text, highlight: slot.hint1.highlight.map((h) => rawId(legend.id, h)) } };
  const first = !state.hint2Used.includes(slotId);
  const next = first ? withFear({ ...state, hint2Uses: state.hint2Uses + 1, hint2Used: [...state.hint2Used, slotId] }, FEAR.hint2) : state;
  return { state: next, reply: { kind: 'hint2', anchor: slot.hint2.anchor, charged: first } };
}

function answer(legend: Legend, run: Run, state: PlayState, slotId: string, option: number): { state: PlayState; reply: Reply } {
  const slot = slotById(run, slotId);
  if (!slot || !state.opened.includes(slotId) || state.solved.includes(slotId) || isLocked(run, state, slot)) throw new PlayError('refused');
  const tried = state.tried[slotId] ?? [];
  if (tried.includes(option)) throw new PlayError('refused'); // a repeated wrong option costs nothing and is refused
  if (option === slot.correctIndex) return { state: { ...state, solved: [...state.solved, slotId] }, reply: { kind: 'answer', correct: true, slotId } };
  const next = withFear({ ...state, wrongAnswers: state.wrongAnswers + 1, tried: { ...state.tried, [slotId]: [...tried, option] } }, FEAR.wrongAnswer);
  return { state: next, reply: { kind: 'answer', correct: false, slotId } };
}

function follow(legend: Legend, run: Run, state: PlayState, leadId: string): { state: PlayState; reply: Reply } {
  const lead = leadsOf(run).find((l) => rawId(legend.id, l.id) === leadId);
  if (!lead) throw new PlayError('refused');
  const have = state.collected[leadId] ?? [];
  if (!lead.steps.every((_, i) => have.includes(i + 1))) throw new PlayError('refused');
  const isTrue = lead.id === run.trueLead.id;
  const again = state.followed.includes(leadId);
  const next = again ? state : { ...state, followed: [...state.followed, leadId] };
  if (isTrue) return { state: next, reply: { kind: 'follow', result: 'true', anchors: [] } };
  const anchors = lead.contradiction?.anchors ?? [];
  const reply: Reply = lead.deadEnd === null ? { kind: 'follow', result: 'dead', anchors } : { kind: 'follow', result: 'dead', text: lead.deadEnd, anchors };
  return { state: again ? next : withFear(next, FEAR.deadEnd), reply };
}

export function step(legend: Legend, run: Run, state: PlayState, action: Action): StepResult {
  if (endStatus(run, state)) throw new PlayError('ended');
  let r: { state: PlayState; reply: Reply };
  switch (action.kind) {
    case 'tap':
      r = tap(legend, run, state, action.hotspotId);
      break;
    case 'hint1':
      r = hint(legend, run, state, action.slotId, false);
      break;
    case 'hint2':
      r = hint(legend, run, state, action.slotId, true);
      break;
    case 'answer':
      r = answer(legend, run, state, action.slotId, action.option);
      break;
    case 'follow':
      r = follow(legend, run, state, action.leadId);
      break;
  }
  const status = endStatus(run, r.state);
  return { state: r.state, reply: r.reply, ended: status ? endInfo(legend, run, r.state, status) : null };
}
