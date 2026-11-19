# Environments

## Purpose

The three places Nexo runs (local, CI, production), how each gets its configuration, and the variable **names** the code validates. Values are never recorded here; the encrypted production file is `secrets/production.enc.env` and must not be decrypted into docs, issues or chat.

## How it works

### Where variables are validated

- `lib/env/env.ts`: public, `NEXT_PUBLIC_*` plus `NODE_ENV`; baked into the client bundle at build time, so they are build args in the image.
- `lib/env/server.ts` (re-exports `lib/env/_server.ts`, behind `server-only`): server secrets and tuning.
- `lib/env/server-admin.ts` (`_server-admin.ts`): variables that only the admin and careers surfaces need, split out so one surface does not fail another's render (comment in that file).
- `SKIP_ENV_VALIDATION=true` or `NODE_ENV=test` bypasses validation. Import the typed export; do not read `process.env` directly.
- `.env.example` lists the variables for local setup.

### Variable names

Public (`lib/env/env.ts`): `NODE_ENV`, `NEXT_PUBLIC_AXIOM_TOKEN`, `NEXT_PUBLIC_AXIOM_DATASET`, `NEXT_PUBLIC_URL`, `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_POSTHOG_KEY` (optional), `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN` (optional), `NEXT_PUBLIC_SENTRY_RELEASE` (optional), `NEXT_PUBLIC_SENTRY_ENVIRONMENT` (optional).

Server (`lib/env/_server.ts`):

| Group | Names |
| --- | --- |
| Database | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `DATABASE_URL_POOLED` (opt), `DATABASE_URL_REPLICA` (opt), `DB_POOL_MAX` (opt) |
| Redis | `REDIS_URL`, `REDIS_PASSWORD`, `REDIS_TLS_ENABLED` (opt), `REDIS_TLS_CA_PATH` (opt) |
| Object storage (Silo) | `MINIO_ENDPOINT`, `MINIO_USER`, `MINIO_PASSWORD` (names kept from MinIO on purpose, see [ADR 0007](../adr/0007-silo-storage.md)) |
| Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_SECRETS` (opt), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `TRUSTED_PROXIES` (opt, defaults to loopback) |
| Auth tuning | `AUTH_VERIFY_CONCURRENCY`, `AUTH_VERIFY_QUEUE_DEPTH`, `AUTH_VERIFY_QUEUE_WAIT_MS` (all opt) |
| Mail and billing | `RESEND_API_KEY`, `ABACATE_PAY`, `ABACATE_PAY_WEBHOOK_SECRET` |
| Status and alerts | `STATUS_COLLECTOR_SECRET`, `SLACK_ALERTS_WEBHOOK_URL` (opt) |
| Tracing | `AXIOM_TRACES_TOKEN`, `AXIOM_TRACES_DATASET`, `TRACES_SAMPLE_RATE` (all opt) |
| Jobs and realtime | `ACCOUNT_DELETION_GRACE_OVERRIDE_MS` (opt, shortens the 30-day grace outside tests), `REALTIME_PORT` (opt) |
| Build | `HUGEICONS_TOKEN` (private registry token) |

Admin surface (`lib/env/_server-admin.ts`): `PLATFORM_ADMIN_EMAILS`, `WORKBENCH_USER`, `WORKBENCH_PASS`.

Read outside the schema: `DISABLE_AUTH_RATE_LIMIT` (`src/lib/auth.ts`, set by e2e), `PLAYWRIGHT_SKIP_BUILD` (browser suite, per `CLAUDE.md`).

### Local

- `pnpm dev` starts the dev infrastructure (`infra/dev.yml`: Postgres with a replica, Redis, Silo, PgBouncer), applies migrations and runs `next dev`. `pnpm infra` starts the containers only; `pnpm docker:create` is the first-run command.
- The worker (`pnpm worker:dev`) and realtime (`pnpm realtime:dev`) are separate processes.
- `.env.example` lists extra names used only by infra files (`REPLICATOR_PASSWORD`, `REDIS_SENTINEL_*`); the typed schema does not read them.
- Integration tests wipe tables after each test, so run them against the disposable `nexo_test` database, never the development one.
- PostHog and Sentry stay off with no key or DSN; Slack alerts are a logged no-op without a webhook.

### CI

- `ci.yml` jobs use dummy values written inline (for example a dummy `DATABASE_URL` for lint) and service containers for Postgres (`nexo_test`, user `test`) and Redis 7 in the integration and e2e jobs. The status collector secret is a fixed test value in CI. Secrets come from GitHub secrets (HugeIcons, Snyk, Slack webhook, Sentry and Axiom tokens).
- Browser tests boot the standalone artifact without bypassing CSP ([ADR 0006](../adr/0006-standalone-output-and-browser-tests.md)); e2e disables Better Auth's built-in limiter with `DISABLE_AUTH_RATE_LIMIT=true`.

### Production

- Seven app instances, one worker, one realtime process from one image (`infra/app.yml`); stateful services in `infra/prod.yml`; everything behind nginx on one host, with Cloudflare in front ([infrastructure](../architecture/infrastructure.md)).
- Runtime variables come from `/var/www/nexo/.env`, decrypted from `secrets/production.enc.env` by the CD job (or `server-ops` `env-sync`). `SLACK_ALERTS_WEBHOOK_URL` is appended from the CI secret `SLACK_WEBHOOK_URL` when sops does not define it. Public values (`NEXT_PUBLIC_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_REALTIME_URL`) are set in the compose file.
- Migrations use a separate secret, `DATABASE_URL_MIGRATE`, available only to the migrate job.
- Sentry environment is `production` (build arg in `cd.yml`).

## Key decisions and why

- **Two env modules** so client bundles can never import server secrets (`server-only`).
- **Optional integrations fail closed to no-ops** (PostHog, Sentry, Slack, Axiom traces), so dev, CI and tests need no accounts.
- **Secrets in git only when encrypted** (sops with age); decrypted values live on the host only.

## Gotchas

- `NEXT_PUBLIC_*` are fixed at build time: changing one needs a new image, not `env-sync`.
- The Axiom token in `NEXT_PUBLIC_AXIOM_TOKEN` is public by design (ingest only); the lint config acknowledges this in a comment.
- Format constraints are enforced (for example `BETTER_AUTH_SECRET` must start with `ba_`); a wrong shape fails boot, not a request.
- Which secrets exist in GitHub beyond those named in the workflows: TODO: confirm.

## Related files

- `lib/env/env.ts`, `lib/env/_server.ts`, `lib/env/_server-admin.ts`, `.env.example`
- `infra/dev.yml`, `infra/app.yml`, `infra/prod.yml`
- `.github/workflows/ci.yml`, `.github/workflows/cd.yml`
- `secrets/production.enc.env` (encrypted)
