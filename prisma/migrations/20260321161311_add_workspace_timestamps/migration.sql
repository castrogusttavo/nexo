/*
  Warnings:

  - You are about to drop the column `activePlan` on the `workspaces` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `workspaces` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "workspaces" DROP COLUMN "activePlan",
ADD COLUMN     "active_plan" "Plan" NOT NULL DEFAULT 'BASIC',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
