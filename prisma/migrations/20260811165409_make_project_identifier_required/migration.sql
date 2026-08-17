/*
  Warnings:

  - Made the column `identifier` on table `projects` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "identifier" SET NOT NULL;
