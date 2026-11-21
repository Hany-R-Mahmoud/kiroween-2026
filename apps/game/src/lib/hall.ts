// Pure Hall rules for the route and its tests (requirement 1; design Property 22). No I/O, no React.
import { WORLD_COUNT } from '@kiroween/skeleton/client';
import type { MessageKey } from '../i18n/en';
import { HUB_DOOR_IDS } from '../layout/hub.ts';

export type DoorState = 'locked' | 'open' | 'signin';

/**
 * Explicit hub door id (from `content/hub-and-tutorial.md`) to legend id. Not derived from the id text: the content
 * names door 1 `hub-door-dutchman` but the legend is `flying-dutchman`. Every Hall use goes through this table.
 */
export const DOOR_LEGEND: Readonly<Record<(typeof HUB_DOOR_IDS)[number], string>> = {
  'hub-door-dutchman': 'flying-dutchman',
  'hub-door-baba-yaga': 'baba-yaga',
  'hub-door-jersey-devil': 'jersey-devil',
  'hub-door-banshee': 'banshee',
  'hub-door-chupacabra': 'chupacabra',
  'hub-door-draugr': 'draugr',
  'hub-door-el-coco': 'el-coco',
  'hub-door-gumiho': 'gumiho',
  'hub-door-naddaha': 'naddaha',
  'hub-door-spring-heeled-jack': 'spring-heeled-jack',
  'hub-door-vetala': 'vetala',
  'hub-door-yuki-onna': 'yuki-onna',
};

/** `hub-door-banshee` gives `banshee`, `hub-door-dutchman` gives `flying-dutchman`; any other id gives null. */
export const doorLegendId = (hotspotId: string): string | null => (Object.hasOwn(DOOR_LEGEND, hotspotId) ? DOOR_LEGEND[hotspotId as keyof typeof DOOR_LEGEND] : null);

/**
 * Locked until the tutorial is done. After that the server's access rule decides (`mayEnter`: a user, or a guest at the
 * guest world), and any other door shows the sign-in prompt.
 */
export function hallDoorState(tutorialDone: boolean, mayEnter: boolean): DoorState {
  if (!tutorialDone) return 'locked';
  return mayEnter ? 'open' : 'signin';
}

/** Curses remaining: one per world not yet broken, counted over distinct legend ids. */
export function cursesLeft(broken: readonly string[]): number {
  return Math.max(0, WORLD_COUNT - new Set(broken).size);
}

/** The catalog key for the clock: dawn at zero, singular for one, else the plural form (Intl.PluralRules). */
export function clockKey(n: number, lang: string): MessageKey {
  if (n <= 0) return 'hub.clock.dawn';
  return new Intl.PluralRules(lang).select(n) === 'one' ? 'hub.clock.one' : 'hub.clock';
}

/** Object Hotspots: the catalog key of the accessible name, and for decoys the key of the result sentence. */
export const OBJECT_LABEL: Readonly<Record<string, MessageKey>> = {
  'hub-desk-ledger': 'hub.label.ledger',
  'hub-lamp': 'hub.label.lamp',
  'hub-clock': 'hub.label.clock',
  'hub-cabinet': 'hub.label.cabinet',
  'hub-jars': 'hub.label.jars',
  'hub-window': 'hub.label.window',
};
export const DECOY_RESULT: Readonly<Record<string, MessageKey>> = {
  'hub-lamp': 'hub.lamp',
  'hub-jars': 'hub.jars',
  'hub-window': 'hub.window',
};

export interface Relic {
  legendId: string;
  assetId: string;
  name: string | null;
}

/** Twelve cabinet slots, in door order: the relic of each broken world, else null. */
export function cabinetSlots(relics: readonly Relic[], broken: readonly string[]): Array<Relic | null> {
  const ids = HUB_DOOR_IDS.map((d) => DOOR_LEGEND[d]);
  return ids.map((id) => (broken.includes(id) ? (relics.find((r) => r.legendId === id) ?? null) : null));
}

/** Union of the server's broken worlds and the guest's, without repeats. */
export const mergeBroken = (server: readonly string[], local: readonly string[]): string[] => [...new Set([...server, ...local])];
