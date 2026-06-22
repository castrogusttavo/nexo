-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('PROFILE', 'ROLE', 'BRINGS', 'WORKSPACE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarding_step" "OnboardingStep" DEFAULT 'PROFILE';
