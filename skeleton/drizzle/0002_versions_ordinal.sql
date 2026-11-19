ALTER TABLE "versions" ADD COLUMN "ordinal" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "versions" ALTER COLUMN "ordinal" DROP DEFAULT;
