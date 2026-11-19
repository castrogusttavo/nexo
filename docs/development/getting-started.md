# Getting started

How to run Nexo locally. Package manager is pnpm (`packageManager: pnpm@10.33.2` in `package.json`); CI uses Node 24 (`.github/workflows/ci.yml`). Everything here is checked against `package.json` and `infra/dev.yml`.

## First run

```bash
pnpm install
pnpm docker:create        # first run only: creates and starts the infra containers
pnpm dev                  # pnpm infra, then next dev
```

- `.env` is required. `.env.example` lists the variables; copy it and fill it in. `docker:create` passes `--env-file .env` to Compose, so the database, Redis and storage credentials come from there.
- `pnpm install` needs the private HugeIcons registry. CI writes an `.npmrc` for `@hugeicons-pro` with the `HUGEICONS_TOKEN` secret before installing; locally you need the same token (`HUGEICONS_TOKEN` is also in `.env.example`). Never commit it.
- `pnpm dev` is `pnpm infra && node scripts/next-banner.mjs dev`. The banner script runs `next dev` and only replaces Next's startup banner.

## Infrastructure

`pnpm infra` is `pnpm docker:start && pnpm prisma:migrate:dev`: it starts the already-created containers and applies pending migrations. `pnpm docker:stop` stops them. Compose file: `infra/dev.yml` (project name pinned to `nexo` so volume names stay stable).

| Container | Image and role | Host port |
| --- | --- | --- |
| `nexo-db` | `postgres:17-alpine`, primary | 5432 |
| `nexo-db-replica` | Postgres streaming replica (read-replica client falls back to the primary when `DATABASE_URL_REPLICA` is unset) | 5434 |
| `nexo-redis` | Redis | 6379 |
| `nexo-minio` (service `nexo-storage`) | Silo, an S3-compatible MinIO fork | 9000 (API), 127.0.0.1:9001 (console) |
| `nexo-pgbouncer` | Pooler, optional (`DATABASE_URL_POOLED`) | 6432 |

Other compose files: `infra/app.yml`, `infra/prod.yml`, `infra/loadtest.yml`; see [infrastructure](../architecture/infrastructure.md). The Redis container serves TLS only on its dev port, which is why `src/__tests__/setup.redis.ts` builds a `rediss://` URL when `REDIS_URL` is unset.

## Other processes

| Command | Runs |
| --- | --- |
| `pnpm worker:dev` | BullMQ worker with watch (`tsx ... worker/index.ts`) |
| `pnpm worker:build` then `pnpm worker` | The esbuild bundle `dist/worker.cjs` |
| `pnpm realtime:dev` | Realtime (Hocuspocus) server; the wiki editor needs it |
| `pnpm email` | React Email preview of `components/emails` on port 3001 |
| `pnpm status:collect`, `pnpm status:watch` | One status collection, or every 60 s until Ctrl+C |
| `pnpm prisma:studio`, `pnpm prisma:migrate:dev`, `pnpm prisma:generate` | Prisma tooling |
| `pnpm build`, `pnpm start` | `prisma generate && next build`; `next start -H 0.0.0.0 -p 3000` |

See [background-jobs](../architecture/background-jobs.md) and [status-page](../architecture/status-page.md).

## Environment validation

Variables are validated with Zod and split in two (`lib/env/`):

- `lib/env/env.ts`: public variables (`NODE_ENV`, `NEXT_PUBLIC_AXIOM_TOKEN` must start with `xaat-`, `NEXT_PUBLIC_AXIOM_DATASET`, `NEXT_PUBLIC_URL`, `NEXT_PUBLIC_REALTIME_URL` must start with `ws`, optional PostHog and Sentry keys). It is also bundled for the browser.
- `lib/env/server.ts`: server variables (database, Redis, storage, Better Auth, OAuth, Resend, secrets). It starts with `import 'server-only'` and re-exports `lib/env/_server.ts`; `server-admin.ts` does the same for `_server-admin.ts`.

Import the typed export (`import { DATABASE_URL } from '@/lib/env/server'`), never read `process.env` directly.

Validation is skipped (lenient parse) when `NODE_ENV=test` or `SKIP_ENV_VALIDATION=true`. `lenientServerEnv()` in `_server.ts` still uses the parsed values when they are valid and falls back to the raw ones when a value is present but malformed.

## Gotchas

- `NEXT_PUBLIC_*` values are inlined into the client bundle at build time, and `SKIP_ENV_VALIDATION` is not, so the browser re-runs the public validation for real. A build missing `NEXT_PUBLIC_REALTIME_URL` or the Axiom variables ships a bundle that throws on every page; CI and `e2e/visual/run-in-docker.sh` set them explicitly.
- A local `.env` with `NODE_ENV=development` makes `next build` build a development bundle and fail during prerender; `playwright.config.ts` pins `NODE_ENV=production` for that reason.
- The integration and e2e suites truncate tables. Use a disposable database ([integration](../testing/integration.md)).
- `pnpm dev` validates instant navigation on every page and prints `Error: Route ...` in the terminal for blocking reads; see [caching](../architecture/caching.md).
- Storage is Silo, not MinIO proper; the container name and env vars (`MINIO_*`) are kept for compatibility ([ADR 0007](../adr/0007-silo-storage.md)).

## Related files

- `package.json`, `infra/dev.yml`, `.env.example`, `scripts/next-banner.mjs`
- `lib/env/env.ts`, `lib/env/server.ts`, `lib/env/_server.ts`
- `prisma/schema.prisma`, `prisma.config.ts`
- [Conventions](./conventions.md), [Testing overview](../testing/README.md)
