# Contract tests

Contract tests answer: does `public/openapi.json` still describe what the code actually does? The spec is hand-maintained and nothing generates it, so these tests rebuild the truth from the code on every run and compare. A new endpoint fails the suite until the spec catches up.

## What lives here

The `contract` project (`vite.config.ts`) includes `src/__tests__/contract/*.contract.test.ts`. It is pure filesystem and JSON work: no database, no Redis, no server, 10 s timeout. It runs as its own CI job (`contract-tests`) and is in the gate.

```bash
pnpm test:contract
```

## How it works

`src/__tests__/contract/openapi.ts` is the shared plumbing. It loads `public/openapi.json` and derives the other side of every comparison from source:

- **Route inventory.** `routeInventory()` walks `app/api/**/route.ts` and reads the exported HTTP verbs from each file. `servers[].url` ends in `/api`, so spec path `/users/me` is `app/api/users/me/route.ts`.
- **Public routes.** `publicRoutes()` parses the `PUBLIC_ROUTES` array out of `proxy.ts` as text; importing the module would pull in `next/server` and the Axiom transport.
- **Envelope.** `envelopeContract()` is derived from `types/http-response.d.ts`.
- **Error codes.** Read from the `ERROR_CODES` registry in `src/errors/codes.ts`.
- **Zod schemas.** Imported from `src/schemas/*.schema.ts`.

The Better Auth surface (`/auth/**`) is documented path by path but served by one catch-all handler (`app/api/auth/[...all]/route.ts`), so it is excluded from the per-path diffs and covered by its own assertion.

## The suites

| File | Asserts |
| --- | --- |
| `openapi-routes.contract.test.ts` | Documented operations and implemented routes are the same set, in both directions. |
| `openapi-spec.contract.test.ts` | Every `$ref` resolves; schemas compile as JSON Schema 2020-12 and use no OpenAPI 3.0 `nullable`; responses use the project envelope; error codes named in the spec exist in `ERROR_CODES` at their registered status; `cookieAuth` is declared on exactly the non-public operations; path parameters match the path template. |
| `openapi-request-bodies.contract.test.ts` | Documented request bodies match the Zod schemas field by field. |
| `dockerignore.contract.test.ts` | `.dockerignore` does not exclude runtime files (`proxy.ts`, `app`, `src`, `lib`, `prisma`, `worker`, and so on). |

### The request-body map

`SPEC_BODY_TO_ZOD` is an explicit map from a spec component name to a Zod export. It is never a name-based guess. Three checks keep it honest:

1. Every documented JSON body must be mapped, or listed in `JSON_BODIES_WITHOUT_SHARED_SCHEMA` (with the reason, for example a route-local Zod schema), or in `NON_JSON_BODIES`.
2. The exception lists and the map must contain no stale entries.
3. For each mapped pair, the field names and required fields must agree. A field is "required" when `schema.safeParse(undefined)` fails.

## Key decisions

- Nothing about the API is restated in the tests. A copy would drift exactly like the spec does.
- The `.dockerignore` check exists because a missing runtime file fails silently: the image builds, and the feature is simply gone. A past `.dockerignore` listing `proxy.ts` shipped images without CSP, HSTS or the edge auth gate, and CI never noticed because it never built the image and asked it for a header.

## Gotchas

- Adding an endpoint, an error code or a schema field can turn this suite red even though no test of yours changed. Update `public/openapi.json`, and `SPEC_BODY_TO_ZOD` if you added a body schema.
- The spec's prose (`description`) is pt-BR; the checks look at structure, not language.

## Related files

- `src/__tests__/contract/openapi.ts`, `openapi-routes.contract.test.ts`, `openapi-spec.contract.test.ts`, `openapi-request-bodies.contract.test.ts`, `dockerignore.contract.test.ts`
- `public/openapi.json`, `proxy.ts`, `src/errors/codes.ts`, `types/http-response.d.ts`
- [Feature workflow](../development/feature-workflow.md) (the endpoint is not done until the spec follows)
- [Testing overview](./README.md)
