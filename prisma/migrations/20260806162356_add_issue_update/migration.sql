-- CreateEnum
CREATE TYPE "IssueUpdateStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK');

-- CreateTable
CREATE TABLE "issue_updates" (
    "id" TEXT NOT NULL,
    "status" "IssueUpdateStatus" NOT NULL,
    "content" TEXT,
    "issue_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_updates_issue_id_created_at_idx" ON "issue_updates"("issue_id", "created_at");

-- AddForeignKey
ALTER TABLE "issue_updates" ADD CONSTRAINT "issue_updates_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_updates" ADD CONSTRAINT "issue_updates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
