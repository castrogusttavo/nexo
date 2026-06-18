-- CreateTable
CREATE TABLE "project_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_favorites_user_id_idx" ON "project_favorites"("user_id");

-- CreateIndex
CREATE INDEX "project_favorites_project_id_idx" ON "project_favorites"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_favorites_user_id_project_id_key" ON "project_favorites"("user_id", "project_id");

-- AddForeignKey
ALTER TABLE "project_favorites" ADD CONSTRAINT "project_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_favorites" ADD CONSTRAINT "project_favorites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
