# Feature workflow

A vertical-slice feature is built in three blocks, always in this order: **SDD** (design the contract), **TDD** (write the whole suite, red), **Code** (implement layer by layer until green). Some phases collapse when the domain is trivial; the block order never changes. The roadmap lives in the vault (`Resources/feature-creation-roadmap.md`, not in this repository: `TODO: confirm`); this page is derived from `CLAUDE.md` and checked against the code.

<!-- DIAGRAM NEEDED: sdd-tdd-code-flow: the three blocks (SDD, TDD red, Code green) and the 14 numbered steps inside them, with the layer or file each step produces and which tests go green when; read docs/development/feature-workflow.md and the layer paths named in it -->

## Block 1: SDD, contract first

Decide what the API exposes before how it is stored. Zod first, Prisma second.

| Step | Deliverable | Location |
| --- | --- | --- |
| 0 | Domain contract bullets: fields, invariants, ownership scope, pagination, domain errors, LGPD sensitivity | your notes or PR description |
| 1 | Zod schemas: `Create`, `Update`, output | `src/schemas/<feature>.schema.ts` |
| 2 | Prisma model and migration | `prisma/schema.prisma`, `pnpm prisma migrate dev --name <slug>` (script: `pnpm prisma:migrate:dev`) |
| 3 | Specific error codes (`<FEATURE>_NOT_FOUND`, `_FORBIDDEN`, `_LIMIT_REACHED`) | `src/errors/codes.ts` |

Only the schema tests go green in this block; the schema is the code. Error codes are added to the registry first, never invented inline, because the registry is the single source of truth for HTTP status ([request-flow](../architecture/request-flow.md)).

## Block 2: TDD, all red before any implementation

Write the whole suite, importing files that do not exist yet, so it is entirely red. The pre-commit hook runs `tsc --noEmit`, so keep the tree type-clean as you go.

| Step | Test | Layer page |
| --- | --- | --- |
| 4 | Test factory in `src/__tests__/factories/` (`createFake<X>`, `seed<X>`) | [testing overview](../testing/README.md) |
| 5 | Repository integration tests | [integration](../testing/integration.md) |
| 6 | Mapper tests | [unit](../testing/unit.md) |
| 7 | Service tests: happy path, authorization with a wrong `userId`, domain limits, the codes from step 3 | [unit](../testing/unit.md) |
| 8 | Route e2e tests | [e2e](../testing/e2e-and-browser.md) |

## Block 3: Code, layer by layer until green

| Step | Deliverable |
| --- | --- |
| 9 | Repository: pure Prisma, no business rules, returns `Result` |
| 10 | Mapper: `Prisma.<X>` to `<X>DTO` |
| 11 | Service: business rules, authorization, audit, returns `Result` |
| 12 | HTTP routes and the `[id]` route in `app/api/<feature>/` |
| 13 | Hook in `src/hooks/use-<feature>.ts` and wiring into the existing component |
| 14 | Observability and a manual smoke |

Rules that run through the blocks:

- **Authorization lives in the service**, not the route (session `userId` equals resource `userId`).
- **Frontend wiring is part of done.** A hook that no component uses does not close the feature. Hooks and logic-bearing components get component tests ([component](../testing/component.md)): request shape, cache writes and invalidation, optimistic rollback, `enabled` guards, error fallbacks.
- **The endpoint is not done until the spec follows.** `public/openapi.json` is hand-maintained; `pnpm test:contract` stays red until it documents the route, the error codes and the body schema, and until the body is added to `SPEC_BODY_TO_ZOD` ([contract](../testing/contract.md)).
- **Observability before the final smoke:** Axiom logs at critical service points, plus `auditMutation` / `auditAuth` (from `lib/axiom/audit`) for LGPD-sensitive events. Type-check and tests verify the code, not the feature: smoke the golden path and a few edge cases in the browser.
- A Redis cache (`src/cache/`) is optional, slotted between mapper and service when reads become a bottleneck.
- Add new private pages to `app/(private)/__tests__/access.e2e.test.ts`.

## Worked example: sticky notes

The smallest complete slice in the repository. Each step below points at the real file.

