# Service Layer

## Fluxo

```
Client → Route/Action → Zod → Autorização → Service → Repository → Prisma/PostgreSQL
```

```mermaid
flowchart TD
    Client([Client])

    subgraph "Camada Route — fronteira HTTP"
        AuthN["Autenticação\ngetAuthSession() → actorId"]
        Route["Route / Action"]
        Zod["Validação Zod"]
        HttpRes["Resposta HTTP"]
    end

    subgraph "Camada Service — lógica de negócio"
        AuthZ["Autorização\nactorId pode fazer isso?"]
        Service["Service"]
        Mapper["Mapper"]
    end

    subgraph "Camada de Dados — persistência"
        Cache[("Redis Cache\narmazena DTOs")]
        Repo["Repository"]
        Prisma["Prisma Client"]
        DB[("PostgreSQL")]
    end

    Client -->|HTTP request| Route
    Route -->|verificar sessão| AuthN
    AuthN -->|actorId| Route
    Route -->|input bruto| Zod
    Zod -->|DTO validado + actorId| Service
    Service --> AuthZ
    AuthZ -->|proibido| Service
    AuthZ -->|autorizado| Cache

    Cache -->|hit: DTO cacheado| Service
    Cache -->|miss| Repo
    Repo --> Prisma
    Prisma --> DB
    DB --> Prisma
    Prisma -->|Prisma model| Repo
    Repo -->|Result| Service
    Service --> Mapper
    Mapper -->|DTO| Service
    Service -->|popular cache com DTO| Cache
    Service -->|Result| Route
    Route --> HttpRes
    HttpRes -->|resposta JSON| Client
```

## Ciclo de Vida da Request

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Route
    participant AuthN as Autenticação
    participant Z as Zod Schema
    participant S as Service
    participant AuthZ as Autorização
    participant Ca as Redis Cache
    participant Rp as Repository
    participant DB as PostgreSQL
    participant M as Mapper

    C->>R: HTTP Request (Cookie: session_token)
    R->>AuthN: getAuthSession(headers)

    alt Sessão inválida ou expirada
        AuthN-->>R: err(unauthorized())
        R-->>C: 401
    end

    AuthN-->>R: ok({ actorId, session })
    R->>Z: Validar input

    alt Validação falha
        Z-->>R: Zod error
        R-->>C: 422
    end

    Z-->>R: DTO Validado
    R->>S: call(actorId, validatedDTO)
    S->>AuthZ: actorId pode executar esta ação?

    alt Proibido
        AuthZ-->>S: err(forbidden())
        S-->>R: err(forbidden())
        R-->>C: 403
    end

    S->>Ca: Cache.get(key)

    alt Cache hit
        Ca-->>S: DTO Cacheado
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

## Responsabilidades por Camada

| Camada | Faz | Não Faz |
|--------|-----|---------|
| **Route** | Autenticar, validar input (Zod), chamar Service, converter Result em HTTP | Lógica de negócio, importar Prisma |
| **Service** | Autorizar, regras de negócio, orquestrar Cache + Repo + Mapper | Conhecimento HTTP, importar Prisma |
| **Repository** | Queries Prisma, capturar erros, retornar Result | Lógica de negócio, validação |
| **Cache** | Armazenar/recuperar DTOs do Redis | Transformar dados |
| **Mapper** | Converter Prisma model → DTO | Efeitos colaterais |

## Autenticação vs Autorização

| Preocupação | Onde | O quê | Falha |
|-------------|------|-------|-------|
| **Autenticação** | Route — `getAuthSession()` | Quem é você? Validar cookie de sessão | `err(unauthorized())` — 401 |
| **Autorização** | Service — checagem de permissão | Você pode fazer isso? Checar role/ownership | `err(forbidden())` — 403 |

## Padrão Cache-Aside

O cache armazena **DTOs** (não models do Prisma). Leituras do cache pulam o Mapper. Mudanças no formato do DTO requerem invalidação do cache no deploy.

```mermaid
flowchart TD
    subgraph "Caminho de Leitura"
        R1["Service.get(id)"] --> R2{"Redis Cache?"}
        R2 -->|"hit → DTO"| R3["Retornar DTO cacheado"]
        R2 -->|miss| R4["Repository.find(id)"]
        R4 --> R5["Mapper.toDTO()"]
        R5 --> R6["Cache.set(key, DTO, TTL=15min)"]
        R6 --> R7["Retornar DTO"]
    end

    subgraph "Caminho de Escrita"
        W1["Service.update(id, data)"] --> W2["Repository.update(id, data)"]
        W2 --> W3["Cache.invalidate(key)"]
        W3 --> W4["Mapper.toDTO()"]
        W4 --> W5["Retornar DTO"]
    end
```

**Regras:**
- Cache armazena DTOs serializados (`JSON.stringify`)
- TTL: 15 minutos (alinhado com tempo de vida do access token)
- Mudança no formato do DTO = invalidar todas as chaves de cache relacionadas no deploy
- Operações de escrita sempre invalidam antes de retornar

## Posicionamento do Mapper

Mappers vivem na **camada Service** (`src/mappers/`), não no Repository:

- Repository retorna `Result<PrismaModel>` — tipos brutos do banco
- Service chama o Mapper — converte para DTO antes de retornar ou cachear
- Por que não no Repository? O Service às vezes precisa de campos brutos para lógica de negócio antes de mapear

## Tratamento de Erros

Erros nunca são lançados. Toda operação retorna `Result<T, AppError>`.

```typescript
// Repository — captura erros do Prisma
async findById(id: string): Promise<Result<User>> {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return err(notFound('User'))
    return ok(user)
  } catch {
    return err(databaseError('Failed to find user'))
  }
}

// Service — orquestra, retorna Result
async getProfile(userId: string): Promise<Result<UserDTO>> {
  const cached = await UserCache.get(userId)
  if (cached) return ok(cached)

  const result = await UserRepository.findById(userId)
  if (!result.ok) return result

  const dto = toUserDTO(result.value)
  await UserCache.set(userId, dto)
  return ok(dto)
}

// Route — traduz Result para HTTP
const result = await UserService.getProfile(userId)
if (!result.ok) return handleError(result.error)
return successResponse(result.value)
```

### Error Factories

| Factory | ErrorCode | HTTP | Uso |
|---------|-----------|------|-----|
| `unauthorized()` | `UNAUTHORIZED` | 401 | Sessão ausente/expirada |
| `invalidCredentials()` | `INVALID_CREDENTIALS` | 401 | Email/senha incorretos |
| `forbidden()` | `FORBIDDEN` | 403 | Sem permissão |
| `notFound(resource)` | `RESOURCE_NOT_FOUND` | 404 | Recurso não encontrado |
| `conflict(msg)` | `CONFLICT` | 409 | Duplicata (email já existe) |
| `validationError()` | `VALIDATION_ERROR` | 422 | Validação de formato |
| `badRequest(msg)` | `BAD_REQUEST` | 400 | Request malformada |
| `databaseError()` | `DATABASE_ERROR` | 500 | Falha do Prisma/PostgreSQL |

### Helpers de Resposta HTTP

| Função | Uso |
|--------|-----|
| `successResponse(data, status?)` | Envolve dados em `NextResponse<SuccessResponse<T>>` |
| `handleError(error)` | Converte `AppError` → resposta HTTP (para erros de Result) |
| `standardError(code, msg?)` | Cria resposta HTTP a partir de `ErrorCode` (para erros na camada Route) |
