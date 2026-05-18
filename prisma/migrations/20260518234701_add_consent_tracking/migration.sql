-- CreateEnum
CREATE TYPE "ConsentDocument" AS ENUM ('TERMS', 'PRIVACY', 'COOKIES');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'REVOKED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accepted_privacy_at" TIMESTAMP(3),
ADD COLUMN     "accepted_terms_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "consent_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document" "ConsentDocument" NOT NULL,
    "version" TEXT NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_events_user_id_document_created_at_idx" ON "consent_events"("user_id", "document", "created_at");

-- AddForeignKey
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
