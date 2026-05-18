-- DropForeignKey
ALTER TABLE "short_links" DROP CONSTRAINT "short_links_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sticky_notes" DROP CONSTRAINT "sticky_notes_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletion_scheduled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_deletion_scheduled_at_idx" ON "users"("deletion_scheduled_at");

-- AddForeignKey
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sticky_notes" ADD CONSTRAINT "sticky_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
