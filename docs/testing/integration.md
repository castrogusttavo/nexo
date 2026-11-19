# Integration tests

Integration tests answer: does this repository query or cache behave correctly against a real PostgreSQL and a real Redis? Mocks stop being useful here, because the thing under test is the interaction with the database.

## What lives here

The `integration` project (`vite.config.ts`) includes:

- `src/repositories/**/__tests__/*.test.ts`
- `src/cache/**/__tests__/*.test.ts`
- `src/lib/**/__tests__/*.integration.test.ts`

It runs with `pool: 'forks'` and `maxWorkers: 1`, so files run serially in separate processes, with a 15 s timeout. Serial execution is required because every test shares one database and truncates it.

```bash
pnpm infra                      # Postgres, Redis, storage up and migrations applied
pnpm test:integration
pnpm vitest --project integration src/repositories/__tests__/sticky-note.repository.test.ts
```

## The database is disposable

`src/__tests__/setup.integration.ts` runs this after every test:

```sql
TRUNCATE TABLE sessions, accounts, verifications, subscriptions, memberships,
  workspaces, users, incident_updates, incidents, health_checks,
  component_dailies, career_jobs CASCADE
```

`CASCADE` also empties every table with a foreign key into those (for example sticky notes, through `users`). It is not a literal "all tables" truncate: a table with no foreign-key path to the listed ones is not cleared. The HTTP e2e setup truncates the same set plus `consent_events`.

Consequence: never run this project against a database holding data you want. CI uses a throwaway `postgres:16` service with database `nexo_test` (`DATABASE_URL: postgresql://test:test@localhost:5432/nexo_test` in `.github/workflows/ci.yml`). Locally, run the project with `DATABASE_URL` pointed at a disposable database such as `nexo_test` rather than your live dev database. How to create that local database is not scripted in the repository: no script, `infra/dev.yml` init file (`infra/docker/postgres-init/` only creates the replicator role) or `.env.example` creates `nexo_test`; only CI creates it, through the `POSTGRES_DB: nexo_test` env of its `postgres:16` service. Locally, create it by hand in the dev Postgres container (for example `CREATE DATABASE nexo_test;`), apply migrations to it (`prisma migrate`) and point `DATABASE_URL` at it.

## Redis

`src/__tests__/setup.redis.ts` always deletes `REDIS_SENTINEL_HOSTS`, forcing a single-instance client. If `REDIS_URL` is unset (local dev) it builds `rediss://[:password@]localhost:6379` and sets `REDIS_TLS_ENABLED=true`, because the dev Redis container serves TLS only. In CI `REDIS_URL` is a plain `redis://localhost:6379` and is left alone.

Cache tests under `src/cache/` use this live Redis. The table truncation does not clear Redis keys; `setup.integration.ts` has no Redis cleanup. Each cache test file does clean up its own keys: all six files under `src/cache/__tests__/` (`issue-list`, `notification-setting`, `status`, `user`, `user-preference`, `workspace`) delete their key prefixes in an `afterEach` (`redis.del`).

## The repository test pattern

`src/repositories/__tests__/sticky-note.repository.test.ts` is the reference:

- Seed with `seedUser()` and `seedStickyNote(userId, { color: 'BLUE' })` (factories in `src/__tests__/factories/`, which write through Prisma).
- Call the repository, unwrap with `expectOk` / `expectErr`.
- Cover the not-found path (`RESOURCE_NOT_FOUND`) and the failure path: `vi.spyOn(prisma.stickyNote, 'findUnique').mockRejectedValueOnce(new Error('boom'))` then `expectErr(..., 'DATABASE_ERROR')`. Repositories never throw; the `catch` returns `err(dbError(...))`.
- No business rules here. Ownership and limits belong to the service and its unit tests.

## Key decisions

- Single worker, forks: correctness over speed. Parallel files would truncate each other's rows.
- Real Postgres in CI instead of an in-memory fake, so constraints, cascades and JSON columns behave as in production.

## Gotchas

- `pnpm test:all` includes this project, so it needs `pnpm infra` first.
- Leftover rows: if a test passes alone and fails in the suite, look for data in a table the truncate list does not reach.
- Schema changes need `pnpm prisma:migrate:dev` (or `prisma migrate deploy` in CI) before the tests see them.

## Related files

- `vite.config.ts` (`integration` project)
- `src/__tests__/setup.integration.ts`, `src/__tests__/setup.redis.ts`
- `src/__tests__/factories/`, `src/repositories/__tests__/`, `src/cache/`
- `infra/dev.yml`, `.github/workflows/ci.yml` (`coverage-tests` job)
- [Testing overview](./README.md)
