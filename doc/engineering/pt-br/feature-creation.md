# Guia de Criação de Feature

Processo passo a passo para implementar qualquer nova feature no Nexo, do banco de dados até a UI. Siga esta ordem independente da complexidade da feature — ela garante que cada camada dependa apenas de camadas já criadas.

## Visão Geral

```
Prisma Schema → Output DTO → Zod Schema → Repository → Mapper → Cache → Service → API Route → Hook → UI
```

Toda feature flui **de baixo para cima**: camada de dados primeiro, apresentação por último. Essa ordem garante que ao escrever um arquivo, todos os imports necessários já existam.

---

## Passo 1 — Prisma Schema

**Arquivo:** `prisma/schema.prisma`

Defina ou atualize o modelo de dados. Este é a fonte de verdade para a estrutura do banco.

**Regras:**
- Usar `cuid()` para IDs
- Usar `@map("snake_case")` para nomes de colunas, `@@map("plural_tabela")` para nomes de tabelas
- Adicionar `createdAt` / `updatedAt` com `@default(now())` e `@updatedAt`
- Definir relações explicitamente com comportamento `onDelete`
- Rodar `npx prisma migrate dev --name <descricao>` após as alterações

**Exemplo:**
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

**Por que primeiro:** Tudo depende do modelo de dados. Os tipos do Prisma gerados aqui são usados pelo Repository e pelo Mapper.

---

## Passo 2 — Output DTO

**Arquivo:** `types/<entidade>.ts`

Defina o formato dos dados que saem da API. É uma interface TypeScript simples — nunca exponha models do Prisma para o client.

**Regras:**
- Datas viram `string` (formato ISO)
- Omitir campos sensíveis (senhas, IDs internos que não devem ser públicos)
- Nomear como `<Entidade>DTO`
- Sem imports do Prisma — apenas tipos primitivos

**Exemplo:**
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

**Por que segundo:** Service, Mapper, Cache e Route referenciam este tipo. Defini-lo cedo evita dependências circulares.

---

## Passo 3 — Zod Schemas (Validação de Input)

**Arquivo:** `src/schemas/<entidade>.schema.ts`

Defina schemas de validação para cada operação (Create, Update). Exporte tipos inferidos como input DTOs.

**Regras:**
- Apenas validação de formato (min/max, regex, tipo) — sem regras de negócio
- Nomear schemas como `Create<Entidade>Schema`, `Update<Entidade>Schema`
- Exportar tipos inferidos: `Create<Entidade>DTO`, `Update<Entidade>DTO`
- Mensagens em português (pt-BR) para validações voltadas ao usuário

**Exemplo:**
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

**Por que terceiro:** Routes usam estes schemas para validar requests. Services usam os tipos inferidos como parâmetros dos métodos.

---

## Passo 4 — Repository

**Arquivo:** `src/repositories/<entidade>.repository.ts`

A única camada que importa o Prisma. Lida com todo acesso ao banco e converte erros do banco em erros de domínio.

**Regras:**
- Um repository por entidade
- Todo método retorna `Promise<Result<T>>`
- Envolver toda chamada Prisma em `try/catch`
- Capturar erros específicos do Prisma (P2002 = conflito de unique, P2025 = não encontrado)
- Nomes de métodos descrevem intenção, não estrutura da query (`findById`, não `getWhereIdEquals`)
- Importar error factories de `@/src/errors`
- Importar `prisma` de `@/src/lib/prisma`
- Importar `ok`, `err` de `@/src/lib/result`

**Exemplo:**
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

**Por que quarto:** Service depende do Repository. Repository depende apenas do Prisma (gerado no Passo 1) e das error factories.

---

## Passo 5 — Mapper

**Arquivo:** `src/mappers/<entidade>.mapper.ts`

Função pura que converte model do Prisma → Output DTO. Sem efeitos colaterais, sem async.

**Regras:**
- Importar o tipo do Prisma e o tipo do output DTO
- Converter `DateTime` para string ISO
- Nomear como `to<Entidade>DTO`
- Omitir campos que não estão no DTO

**Exemplo:**
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

**Por que quinto:** Service usa o mapper para converter resultados do Repository antes de retornar. Depende dos tipos dos Passos 1 e 2.

---

## Passo 6 — Cache (opcional)

**Arquivo:** `src/cache/<entidade>.cache.ts`

Padrão cache-aside com Redis. Cachear apenas entidades lidas frequentemente e que mudam pouco.

