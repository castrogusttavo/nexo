# Architecture Overview

## Principles

- **Layered separation** — Routes handle HTTP, Services own business logic, Repositories own data access. No layer crosses its boundary.
- **Errors as values** — `Result<T, AppError>` everywhere. No thrown exceptions, no try/catch outside Repositories.
- **Authorization in the domain** — Permission checks live inside Services, not in Routes, so every entry point (API, action, worker) goes through the same gate.
- **Infrastructure as containers** — PostgreSQL, Redis, RabbitMQ, and MinIO run as Docker containers on a shared network.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 + Turbopack | SSR, server components, API routes |
| **Language** | TypeScript | Type safety across the stack |
| **Database** | PostgreSQL 17 | Primary data store |
| **ORM** | Prisma 7 | Schema management, migrations, type-safe queries |
| **Cache** | Redis 7 + Sentinel | Session cache, data cache (cache-aside), automatic failover |
| **Queue** | RabbitMQ 4 | Async job processing (emails, notifications) |
| **Storage** | MinIO | S3-compatible file storage (attachments, images) |
| **Auth** | Better Auth | Email/password + OAuth (Google, GitHub) |
| **Validation** | Zod | Input schema validation with type inference |
| **UI** | Shadcn UI + Tailwind CSS 4 | Component library and styling |
| **Data fetching** | TanStack Query v5 | Client-side cache, mutations, optimistic updates |
| **Email** | Resend + React Email | Transactional emails with React templates |
| **Observability** | Axiom | Logs, errors, web vitals |
| **Linting** | Biome | Linting and formatting |
| **Testing** | Vitest | Unit, integration, and e2e tests |
| **Secrets** | SOPS + age | Encrypted secrets in git, decrypted at deploy time |

## Folder Structure

```
/app
  /api/**/route.ts            # API routes (HTTP handling)
  /**/actions.ts               # Server actions
  /**/page.tsx                 # Pages
/src
  /services/                   # Business logic + authorization
  /repositories/               # Data access (Prisma only)
  /schemas/                    # Zod validation schemas
  /cache/                      # Redis cache-aside
  /errors/                     # AppError, factory functions, error codes
  /mappers/                    # Prisma model → DTO converters
  /hooks/                      # React Query hooks
  /lib/                        # Auth, Prisma client, Redis, Result type
/types/                        # Output DTOs
/utils/                        # HTTP response helpers
/prisma
  /schema.prisma               # Database schema
  /migrations/                 # Migration history
/secrets
  /production.enc.env          # SOPS-encrypted production secrets
```

## Inviolable Rules

| Rule | Reason |
|------|--------|
| Route never imports Prisma | Keeps data layer isolated |
| Service never imports Prisma | Testability and isolation |
| Worker uses Service, not Prisma | Same business logic for all entry points |
| try/catch only in Repository | Infrastructure errors don't leak into the domain |
| Authorization lives in Service | Ensures checks regardless of entry point |
| Never throw — return `err()` | Errors as values, forced handling |

## Code Patterns

### Repository Pattern

- One repository per domain entity
- Methods named by intent (`findByWorkspace`, not `selectWhereWorkspaceId`)
- Returns `Result<T, AppError>` — never throws
- try/catch around every Prisma call
- Prisma errors converted via factory functions

### DTO (Data Transfer Object)

- Input DTOs inferred from Zod schemas (`z.infer<typeof Schema>`)
- Output DTOs defined manually in `/types/`
- Prisma objects never returned to client
- Mapper handles Prisma model → output DTO conversion

### Mapper

- One mapper per entity, called by Service (not Repository)
- Pure functions, no side effects
- Repository returns raw `Result<PrismaModel>`, Service maps before caching or returning

### Unit of Work

- For multi-repository atomic writes
- Service passes a callback, doesn't know transaction details

### Strategy

- For interchangeable implementations (notifications, storage)
- Interface defined explicitly, implementation chosen at initialization

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Zod Schema | `PascalCaseSchema` | `CreateProjectSchema` |
| Input DTO | Inferred from schema | `CreateProjectDTO` |
| Output DTO | `PascalCaseDTO` | `ProjectDTO` |
| Service | `PascalCaseService` | `ProjectService` |
| Repository | `PascalCaseRepository` | `ProjectRepository` |
| Mapper | `toCamelCaseDTO` | `toProjectDTO` |
| Error factory | `camelCase` | `conflict()`, `notFound()` |
