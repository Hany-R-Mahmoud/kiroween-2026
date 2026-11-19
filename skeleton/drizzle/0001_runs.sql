CREATE TYPE "public"."run_status" AS ENUM('in_progress', 'won', 'restarted', 'abandoned');--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"legend_id" text NOT NULL,
	"seed" text NOT NULL,
	"true_version_id" text NOT NULL,
	"status" "run_status" DEFAULT 'in_progress' NOT NULL,
	"slots_solved" smallint DEFAULT 0 NOT NULL,
	"hint2_uses" smallint DEFAULT 0 NOT NULL,
	"wrong_answers" smallint DEFAULT 0 NOT NULL,
	"highest_fear" smallint DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "runs_counts_non_negative" CHECK ("runs"."slots_solved" >= 0 and "runs"."hint2_uses" >= 0 and "runs"."wrong_answers" >= 0 and "runs"."highest_fear" >= 0 and "runs"."score" >= 0),
	CONSTRAINT "runs_finished_when_closed" CHECK (("runs"."status" = 'in_progress') = ("runs"."finished_at" is null))
);
--> statement-breakpoint
ALTER TABLE "legends" ADD COLUMN "model" jsonb;--> statement-breakpoint
CREATE INDEX "runs_user_idx" ON "runs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "runs_one_in_progress" ON "runs" USING btree ("user_id","legend_id") WHERE "runs"."status" = 'in_progress';