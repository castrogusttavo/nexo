/*
  Project states are workspace-scoped and every project has one. Existing
  workspaces get the six default states and existing projects the default
  one, so state_id is added nullable, backfilled, then made required.
*/

-- CreateEnum
CREATE TYPE "ProjectStateGroup" AS ENUM ('DRAFT', 'PLANNING', 'EXECUTION', 'MONITORING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "project_states_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "project_states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group" "ProjectStateGroup" NOT NULL,
    "color" "TagColor" NOT NULL DEFAULT 'ZINC',
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "workspace_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_states_workspace_id_group_idx" ON "project_states"("workspace_id", "group");

-- CreateIndex
CREATE UNIQUE INDEX "project_states_workspace_id_name_key" ON "project_states"("workspace_id", "name");

-- AddForeignKey
ALTER TABLE "project_states" ADD CONSTRAINT "project_states_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: the default states for every existing workspace. Ids are
-- 'c' + 24 hex chars, the shape of Prisma's cuid() that z.cuid2() accepts.
INSERT INTO "project_states" ("id", "name", "group", "color", "order", "is_default", "workspace_id", "updated_at")
SELECT
  'c' || substr(md5(random()::text || clock_timestamp()::text || w."id" || d."name"), 1, 24),
  d."name", d."grp"::"ProjectStateGroup", d."color"::"TagColor", 0, d."is_default", w."id", CURRENT_TIMESTAMP
FROM "workspaces" w
CROSS JOIN (VALUES
  ('Rascunho',      'DRAFT',      'ZINC',   true),
  ('Planejamento',  'PLANNING',   'BLUE',   false),
  ('Execução',      'EXECUTION',  'YELLOW', false),
  ('Monitoramento', 'MONITORING', 'PURPLE', false),
  ('Concluído',     'COMPLETED',  'GREEN',  false),
  ('Cancelado',     'CANCELLED',  'RED',    false)
) AS d("name", "grp", "color", "is_default");

-- AlterTable: nullable, backfilled with the workspace default, then required
ALTER TABLE "projects" ADD COLUMN "state_id" TEXT;

UPDATE "projects" p
SET "state_id" = s."id"
FROM "project_states" s
WHERE s."workspace_id" = p."workspace_id" AND s."is_default";

ALTER TABLE "projects" ALTER COLUMN "state_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "projects_state_id_idx" ON "projects"("state_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "project_states"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
