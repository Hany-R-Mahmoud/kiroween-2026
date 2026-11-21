// Builds the PlayView the browser receives, from Earned_Data only. Pure: no I/O, no clock, no randomness.
// Nothing here reads `correctIndex`, a Hotspot role, `swaps`, the true version, an unearned Hint 2 anchor, or the Seed of a
// Run in progress. Leads are listed in content order and carry the same fields whether true or dead end.
import type { Run, RunSlot } from '../generator/generate.ts';
import type { LeadRun } from '../generator/versions.ts';
import type { Legend } from '../model/schema.ts';
import { endInfo, endStatus, finalSlot, rawId } from './engine.ts';
import type { PlayState } from './state.ts';
import type { LeadView, PlayView, SlotView } from './types.ts';

function slotView(run: Run, state: PlayState, slot: RunSlot, i: number): SlotView {
  const id = rawId(run.legendId, slot.slotId);
  const final = slot === finalSlot(run);
  const solved = state.solved.includes(id);
  const locked = final && !run.slots.every((s) => s === slot || state.solved.includes(rawId(run.legendId, s.slotId)));
  const open = !solved && !locked && state.opened.includes(id);
  const view: SlotView = { slotId: id, index: i + 1, type: slot.type, final, state: solved ? 'solved' : locked ? 'locked' : open ? 'open' : 'hidden' };
  if (open) {
    view.question = slot.question;
    view.options = [...slot.options];
    view.tried = [...(state.tried[id] ?? [])];
  }
  if (state.hint2Used.includes(id)) view.hint2 = { anchor: slot.hint2.anchor };
  return view;
}

function leadView(legend: Legend, run: Run, state: PlayState, lead: LeadRun, startsFrom: string): LeadView | null {
  const id = rawId(run.legendId, lead.id);
  const have = state.collected[id] ?? [];
  if (!have.length) return null;
  const version = legend.versions.find((v) => v.id === startsFrom);
  const view: LeadView = {
    leadId: id,
    start: version ? `${version.sourceType}, ${version.era}` : rawId(run.legendId, startsFrom),
    total: lead.steps.length,
    steps: [...have].sort((a, b) => a - b).filter((n) => n >= 1 && n <= lead.steps.length).map((n) => ({ n, text: lead.steps[n - 1]! })),
    canFollow: lead.steps.every((_, k) => have.includes(k + 1)),
  };
  if (state.followed.includes(id)) {
    view.followed = lead.id === run.trueLead.id ? { kind: 'true' } : { kind: 'dead', text: lead.deadEnd ?? '', anchors: [...(lead.contradiction?.anchors ?? [])] };
  }
  return view;
}

export function toView(legend: Legend, run: Run, state: PlayState): PlayView {
  const byId = new Map([run.trueLead, ...run.deadEnds].map((l) => [l.id, l]));
  // Content order, so the position of the true lead in the list says nothing.
  const leads = legend.leads.flatMap((l) => {
    const lead = byId.get(l.id);
    const v = lead && leadView(legend, run, state, lead, l.startsFrom);
    return v ? [v] : [];
  });
  const status = endStatus(run, state);
  return {
    legendId: run.legendId,
    status: status ?? 'in_progress',
    fear: state.fear,
    slots: run.slots.map((s, i) => slotView(run, state, s, i)),
    leads,
    ...(status ? { ended: endInfo(legend, run, state, status) } : {}),
  };
}
