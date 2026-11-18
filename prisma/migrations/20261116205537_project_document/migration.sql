-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "document" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "document_updated_at" TIMESTAMP(3),
ADD COLUMN     "document_yjs_state" BYTEA;
