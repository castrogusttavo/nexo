-- CreateEnum
CREATE TYPE "EstimateSystem" AS ENUM ('POINTS', 'CATEGORIES', 'TIME');

-- CreateEnum
CREATE TYPE "EstimateModel" AS ENUM ('FIBONACCI', 'LINEAR', 'SQUARES', 'T_SHIRT_SIZES', 'EASY_TO_HARD', 'HOURS');

-- CreateTable
CREATE TABLE "estimate_settings" (
    "id" TEXT NOT NULL,
    "system" "EstimateSystem" NOT NULL DEFAULT 'POINTS',
    "model" "EstimateModel" NOT NULL DEFAULT 'FIBONACCI',
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estimate_settings_project_id_key" ON "estimate_settings"("project_id");

-- AddForeignKey
ALTER TABLE "estimate_settings" ADD CONSTRAINT "estimate_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
