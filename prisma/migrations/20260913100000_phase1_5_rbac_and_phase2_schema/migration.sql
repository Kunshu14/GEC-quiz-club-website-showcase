-- Phase 1.5: RBAC + Phase 2 schema
-- This migration replaces the hardcoded Role enum with a full RBAC system
-- and adds the Question/Category foundation for Phase 2.

-- ─── Step 0: Create Phase 2 enums ────────────────────────────────────

CREATE TYPE "question_difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "question_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ─── Step 1: Create new RBAC tables ───────────────────────────────────

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Step 2: Create Phase 2 tables (Categories & Questions) ──────────

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answer_text" TEXT NOT NULL,
    "difficulty" "question_difficulty" NOT NULL,
    "notes" TEXT,
    "status" "question_status" NOT NULL DEFAULT 'PENDING',
    "submitted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "questions" ADD CONSTRAINT "questions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "question_categories" (
    "question_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "sub_genre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_categories_pkey" PRIMARY KEY ("question_id", "category_id")
);
ALTER TABLE "question_categories" ADD CONSTRAINT "question_categories_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_categories" ADD CONSTRAINT "question_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "questions_status_idx" ON "questions"("status");
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");
CREATE INDEX "questions_submitted_by_idx" ON "questions"("submitted_by");
CREATE INDEX "question_categories_category_id_idx" ON "question_categories"("category_id");

-- ─── Step 3: Add role_id column to users (nullable initially) ─────────

ALTER TABLE "users" ADD COLUMN "role_id" TEXT;

-- ─── Step 4: Seed roles ──────────────────────────────────────────────

INSERT INTO "roles" ("id", "name", "is_system", "created_at") VALUES
('role_admin', 'Admin', true, CURRENT_TIMESTAMP),
('role_president', 'President', true, CURRENT_TIMESTAMP),
('role_vice_president', 'Vice President', true, CURRENT_TIMESTAMP),
('role_treasurer', 'Treasurer', true, CURRENT_TIMESTAMP),
('role_head_quizzing', 'Head of Quizzing', true, CURRENT_TIMESTAMP),
('role_pr_head', 'PR Head', true, CURRENT_TIMESTAMP),
('role_creative_head', 'Creative Head', true, CURRENT_TIMESTAMP),
('role_fe_rep', 'FE Representative', true, CURRENT_TIMESTAMP),
('role_se_rep', 'SE Representative', true, CURRENT_TIMESTAMP),
('role_te_rep', 'TE Representative', true, CURRENT_TIMESTAMP),
('role_be_rep', 'BE Representative', true, CURRENT_TIMESTAMP),
('role_me_rep', 'ME Representative', true, CURRENT_TIMESTAMP),
('role_member', 'Member', true, CURRENT_TIMESTAMP);

-- ─── Step 5: Seed permissions ────────────────────────────────────────

INSERT INTO "permissions" ("id", "key", "label", "description") VALUES
('perm_manage_users', 'manage_users', 'Manage Users', 'Approve, deny, revoke, reinstate, and promote users'),
('perm_manage_categories', 'manage_categories', 'Manage Categories', 'Add, edit, and rename question categories'),
('perm_manage_questions', 'manage_questions', 'Manage Questions', 'Approve, reject, and edit any question submission'),
('perm_view_full_pool', 'view_full_pool', 'View Full Pool', 'See all questions in the pool, not just own submissions'),
('perm_build_quizzes', 'build_quizzes', 'Build Quizzes', 'Create and edit quizzes, build running orders');

-- ─── Step 6: Seed default role-permission mappings ───────────────────

-- Admin: all permissions
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_admin', 'perm_manage_users'),
('role_admin', 'perm_manage_categories'),
('role_admin', 'perm_manage_questions'),
('role_admin', 'perm_view_full_pool'),
('role_admin', 'perm_build_quizzes');

-- President: all permissions
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_president', 'perm_manage_users'),
('role_president', 'perm_manage_categories'),
('role_president', 'perm_manage_questions'),
('role_president', 'perm_view_full_pool'),
('role_president', 'perm_build_quizzes');

-- Vice President: all permissions
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_vice_president', 'perm_manage_users'),
('role_vice_president', 'perm_manage_categories'),
('role_vice_president', 'perm_manage_questions'),
('role_vice_president', 'perm_view_full_pool'),
('role_vice_president', 'perm_build_quizzes');

-- Head of Quizzing: manage_questions, view_full_pool, build_quizzes
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_head_quizzing', 'perm_manage_questions'),
('role_head_quizzing', 'perm_view_full_pool'),
('role_head_quizzing', 'perm_build_quizzes');

-- Treasurer: view_full_pool only
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_treasurer', 'perm_view_full_pool');

-- PR Head: view_full_pool only
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_pr_head', 'perm_view_full_pool');

-- Creative Head: view_full_pool only
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_creative_head', 'perm_view_full_pool');

-- FE Representative: view_full_pool only
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_fe_rep', 'perm_view_full_pool');

-- SE Representative: view_full_pool only
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_se_rep', 'perm_view_full_pool');

-- TE Representative: view_full_pool only
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_te_rep', 'perm_view_full_pool');

-- BE Representative: view_full_pool only
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_be_rep', 'perm_view_full_pool');

-- ME Representative: view_full_pool only
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('role_me_rep', 'perm_view_full_pool');

-- Member: no special permissions (can only submit questions, baseline ability)

-- ─── Step 7: Seed 12 starting categories ─────────────────────────────

INSERT INTO "categories" ("id", "name") VALUES
('cat_pop_culture', 'Pop Culture'),
('cat_entertainment', 'Entertainment'),
('cat_movies', 'Movies'),
('cat_history', 'History'),
('cat_politics', 'Politics'),
('cat_geography', 'Geography'),
('cat_world_cultures', 'World Cultures'),
('cat_science', 'Science'),
('cat_technology', 'Technology'),
('cat_literature', 'Literature'),
('cat_arts', 'Arts'),
('cat_sports', 'Sports');

-- ─── Step 8: Migrate existing users to new role IDs ─────────────────

-- ADMIN → Admin role
UPDATE "users" SET "role_id" = 'role_admin' WHERE "role" = 'ADMIN';

-- QUIZMASTER → Head of Quizzing role
UPDATE "users" SET "role_id" = 'role_head_quizzing' WHERE "role" = 'QUIZMASTER';

-- MEMBER → Member role (default)
UPDATE "users" SET "role_id" = 'role_member' WHERE "role" = 'MEMBER';

-- Any remaining users without a role_id get Member
UPDATE "users" SET "role_id" = 'role_member' WHERE "role_id" IS NULL;

-- ─── Step 9: Make role_id non-nullable ───────────────────────────────

ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

-- ─── Step 10: Add FK constraint on role_id ──────────────────────────

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Step 11: Drop old role column and enum ─────────────────────────

ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "role";
