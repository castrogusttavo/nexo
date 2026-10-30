-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "image" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';
