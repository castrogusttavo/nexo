-- Rename BASIC -> FREE (existing rows keep their value, only the label changes).
ALTER TYPE "Plan" RENAME VALUE 'BASIC' TO 'FREE';

-- Add the new BUSINESS tier.
ALTER TYPE "Plan" ADD VALUE 'BUSINESS';

-- Point the default at the renamed FREE label.
ALTER TABLE "workspaces" ALTER COLUMN "active_plan" SET DEFAULT 'FREE';
