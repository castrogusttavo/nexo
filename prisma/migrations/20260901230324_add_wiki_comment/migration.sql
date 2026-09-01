-- CreateTable
CREATE TABLE "wiki_comments" (
    "id" TEXT NOT NULL,
    "wiki_page_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "mark_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wiki_comments_wiki_page_id_mark_id_idx" ON "wiki_comments"("wiki_page_id", "mark_id");

-- AddForeignKey
ALTER TABLE "wiki_comments" ADD CONSTRAINT "wiki_comments_wiki_page_id_fkey" FOREIGN KEY ("wiki_page_id") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_comments" ADD CONSTRAINT "wiki_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_comments" ADD CONSTRAINT "wiki_comments_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_comments" ADD CONSTRAINT "wiki_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "wiki_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
