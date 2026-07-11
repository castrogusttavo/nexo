UPDATE "users" u
SET "onboarding_step" = NULL
WHERE u."onboarding_step" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "memberships" m WHERE m."user_id" = u."id"
  );
