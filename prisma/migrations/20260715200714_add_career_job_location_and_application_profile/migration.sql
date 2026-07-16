-- CreateEnum
CREATE TYPE "CareerLocationType" AS ENUM ('REMOTE', 'HYBRID', 'ON_SITE');

-- CreateEnum
CREATE TYPE "CareerEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'TEMPORARY');

-- AlterTable
ALTER TABLE "career_applications" ADD COLUMN     "experience_years" INTEGER,
ADD COLUMN     "last_job_title" TEXT,
ADD COLUMN     "linkedin_url" TEXT;

-- AlterTable
ALTER TABLE "career_jobs" ADD COLUMN     "employment_type" "CareerEmploymentType" NOT NULL DEFAULT 'CONTRACT',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "location_type" "CareerLocationType" NOT NULL DEFAULT 'REMOTE';
