/*
  Warnings:

  - A unique constraint covering the columns `[workspace_id,identifier]` on the table `projects` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "identifier" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspace_id_identifier_key" ON "projects"("workspace_id", "identifier");
