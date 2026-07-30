-- CreateTable
CREATE TABLE "issue_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" "TagColor" NOT NULL DEFAULT 'ZINC',
    "icon" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_types_project_id_idx" ON "issue_types"("project_id");

-- AddForeignKey
ALTER TABLE "issue_types" ADD CONSTRAINT "issue_types_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
