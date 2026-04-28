-- CreateEnum
CREATE TYPE "ComponentStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "component_key" TEXT NOT NULL,
    "status" "ComponentStatus" NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "error" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_dailies" (
    "id" TEXT NOT NULL,
    "component_key" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "worst_status" "ComponentStatus" NOT NULL,
    "total_checks" INTEGER NOT NULL,
    "up_checks" INTEGER NOT NULL,
    "uptime_pct" DECIMAL(6,3) NOT NULL,
    "avg_latency_ms" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_dailies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_checks_component_key_checked_at_idx" ON "health_checks"("component_key", "checked_at");

-- CreateIndex
CREATE INDEX "health_checks_checked_at_idx" ON "health_checks"("checked_at");

-- CreateIndex
CREATE INDEX "component_dailies_component_key_day_idx" ON "component_dailies"("component_key", "day");

-- CreateIndex
CREATE UNIQUE INDEX "component_dailies_component_key_day_key" ON "component_dailies"("component_key", "day");
