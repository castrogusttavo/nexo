-- CreateTable
CREATE TABLE "notification_setting" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "priority_changes" BOOLEAN NOT NULL DEFAULT true,
    "state_changes" BOOLEAN NOT NULL DEFAULT true,
    "comments" BOOLEAN NOT NULL DEFAULT true,
    "mentions" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_setting_user_id_key" ON "notification_setting"("user_id");

-- AddForeignKey
ALTER TABLE "notification_setting" ADD CONSTRAINT "notification_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
