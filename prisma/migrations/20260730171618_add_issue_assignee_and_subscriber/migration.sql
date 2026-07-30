-- CreateTable
CREATE TABLE "issue_assignees" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_subscribers" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_assignees_issue_id_idx" ON "issue_assignees"("issue_id");

-- CreateIndex
CREATE INDEX "issue_assignees_user_id_idx" ON "issue_assignees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "issue_assignees_issue_id_user_id_key" ON "issue_assignees"("issue_id", "user_id");

-- CreateIndex
CREATE INDEX "issue_subscribers_issue_id_idx" ON "issue_subscribers"("issue_id");

-- CreateIndex
CREATE INDEX "issue_subscribers_user_id_idx" ON "issue_subscribers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "issue_subscribers_issue_id_user_id_key" ON "issue_subscribers"("issue_id", "user_id");

-- AddForeignKey
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_subscribers" ADD CONSTRAINT "issue_subscribers_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_subscribers" ADD CONSTRAINT "issue_subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
