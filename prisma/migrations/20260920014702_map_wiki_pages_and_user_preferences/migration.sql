-- Both models were missing @@map, so they were the only two tables left in
-- PascalCase. Rename (no data touched); columns were already snake_case.
ALTER TABLE "WikiPage" RENAME TO "wiki_pages";
ALTER TABLE "UserPreference" RENAME TO "user_preferences";

-- Keep constraint/index names in line with the new table names.
ALTER TABLE "user_preferences" RENAME CONSTRAINT "UserPreference_pkey" TO "user_preferences_pkey";
ALTER TABLE "wiki_pages" RENAME CONSTRAINT "WikiPage_pkey" TO "wiki_pages_pkey";
ALTER TABLE "user_preferences" RENAME CONSTRAINT "UserPreference_user_id_fkey" TO "user_preferences_user_id_fkey";
ALTER TABLE "wiki_pages" RENAME CONSTRAINT "WikiPage_created_by_id_fkey" TO "wiki_pages_created_by_id_fkey";
ALTER TABLE "wiki_pages" RENAME CONSTRAINT "WikiPage_parent_id_fkey" TO "wiki_pages_parent_id_fkey";
ALTER TABLE "wiki_pages" RENAME CONSTRAINT "WikiPage_updated_by_id_fkey" TO "wiki_pages_updated_by_id_fkey";
ALTER TABLE "wiki_pages" RENAME CONSTRAINT "WikiPage_workspace_id_fkey" TO "wiki_pages_workspace_id_fkey";
ALTER INDEX "UserPreference_user_id_key" RENAME TO "user_preferences_user_id_key";
