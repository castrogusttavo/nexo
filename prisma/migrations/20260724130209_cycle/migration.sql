-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "cycles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CycleStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "lead_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cycle_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cycles_project_id_status_idx" ON "cycles"("project_id", "status");

-- CreateIndex
CREATE INDEX "cycles_lead_id_idx" ON "cycles"("lead_id");

-- CreateIndex
CREATE INDEX "cycle_members_cycle_id_idx" ON "cycle_members"("cycle_id");

-- CreateIndex
CREATE INDEX "cycle_members_user_id_idx" ON "cycle_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_members_user_id_cycle_id_key" ON "cycle_members"("user_id", "cycle_id");

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_members" ADD CONSTRAINT "cycle_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_members" ADD CONSTRAINT "cycle_members_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
