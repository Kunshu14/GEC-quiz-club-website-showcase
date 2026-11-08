-- CreateEnum
CREATE TYPE "quiz_mode" AS ENUM ('IN_PERSON', 'ONLINE', 'HYBRID');

-- CreateTable
CREATE TABLE "quiz_themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_categories" (
    "theme_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "theme_categories_pkey" PRIMARY KEY ("theme_id","category_id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "academic_year" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'Written Prelims + On-Stage Finals',
    "mode" "quiz_mode" NOT NULL DEFAULT 'IN_PERSON',
    "theme_id" TEXT,
    "venue_or_platform" TEXT NOT NULL,
    "timing" TEXT,
    "budget" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lessons_learned" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_qms" (
    "quiz_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "quiz_qms_pkey" PRIMARY KEY ("quiz_id","user_id")
);

-- CreateTable
CREATE TABLE "usage_log" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "used_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "round_name" TEXT,

    CONSTRAINT "usage_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_themes_name_key" ON "quiz_themes"("name");

-- CreateIndex
CREATE INDEX "theme_categories_category_id_idx" ON "theme_categories"("category_id");

-- CreateIndex
CREATE INDEX "quizzes_date_idx" ON "quizzes"("date");

-- CreateIndex
CREATE INDEX "quizzes_academic_year_idx" ON "quizzes"("academic_year");

-- CreateIndex
CREATE INDEX "quizzes_theme_id_idx" ON "quizzes"("theme_id");

-- CreateIndex
CREATE INDEX "quizzes_created_by_idx" ON "quizzes"("created_by");

-- CreateIndex
CREATE INDEX "quiz_qms_user_id_idx" ON "quiz_qms"("user_id");

-- CreateIndex
CREATE INDEX "usage_log_question_id_idx" ON "usage_log"("question_id");

-- CreateIndex
CREATE INDEX "usage_log_quiz_id_order_index_idx" ON "usage_log"("quiz_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "usage_log_quiz_id_question_id_key" ON "usage_log"("quiz_id", "question_id");

-- AddForeignKey
ALTER TABLE "theme_categories" ADD CONSTRAINT "theme_categories_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "quiz_themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_categories" ADD CONSTRAINT "theme_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "quiz_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_qms" ADD CONSTRAINT "quiz_qms_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_qms" ADD CONSTRAINT "quiz_qms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_log" ADD CONSTRAINT "usage_log_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_log" ADD CONSTRAINT "usage_log_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Seed initial Quiz Theme: MELA ─────────────────────────────────────
INSERT INTO "quiz_themes" ("id", "name", "description", "created_at")
VALUES ('theme_mela', 'MELA', 'Combo category quiz: Movies, Entertainment, Literature, Arts', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Map MELA to Movies, Entertainment, Literature, Arts
INSERT INTO "theme_categories" ("theme_id", "category_id")
SELECT 'theme_mela', "id" FROM "categories" WHERE "id" IN ('cat_movies', 'cat_entertainment', 'cat_literature', 'cat_arts')
ON CONFLICT ("theme_id", "category_id") DO NOTHING;
