-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "cycle_id" TEXT,
ADD COLUMN     "estimate_value_id" TEXT,
ADD COLUMN     "module_id" TEXT;

-- CreateIndex
CREATE INDEX "issues_cycle_id_idx" ON "issues"("cycle_id");

-- CreateIndex
CREATE INDEX "issues_module_id_idx" ON "issues"("module_id");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_estimate_value_id_fkey" FOREIGN KEY ("estimate_value_id") REFERENCES "estimate_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;
