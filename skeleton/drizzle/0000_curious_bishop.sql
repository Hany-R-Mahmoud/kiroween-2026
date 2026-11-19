CREATE TYPE "public"."anchor_kind" AS ENUM('chapter', 'versions', 'version');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('D', 'R', 'checked');--> statement-breakpoint
CREATE TYPE "public"."hotspot_role" AS ENUM('meaningful', 'decoy');--> statement-breakpoint
CREATE TYPE "public"."puzzle_type" AS ENUM('weakness', 'ritual-order', 'true-or-told', 'original-name', 'symbol', 'date-or-number', 'who-said-it', 'object-match');--> statement-breakpoint
CREATE TABLE "anchors" (
	"anchor" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"kind" "anchor_kind" NOT NULL,
	"ref_id" text
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text NOT NULL,
	"legend_id" text NOT NULL,
	"usage" text NOT NULL,
	"size" text NOT NULL,
	"background" text NOT NULL,
	"prompt" text NOT NULL,
	"must_avoid" text NOT NULL,
	CONSTRAINT "assets_legend_id_id_pk" PRIMARY KEY("legend_id","id")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"anchor" text NOT NULL,
	"title" text NOT NULL,
	"source_ids" text[] NOT NULL,
	"body" text NOT NULL,
	"hook" text NOT NULL,
	CONSTRAINT "chapters_anchor_unique" UNIQUE("anchor")
);
--> statement-breakpoint
CREATE TABLE "documented_told" (
	"id" serial PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"documented" text NOT NULL,
	"told" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fact_puzzle_types" (
	"fact_id" text NOT NULL,
	"puzzle_type" "puzzle_type" NOT NULL,
	CONSTRAINT "fact_puzzle_types_fact_id_puzzle_type_pk" PRIMARY KEY("fact_id","puzzle_type")
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"statement" text NOT NULL,
	"confidence" "confidence" NOT NULL,
	"anchor" text NOT NULL,
	"version_id" text,
	"answer" text NOT NULL,
	"wrong_answers" text[] NOT NULL,
	"difficulty" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fear_events" (
	"id" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"description" text NOT NULL,
	"reduced_motion" text
);
--> statement-breakpoint
CREATE TABLE "hotspots" (
	"id" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"scene_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"object" text NOT NULL,
	"role" "hotspot_role" NOT NULL,
	"swappable" boolean NOT NULL,
	"links" jsonb NOT NULL,
	"on_tap" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"starts_from" text NOT NULL,
	"steps" text[] NOT NULL,
	"dead_end" text,
	"contradiction_fact_ids" text[],
	"contradiction_anchors" text[],
	"true_for" text[] NOT NULL,
	"never_true" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legends" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"region" text NOT NULL,
	"country_theme" text NOT NULL,
	"map_lat" double precision NOT NULL,
	"map_lng" double precision NOT NULL,
	"era" text NOT NULL,
	"scare_level" smallint NOT NULL,
	"reading_time_min" integer NOT NULL,
	"one_line_hook" text NOT NULL,
	"cold_open" text NOT NULL,
	"documented_closing" text NOT NULL,
	"setting" text NOT NULL,
	"spirit" text NOT NULL,
	"theme" jsonb NOT NULL,
	"final_puzzle" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzle_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"label" text NOT NULL,
	"puzzle_type" "puzzle_type" NOT NULL,
	"is_final" boolean NOT NULL,
	"candidate_fact_ids" text[] NOT NULL,
	"hint1_text" text NOT NULL,
	"hint1_highlights" text[] NOT NULL,
	"hint2_anchor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text NOT NULL,
	"legend_id" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"year" text NOT NULL,
	"url" text NOT NULL,
	"public_domain" text NOT NULL,
	"supports" text NOT NULL,
	CONSTRAINT "sources_legend_id_id_pk" PRIMARY KEY("legend_id","id")
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"id" text PRIMARY KEY NOT NULL,
	"legend_id" text NOT NULL,
	"source_type" text NOT NULL,
	"era" text NOT NULL,
	"claim" text NOT NULL,
	"conflicts" text NOT NULL,
	"source_id" text NOT NULL,
	"anchor" text NOT NULL,
	"paragraph" text NOT NULL,
	CONSTRAINT "versions_anchor_unique" UNIQUE("anchor")
);
--> statement-breakpoint
ALTER TABLE "anchors" ADD CONSTRAINT "anchors_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_anchor_anchors_anchor_fk" FOREIGN KEY ("anchor") REFERENCES "public"."anchors"("anchor") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documented_told" ADD CONSTRAINT "documented_told_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_puzzle_types" ADD CONSTRAINT "fact_puzzle_types_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_anchor_anchors_anchor_fk" FOREIGN KEY ("anchor") REFERENCES "public"."anchors"("anchor") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_version_id_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fear_events" ADD CONSTRAINT "fear_events_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspots" ADD CONSTRAINT "hotspots_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspots" ADD CONSTRAINT "hotspots_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_starts_from_versions_id_fk" FOREIGN KEY ("starts_from") REFERENCES "public"."versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_slots" ADD CONSTRAINT "puzzle_slots_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_slots" ADD CONSTRAINT "puzzle_slots_hint2_anchor_anchors_anchor_fk" FOREIGN KEY ("hint2_anchor") REFERENCES "public"."anchors"("anchor") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_legend_id_legends_id_fk" FOREIGN KEY ("legend_id") REFERENCES "public"."legends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_anchor_anchors_anchor_fk" FOREIGN KEY ("anchor") REFERENCES "public"."anchors"("anchor") ON DELETE cascade ON UPDATE no action;