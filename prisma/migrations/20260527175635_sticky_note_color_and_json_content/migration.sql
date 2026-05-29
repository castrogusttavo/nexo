/*
  Warnings:

  - Changed the type of `content` on the `sticky_notes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "StickyColor" AS ENUM ('RED', 'YELLOW', 'BLUE', 'GREEN', 'PURPLE', 'ZINC');

-- DropIndex
DROP INDEX "sticky_notes_created_at_idx";

-- AlterTable
ALTER TABLE "sticky_notes" ADD COLUMN     "color" "StickyColor" NOT NULL DEFAULT 'ZINC',
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- CreateIndex
CREATE INDEX "sticky_notes_user_id_updated_at_idx" ON "sticky_notes"("user_id", "updated_at");
