-- CreateEnum
CREATE TYPE "roster_status" AS ENUM ('CONFIRMED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "score_status" AS ENUM ('ACTIVE', 'ELIMINATED', 'ADVANCED');

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "college" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_roster" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "seat_no" INTEGER,
    "team_name" TEXT NOT NULL,
    "status" "roster_status" NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "roster_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "seat_no" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "roster_id" TEXT NOT NULL,
    "seat_no" INTEGER NOT NULL,
    "round_label" TEXT NOT NULL,
    "points" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "status" "score_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_rank" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "roster_id" TEXT NOT NULL,
    "seat_no" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "total_points" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_rank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participants_name_idx" ON "participants"("name");
CREATE INDEX "participants_email_idx" ON "participants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_roster_quiz_id_seat_no_key" ON "quiz_roster"("quiz_id", "seat_no");
CREATE INDEX "quiz_roster_quiz_id_idx" ON "quiz_roster"("quiz_id");
CREATE INDEX "quiz_roster_status_idx" ON "quiz_roster"("status");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_quiz_id_participant_id_key" ON "team_members"("quiz_id", "participant_id");
CREATE INDEX "team_members_roster_id_idx" ON "team_members"("roster_id");
CREATE INDEX "team_members_participant_id_idx" ON "team_members"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_quiz_id_seat_no_round_label_key" ON "scores"("quiz_id", "seat_no", "round_label");
CREATE INDEX "scores_quiz_id_round_label_idx" ON "scores"("quiz_id", "round_label");
CREATE INDEX "scores_roster_id_idx" ON "scores"("roster_id");

-- CreateIndex
CREATE UNIQUE INDEX "final_rank_roster_id_key" ON "final_rank"("roster_id");
CREATE UNIQUE INDEX "final_rank_quiz_id_rank_key" ON "final_rank"("quiz_id", "rank");
CREATE UNIQUE INDEX "final_rank_quiz_id_seat_no_key" ON "final_rank"("quiz_id", "seat_no");
CREATE INDEX "final_rank_quiz_id_idx" ON "final_rank"("quiz_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_linked_participant_id_fkey" FOREIGN KEY ("linked_participant_id") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_roster" ADD CONSTRAINT "quiz_roster_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "quiz_roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "quiz_roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_rank" ADD CONSTRAINT "final_rank_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_rank" ADD CONSTRAINT "final_rank_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "quiz_roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
