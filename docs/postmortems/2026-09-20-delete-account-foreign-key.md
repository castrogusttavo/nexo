# 2026-09-20: account deletion failing silently on a foreign key

## Summary

Hard-deleting a user (`prisma.user.delete`) failed for anyone who had ever authored content: twelve `User` relations had no `onDelete`, so Postgres refused with `violates foreign key constraint activities_actor_id_fkey`. The `delete-account` job threw, BullMQ retried three times and gave up, and nobody was told. Per the fix commit, "every deletion request since the feature shipped has been failing in silence". The data fix landed on 2026-09-20 (`94d044f2`), the alarm that makes this class loud on 2026-09-21 (`8be505aa`).

## Impact

- Users who requested deletion kept their account and data after the 30-day grace period. This is an LGPD obligation the feature exists to meet, which is why the commit calls it out. How many requests were pending is not recorded: TODO: confirm.
- No data loss; the failure was in the other direction (not deleting).
- Duration: the whole life of the feature (commit message). The date the feature shipped is TODO: confirm.

## Timeline

- 2026-09-20 17:45, `94d044f2`: authorship made nullable with `onDelete: SetNull` (migration `20260920201252_anonymize_deleted_user_content`). Content stays, the person goes; the UI shows "Usuário removido" and "Sem líder" (`lib/removed-user.ts`).
- 2026-09-21 01:28, `8be505aa`: the worker logs one `queue.job.exhausted` error when a job gives up.
- 2026-09-21 11:22, `807fa5e8`: stalled jobs get reason `stalled` (BullMQ 5.79 fails them with `UnrecoverableError`), a `QueueEvents` backstop and a dedup ledger so a death alarms once.
- 2026-09-22, `f40974bc`: Slack delivery for alerts, including dead jobs.

<!-- DIAGRAM NEEDED: delete-account-failure: sequence of the delete-account job from enqueue to FK violation, retries and silent death, versus the fixed flow with SetNull and the exhausted alarm; read src/lib/queue/processors/account-lifecycle.ts, src/lib/queue/failure-alarm.ts, prisma/migrations/20260920201252_anonymize_deleted_user_content/migration.sql -->

## Root cause

1. **Schema.** Authorship columns referenced `User` with the default (restrict) behaviour; deleting a user who authored anything violated a foreign key.
2. **Tests that could not see it.** Unit-test fixtures had no authored rows, so they passed.
3. **No alarm.** A queue that always fails looks the same as one that never runs; the failed set was the only evidence and is pruned after 7 days.

## Detection

Found by reading the production error; the commit message quotes the exact constraint name. The existence of the Postgres error in a log or the failed set is implied. How it was first noticed: TODO: confirm.

## Resolution

- Content survives, personal data leaves: authorship nullable with `SetNull`; leads become "no lead"; nullability propagated through DTOs, repository includes and the UI without `!` or `as string`.
- A side effect fixed on the way: the project members page gated management on being the lead, so a leaderless project locked everyone out; it now follows the service (owner or admin).
- `seed-preview-data` fails loudly instead of seeding authorless content.

## Guards added

- An integration test seeds a user who leads a project and wrote an issue, comment, wiki page and activity, deletes the user, and asserts everything survives with null authorship. Restoring the old constraint reproduces the production error.
- The failure alarm contract (`queue.job.exhausted`), see [background-jobs](../architecture/background-jobs.md) and [ADR 0008](../adr/0008-job-failure-alarm-with-dedup.md).
- Component tests for the nullable-author states.

## Lessons

- Fixtures with realistic relations catch constraint failures; empty fixtures hide them.
- Make final failures loud. A retry policy without an alarm turns an error into silence.
- Deletion paths need an end-to-end test against a real database.

## Related files

- `prisma/schema.prisma`, `prisma/migrations/20260920201252_anonymize_deleted_user_content/`
- `src/lib/queue/processors/account-lifecycle.ts`, `src/lib/queue/failure-alarm.ts`, `src/lib/queue/failure-listener.ts`
- `lib/removed-user.ts`
