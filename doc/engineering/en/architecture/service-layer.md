# Service Layer

## Flow

```
Client → Route/Action → Zod → Authorization → Service → Repository → Prisma/PostgreSQL
```

```mermaid
flowchart TD
    Client([Client])

    subgraph "Route Layer — HTTP boundary"
        AuthN["Authentication\ngetAuthSession() → actorId"]
        Route["Route / Action"]
        Zod["Zod Validation"]
        HttpRes["HTTP Response"]
    end

    subgraph "Service Layer — business logic"
        AuthZ["Authorization\ncan actorId do this?"]
        Service["Service"]
        Mapper["Mapper"]
    end

    subgraph "Data Layer — persistence"
        Cache[("Redis Cache\nstores DTOs")]
        Repo["Repository"]
        Prisma["Prisma Client"]
        DB[("PostgreSQL")]
    end

    Client -->|HTTP request| Route
    Route -->|verify session| AuthN
    AuthN -->|actorId| Route
    Route -->|raw input| Zod
    Zod -->|validated DTO + actorId| Service
    Service --> AuthZ
    AuthZ -->|forbidden| Service
    AuthZ -->|authorized| Cache

    Cache -->|hit: cached DTO| Service
    Cache -->|miss| Repo
    Repo --> Prisma
    Prisma --> DB
    DB --> Prisma
    Prisma -->|Prisma model| Repo
    Repo -->|Result| Service
    Service --> Mapper
    Mapper -->|DTO| Service
    Service -->|populate cache with DTO| Cache
    Service -->|Result| Route
    Route --> HttpRes
    HttpRes -->|JSON response| Client
```

## Request Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Route
    participant AuthN as Authentication
    participant Z as Zod Schema
    participant S as Service
    participant AuthZ as Authorization
    participant Ca as Redis Cache
    participant Rp as Repository
    participant DB as PostgreSQL
    participant M as Mapper

    C->>R: HTTP Request (Cookie: session_token)
    R->>AuthN: getAuthSession(headers)

    alt Invalid or expired session
        AuthN-->>R: err(unauthorized())
        R-->>C: 401
    end

    AuthN-->>R: ok({ actorId, session })
    R->>Z: Validate input

    alt Validation fails
        Z-->>R: Zod error
        R-->>C: 422
    end

    Z-->>R: Validated DTO
    R->>S: call(actorId, validatedDTO)
    S->>AuthZ: Can actorId perform this action?

    alt Forbidden
        AuthZ-->>S: err(forbidden())
        S-->>R: err(forbidden())
        R-->>C: 403
    end

    S->>Ca: Cache.get(key)

    alt Cache hit
        Ca-->>S: Cached DTO
    else Cache miss
        Ca-->>S: null
        S->>Rp: Repository.find()
        Rp->>DB: Prisma query
        DB-->>Rp: Prisma model
        Rp-->>S: ok(PrismaModel)
        S->>M: toDTO(PrismaModel)
        M-->>S: DTO
        S->>Ca: Cache.set(key, DTO, TTL=15min)
    end

    S-->>R: ok(DTO)
    R-->>C: 200 successResponse(DTO)
```

## Layer Responsibilities

| Layer | Does | Does Not |
|-------|------|----------|
| **Route** | Authenticate, validate input (Zod), call Service, convert Result to HTTP | Business logic, import Prisma |
| **Service** | Authorize, business rules, orchestrate Cache + Repo + Mapper | HTTP knowledge, import Prisma |
| **Repository** | Prisma queries, catch errors, return Result | Business logic, validation |
| **Cache** | Store/retrieve DTOs from Redis | Transform data |
| **Mapper** | Convert Prisma model → DTO | Side effects |

## Authentication vs Authorization

| Concern | Where | What | Failure |
|---------|-------|------|---------|
| **Authentication** | Route — `getAuthSession()` | Who are you? Validate session cookie | `err(unauthorized())` — 401 |
| **Authorization** | Service — permission check | Can you do this? Check role/ownership | `err(forbidden())` — 403 |

## Cache-Aside Pattern

The cache stores **DTOs** (not Prisma models). Cache reads skip the Mapper. DTO shape changes require cache invalidation on deploy.

```mermaid
flowchart TD
    subgraph "Read Path"
        R1["Service.get(id)"] --> R2{"Redis Cache?"}
        R2 -->|"hit → DTO"| R3["Return cached DTO"]
        R2 -->|miss| R4["Repository.find(id)"]
        R4 --> R5["Mapper.toDTO()"]
        R5 --> R6["Cache.set(key, DTO, TTL=15min)"]
        R6 --> R7["Return DTO"]
    end

    subgraph "Write Path"
        W1["Service.update(id, data)"] --> W2["Repository.update(id, data)"]
        W2 --> W3["Cache.invalidate(key)"]
        W3 --> W4["Mapper.toDTO()"]
        W4 --> W5["Return DTO"]
    end
```

**Rules:**
- Cache stores serialized DTOs (`JSON.stringify`)
- TTL: 15 minutes (matches access token lifetime)
- DTO shape change = invalidate all related cache keys on deploy
- Write operations always invalidate before returning

## Mapper Placement

Mappers live in the **Service layer** (`src/mappers/`), not in the Repository:

- Repository returns `Result<PrismaModel>` — raw database types
- Service calls Mapper — converts to DTO before returning or caching
- Why not in Repository? Service sometimes needs raw fields for business logic before mapping

## Error Handling

Errors are never thrown. Every operation returns `Result<T, AppError>`.

```typescript
// Repository — catches Prisma errors
async findById(id: string): Promise<Result<User>> {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return err(notFound('User'))
    return ok(user)
  } catch {
    return err(databaseError('Failed to find user'))
  }
}

// Service — orchestrates, returns Result
async getProfile(userId: string): Promise<Result<UserDTO>> {
  const cached = await UserCache.get(userId)
  if (cached) return ok(cached)

  const result = await UserRepository.findById(userId)
  if (!result.ok) return result

  const dto = toUserDTO(result.value)
  await UserCache.set(userId, dto)
  return ok(dto)
}

// Route — translates Result to HTTP
const result = await UserService.getProfile(userId)
if (!result.ok) return handleError(result.error)
return successResponse(result.value)
```

### Error Factories

| Factory | ErrorCode | HTTP | Usage |
|---------|-----------|------|-------|
| `unauthorized()` | `UNAUTHORIZED` | 401 | Missing/expired session |
| `invalidCredentials()` | `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `forbidden()` | `FORBIDDEN` | 403 | No permission |
| `notFound(resource)` | `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `conflict(msg)` | `CONFLICT` | 409 | Duplicate (email exists) |
| `validationError()` | `VALIDATION_ERROR` | 422 | Format validation |
| `badRequest(msg)` | `BAD_REQUEST` | 400 | Malformed request |
| `databaseError()` | `DATABASE_ERROR` | 500 | Prisma/PostgreSQL failure |

### HTTP Response Helpers

| Function | Usage |
|----------|-------|
| `successResponse(data, status?)` | Wraps data in `NextResponse<SuccessResponse<T>>` |
| `handleError(error)` | Converts `AppError` → HTTP response (for Result errors) |
| `standardError(code, msg?)` | Creates HTTP response from `ErrorCode` (for Route-level errors) |
