-- CreateTable
CREATE TABLE "estimate_values" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "estimate_settings_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_values_estimate_settings_id_idx" ON "estimate_values"("estimate_settings_id");

-- AddForeignKey
ALTER TABLE "estimate_values" ADD CONSTRAINT "estimate_values_estimate_settings_id_fkey" FOREIGN KEY ("estimate_settings_id") REFERENCES "estimate_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
