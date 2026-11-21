// Hall rules (requirement 1.3 to 1.5, 1.7). Pure: no I/O, no clock.
import { canEnter, type Visitor } from '../access/canEnter.ts';

/** The number of legend worlds. One curse per world. */
export const WORLD_COUNT = 12;

/**
 * `locked`: the tutorial is not done, so the door sends the player to the tutorial room (1.3).
 * `open`: the player may enter (1.4, 1.5).
 * `signin`: a guest at a world other than the guest world (1.4).
 */
export type DoorState = 'locked' | 'open' | 'signin';

export function doorState(input: { visitor: Visitor; tutorialDone: boolean; legendId: string; guestWorld: string }): DoorState {
  if (!input.tutorialDone) return 'locked';
  return canEnter({ kind: 'legend', id: input.legendId }, input.visitor, input.guestWorld) ? 'open' : 'signin';
}

/** One state per legend id, in the order given. */
export function doorStates(input: { visitor: Visitor; tutorialDone: boolean; legendIds: readonly string[]; guestWorld: string }): Record<string, DoorState> {
  return Object.fromEntries(input.legendIds.map((legendId) => [legendId, doorState({ ...input, legendId })]));
}

/** Curses remaining: 12 minus the distinct broken worlds, never below 0. Repeats and non-numeric noise do not count twice. */
export function cursesRemaining(brokenWorlds: readonly string[]): number {
  return Math.max(0, WORLD_COUNT - new Set(brokenWorlds).size);
}
