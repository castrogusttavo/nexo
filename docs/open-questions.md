# Open questions and known issues

What the repository cannot answer on its own, and behaviour found while writing these docs that looks like a defect. The code is the source of truth: when you fix or confirm an item, update the page that mentions it and delete the line here.

## Not defined in this repository

Facts that live outside the code (production host, external services, decisions). Pages say "Not defined in this repository" at these points.

- Where the once-a-minute status collector is scheduled. Nothing in `.github/`, `infra/` or `worker/` calls `/api/status/collect/*` (`worker/status-collect.ts` only mentions "the production cron"). See [status-page](architecture/status-page.md).
- Where the Axiom monitor on `queue.job.exhausted` is defined. See [background-jobs](architecture/background-jobs.md) and [observability](operations/observability.md).
- Which database URLs production sets (`DATABASE_URL_POOLED`, `DATABASE_URL_REPLICA`): they live in the host `.env`. In code, `src/lib/prisma.ts` uses `DATABASE_URL_POOLED ?? DATABASE_URL`, and the only reader of `getPrismaReplica()` is `src/repositories/issue.repository.ts`. See [infrastructure](architecture/infrastructure.md).
- Server layout: nginx server blocks, certificates, the `/realtime` route, the backup script and cron (`server-ops` has `backup-inspect` and `backup-run`, but the script is not versioned).
- Manual rollback: no script and no `server-ops` mode does it; the compose file pins `:latest` and migrations are forward-only. See [deploy](operations/deploy.md).
- How the delete-account and STR-61 incidents were first noticed, their production impact and, for delete-account, when it shipped to production. See [postmortems](postmortems/README.md).
- The GitHub secrets list (names the workflows reference are in [environments](operations/environments.md)).
- Whether the admin routes need a rate limiter beyond the allowlist, verified e-mail and 2FA gate, and whether the data export satisfies the LGPD access right (a legal call).
- Whether `content/changelog/` should live in this repo, whether a public API with keys is planned, whether short links will redirect, whether notification delivery and an issue-type settings page are planned.
- Why the `BUSINESS` plan is capped at 12 seats like `FREE`, and why Biome's scope is limited to `app`, `src`, `worker`, `e2e` and `playwright.config.ts`.
- The real reasons behind [ADR-0001](adr/0001-trunk-based-development.md), [0002](adr/0002-result-instead-of-throw.md) and [0005](adr/0005-better-auth.md): the history shows when, not why. All "alternatives considered" in the ADRs are inferred unless a commit is cited.

## Known issues in the code

- `src/cache/_cache.ts`: `get()` logs failures with the action `'set'`.
- `next.config.ts` has `typescript.ignoreBuildErrors: true`.
- `.github/workflows` and `playwright.config.ts`: the Playwright comment says `next start` refuses `output: 'standalone'`, but Next only warns and keeps serving (the vitest HTTP e2e suite runs on `next start`). `infra/dev.yml` runs `postgres:17-alpine` while CI uses `postgres:16`.
- Draft job posts render for anyone with the slug (`app/(web)/careers/[slug]/page.tsx` never checks `job.status`). See [careers](domains/careers-and-marketing.md).
- No route changes or removes a workspace member (only `InvitationService.updateRole` for pending invitations). See [workspace](domains/workspace-and-members.md).
- Account deletion cascades memberships, so a workspace whose only member is deleted stays with no members. See [user and account](domains/user-and-account.md).
- Plan entitlements are declared in `src/config/plans.ts` but only the seat limit and the CSV import are enforced; `REFUNDED` is never set. See [billing](domains/billing-and-coupons.md).
- Wiki: viewers can edit; `move` has no descendant check; the `content` snapshot and the Yjs state are separate and a `PATCH` does not reach live editors; no content-type allowlist on generic uploads. See [wiki](domains/wiki.md).
- Issues: a project member with workspace role `VIEWER` can create, edit and delete issues; `IssueListCache` is not invalidated on assignee or label changes (up to 30 s stale); deleting a state still in use returns a generic 500. See [issue](domains/issue.md) and [labels, states and estimates](domains/label-state-estimate.md).
- Cycles and modules: `addMember` accepts any existing user id and `endDate` may precede `startDate`. See [cycle](domains/cycle.md) and [module](domains/module.md).
- Notification settings are stored but never read by a sender; the project `*Enabled` switches only hide UI; activity rows are never cleaned up. See [activity and notifications](domains/activity-and-notifications.md).
- Data export covers profile, sessions, accounts, consents and the audit log, not workspace content.
- `GET /workspaces/{id}/projects/{slug}/issues` reads `cursor` and `limit` that `public/openapi.json` does not list; the contract suite does not compare query parameters. See [endpoints](api/endpoints.md).
