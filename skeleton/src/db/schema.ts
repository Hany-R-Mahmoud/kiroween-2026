import { sql } from 'drizzle-orm';
import { boolean, check, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, serial, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { Legend } from '../model/schema.ts';

// Ids are namespaced `<legend-id>:<raw id>`. Every child table cascades from `legends`, so replacing
// one legend is a delete plus inserts in one transaction.

export const puzzleTypeEnum = pgEnum('puzzle_type', ['weakness', 'ritual-order', 'true-or-told', 'original-name', 'symbol', 'date-or-number', 'who-said-it', 'object-match']);
export const hotspotRoleEnum = pgEnum('hotspot_role', ['meaningful', 'decoy']);
export const confidenceEnum = pgEnum('confidence', ['D', 'R', 'checked']);
export const anchorKindEnum = pgEnum('anchor_kind', ['chapter', 'versions', 'version']);

export const legends = pgTable('legends', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  region: text('region').notNull(),
  countryTheme: text('country_theme').notNull(),
  mapLat: doublePrecision('map_lat').notNull(),
  mapLng: doublePrecision('map_lng').notNull(),
  era: text('era').notNull(),
  scareLevel: smallint('scare_level').notNull(),
  readingTimeMin: integer('reading_time_min').notNull(),
  oneLineHook: text('one_line_hook').notNull(),
  coldOpen: text('cold_open').notNull(),
  documentedClosing: text('documented_closing').notNull(),
  setting: text('setting').notNull(),
  spirit: text('spirit').notNull(),
  theme: jsonb('theme').$type<Legend['theme']>().notNull(),
  finalPuzzle: jsonb('final_puzzle').$type<Legend['world']['finalPuzzle']>().notNull(),
  contentHash: text('content_hash').notNull(),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
  // The parsed Legend, read back with legendSchema.parse. The generator depends on the order of leads, facts and
  // versions, which the relational tables above do not keep, so runs are generated from this copy.
  model: jsonb('model').$type<Legend>(),
});

const legendId = () => text('legend_id').notNull().references(() => legends.id, { onDelete: 'cascade' });

export const anchors = pgTable('anchors', {
  anchor: text('anchor').primaryKey(),
  legendId: legendId(),
  kind: anchorKindEnum('kind').notNull(),
  refId: text('ref_id'),
});

const anchorRef = (name: string) => text(name).notNull().references(() => anchors.anchor, { onDelete: 'cascade' });

export const chapters = pgTable('chapters', {
  id: text('id').primaryKey(),
  legendId: legendId(),
  ordinal: integer('ordinal').notNull(),
  anchor: anchorRef('anchor').unique(),
  title: text('title').notNull(),
  sourceIds: text('source_ids').array().notNull(),
  body: text('body').notNull(),
  hook: text('hook').notNull(),
});

export const versions = pgTable('versions', {
  id: text('id').primaryKey(),
  legendId: legendId(),
  sourceType: text('source_type').notNull(),
  era: text('era').notNull(),
  claim: text('claim').notNull(),
  conflicts: text('conflicts').notNull(),
  sourceId: text('source_id').notNull(),
  anchor: anchorRef('anchor').unique(),
  paragraph: text('paragraph').notNull(),
});

export const documentedTold = pgTable('documented_told', {
  id: serial('id').primaryKey(),
  legendId: legendId(),
  ordinal: integer('ordinal').notNull(),
  documented: text('documented').notNull(),
  told: text('told').notNull(),
});

export const facts = pgTable('facts', {
  id: text('id').primaryKey(),
  legendId: legendId(),
  statement: text('statement').notNull(),
  confidence: confidenceEnum('confidence').notNull(),
  anchor: anchorRef('anchor'),
  versionId: text('version_id').references(() => versions.id, { onDelete: 'cascade' }),
  answer: text('answer').notNull(),
  wrongAnswers: text('wrong_answers').array().notNull(),
  difficulty: smallint('difficulty').notNull(),
});

export const factPuzzleTypes = pgTable(
  'fact_puzzle_types',
  {
    factId: text('fact_id').notNull().references(() => facts.id, { onDelete: 'cascade' }),
    puzzleType: puzzleTypeEnum('puzzle_type').notNull(),
  },
  (t) => [primaryKey({ columns: [t.factId, t.puzzleType] })],
);

