// Pure Tutorial rules for the route and its tests (requirement 2). No I/O, no React.
// Tap results for the seven tutorial Hotspots are fixed catalog text (design: "Tutorial"); only the drawer is server-side.
import { atlasUrl } from '@kiroween/skeleton/client';
import type { TutorialResponse } from '@kiroween/skeleton';
import type { MessageKey } from '../i18n/en';
import type { FearEventEntry } from '../layout/fearEvents.ts';

export const TUTORIAL_CORKBOARD_ID = 'tut-corkboard';
export const TUTORIAL_DRAWER_ID = 'tut-drawer';
export const TUTORIAL_CANDLE_ID = 'tut-candle';
export const TUTORIAL_MIRROR_ID = 'tut-mirror';
/** The hall key shown as the reward. */
export const KEY_ASSET = 'shared-game-ui-key-01';

/** Accessible name of each tap region (catalog). */
export const TUTORIAL_LABEL: Readonly<Record<string, MessageKey>> = {
  'tut-coat': 'tut.label.coat',
  'tut-bookshelf': 'tut.label.bookshelf',
  'tut-candle': 'tut.label.candle',
  'tut-drawer': 'tut.label.drawer',
  'tut-typewriter': 'tut.label.typewriter',
  'tut-mirror': 'tut.label.mirror',
  'tut-corkboard': 'tut.label.corkboard',
};

/** Tap result sentence of every Hotspot that needs no server (the drawer is answered by the server). */
export const TUTORIAL_TAP_TEXT: Readonly<Record<string, MessageKey>> = {
  'tut-coat': 'tut.coat',
  'tut-bookshelf': 'tut.bookshelf',
  'tut-candle': 'tut.candle',
  'tut-typewriter': 'tut.typewriter',
  'tut-mirror': 'tut.mirror',
  'tut-corkboard': 'tut.corkboard',
};

/** The mirror's Fear_Event: a figure behind the player, then gone (a sight). */
export const MIRROR_EVENT: FearEventEntry = { id: 'fe-1', trigger: 'decoy-tap', caption: 'sight' };

/** The atlas address of the chapter Hint 2 opens, or null when the anchor is malformed. */
export function tutorialHint2Href(anchor: string, atlasOrigin: string): string | null {
  try {
    return atlasOrigin.replace(/\/+$/, '') + atlasUrl(anchor);
  } catch {
    return null;
  }
}

/** The answer text the player typed, reduced to what may be sent: trimmed, 1 to 40 characters, else null. */
export function answerToSend(raw: string): string | null {
  const v = raw.trim();
  return v.length >= 1 && v.length <= 40 ? v : null;
}

type Reply = TutorialResponse['reply'];

/** True when the latest reply is a refused drawer code. */
export const isWrongCode = (reply: Reply): boolean => reply !== null && reply.kind === 'answer' && !reply.correct;
