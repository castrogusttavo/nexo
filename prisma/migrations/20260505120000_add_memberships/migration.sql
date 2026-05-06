-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_workspace_id_key" ON "memberships"("user_id", "workspace_id");

-- CreateIndex
CREATE INDEX "memberships_workspace_id_idx" ON "memberships"("workspace_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill memberships from existing users.workspace_id
INSERT INTO "memberships" ("id", "user_id", "workspace_id", "role", "created_at", "updated_at")
SELECT
    md5(random()::text || clock_timestamp()::text || "users"."id") AS "id",
    "users"."id",
    "users"."workspace_id",
    "users"."role",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users"
WHERE "users"."workspace_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_workspace_id_fkey";

-- DropColumn
ALTER TABLE "users" DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
