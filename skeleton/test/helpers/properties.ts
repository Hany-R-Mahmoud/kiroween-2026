import type { Run } from '../../src/index.ts';
import type { Hotspot, Legend } from '../../src/index.ts';
import { answerInText, normalise, toParagraphs } from '../../src/generator/normalise.ts';

// Each property re-derives its rule from the Legend data. None of them calls generator code
// except `normalise`, which has its own tests. Each returns a list of violations (empty = holds).
export type Property = (l: Legend, run: Run) => string[];

const fact = (l: Legend, id: string) => l.facts.find((f) => f.id === id)!;
const baseHotspot = (l: Legend, id: string): Hotspot => l.world.hotspots.find((h) => h.id === id)!;
const meaningful = (run: Run) => run.hotspots.filter((h) => h.role === 'meaningful');

/** Paragraphs the fact's anchor points at, computed here from the chapters and versions. */
function linkedParagraphs(l: Legend, anchor: string): string[] {
  const ch = l.chapters.find((c) => c.anchor === anchor);
  if (ch) return toParagraphs(ch.text);
  const v = l.versions.find((x) => x.anchor === anchor);
  if (v) return toParagraphs(v.claim, v.conflicts, v.paragraph);
  if (anchor === `${l.id}--versions`) return l.versions.flatMap((x) => toParagraphs(x.claim, x.conflicts, x.paragraph));
  return [];
}

