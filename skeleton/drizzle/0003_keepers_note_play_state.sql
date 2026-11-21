CREATE TABLE "keepers_note" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"label" text NOT NULL,
	"reading_time_min" integer NOT NULL,
	"one_line_hook" text NOT NULL,
	"chapter_title" text NOT NULL,
	"anchor" text NOT NULL,
	"body" text NOT NULL,
	"hook" text NOT NULL,
	"content_hash" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "keepers_note_anchor_unique" UNIQUE("anchor"),
	CONSTRAINT "keepers_note_id_check" CHECK ("keepers_note"."id" = 'keepers-note'),
	CONSTRAINT "keepers_note_reading_time_check" CHECK ("keepers_note"."reading_time_min" > 0),
	CONSTRAINT "keepers_note_anchor_check" CHECK ("keepers_note"."anchor" = 'keepers-note--ch-1')
);
--> statement-breakpoint
CREATE TABLE "keepers_note_details" (
	"detail_id" text PRIMARY KEY NOT NULL,
	"ordinal" integer NOT NULL,
	"phrase" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"also_accept" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_flags" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tutorial_done_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "play_state" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "rev" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
GRANT SELECT ON "keepers_note" TO atlas_reader;