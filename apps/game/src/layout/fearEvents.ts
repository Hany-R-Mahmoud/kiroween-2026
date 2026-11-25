// Fear_Event trigger and caption kinds for every legend (design: "Fear events"). Data only; nothing is parsed from prose at runtime.
// Assigned by event number with the design's exceptions. This file is the single place to change them (owner review).
// Event text and reduced-motion lines come from the content store. Only flying-dutchman has per-event reduced-motion lines;
// the other 11 legends show the catalog caption (G4).

export type FearTrigger = 'decoy-tap' | 'scene-enter' | 'wrong-answer' | 'hint2';
/** `sound` shows `fear.caption.sound`; `sight` shows `fear.caption.sight`. */
export type FearCaption = 'sound' | 'sight';
export type FearEventId = 'fe-1' | 'fe-2' | 'fe-3' | 'fe-4' | 'fe-5';

export interface FearEventEntry {
  id: FearEventId;
  trigger: FearTrigger;
  caption: FearCaption;
  /** 1-based scene number, only for `scene-enter`: the scene whose entry plays the event. */
  scene?: 1 | 2 | 3;
}

type Row = readonly [FearEventEntry, FearEventEntry, FearEventEntry, FearEventEntry, FearEventEntry];

/** Default trigger by event number. Event 3: first entry to scene 2. Event 5: first entry to scene 3. */
function row(c1: FearCaption, c2: FearCaption, c3: FearCaption, c4: FearCaption, c5: FearCaption, last: 'scene' | 'tap' = 'scene'): Row {
  return [
    { id: 'fe-1', trigger: 'decoy-tap', caption: c1 },
    { id: 'fe-2', trigger: 'wrong-answer', caption: c2 },
    { id: 'fe-3', trigger: 'scene-enter', caption: c3, scene: 2 },
    { id: 'fe-4', trigger: 'hint2', caption: c4 },
    last === 'scene'
      ? { id: 'fe-5', trigger: 'scene-enter', caption: c5, scene: 3 }
      : { id: 'fe-5', trigger: 'decoy-tap', caption: c5 }, // prose: "the player's last tap"
  ];
}

const S = 'sound';
const E = 'sight';

export const FEAR_EVENTS = {
  'baba-yaga': row(S, E, S, E, E, 'tap'),
  banshee: row(S, E, E, E, E), // 1 decoy-tap and 5 return to the loft scene (scene 3), as written
  chupacabra: row(S, E, E, E, E),
  draugr: row(S, E, E, E, E, 'tap'),
  'el-coco': row(S, E, E, S, E),
  'flying-dutchman': row(S, E, E, E, E),
  gumiho: row(S, E, E, S, E),
  'jersey-devil': row(S, E, E, S, E), // 5 is scene 3, as written; 4 is an audio cue with a text caption
  naddaha: row(S, E, E, E, E),
  'spring-heeled-jack': row(S, E, E, E, E),
  vetala: row(E, E, S, E, E, 'tap'),
  'yuki-onna': row(E, E, S, E, E, 'tap'),
} as const satisfies Record<string, Row>;

export type FearLegendId = keyof typeof FEAR_EVENTS;

export type FearLook = 'cold' | 'fog' | 'dim';
const LOOKS: readonly FearLook[] = ['cold', 'fog', 'dim'];
// New legends must be appended to FEAR_EVENTS. Reordering (or inserting before the end) changes every later legend's looks.
const LEGEND_ORDER = Object.keys(FEAR_EVENTS);

/** Same legend and event id always give the same look. `null` (the tutorial) uses offset 0. Pure: no RNG, no clock. */
export function fearLookOf(legendId: string | null, id: FearEventId): FearLook {
  const offset = legendId === null ? 0 : Math.max(0, LEGEND_ORDER.indexOf(legendId));
  return LOOKS[(offset + Number(id.slice(3)) - 1) % 3]!;
}

export function fearEventsOf(legendId: string): readonly FearEventEntry[] | null {
  return Object.hasOwn(FEAR_EVENTS, legendId) ? FEAR_EVENTS[legendId as FearLegendId] : null;
}
