# 0002. `Result` instead of thrown errors across layers

- Status: Accepted
- Date: 2026-02-21
- Commits: `3555f988` (adds `src/lib/result.ts` and `src/errors/app-error.ts`, 2026-02-21), `2d3ff047` (first API-route controllers on top of it, 2026-02-23)

## Context

The backend is layered: route, service, repository, Prisma. Each layer can fail for expected reasons (not found, forbidden, validation, rate limit, database error). With exceptions, the failure modes of a function are invisible in its signature, and a route has to guess which errors to catch and which HTTP status each deserves.

## Decision

Services and repositories never throw across a layer boundary. They return `Result<T, AppError>` (`ok(value)` / `err(error)`, in `src/lib/result.ts`).

- Repositories wrap Prisma calls in try/catch and return `err(databaseError(...))` or `err(notFound(...))`.
- Callers narrow with `if (!result.ok) return result`, so errors propagate unchanged to the route.
- `AppError` is a plain object whose `code` comes from the central `ERROR_CODES` registry (`src/errors/codes.ts`), the single source of truth mapping each code to an HTTP status. New codes are added to the registry first, never invented inline; errors are built with factory helpers (`unauthorized()`, `notFound('Resource')`, `rateLimited()`, ...).
- The route is the only place that turns an `AppError` into HTTP, through `handleError`, inside the `{ success, statusCode, data | error }` envelope.
- Authorization lives in the service (for example an ownership check returning `err(forbidden())`), not in the route.

## Consequences

- Failure paths are part of the type signature and the compiler forces callers to handle them.
- The error-to-status mapping is one table, which the contract suite compares with `public/openapi.json`.
- Every call site pays a small tax of `if (!result.ok)` boilerplate.
- Unexpected exceptions (programming errors, third-party libraries) can still be thrown; the convention covers expected failures and requires wrapping at the repository boundary.

## Alternatives considered

None are recorded in the history. Inferred obvious options: thrown typed exceptions caught by a route-level wrapper; a throwing service layer with an error-handling middleware. The reason for choosing `Result` over them is taken from `CLAUDE.md` ("no thrown errors across layers"), not from a commit message.

Related: [request-flow](../architecture/request-flow.md).
