-- CreateEnum
CREATE TYPE "CareerJobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CareerApplicationStatus" AS ENUM ('RECEIVED', 'REVIEWING', 'REJECTED', 'HIRED');

-- CreateTable
CREATE TABLE "career_jobs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "summary" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "CareerJobStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "portfolio_url" TEXT,
    "message" TEXT,
    "resume_bucket" TEXT NOT NULL,
    "resume_key" TEXT NOT NULL,
    "resume_file_name" TEXT NOT NULL,
    "consent_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT NOT NULL,
    "status" "CareerApplicationStatus" NOT NULL DEFAULT 'RECEIVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "career_jobs_slug_key" ON "career_jobs"("slug");

-- CreateIndex
CREATE INDEX "career_applications_job_id_idx" ON "career_applications"("job_id");

-- CreateIndex
CREATE INDEX "career_applications_created_at_idx" ON "career_applications"("created_at");

-- AddForeignKey
ALTER TABLE "career_applications" ADD CONSTRAINT "career_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "career_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
