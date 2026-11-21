// Wire types: what the browser sends and receives. Browser-safe (types only). No field here carries a correct index,
// a Hotspot role, the true version, the swaps, an unused Hint 2 anchor, or the Seed of a Run in progress.
import type { PuzzleType } from '../model/schema.ts';

export type Action =
  | { kind: 'tap'; hotspotId: string }
  | { kind: 'hint1'; slotId: string }
  | { kind: 'hint2'; slotId: string }
  | { kind: 'answer'; slotId: string; option: 0 | 1 | 2 | 3 }
  | { kind: 'follow'; leadId: string };

export type RunEndStatus = 'won' | 'restarted';

/** Summary of an ended Run. The Seed and curse text exist only here, after the end. */
export interface EndInfo {
  status: RunEndStatus;
  score: number;
  slotsSolved: number;
  seed: string;
  curseText?: string;
}

export interface SlotView {
  slotId: string;
  index: number;
  type: PuzzleType;
  final: boolean;
  state: 'hidden' | 'locked' | 'open' | 'solved';
  question?: string;
  options?: [string, string, string, string];
  tried?: number[];
  hint1?: { text: string; highlight: string[] };
  hint2?: { anchor: string };
}

export interface LeadView {
  leadId: string;
  start: string;
  total: number;
  steps: { n: number; text: string }[];
  canFollow: boolean;
  followed?: { kind: 'dead'; text: string; anchors: string[] } | { kind: 'true' };
}

export interface PlayView {
  legendId: string;
  status: 'in_progress' | 'won' | 'restarted';
  fear: number;
  slots: SlotView[];
  leads: LeadView[];
  ended?: EndInfo;
}

/** The result of one action. Same fields for every Hotspot and every lead, so nothing leaks through shape. */
export type Reply =
  | { kind: 'tap'; text?: string; key?: 'tap.nothing' | 'tap.something'; opened: string[]; collected: number }
  | { kind: 'hint1'; text: string; highlight: string[] }
  | { kind: 'hint2'; anchor: string; charged: boolean }
  | { kind: 'answer'; correct: boolean; slotId: string }
  | { kind: 'follow'; result: 'dead' | 'true'; text?: string; anchors: string[] };
