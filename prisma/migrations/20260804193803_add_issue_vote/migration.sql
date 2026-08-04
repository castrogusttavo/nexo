-- CreateEnum
CREATE TYPE "IssueVoteType" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "issue_votes" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "IssueVoteType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_votes_issue_id_idx" ON "issue_votes"("issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "issue_votes_issue_id_user_id_key" ON "issue_votes"("issue_id", "user_id");

-- AddForeignKey
ALTER TABLE "issue_votes" ADD CONSTRAINT "issue_votes_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_votes" ADD CONSTRAINT "issue_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
