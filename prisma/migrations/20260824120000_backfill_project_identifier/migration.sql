/*
  The 20260811165409_make_project_identifier_required migration assumed every
  project already had an `identifier` (true in every env seeded after
  20260726132607_project_identifier). Production has legacy projects created
  before that column existed, so the bare `SET NOT NULL` fails there with a
  NOT NULL violation (P3009).

  This migration backfills any remaining NULL `identifier` using the same
  convention as ProjectService (baseIdentifierFrom / nextIdentifierCandidate):
  uppercase alphanumeric prefix of the name, first 6 chars, padded to at
  least 2 with 'X', with a numeric suffix on collision within the workspace.
  It is a no-op everywhere the column is already fully populated.
*/
DO $$
DECLARE
  proj RECORD;
  base TEXT;
  candidate TEXT;
  attempt INT;
  suffix TEXT;
BEGIN
  FOR proj IN
    SELECT id, name, workspace_id
    FROM projects
    WHERE identifier IS NULL
    ORDER BY created_at
  LOOP
    base := upper(regexp_replace(proj.name, '[^A-Za-z0-9]', '', 'g'));
    base := substr(base, 1, 6);
    IF length(base) < 2 THEN
      base := rpad(base, 2, 'X');
    END IF;

    candidate := base;
    attempt := 1;
    WHILE EXISTS (
      SELECT 1 FROM projects
      WHERE workspace_id = proj.workspace_id
        AND identifier = candidate
        AND id <> proj.id
    ) LOOP
      attempt := attempt + 1;
      suffix := attempt::text;
      candidate := substr(base, 1, 10 - length(suffix)) || suffix;
    END LOOP;

    UPDATE projects SET identifier = candidate WHERE id = proj.id;
  END LOOP;
END $$;

-- AlterTable (idempotent: no-op where already NOT NULL)
ALTER TABLE "projects" ALTER COLUMN "identifier" SET NOT NULL;