**Regras:**
- Armazenar DTOs, nunca models do Prisma (DTOs são seguros para serialização)
- Métodos: `get()`, `set()`, `invalidate()`
- Prefixar chaves com nome da entidade
- TTL: 15 minutos (padrão, ajustar por domínio)
- Usar `ensureRedisConnected` de `@/src/lib/redis`

**Exemplo:**
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

**Quando pular:** Features CRUD que são write-heavy ou raramente lidas não precisam de cache. Adicione depois quando o profiling mostrar necessidade.

---

## Passo 7 — Service

**Arquivo:** `src/services/<entidade>.service.ts`

Toda lógica de negócio e autorização vivem aqui. Este é o core da feature.

**Regras:**
- Nunca importa Prisma — apenas Repository, Mapper, Cache e error factories
- Todo método recebe `actorId` como primeiro parâmetro (para autorização)
- Checagem de autorização acontece dentro do service (não na route)
- Retorna `Promise<Result<DTO>>`
- Orquestra: checar auth → validar regras de negócio → chamar Repository → mapear para DTO → gerenciar cache
- Em leituras: checar cache primeiro, em miss buscar do Repository
- Em escritas: chamar Repository, invalidar cache, retornar DTO mapeado

**Exemplo:**
```typescript
import { forbidden } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toProjectDTO } from '@/src/mappers/project.mapper'
import { ProjectRepository } from '@/src/repositories/project.repository'
import type { CreateProjectDTO } from '@/src/schemas/project.schema'
import type { ProjectDTO } from '@/types/project'

export const ProjectService = {
  async create(actorId: string, dto: CreateProjectDTO): Promise<Result<ProjectDTO>> {
    // Autorização: apenas OWNER/ADMIN pode criar
    // ... checar role do actor ...

    const result = await ProjectRepository.create({ ...dto, workspaceId })
    if (!result.ok) return result

    return ok(toProjectDTO(result.value))
  },
  // ...
}
```

**Por que sétimo:** Service depende do Repository (Passo 4), Mapper (Passo 5), Cache (Passo 6) e tipos de input (Passo 3). Tudo está pronto.

---

## Passo 8 — API Route

**Arquivo:** `app/api/<entidade>/route.ts` (coleção) e `app/api/<entidade>/[id]/route.ts` (recurso individual)

Fronteira HTTP. Lida com autenticação, validação Zod, chama o Service e retorna a resposta.

**Regras:**
- Sem lógica de negócio — delegar tudo ao Service
- Sem imports do Prisma
- Padrão para cada handler:
  1. Autenticar (`getAuthSession()`)
  2. Parsear e validar body (para POST/PATCH/PUT)
  3. Chamar método do Service
  4. Retornar `successResponse()` ou `handleError()`
- Usar `standardError()` para falhas de validação
- Usar `handleError()` para erros de Result do Service

**Exemplo:**
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

**Convenção de estrutura de rotas:**
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/<entidade>` | Criar |
| GET | `/api/<entidade>` | Listar todos |
| GET | `/api/<entidade>/[id]` | Buscar um |
| PATCH | `/api/<entidade>/[id]` | Atualizar |
| DELETE | `/api/<entidade>/[id]` | Deletar |

---

## Passo 9 — React Hook

**Arquivo:** `src/hooks/use-<entidade>.ts`

Data fetching no client com React Query v5.

**Regras:**
- Um hook por responsabilidade (`useProject`, `useCreateProject`, `useProjects`)
- Queries: `useQuery` com resposta tipada
- Mutations: `useMutation` com invalidação de cache no `onSuccess`
- Sempre tipar a resposta como `SuccessResponse<DTO>`
- Usar `queryClient.invalidateQueries` para atualizar caches relacionados após mutations

**Exemplo:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectDTO } from '@/types/project'
import type { SuccessResponse } from '@/types/http-response'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<ProjectDTO[]> => {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Erro ao buscar projetos')
      const json: SuccessResponse<ProjectDTO[]> = await res.json()
      return json.data
    },
  })
}
```

---

## Passo 10 — Frontend (UI)

Decidir entre **Server Component** e **Client Component + Route**:

| Cenário | Abordagem |
|---------|-----------|
| Página estática, SEO importa, sem interatividade | Server Component → fetch direto no componente (sem hook) |
| Página dinâmica, interações do usuário (forms, modais, atualizações em tempo real) | Client Component → Hook → API Route |
| Envio de formulário, mutations | Server Action (`actions.ts`) ou Client Component → `useMutation` → API Route |