// A lead can name several contradiction facts and anchors, and be true for several versions, so those are arrays.
// The parser has already checked that every id in them exists.
export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  legendId: legendId(),
  startsFrom: text('starts_from').notNull().references(() => versions.id, { onDelete: 'cascade' }),
  steps: text('steps').array().notNull(),
  deadEnd: text('dead_end'),
  contradictionFactIds: text('contradiction_fact_ids').array(),
  contradictionAnchors: text('contradiction_anchors').array(),
  trueFor: text('true_for').array().notNull(),
  neverTrue: boolean('never_true').notNull(),
});

export const scenes = pgTable('scenes', {
  id: text('id').primaryKey(),
  legendId: legendId(),
  ordinal: integer('ordinal').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const hotspots = pgTable('hotspots', {
  id: text('id').primaryKey(),
  legendId: legendId(),
  sceneId: text('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  ordinal: integer('ordinal').notNull(),
  object: text('object').notNull(),
  role: hotspotRoleEnum('role').notNull(),
  swappable: boolean('swappable').notNull(),
  links: jsonb('links').$type<Legend['world']['hotspots'][number]['links']>().notNull(),
  onTap: text('on_tap').notNull(),
});

export const puzzleSlots = pgTable('puzzle_slots', {
  id: text('id').primaryKey(),
  legendId: legendId(),
  ordinal: integer('ordinal').notNull(),
  label: text('label').notNull(),
  puzzleType: puzzleTypeEnum('puzzle_type').notNull(),
  isFinal: boolean('is_final').notNull(),
  candidateFactIds: text('candidate_fact_ids').array().notNull(),
  hint1Text: text('hint1_text').notNull(),
  hint1Highlights: text('hint1_highlights').array().notNull(),
  hint2Anchor: anchorRef('hint2_anchor'),
});

export const fearEvents = pgTable('fear_events', {
  id: text('id').primaryKey(),
  legendId: legendId(),
  ordinal: integer('ordinal').notNull(),
  description: text('description').notNull(),
  reducedMotion: text('reduced_motion'),
});

export const assets = pgTable(
  'assets',
  {
    id: text('id').notNull(),
    legendId: legendId(),
    usage: text('usage').notNull(),
    size: text('size').notNull(),
    background: text('background').notNull(),
    prompt: text('prompt').notNull(),
    mustAvoid: text('must_avoid').notNull(),
  },
  (t) => [primaryKey({ columns: [t.legendId, t.id] })],
);

export const sources = pgTable(
  'sources',
  {
    id: text('id').notNull(),
    legendId: legendId(),
    title: text('title').notNull(),
    author: text('author').notNull(),
    year: text('year').notNull(),
    url: text('url').notNull(),
    publicDomain: text('public_domain').notNull(),
    supports: text('supports').notNull(),
  },
  (t) => [primaryKey({ columns: [t.legendId, t.id] })],
);

export const runStatusEnum = pgEnum('run_status', ['in_progress', 'won', 'restarted', 'abandoned']);

// Player history. `legend_id` and `true_version_id` are plain text, not foreign keys: the importer replaces a legend by
// deleting and re-inserting it, and a foreign key would either delete every player's runs on import (cascade) or
// block the import (restrict). The server checks the legend id against the catalogue before inserting.
// `user_id` is the Neon Auth user id from a verified session; there is no foreign key into the neon_auth schema.
export const runs = pgTable(
  'runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    legendId: text('legend_id').notNull(),
    seed: text('seed').notNull(),
    trueVersionId: text('true_version_id').notNull(),
    status: runStatusEnum('status').notNull().default('in_progress'),
    slotsSolved: smallint('slots_solved').notNull().default(0),
    hint2Uses: smallint('hint2_uses').notNull().default(0),
    wrongAnswers: smallint('wrong_answers').notNull().default(0),
    highestFear: smallint('highest_fear').notNull().default(0),
    score: integer('score').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [
    index('runs_user_idx').on(t.userId),
    // at most one run in progress per user and world (R4.9); a racing second start fails with 23505 on this index
    uniqueIndex('runs_one_in_progress').on(t.userId, t.legendId).where(sql`${t.status} = 'in_progress'`),
    check('runs_counts_non_negative', sql`${t.slotsSolved} >= 0 and ${t.hint2Uses} >= 0 and ${t.wrongAnswers} >= 0 and ${t.highestFear} >= 0 and ${t.score} >= 0`),
    check('runs_finished_when_closed', sql`(${t.status} = 'in_progress') = (${t.finishedAt} is null)`),
  ],
);

/** Name of the partial unique index, used to recognise a racing start (SQLSTATE 23505). */
export const ONE_IN_PROGRESS_INDEX = 'runs_one_in_progress';
