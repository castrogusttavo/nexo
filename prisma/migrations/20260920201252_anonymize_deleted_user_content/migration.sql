-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_uploaded_by_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_author_id_fkey";

-- DropForeignKey
ALTER TABLE "cycles" DROP CONSTRAINT "cycles_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "issue_updates" DROP CONSTRAINT "issue_updates_author_id_fkey";

-- DropForeignKey
ALTER TABLE "issues" DROP CONSTRAINT "issues_author_id_fkey";

-- DropForeignKey
ALTER TABLE "modules" DROP CONSTRAINT "modules_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "wiki_comments" DROP CONSTRAINT "wiki_comments_author_id_fkey";

-- DropForeignKey
ALTER TABLE "wiki_pages" DROP CONSTRAINT "wiki_pages_created_by_id_fkey";

-- AlterTable
ALTER TABLE "activities" ALTER COLUMN "actor_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "attachments" ALTER COLUMN "uploaded_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "author_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cycles" ALTER COLUMN "lead_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "issue_updates" ALTER COLUMN "author_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "issues" ALTER COLUMN "author_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "modules" ALTER COLUMN "lead_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "lead_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "wiki_comments" ALTER COLUMN "author_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "wiki_pages" ALTER COLUMN "created_by_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_updates" ADD CONSTRAINT "issue_updates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_comments" ADD CONSTRAINT "wiki_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