**Para features CRUD** (como gerenciamento de workspace), o setup típico é:

- **Página de listagem**: Server Component que busca dados iniciais, hidrata o React Query
- **Forms de criar/editar**: Client Components usando hooks `useMutation`
- **Deletar**: Client Component com dialog de confirmação + `useMutation`

---

## Mensagens de Commit Git

Todas as mensagens de commit seguem o formato **Conventional Commits**. Sempre escreva em inglês.

### Formato

```
<tipo>(<escopo>): <descrição curta>
```

- **tipo**: que tipo de mudança
- **escopo**: área da feature ou módulo afetado (opcional mas preferido)
- **descrição curta**: modo imperativo, minúscula, sem ponto no final

### Tipos

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| `feat` | Nova feature ou funcionalidade | `feat(workspace): add CRUD endpoints` |
| `fix` | Correção de bug | `fix(workspace): link user on workspace creation` |
| `refactor` | Mudança de código que não corrige bug nem adiciona feature | `refactor(auth): extract session validation` |
| `chore` | Tooling, config, dependências, sem código de produção | `chore: update prisma to v7.5` |
| `style` | Formatação, espaços, linting (sem mudança de lógica) | `style: apply Biome formatting to auth pages` |
| `docs` | Apenas documentação | `docs: add feature creation guide` |
| `test` | Adição ou correção de testes | `test(workspace): add service unit tests` |
| `perf` | Melhoria de performance | `perf(cache): reduce workspace TTL` |
| `ci` | Mudanças na pipeline CI/CD | `ci: add workspace migration to deploy` |

### Regras

1. **Modo imperativo** — "add feature", não "added feature" ou "adds feature"
2. **Minúscula** — sem letra maiúscula no início da descrição
3. **Sem ponto** — não terminar com `.`
4. **Curto** — manter abaixo de 72 caracteres no total
5. **Escopo corresponde ao domínio** — usar o nome da feature/módulo: `workspace`, `auth`, `ui`, `ci`, `cache`, etc.
6. **Uma preocupação por commit** — não misturar fix de bug com nova feature

### Escopo por Camada (para trabalho em features)

Ao construir uma feature em múltiplas camadas, usar o **domínio** como escopo (não a camada):

```
feat(workspace): add prisma schema and migration
feat(workspace): add repository with CRUD operations
feat(workspace): add service with authorization
feat(workspace): add API routes
feat(workspace): add React hooks and test UI
```

Não:
```
feat(repository): add workspace repository    ← errado: escopo é a camada
feat: add workspace repository                ← aceitável mas menos descritivo
```

### Breaking Changes

Para breaking changes, adicionar `!` após o escopo:

```
feat(auth)!: require workspace membership for all endpoints
```

---

## Checklist

Use este checklist ao implementar qualquer feature:

- [ ] Schema do Prisma atualizado + migration criada
- [ ] Output DTO definido em `types/`
- [ ] Zod schemas para cada operação em `src/schemas/`
- [ ] Repository com métodos que retornam Result em `src/repositories/`
- [ ] Mapper (model do Prisma → DTO) em `src/mappers/`
- [ ] Camada de cache (se necessário) em `src/cache/`
- [ ] Service com lógica de negócio + autorização em `src/services/`
- [ ] API Routes (coleção + recurso) em `app/api/`
- [ ] React hooks em `src/hooks/`
- [ ] Componentes/páginas de UI em `app/`

## Padrões Comuns

### Operações de Delete

Deletes tipicamente retornam `void` (ou um boolean de sucesso), não a entidade deletada:
- Repository: `delete()` → `Result<void>`
- Service: `delete()` → `Result<void>` (checar autorização primeiro)
- Route: `DELETE` → `successResponse(null, 204)` ou `successResponse({ deleted: true })`

### Operações de Listagem

Listagens podem precisar de paginação, filtros e ordenação:
- Repository: `findMany(filters)` → `Result<Entity[]>`
- Service: `list(actorId, filters)` → `Result<DTO[]>`
- Route: parsear query params → passar para o Service

### Padrões de Autorização

```typescript
// Simples: actor deve ser membro do workspace
const actor = await UserRepository.findById(actorId)
if (!actor.ok) return actor
if (actor.value.workspaceId !== targetWorkspaceId) return err(forbidden())

// Baseado em role: apenas OWNER/ADMIN pode executar a ação
if (!['OWNER', 'ADMIN'].includes(actor.value.role)) return err(forbidden())
```
