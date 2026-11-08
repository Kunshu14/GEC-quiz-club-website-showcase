-- Phase 3: Media Attachments & Trigram Duplicate Detection

-- ─── Step 1: Add FLAGGED to question_status enum ─────────────────────
ALTER TYPE "question_status" ADD VALUE IF NOT EXISTS 'FLAGGED';

-- ─── Step 2: Create media enums ──────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "media_role" AS ENUM ('QUESTION', 'ANSWER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "media_type" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Step 3: Add duplicate tracking fields to questions ──────────────
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "duplicate_of_id" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "duplicate_score" DOUBLE PRECISION;

DO $$ BEGIN
  ALTER TABLE "questions" ADD CONSTRAINT "questions_duplicate_of_id_fkey"
    FOREIGN KEY ("duplicate_of_id") REFERENCES "questions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "questions_duplicate_of_id_idx" ON "questions"("duplicate_of_id");

-- ─── Step 4: Create question_media table ─────────────────────────────
CREATE TABLE IF NOT EXISTS "question_media" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "role" "media_role" NOT NULL,
    "type" "media_type" NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_media_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "question_media" ADD CONSTRAINT "question_media_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "question_media" ADD CONSTRAINT "question_media_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "question_media_question_id_idx" ON "question_media"("question_id");

-- ─── Step 5: Enable pg_trgm and add Trigram GIN index on questions(text) ──
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "questions_text_trgm_idx" ON "questions" USING gin ("text" gin_trgm_ops);

-- ─── Step 6: Create Supabase Storage bucket for question media ────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-media', 'question-media', true)
ON CONFLICT (id) DO NOTHING;
