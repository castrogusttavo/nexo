# Feature Creation Guide

Step-by-step process for implementing any new feature in Nexo, from database to UI. Follow this order regardless of feature complexity — it ensures each layer only depends on layers already created.

## Overview

```
Prisma Schema → Output DTO → Zod Schema → Repository → Mapper → Cache → Service → API Route → Hook → UI
```

Every feature flows **bottom-up**: data layer first, presentation last. This order guarantees that when you write a file, every import it needs already exists.

---

## Step 1 — Prisma Schema

**File:** `prisma/schema.prisma`

Define or update the data model. This is the source of truth for the database structure.

**Rules:**
- Use `cuid()` for IDs
- Use `@map("snake_case")` for column names, `@@map("plural_table")` for table names
- Add `createdAt` / `updatedAt` with `@default(now())` and `@updatedAt`
- Define relations explicitly with `onDelete` behavior
- Run `npx prisma migrate dev --name <description>` after changes

**Example:**
```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  workspaceId String   @map("workspace_id")
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@map("projects")
}
```

**Why first:** Everything depends on the database model. The Prisma types generated here are used by Repository and Mapper.

---

## Step 2 — Output DTO

**File:** `types/<entity>.ts`

Define the shape of data that leaves the API. This is a plain TypeScript interface — never expose Prisma models to the client.

