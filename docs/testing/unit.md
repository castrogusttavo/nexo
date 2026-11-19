# Unit tests

Unit tests answer one question: given its collaborators behave a certain way, is this module's logic right? They run in Node with everything below the unit mocked, need no database, Redis or server, and are the fastest layer.

## What lives here

The `unit` project (`vite.config.ts`) includes:

- `src/services/**/__tests__/*.test.ts` (business rules, authorization, audit calls)
- `src/mappers/**/__tests__/*.test.ts` (Prisma model to DTO)
- `src/schemas/**/__tests__/*.test.ts` (Zod schemas)
- `src/errors/**/__tests__/*.test.ts`
- `src/lib/__tests__/*.test.ts`, `utils/__tests__/*.test.ts`, `lib/__tests__/*.test.ts`

Files ending `.integration.test.ts` or `.smoke.test.ts` are excluded from the project. Timeout is 5 s per test; environment is `node` with Vitest globals.

```bash
pnpm test:unit
pnpm test:unit:watch
pnpm test:unit:coverage
pnpm vitest --project unit src/services/__tests__/sticky-note.service.test.ts
```

## How it works

Setup files, in order: `src/__tests__/setup.ts` (loads `.env`, removes `SLACK_ALERTS_WEBHOOK_URL`) and `src/__tests__/setup.unit.ts`. The second mocks `@/lib/axiom/logger` for every test, so nothing reaches the Axiom transport, and runs `vi.restoreAllMocks()` plus `vi.clearAllMocks()` after each test. A test can still assert on `vi.mocked(logger).info` without redeclaring the mock.

`server-only` is aliased to `src/__tests__/server-only.mock.ts`, so server modules import without Next.

### The service test pattern

`src/services/__tests__/sticky-note.service.test.ts` is the reference:

1. `vi.mock('@/src/repositories/sticky-note.repository')` automocks the repository; `vi.mocked(StickyNoteRepository)` types the handles.
2. Build inputs with a factory (`createFakeStickyNote({ id: 's1', userId: 'u1' })` from `src/__tests__/factories/sticky-note.factory.ts`).
3. Program the mock with `ok(...)` or `err(...)` from `src/lib/result.ts`.
4. Call the service and unwrap with `expectOk(result)` / `expectErr(result, 'FORBIDDEN')` from `src/__tests__/helpers/result.helpers.ts`. These assert on the `Result` shape and narrow the type.
5. Assert on what the service passed to the repository (`toHaveBeenCalledWith`).

Every service test file should cover: the happy path, the authorization failure with another user's id (`FORBIDDEN`), a repository error propagating unchanged, and any domain limit the service enforces. Services own authorization, so this is where ownership rules are proven.

### Mappers and schemas

Mapper tests pass a fake Prisma object and assert the DTO fields. Schema tests feed valid and invalid payloads to the Zod schema; they are the only tests that go green in the SDD block of [feature-workflow](../development/feature-workflow.md).

## Key decisions

- Mocks stop at the repository boundary. The service is never tested with Prisma mocked; Prisma is the integration layer's job.
- Logging and audit calls are mocked globally rather than per file, so a service can call `auditMutation` without each test caring.
- Stryker mutates the code these tests cover, which is why unit tests that merely execute a line are not enough. See [mutation-and-coverage](./mutation-and-coverage.md).

## Gotchas

- A `*.test.ts` outside the globs above is never run. Check the path before debugging a "test not found".
- `lib/__tests__/server-admin-env.test.ts` calls `vi.resetModules()`; `vitest.stryker.config.ts` excludes it from the mutation run for that reason.
- Route handlers are not unit-tested; they are covered by the HTTP e2e layer. `utils/api-handler.ts` itself has a unit test (`utils/__tests__/api-handler.test.ts`).

## Related files

- `vite.config.ts` (`unit` project), `src/__tests__/setup.ts`, `src/__tests__/setup.unit.ts`
- `src/__tests__/factories/`, `src/__tests__/helpers/result.helpers.ts`
- `src/services/__tests__/sticky-note.service.test.ts`, `src/mappers/__tests__/sticky-note.mapper.test.ts`
- [Testing overview](./README.md)
