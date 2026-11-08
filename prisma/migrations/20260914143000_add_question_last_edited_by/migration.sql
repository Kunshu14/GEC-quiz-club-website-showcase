-- AlterTable: Add last_edited_by and last_edited_at to questions
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "last_edited_by" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "last_edited_at" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "questions" ADD CONSTRAINT "questions_last_edited_by_fkey"
    FOREIGN KEY ("last_edited_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "questions_last_edited_by_idx" ON "questions"("last_edited_by");
