-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "cycles_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "issue_types_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "modules_enabled" BOOLEAN NOT NULL DEFAULT true;
