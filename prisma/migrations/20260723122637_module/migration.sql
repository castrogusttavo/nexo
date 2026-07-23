-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('BACKLOG', 'PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "ModuleStatus" NOT NULL DEFAULT 'BACKLOG',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "lead_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modules_project_id_status_idx" ON "modules"("project_id", "status");

-- CreateIndex
CREATE INDEX "modules_lead_id_idx" ON "modules"("lead_id");

-- CreateIndex
CREATE INDEX "module_members_user_id_idx" ON "module_members"("user_id");

-- CreateIndex
CREATE INDEX "module_members_module_id_idx" ON "module_members"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_members_user_id_module_id_key" ON "module_members"("user_id", "module_id");

-- CreateIndex
CREATE INDEX "module_favorites_user_id_idx" ON "module_favorites"("user_id");

-- CreateIndex
CREATE INDEX "module_favorites_module_id_idx" ON "module_favorites"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_favorites_user_id_module_id_key" ON "module_favorites"("user_id", "module_id");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_members" ADD CONSTRAINT "module_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_members" ADD CONSTRAINT "module_members_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_favorites" ADD CONSTRAINT "module_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_favorites" ADD CONSTRAINT "module_favorites_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