export const PROPERTIES: Record<string, Property> = {
  'every slot is filled, in order, including a slot marked final': (l, run) => {
    const want = l.world.slots.map((s) => s.id);
    const got = run.slots.map((s) => s.slotId);
    const out = want.join() === got.join() ? [] : [`slots ${got.join()} != ${want.join()}`];
    for (const s of run.slots) {
      const slot = l.world.slots.find((x) => x.id === s.slotId)!;
      if (s.isFinal !== slot.isFinal || s.type !== slot.type) out.push(`${s.slotId}: type or final flag differs from the legend`);
      if (!slot.candidateFactIds.includes(s.factId)) out.push(`${s.slotId}: fact ${s.factId} is not a candidate`);
    }
    return out;
  },

  'exactly four distinct options and exactly one correct': (l, run) =>
    run.slots.flatMap((s) => {
      const f = fact(l, s.factId);
      const out: string[] = [];
      if (s.options.length !== 4) out.push(`${s.slotId}: ${s.options.length} options`);
      if (new Set(s.options.map(normalise)).size !== s.options.length) out.push(`${s.slotId}: options not distinct`);
      if (s.options.filter((o) => o === f.answer).length !== 1) out.push(`${s.slotId}: correct answer appears ${s.options.filter((o) => o === f.answer).length} times`);
      if (s.options[s.correctIndex] !== f.answer) out.push(`${s.slotId}: correctIndex does not point at the answer`);
      return out;
    }),

  'the correct answer is never among the wrong ones, and the wrong ones come from the fact': (l, run) =>
    run.slots.flatMap((s) => {
      const f = fact(l, s.factId);
      const wrong = s.options.filter((_, i) => i !== s.correctIndex);
      const out: string[] = [];
      if (wrong.length !== 3) out.push(`${s.slotId}: ${wrong.length} wrong options`);
      for (const w of wrong) {
        if (!f.wrongAnswers.includes(w)) out.push(`${s.slotId}: wrong option "${w}" is not in the fact's list`);
        if (normalise(w) === normalise(f.answer)) out.push(`${s.slotId}: wrong option equals the answer`);
      }
      return out;
    }),

  'a fact fits its slot: type, version, confidence, and only one slot per fact': (l, run) => {
    const out = run.slots.flatMap((s) => {
      const f = fact(l, s.factId);
      const x: string[] = [];
      if (!f.puzzleTypes.includes(s.type)) x.push(`${s.slotId}: fact ${f.id} cannot fill ${s.type}`);
      if (f.versionId !== null && f.versionId !== run.trueVersionId) x.push(`${s.slotId}: fact ${f.id} belongs to ${f.versionId}, true version is ${run.trueVersionId}`);
      if (s.type === 'true-or-told' && f.confidence === 'R') x.push(`${s.slotId}: [R] fact ${f.id} in a true-or-told slot`);
      return x;
    });
    if (new Set(run.slots.map((s) => s.factId)).size !== run.slots.length) out.push('a fact fills two slots');
    return out;
  },

  'the true version has a lead that can be true for it, and a "never" lead is never the true lead': (l, run) => {
    const out: string[] = [];
    const lead = l.leads.find((x) => x.id === run.trueLead.id);
    if (!lead) return [`true lead ${run.trueLead.id} is not in the legend`];
    if (lead.canBeTrueFor === 'never') out.push(`true lead ${lead.id} is marked never`);
    else if (!lead.canBeTrueFor.includes(run.trueVersionId)) out.push(`true lead ${lead.id} cannot be true for ${run.trueVersionId}`);
    if (run.deadEnds.some((d) => d.id === lead.id)) out.push('the true lead is also listed as a dead end');
    return out;
  },

  'every dead end names a contradiction fact and an anchor that exist': (l, run) =>
    run.deadEnds.flatMap((d) => {
      const out: string[] = [];
      if (!d.contradiction) return [`${d.id}: dead end without a contradiction`];
      for (const id of d.contradiction.factIds) if (!l.facts.some((f) => f.id === id)) out.push(`${d.id}: unknown fact ${id}`);
      for (const a of d.contradiction.anchors) if (!l.anchors.includes(a)) out.push(`${d.id}: unknown anchor ${a}`);
      return out;
    }),

  'every filled slot and every true-lead step has a meaningful hotspot': (l, run) => {
    const out: string[] = [];
    for (const s of run.slots) {
      const cands = l.world.slots.find((x) => x.id === s.slotId)!.candidateFactIds;
      if (!meaningful(run).some((h) => h.links.some((k) => k.kind === 'fact' && cands.includes(k.factId)))) out.push(`${s.slotId}: no meaningful hotspot`);
      if (!s.hotspotIds.length || s.hotspotIds.some((id) => run.hotspots.find((h) => h.id === id)?.role !== 'meaningful')) out.push(`${s.slotId}: hotspotIds are not all meaningful`);
    }
    run.trueLead.steps.forEach((_, i) => {
      if (!meaningful(run).some((h) => h.links.some((k) => k.kind === 'leadStep' && k.leadId === run.trueLead.id && (k.step === null || k.step === i + 1)))) out.push(`${run.trueLead.id} step ${i + 1}: no meaningful hotspot`);
    });
    return out;
  },

  'at least 5 decoys remain, and swaps are valid pairs that hand over the links': (l, run) => {
    const out: string[] = [];
    if (run.hotspots.filter((h) => h.role === 'decoy').length < 5) out.push('fewer than 5 decoys');
    if (run.hotspots.length !== l.world.hotspots.length) out.push('hotspot count changed');
    const swapped = new Set(run.swaps.flat());
    if (swapped.size !== run.swaps.length * 2) out.push('a hotspot is in two swaps');
    for (const [a, b] of run.swaps) {
      const ha = baseHotspot(l, a);
      const hb = baseHotspot(l, b);
      if (!ha.swappable || !hb.swappable) out.push(`swap ${a}/${b}: not both swappable`);
      if (ha.sceneId !== hb.sceneId) out.push(`swap ${a}/${b}: different scenes`);
      if (ha.role === hb.role) out.push(`swap ${a}/${b}: same role`);
      const [m, d] = ha.role === 'meaningful' ? [ha, hb] : [hb, ha];
      const now = (id: string) => run.hotspots.find((h) => h.id === id)!;
      if (now(m.id).role !== 'decoy' || now(d.id).role !== 'meaningful') out.push(`swap ${a}/${b}: roles not exchanged`);
      if (JSON.stringify(now(d.id).links) !== JSON.stringify(m.links)) out.push(`swap ${a}/${b}: links not handed over`);
    }
    for (const h of run.hotspots) {
      const base = baseHotspot(l, h.id);
      if (!swapped.has(h.id) && (h.role !== base.role || JSON.stringify(h.links) !== JSON.stringify(base.links))) out.push(`${h.id}: changed without a swap`);
    }
    return out;
  },

  'hint 2 deep-links to a chapter, versions or per-version anchor, and hint 1 never points at a decoy': (l, run) =>
    run.slots.flatMap((s) => {
      const out: string[] = [];
      if (!l.anchors.includes(s.hint2.anchor)) out.push(`${s.slotId}: hint 2 anchor ${s.hint2.anchor} is not a deep-link target`);
      const base = l.world.slots.find((x) => x.id === s.slotId)!;
      if (base.hint2Anchor !== `${l.id}--versions` && s.hint2.anchor !== base.hint2Anchor) out.push(`${s.slotId}: hint 2 anchor was changed`);
      if (base.hint2Anchor === `${l.id}--versions` && s.hint2.anchor !== base.hint2Anchor && s.hint2.anchor !== `${l.id}--versions--${run.trueVersionId.slice(l.id.length + 1)}`) out.push(`${s.slotId}: bare versions anchor refined to the wrong version`);
      for (const id of s.hint1.highlight) {
        const h = run.hotspots.find((x) => x.id === id);
        if (!h) out.push(`${s.slotId}: highlight ${id} does not exist`);
        else if (h.role === 'decoy' && baseHotspot(l, id).role === 'meaningful') out.push(`${s.slotId}: highlight ${id} points at a hotspot a swap made a decoy`);
      }
      return out;
    }),

  'the answer is written in the linked text, for every type that needs it': (l, run) =>
    run.slots.flatMap((s) => {
      if (s.type === 'true-or-told' || s.type === 'ritual-order') return [];
      const f = fact(l, s.factId);
      return answerInText(linkedParagraphs(l, f.anchor), f.answer, s.type) ? [] : [`${s.slotId}: answer "${f.answer}" is not in ${f.anchor}`];
    }),
};
