-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "project_labels_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "project_labels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" "TagColor" NOT NULL DEFAULT 'ZINC',
    "workspace_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_label_assignments" (
    "project_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_label_assignments_pkey" PRIMARY KEY ("project_id","label_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_labels_workspace_id_name_key" ON "project_labels"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "project_label_assignments_label_id_idx" ON "project_label_assignments"("label_id");

-- AddForeignKey
ALTER TABLE "project_labels" ADD CONSTRAINT "project_labels_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_label_assignments" ADD CONSTRAINT "project_label_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_label_assignments" ADD CONSTRAINT "project_label_assignments_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "project_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