**Rules:**
- Dates become `string` (ISO format)
- Omit sensitive fields (passwords, internal IDs that shouldn't be public)
- Name as `<Entity>DTO`
- No imports from Prisma — only primitive types

**Example:**
```typescript
export interface ProjectDTO {
  id: string
  name: string
  slug: string
  description: string | null
  workspaceId: string
  createdAt: string
}
```

**Why second:** Service, Mapper, Cache, and Route all reference this type. Defining it early prevents circular dependencies.

---

## Step 3 — Zod Schemas (Input Validation)

**File:** `src/schemas/<entity>.schema.ts`

Define validation schemas for each operation (Create, Update). Export inferred types as input DTOs.

**Rules:**
- Format validation only (min/max length, regex, type) — no business rules
- Name schemas as `Create<Entity>Schema`, `Update<Entity>Schema`
- Export inferred types: `Create<Entity>DTO`, `Update<Entity>DTO`
- Messages in Portuguese (pt-BR) for user-facing validation

**Example:**
```typescript
import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug inválido'),
  description: z.string().max(500).optional(),
})

export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>

export const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
})

export type UpdateProjectDTO = z.infer<typeof UpdateProjectSchema>
```

**Why third:** Routes use these for request validation. Services use the inferred types as method parameters.

---

## Step 4 — Repository

**File:** `src/repositories/<entity>.repository.ts`

The only layer that imports Prisma. Handles all database access and converts database errors into domain errors.

**Rules:**
- One repository per entity
- Every method returns `Promise<Result<T>>`
- Wrap every Prisma call in `try/catch`
- Catch specific Prisma errors (P2002 = unique conflict, P2025 = not found)
- Method names describe intent, not query structure (`findById`, not `getWhereIdEquals`)
- Import error factories from `@/src/errors`
- Import `prisma` from `@/src/lib/prisma`
- Import `ok`, `err` from `@/src/lib/result`

**Example:**
```typescript
import type { Project } from '@prisma/client'
import { conflict, databaseError, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'

export const ProjectRepository = {
  async findById(id: string): Promise<Result<Project>> {
    try {
      const project = await prisma.project.findUnique({ where: { id } })
      if (!project) return err(notFound('Project'))
      return ok(project)
    } catch {
      return err(databaseError('Failed to find project by id'))
    }
  },

  async create(data: { name: string; slug: string; description?: string; workspaceId: string }): Promise<Result<Project>> {
    try {
      const project = await prisma.project.create({ data })
      return ok(project)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(conflict('Slug já está em uso'))
      }
      return err(databaseError('Failed to create project'))
    }
  },
  // ...
}
```

**Why fourth:** Service depends on Repository. Repository depends only on Prisma (generated in Step 1) and error factories.

---

## Step 5 — Mapper

**File:** `src/mappers/<entity>.mapper.ts`

Pure function that converts Prisma model → Output DTO. No side effects, no async.

**Rules:**
- Import the Prisma type and the output DTO type
- Convert `DateTime` to ISO string
- Name as `to<Entity>DTO`
- Omit any fields not in the DTO

**Example:**
```typescript
import type { Project } from '@prisma/client'
import type { ProjectDTO } from '@/types/project'

export function toProjectDTO(project: Project): ProjectDTO {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    workspaceId: project.workspaceId,
    createdAt: project.createdAt.toISOString(),
  }
}
```

**Why fifth:** Service uses the mapper to convert Repository results before returning. Depends on types from Steps 1 and 2.

---

## Step 6 — Cache (optional)

**File:** `src/cache/<entity>.cache.ts`

Cache-aside pattern with Redis. Only cache entities that are read frequently and change infrequently.

**Rules:**
- Store DTOs, never Prisma models (DTOs are serialization-safe)
- Methods: `get()`, `set()`, `invalidate()`
- Prefix keys with entity name
- TTL: 15 minutes (default, adjust per domain)
- Use `ensureRedisConnected` from `@/src/lib/redis`

**Example:**
```typescript
import { ensureRedisConnected } from '@/src/lib/redis'
import type { ProjectDTO } from '@/types/project'

const PREFIX = 'project:'
const TTL = 15 * 60

export const ProjectCache = {
  async get(id: string): Promise<ProjectDTO | null> {
    const client = await ensureRedisConnected()
    const data = await client.get(`${PREFIX}${id}`)
    if (!data) return null
    return JSON.parse(data) as ProjectDTO
  },

  async set(id: string, project: ProjectDTO): Promise<void> {
    const client = await ensureRedisConnected()
    await client.set(`${PREFIX}${id}`, JSON.stringify(project), { EX: TTL })
  },

  async invalidate(id: string): Promise<void> {
    const client = await ensureRedisConnected()
    await client.del(`${PREFIX}${id}`)
  },
}
```

**When to skip:** CRUD features that are write-heavy or rarely read don't need cache. Add it later when profiling shows it's needed.

---

## Step 7 — Service

**File:** `src/services/<entity>.service.ts`

All business logic and authorization live here. This is the core of the feature.

**Rules:**
- Never imports Prisma — only Repository, Mapper, Cache, and error factories
- Every method receives `actorId` as first parameter (for authorization)
- Authorization check happens inside the service (not in the route)
- Returns `Promise<Result<DTO>>`
- Orchestrates: check auth → validate business rules → call Repository → map to DTO → manage cache
- On reads: check cache first, on miss fetch from Repository
- On writes: call Repository, invalidate cache, return mapped DTO

**Example:**
```typescript
import { forbidden } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toProjectDTO } from '@/src/mappers/project.mapper'
import { ProjectRepository } from '@/src/repositories/project.repository'
import type { CreateProjectDTO } from '@/src/schemas/project.schema'
import type { ProjectDTO } from '@/types/project'

export const ProjectService = {
  async create(actorId: string, dto: CreateProjectDTO): Promise<Result<ProjectDTO>> {
    // Authorization: only OWNER/ADMIN can create
    // ... check actor role ...

    const result = await ProjectRepository.create({ ...dto, workspaceId })
    if (!result.ok) return result

    return ok(toProjectDTO(result.value))
  },
  // ...
}
```

**Why seventh:** Service depends on Repository (Step 4), Mapper (Step 5), Cache (Step 6), and input types (Step 3). Everything is ready.

---

## Step 8 — API Route

**File:** `app/api/<entity>/route.ts` (collection) and `app/api/<entity>/[id]/route.ts` (single resource)

HTTP boundary. Handles authentication, Zod validation, calls Service, returns response.

**Rules:**
- No business logic — delegate everything to Service
- No Prisma imports
- Pattern for each handler:
  1. Authenticate (`getAuthSession()`)
  2. Parse and validate body (for POST/PATCH/PUT)
  3. Call Service method
  4. Return `successResponse()` or `handleError()`
- Use `standardError()` for validation failures
- Use `handleError()` for Result errors from Service

**Example:**
```typescript
import type { NextRequest } from 'next/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { CreateProjectSchema } from '@/src/schemas/project.schema'
import { ProjectService } from '@/src/services/project.service'
import { handleError, standardError, successResponse } from '@/utils/http-response'

export async function POST(request: NextRequest) {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const body = await request.json()
  const parsed = CreateProjectSchema.safeParse(body)

  if (!parsed.success) {
    return standardError('VALIDATION_ERROR', 'Dados inválidos', parsed.error.issues)
  }

  const result = await ProjectService.create(auth.value.user.id, parsed.data)
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
}
```

**Route structure convention:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/<entity>` | Create |
| GET | `/api/<entity>` | List all |
| GET | `/api/<entity>/[id]` | Get one |
| PATCH | `/api/<entity>/[id]` | Update |
| DELETE | `/api/<entity>/[id]` | Delete |

---

## Step 9 — React Hook

**File:** `src/hooks/use-<entity>.ts`

Client-side data fetching with React Query v5.

**Rules:**
- One hook per concern (`useProject`, `useCreateProject`, `useProjects`)
- Queries: `useQuery` with typed response
- Mutations: `useMutation` with `onSuccess` cache invalidation
- Always type the response as `SuccessResponse<DTO>`
- Use `queryClient.invalidateQueries` to refresh related caches after mutations

**Example:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectDTO } from '@/types/project'
import type { SuccessResponse } from '@/types/http-response'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<ProjectDTO[]> => {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const json: SuccessResponse<ProjectDTO[]> = await res.json()
      return json.data
    },
  })
}
```

---

## Step 10 — Frontend (UI)

Decide between **Server Component** and **Client Component + Route**:

| Scenario | Approach |
|----------|----------|
| Static page, SEO matters, no interactivity | Server Component → fetch directly in component (no hook needed) |
| Dynamic page, user interactions (forms, modals, real-time updates) | Client Component → Hook → API Route |
| Form submission, mutations | Server Action (`actions.ts`) or Client Component → `useMutation` → API Route |

**For CRUD features** (like workspace management), the typical setup is:

- **List page**: Server Component that fetches initial data, hydrates React Query
- **Create/Edit forms**: Client Components using `useMutation` hooks
- **Delete**: Client Component with confirmation dialog + `useMutation`

---

## Git Commit Messages

All commit messages follow **Conventional Commits** format. Always write in English.

### Format

```
<type>(<scope>): <short description>
```

- **type**: what kind of change
- **scope**: feature area or module affected (optional but preferred)
- **short description**: imperative mood, lowercase, no period at the end

### Types

| Type | When to use | Example |
|------|-------------|---------|
| `feat` | New feature or capability | `feat(workspace): add CRUD endpoints` |
| `fix` | Bug fix | `fix(workspace): link user on workspace creation` |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor(auth): extract session validation` |
| `chore` | Tooling, config, dependencies, no production code | `chore: update prisma to v7.5` |
| `style` | Formatting, whitespace, linting (no logic change) | `style: apply Biome formatting to auth pages` |
| `docs` | Documentation only | `docs: add feature creation guide` |
| `test` | Adding or fixing tests | `test(workspace): add service unit tests` |
| `perf` | Performance improvement | `perf(cache): reduce workspace TTL` |
| `ci` | CI/CD pipeline changes | `ci: add workspace migration to deploy` |

### Rules

1. **Imperative mood** — "add feature", not "added feature" or "adds feature"
2. **Lowercase** — no capital letter at the start of the description
3. **No period** — don't end with `.`
4. **Short** — keep under 72 characters total
5. **Scope matches domain** — use the feature/module name: `workspace`, `auth`, `ui`, `ci`, `cache`, etc.
6. **One concern per commit** — don't mix a bug fix with a new feature

### Scoping by Layer (for feature work)

When building a feature across multiple layers, use the **domain** as scope (not the layer):

```
feat(workspace): add prisma schema and migration
feat(workspace): add repository with CRUD operations
feat(workspace): add service with authorization
feat(workspace): add API routes
feat(workspace): add React hooks and test UI
```

Not:
```
feat(repository): add workspace repository    ← wrong: scope is the layer
feat: add workspace repository                ← acceptable but less descriptive
```

### Breaking Changes

For breaking changes, add `!` after the scope:

```
feat(auth)!: require workspace membership for all endpoints
```

---

## Checklist

Use this checklist when implementing any feature:

- [ ] Prisma schema updated + migration created
- [ ] Output DTO defined in `types/`
- [ ] Zod schemas for each operation in `src/schemas/`
- [ ] Repository with Result-returning methods in `src/repositories/`
- [ ] Mapper (Prisma model → DTO) in `src/mappers/`
- [ ] Cache layer (if needed) in `src/cache/`
- [ ] Service with business logic + authorization in `src/services/`
- [ ] API Routes (collection + resource) in `app/api/`
- [ ] React hooks in `src/hooks/`
- [ ] UI components/pages in `app/`

## Common Patterns

### Delete Operations

Deletes typically return `void` (or a success boolean), not the deleted entity:
- Repository: `delete()` → `Result<void>`
- Service: `delete()` → `Result<void>` (check authorization first)
- Route: `DELETE` → `successResponse(null, 204)` or `successResponse({ deleted: true })`

### List Operations

Lists may need pagination, filtering, and sorting:
- Repository: `findMany(filters)` → `Result<Entity[]>`
- Service: `list(actorId, filters)` → `Result<DTO[]>`
- Route: parse query params → pass to Service

### Authorization Patterns

```typescript
// Simple: actor must be member of workspace
const actor = await UserRepository.findById(actorId)
if (!actor.ok) return actor
if (actor.value.workspaceId !== targetWorkspaceId) return err(forbidden())

// Role-based: only OWNER/ADMIN can perform action
if (!['OWNER', 'ADMIN'].includes(actor.value.role)) return err(forbidden())
```
