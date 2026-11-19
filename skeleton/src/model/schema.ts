import { z } from 'zod';

export const PUZZLE_TYPES = [
  'weakness',
  'ritual-order',
  'true-or-told',
  'original-name',
  'symbol',
  'date-or-number',
  'who-said-it',
  'object-match',
] as const;
export const puzzleTypeSchema = z.enum(PUZZLE_TYPES);
export type PuzzleType = z.infer<typeof puzzleTypeSchema>;

// All ids below (except source ids and anchors) are namespaced: `<legend-id>:<raw id>`.
const factLink = z.object({ kind: z.literal('fact'), factId: z.string() });
// step null means "the whole lead" (hotspot linked as `lead-3` without a step)
const leadStepLink = z.object({ kind: z.literal('leadStep'), leadId: z.string(), step: z.number().int().positive().nullable() });
export const linkSchema = z.discriminatedUnion('kind', [factLink, leadStepLink]);
export type Link = z.infer<typeof linkSchema>;

const chapterSchema = z.object({
  id: z.string(),
  ordinal: z.number().int().positive(),
  anchor: z.string(),
  title: z.string(),
  sources: z.array(z.string()),
  text: z.string().min(1),
  hook: z.string().min(1),
});

const versionSchema = z.object({
  id: z.string(),
  sourceType: z.string(),
  era: z.string(),
  claim: z.string(),
  conflicts: z.string(),
  sourceId: z.string(),
  anchor: z.string(),
  paragraph: z.string().min(1),
});

const factSchema = z.object({
  id: z.string(),
  statement: z.string().min(1),
  confidence: z.enum(['D', 'R', 'checked']),
  anchor: z.string(),
  versionId: z.string().nullable(),
  puzzleTypes: z.array(puzzleTypeSchema).min(1),
  answer: z.string().min(1),
  wrongAnswers: z.array(z.string().min(1)).min(3),
  difficulty: z.number().int().min(1).max(3),
});

const leadSchema = z.object({
  id: z.string(),
  startsFrom: z.string(),
  steps: z.array(z.string().min(1)).min(1),
  deadEnd: z.string().nullable(),
  // null for the "n/a (true lead)" chains: they cannot be shown as dead ends
  contradiction: z.object({ factIds: z.array(z.string()).min(1), anchors: z.array(z.string()).min(1) }).nullable(),
  canBeTrueFor: z.union([z.literal('never'), z.array(z.string()).min(1)]),
});

const hint = z.object({ text: z.string().min(1), highlight: z.array(z.string()) });

const slotSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: puzzleTypeSchema,
  isFinal: z.boolean(),
  candidateFactIds: z.array(z.string()).min(1),
  hint1: hint,
  hint2Anchor: z.string(),
});

const hotspotSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  object: z.string(),
  role: z.enum(['meaningful', 'decoy']),
  swappable: z.boolean(),
  links: z.array(linkSchema),
  onTap: z.string(),
});

const themeSchema = z.object({
  palette: z.string(),
  displayFont: z.string(),
  bodyFont: z.string(),
  textures: z.string(),
  motifs: z.string(),
  ambientSound: z.string(),
  uiAccents: z.string(),
});

export const legendSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  meta: z.object({
    title: z.string(),
    region: z.string(),
    countryTheme: z.string(),
    mapPoint: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    era: z.string(),
    scareLevel: z.number().int().min(1).max(5),
    readingTimeMin: z.number().int().positive(),
    oneLineHook: z.string(),
  }),
  coldOpen: z.string().min(1),
  chapters: z.array(chapterSchema).min(1),
  versions: z.array(versionSchema).min(1),
  documentedTold: z.object({
    rows: z.array(z.object({ documented: z.string(), told: z.string() })),
    closing: z.string(),
  }),
  facts: z.array(factSchema).min(1),
  leads: z.array(leadSchema).min(1),
  world: z.object({
    setting: z.string(),
    scenes: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })).min(1),
    hotspots: z.array(hotspotSchema).min(1),
    spirit: z.string(),
    slots: z.array(slotSchema).min(1),
    finalPuzzle: z.object({ description: z.string().min(1), hint1: hint.nullable(), hint2Anchor: z.string().nullable() }),
    fearEvents: z.array(z.object({ id: z.string(), description: z.string(), reducedMotion: z.string().nullable() })),
  }),
  theme: themeSchema,
  assets: z.array(
    z.object({
      id: z.string(),
      usage: z.string(),
      size: z.string(),
      background: z.string(),
      prompt: z.string(),
      mustAvoid: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      author: z.string(),
      year: z.string(),
      url: z.string(),
      publicDomain: z.string(),
      supports: z.string(),
    }),
  ),
  // chapter anchors, `<id>--versions` and `<id>--versions--<v>`: every valid deep-link target
  anchors: z.array(z.string()),
});

export type Legend = z.infer<typeof legendSchema>;
export type Fact = Legend['facts'][number];
export type Lead = Legend['leads'][number];
export type Slot = Legend['world']['slots'][number];
export type Hotspot = Legend['world']['hotspots'][number];
