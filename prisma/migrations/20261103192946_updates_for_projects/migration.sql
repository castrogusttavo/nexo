-- issue_updates becomes updates, keeping every row. Constraint and index names
-- follow Prisma's own, so the next migrate dev finds no drift.
ALTER TABLE "issue_updates" RENAME TO "updates";
ALTER TYPE "IssueUpdateStatus" RENAME TO "UpdateStatus";
ALTER TABLE "updates" RENAME CONSTRAINT "issue_updates_pkey" TO "updates_pkey";
ALTER TABLE "updates" RENAME CONSTRAINT "issue_updates_issue_id_fkey" TO "updates_issue_id_fkey";
ALTER TABLE "updates" RENAME CONSTRAINT "issue_updates_author_id_fkey" TO "updates_author_id_fkey";
ALTER INDEX "issue_updates_issue_id_created_at_idx" RENAME TO "updates_issue_id_created_at_idx";

-- An update now belongs to a project OR an issue, never both and never neither.
ALTER TABLE "updates" ALTER COLUMN "issue_id" DROP NOT NULL;
ALTER TABLE "updates" ADD COLUMN "project_id" TEXT;
ALTER TABLE "updates" ADD CONSTRAINT "updates_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "updates_project_id_created_at_idx" ON "updates"("project_id", "created_at");
ALTER TABLE "updates" ADD CONSTRAINT "updates_subject_check"
  CHECK (("project_id" IS NULL) <> ("issue_id" IS NULL));

-- CreateTable
CREATE TABLE "update_replies" (
  "id" TEXT NOT NULL,
  "update_id" TEXT NOT NULL,
  "author_id" TEXT,
  "content" TEXT NOT NULL,
  "edited_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "update_replies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "update_replies_update_id_created_at_idx" ON "update_replies"("update_id", "created_at");
ALTER TABLE "update_replies" ADD CONSTRAINT "update_replies_update_id_fkey"
  FOREIGN KEY ("update_id") REFERENCES "updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "update_replies" ADD CONSTRAINT "update_replies_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "update_reactions" (
  "update_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "update_reactions_pkey" PRIMARY KEY ("update_id", "user_id", "emoji")
);
CREATE INDEX "update_reactions_update_id_idx" ON "update_reactions"("update_id");
ALTER TABLE "update_reactions" ADD CONSTRAINT "update_reactions_update_id_fkey"
  FOREIGN KEY ("update_id") REFERENCES "updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "update_reactions" ADD CONSTRAINT "update_reactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects" ADD COLUMN "updates_enabled" BOOLEAN NOT NULL DEFAULT false;