**Contract (steps 0 to 3).** A note belongs to one user; it has TipTap JSON `content` and one of six colors; only the owner reads or changes it; no pagination, no limit.
- `src/schemas/sticky-note.schema.ts`: `StickyColorSchema` (`RED`, `YELLOW`, `BLUE`, `GREEN`, `PURPLE`, `ZINC`), `CreateStickyNoteSchema` (both fields optional; content capped at 100,000 serialized characters), `UpdateStickyNoteSchema = CreateStickyNoteSchema.partial()`.
- `prisma/schema.prisma`, `model StickyNote` mapped to `sticky_notes`, `user` relation with `onDelete: Cascade`, index on `(userId, updatedAt)`. Migration: `prisma/migrations/20260527175635_sticky_note_color_and_json_content/`.
- Error codes: none specific. This feature reuses the generic `RESOURCE_NOT_FOUND` (`notFound('StickyNote')`), `FORBIDDEN` and `DATABASE_ERROR`; a bigger domain would add `<FEATURE>_*` codes here.

**Tests (steps 4 to 8).**
- Factory: `src/__tests__/factories/sticky-note.factory.ts` has `createFakeStickyNote`, `createFakeStickyNoteDTO` and `seedStickyNote(userId, overrides)`.
- Schema: `src/schemas/__tests__/sticky-note.schema.test.ts`. Repository: `src/repositories/__tests__/sticky-note.repository.test.ts`. Mapper: `src/mappers/__tests__/sticky-note.mapper.test.ts`.
- Service: `src/services/__tests__/sticky-note.service.test.ts` covers list, getById, create, update and delete: owner succeeds, `FORBIDDEN` for another actor, repository errors propagate.
- Routes: `app/api/sticky-notes/__tests__/route.e2e.test.ts` and `app/api/sticky-notes/[id]/__tests__/route.e2e.test.ts`.

**Code (steps 9 to 12).**
- Repository `src/repositories/sticky-note.repository.ts`: `findById`, `listByUserId` (ordered `updatedAt desc`), `create` (defaults: `{ type: 'doc', content: [] }` and `ZINC`), `update`, `delete`. Each wraps Prisma in try/catch and returns `err(dbError(...))` or `err(notFound('StickyNote'))`.
- Mapper `src/mappers/sticky-note.mapper.ts`: `toStickyNoteDTO`, with the DTO type in `types/sticky-note.d.ts`.
- Service `src/services/sticky-note.service.ts`: `update` and `delete` first `findById`, then `if (existing.value.userId !== actorId) return err(forbidden())`, and call `auditMutation` on both success and failure (`reason: 'not_owner'` for the ownership failure).
- Routes: `app/api/sticky-notes/route.ts` is two exports built from `withAuthenticatedRoute` and `withValidatedBody` (POST returns 201 and requires consent for `page:(private)`). `app/api/sticky-notes/[id]/route.ts` composes `getAuthSession`, `consume(apiLimiter, ...)`, `requireConsent`, Zod `safeParse` and the service by hand for `PATCH` and `DELETE`. There is no `GET` by id route even though the service has `getById`.

**Frontend and spec (steps 13, spec).**
- Hook `src/hooks/use-sticky-note.ts` (query key `['sticky-notes']`, create invalidates, update writes the cache and re-sorts) with `src/hooks/__tests__/use-sticky-note.component.test.tsx`.
- Wired into `app/_components/user/sticky/` (`user-sticky.tsx`, `user-sticky-list.tsx`, `user-sticky-create-button.tsx`), each with a component test.
- Browser coverage: `e2e/specs/stickies-and-wiki.spec.ts` creates a note and checks it survives a reload.
- Spec: `/sticky-notes` and `/sticky-notes/{id}` in `public/openapi.json`.

## Gotchas

- Steps are an order of work, not a checklist to run in one commit: commit small and thematic ([conventions](./conventions.md)).
- Phases 9 to 11 collapse into nearly one block for a trivial domain; sticky notes is such a case.
- The sticky-note slice has no feature-specific error codes, so step 3 was a no-op there. Do not read that as the norm.
- The two route files in the example are not written the same way (wrappers versus manual composition); either is accepted, the wrappers are the shorter path ([request-flow](../architecture/request-flow.md)).

## Related files

- `CLAUDE.md` (section "Creating a new feature")
- `src/schemas/`, `src/repositories/`, `src/mappers/`, `src/services/`, `app/api/`, `src/hooks/`
- `src/errors/codes.ts`, `public/openapi.json`, `utils/api-handler.ts`
- [Testing overview](../testing/README.md), [Conventions](./conventions.md), [Getting started](./getting-started.md)
