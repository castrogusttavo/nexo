# Open questions and findings

Things found while writing these docs that the repository cannot settle, or that look like defects. Each item is also marked `TODO: confirm` in the page that depends on it. Close an item by fixing the code or confirming the fact, then update the page and delete the line here.

## Facts only the operator can confirm

- Where the once-a-minute status collector is scheduled (nothing in the repo calls `/api/status/collect/*`). See [status-page](architecture/status-page.md).
- Where the Axiom monitor on `queue.job.exhausted` is defined. See [background-jobs](architecture/background-jobs.md).
- Whether production points the app at the read replica or at PgBouncer (both are provisioned in `infra/prod.yml`). See [infrastructure](architecture/infrastructure.md).
- Server layout outside the repo: nginx server blocks, certificates, the backup cron, the route to Silo.
- Whether the worker always runs as one container (the failure alarm's dedup ledger is per process) and whether the ledger survives a restart. See [ADR-0008](adr/0008-job-failure-alarm-with-dedup.md).
- The date production finished the MinIO to Silo switch. See [ADR-0007](adr/0007-silo-storage.md).
- The real reasons behind ADR-0001, 0002 and 0005 (the history shows when, not why), and which "alternatives considered" were really weighed.
- How to create the local `nexo_test` database (no script does it). See [integration tests](testing/integration.md).
- Whether `content/changelog/` is meant to live in this repo. See [changelog](changelog/README.md).

## Where the code differs from CLAUDE.md (CLAUDE.md is stale)

- `proxy.ts` sets no `x-nonce`; CSP is `'self'` plus `'unsafe-inline'` on purpose. See [ADR-0006](adr/0006-standalone-output-and-browser-tests.md).
- The status page has eight components (`jobs` was added), not seven.
- Routes use `withAuthenticatedRoute` and `withValidatedBody` (`utils/api-handler.ts`) instead of the manual steps.
- Production runs seven app instances, not five.
- Scalar is served at `/reference` and only in development; `/docs` is a placeholder.
- Integration tests truncate 12 named tables with `CASCADE`, not all tables.
- Biome's `files.includes` covers only `app`, `src`, `worker`, `e2e` and `playwright.config.ts`.
- CI skips pushes that touch only root `*.md` or `LICENSE`, so CD does not run for them.

## Possible defects to look at

- `src/cache/_cache.ts`: `get()` logs failures with the action `'set'`.
- `next.config.ts` has `typescript.ignoreBuildErrors: true`. Intentional?
- Draft job posts look reachable by slug (`findBySlug` does not filter by status). See [careers](domains/careers-and-marketing.md).
- No route changes a member's role or removes a member (`app/api/workspaces/[id]/members/` has only `GET` and `import`). See [workspace](domains/workspace-and-members.md).
- Plan gates are declared in `src/config/plans.ts` but only the seat limit and the CSV import are enforced. See [billing](domains/billing-and-coupons.md).
- Wiki: viewers can write; `move` does not stop a page becoming a child of its own descendant; no restore for archived pages; no content-type allowlist on generic uploads. See [wiki](domains/wiki.md).
- Issues: a project member with workspace role `VIEWER` can create, edit and delete issues. Cycle and module `addMember` do not check the target belongs to the project. `IssueListCache` is not invalidated on assignee or label changes (up to 30 s stale). See [issue](domains/issue.md) and [cycle](domains/cycle.md).
- Notification settings are stored but no sender reads them, and the project `*Enabled` switches only hide UI. See [activity and notifications](domains/activity-and-notifications.md).
- `REFUNDED` exists in the enum but no webhook sets it.
- Data export covers profile, sessions, accounts, consents and audit log only, not workspace content. See [user and account](domains/user-and-account.md).
- Admin career routes use no `apiLimiter`, and there is no admin endpoint to read applications. See [admin](domains/admin.md).
- No image rollback exists: the compose file pins `:latest` and migrations are forward-only. See [deploy](operations/deploy.md).
