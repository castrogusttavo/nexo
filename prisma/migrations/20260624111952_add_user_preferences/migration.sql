-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "QuickSendShortcut" AS ENUM ('ENTER', 'CTRL_ENTER');

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "smooth_cursor" BOOLEAN NOT NULL DEFAULT false,
    "quick_send_shortcut" "QuickSendShortcut" NOT NULL DEFAULT 'ENTER',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "week_starts_on" INTEGER NOT NULL DEFAULT 1,
    "weekend_days" INTEGER[] DEFAULT ARRAY[0, 6]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_user_id_key" ON "UserPreference"("user_id");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
