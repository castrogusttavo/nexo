-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "priority" "ProjectPriority" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "start_date" TIMESTAMP(3);
