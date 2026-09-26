-- AlterTable
ALTER TABLE "two_factors" ADD COLUMN     "failed_verification_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "two_factors_secret_idx" ON "two_factors"("secret");
