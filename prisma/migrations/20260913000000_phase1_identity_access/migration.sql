-- CreateEnum
CREATE TYPE "role" AS ENUM ('MEMBER', 'QUIZMASTER', 'ADMIN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'ALUMNI', 'REVOKED');

-- CreateEnum
CREATE TYPE "access_request_status" AS ENUM ('PENDING', 'INVITED', 'APPROVED', 'DENIED');

-- DropTable
DROP TABLE "HealthCheck";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'MEMBER',
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "linked_participant_id" TEXT,
    "was_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "status" "access_request_status" NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
