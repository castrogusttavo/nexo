/*
  Warnings:

  - You are about to drop the column `assignee_id` on the `issues` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "issues" DROP CONSTRAINT "issues_assignee_id_fkey";

-- AlterTable
ALTER TABLE "issues" DROP COLUMN "assignee_id";
