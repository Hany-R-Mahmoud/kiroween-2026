// Pure rules for the World route (task 7.7). No I/O, no React, no random source (game logic uses the Seed on the server).
import { atlasUrl, type PlayView, type Reply, type SlotView } from '@kiroween/skeleton/client';
import type { MessageKey } from '../i18n/en.ts';
import type { FearEventEntry, FearTrigger } from '../layout/fearEvents.ts';

export interface WorldInfoScene {
  id: string;
  name: string;
  alt: string;
}
export interface WorldInfoHotspot {
  id: string;
  sceneId: string;
  name: string;
}

/** Hotspots of one scene, in content order. */
export const hotspotsOfScene = <H extends { sceneId: string }>(hotspots: readonly H[], sceneId: string): H[] => hotspots.filter((h) => h.sceneId === sceneId);

/** Hint 1 highlights of every slot that is not solved yet. Rebuilt from the view, so a reload shows the same marks. */
export function markedIds(view: PlayView | null): ReadonlySet<string> {
  const out = new Set<string>();
  for (const s of view?.slots ?? []) if (s.state !== 'solved' && s.hint1) for (const id of s.hint1.highlight) out.add(id);
  return out;
}

/** The catalog key of a puzzle type label. */
export const puzzleKey = (type: string): MessageKey => `puzzle.${type}` as MessageKey;

/** The slot whose question the panel shows: the chosen one if still open, else the first open slot. */
export function activeSlot(view: PlayView | null, chosen: string | null): SlotView | null {
  const open = (view?.slots ?? []).filter((s) => s.state === 'open');
  return open.find((s) => s.slotId === chosen) ?? open[0] ?? null;
}

/** Hints are offered only for an open puzzle: not hidden, locked or solved (Requirement 26.3). */
export const isHintable = (slot: SlotView | null): boolean => !!slot && slot.state === 'open';

/** True when every puzzle is solved but the Run goes on, so one thread is still to follow. */
export const needsLead = (view: PlayView | null): boolean => !!view && view.status === 'in_progress' && view.slots.length > 0 && view.slots.every((s) => s.state === 'solved');

/** The atlas address of a chapter, or null when the anchor is malformed. `origin` is empty for the same origin. */
export function atlasHref(origin: string, anchor: string): string | null {
  try {
    return origin.replace(/\/+$/, '') + atlasUrl(anchor);
  } catch {
    return null;
  }
}

/** The sentence a tap shows: the content text when the server sent it, else the catalog key. */
export function tapSentence(reply: Reply | null, t: (key: MessageKey) => string): string | null {
  if (!reply || reply.kind !== 'tap') return null;
  return reply.text ?? (reply.key ? t(reply.key) : null);
}

/** The always-visible reply line: the server's text when not blank, else its key, else a fixed line. Never empty. */
export function replyLine(reply: Reply | null, t: (key: MessageKey) => string): string {
  if (!reply || reply.kind !== 'tap') return t('scene.reply.idle');
  const text = reply.text?.trim() ? reply.text : reply.key ? t(reply.key) : '';
  return text.trim() ? text : t('tap.nothing');
}

/** A decoy tap: it opened nothing and collected nothing. */
export const isDecoyTap = (reply: Reply | null): boolean => !!reply && reply.kind === 'tap' && reply.opened.length === 0 && reply.collected === 0;

export type FearContext = { kind: Exclude<FearTrigger, 'scene-enter'> } | { kind: 'scene-enter'; scene: number };

/** The Fear_Event trigger a reply raises, or null. */
export function triggerOf(reply: Reply | null): FearContext | null {
  if (!reply) return null;
  if (reply.kind === 'answer' && !reply.correct) return { kind: 'wrong-answer' };
  if (reply.kind === 'hint2' && reply.charged) return { kind: 'hint2' };
  if (isDecoyTap(reply)) return { kind: 'decoy-tap' };
  return null;
}

/** The first event of this trigger (for a scene, the one assigned to that scene) that has not played in this Run. */
export function chooseFearEvent(entries: readonly FearEventEntry[] | null, ctx: FearContext, played: ReadonlySet<string>): FearEventEntry | null {
  for (const e of entries ?? []) {
    if (e.trigger !== ctx.kind || played.has(e.id)) continue;
    if (ctx.kind === 'scene-enter' && e.scene !== ctx.scene) continue;
    return e;
  }
  return null;
}

/** The event's own reduced-motion line from content (flying-dutchman only), matched by id and then by number. */
export function reducedLineOf(events: readonly { id: string; reducedMotion: string | null }[], entry: FearEventEntry): string | null {
  const byId = events.find((e) => e.id === entry.id);
  const byNo = events[Number(entry.id.slice(3)) - 1];
  return (byId ?? byNo)?.reducedMotion ?? null;
}
