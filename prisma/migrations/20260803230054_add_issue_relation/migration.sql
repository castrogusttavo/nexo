-- CreateEnum
CREATE TYPE "IssueRelationType" AS ENUM ('RELATES_TO', 'IMPLEMENTS');

-- CreateTable
CREATE TABLE "issue_relations" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "type" "IssueRelationType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_relations_source_id_idx" ON "issue_relations"("source_id");

-- CreateIndex
CREATE INDEX "issue_relations_target_id_idx" ON "issue_relations"("target_id");

-- CreateIndex
CREATE UNIQUE INDEX "issue_relations_source_id_target_id_type_key" ON "issue_relations"("source_id", "target_id", "type");

-- AddForeignKey
ALTER TABLE "issue_relations" ADD CONSTRAINT "issue_relations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_relations" ADD CONSTRAINT "issue_relations_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
