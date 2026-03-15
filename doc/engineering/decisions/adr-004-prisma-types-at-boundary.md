# ADR-004: Prisma Types at the Repository–Service Boundary

**Status:** Accepted
**Date:** 2026-03-15

## Context

The Repository returns `Result<PrismaModel>` (e.g., `Result<User>` where `User` comes from `@prisma/client`). The Service receives this type and passes it to the Mapper, which converts it to a DTO.

This means two files outside the Repository import Prisma types:

| File | Import | Usage |
|------|--------|-------|
| `src/mappers/user.mapper.ts` | `import type { User } from '@prisma/client'` | Input type of `toUserDTO()` |
| `src/__tests__/factories/user.factory.ts` | `import type { User } from '@prisma/client'` | `createFakeUser()` return type |

The question: should we introduce a domain model interface to decouple from Prisma?

## Decision

**Accept the coupling.** Prisma types serve as the domain model at the Repository–Service boundary. No intermediate domain interface.

### Why this is acceptable

1. **The Service never imports `@prisma/client`** — it receives `result.value` (inferred type) and passes it to the Mapper. The Service doesn't reference Prisma types directly.

2. **The coupling surface is minimal** — only the Mapper and test factory import Prisma types. Both are leaf nodes in the dependency graph with no downstream consumers.

3. **If the ORM changes, the impact is contained:**

| Layer | Changes? | Reason |
|-------|----------|--------|
| Repository | Yes | New ORM queries |
| Mapper | Yes | New input type |
| Test factory | Yes | New fake model shape |
| **Service** | **No** | Only touches `.id`, `.email` on `result.value` — generic fields |
| Route | No | Only sees DTOs |
| Cache | No | Only sees DTOs |

4. **A domain model interface would add ceremony without current benefit** — it would mirror the Prisma type 1:1 today, creating a "pass-through" layer that exists only to satisfy a hypothetical future ORM migration.

## Consequences

### Positive

- No extra abstraction layer to maintain
- Mapper function signature clearly documents what it transforms (`User → UserDTO`)
- Tests use real Prisma types, catching type mismatches early

### Negative

- ORM change requires updating Mapper + test factory (but not Service)
- Prisma types appear outside the Repository (type-only imports, no runtime dependency)

### When to revisit

If the project adds a second ORM or data source (e.g., an external API returning user data), introduce a domain interface at that point — the Mapper would then accept `DomainUser` instead of Prisma `User`, and each data source maps to `DomainUser` independently.
