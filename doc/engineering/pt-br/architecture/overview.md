# Visão Geral da Arquitetura

## Princípios

- **Separação em camadas** — Routes lidam com HTTP, Services são donos da lógica de negócio, Repositories são donos do acesso a dados. Nenhuma camada cruza sua fronteira.
- **Erros como valores** — `Result<T, AppError>` em todo lugar. Sem exceções lançadas, sem try/catch fora dos Repositories.
- **Autorização no domínio** — Checagens de permissão vivem dentro dos Services, não nas Routes, para que todo ponto de entrada (API, action, worker) passe pelo mesmo portão.
- **Infraestrutura como containers** — PostgreSQL, Redis, RabbitMQ e MinIO rodam como containers Docker em uma rede compartilhada.

## Stack Tecnológica

| Camada | Tecnologia | Propósito |
|--------|-----------|-----------|
| **Framework** | Next.js 16 + Turbopack | SSR, server components, API routes |
| **Linguagem** | TypeScript | Segurança de tipos em toda a stack |
| **Banco de Dados** | PostgreSQL 17 | Armazenamento primário de dados |
| **ORM** | Prisma 7 | Gerenciamento de schema, migrations, queries type-safe |
| **Cache** | Redis 7 + Sentinel | Cache de sessão, cache de dados (cache-aside), failover automático |
| **Fila** | RabbitMQ 4 | Processamento assíncrono de jobs (e-mails, notificações) |
| **Storage** | MinIO | Armazenamento de arquivos compatível com S3 (anexos, imagens) |
| **Auth** | Better Auth | Email/senha + OAuth (Google, GitHub) |
| **Validação** | Zod | Validação de schema de input com inferência de tipos |
| **UI** | Shadcn UI + Tailwind CSS 4 | Biblioteca de componentes e estilização |
| **Data fetching** | TanStack Query v5 | Cache no client, mutations, optimistic updates |
| **E-mail** | Resend + React Email | E-mails transacionais com templates React |
| **Observabilidade** | Axiom | Logs, erros, web vitals |
| **Linting** | Biome | Linting e formatação |
| **Testes** | Vitest | Testes unitários, integração e e2e |
| **Secrets** | SOPS + age | Secrets criptografados no git, decriptados no deploy |

## Estrutura de Pastas

```
/app
  /api/**/route.ts            # API routes (tratamento HTTP)
  /**/actions.ts               # Server actions
  /**/page.tsx                 # Páginas
/src
  /services/                   # Lógica de negócio + autorização
  /repositories/               # Acesso a dados (apenas Prisma)
  /schemas/                    # Schemas de validação Zod
  /cache/                      # Redis cache-aside
  /errors/                     # AppError, factory functions, códigos de erro
  /mappers/                    # Conversores Prisma model → DTO
  /hooks/                      # React Query hooks
  /lib/                        # Auth, Prisma client, Redis, tipo Result
/types/                        # Output DTOs
/utils/                        # Helpers de resposta HTTP
/prisma
  /schema.prisma               # Schema do banco de dados
  /migrations/                 # Histórico de migrations
/secrets
  /production.enc.env          # Secrets de produção criptografados com SOPS
```

## Regras Invioláveis

| Regra | Razão |
|-------|-------|
| Route nunca importa Prisma | Mantém a camada de dados isolada |
| Service nunca importa Prisma | Testabilidade e isolamento |
| Worker usa Service, não Prisma | Mesma lógica de negócio para todos os pontos de entrada |
| try/catch apenas no Repository | Erros de infraestrutura não vazam para o domínio |
| Autorização vive no Service | Garante checagens independente do ponto de entrada |
| Nunca lançar exceção — retornar `err()` | Erros como valores, tratamento forçado |

## Padrões de Código

### Padrão Repository

- Um repository por entidade de domínio
- Métodos nomeados por intenção (`findByWorkspace`, não `selectWhereWorkspaceId`)
- Retorna `Result<T, AppError>` — nunca lança exceção
- try/catch envolvendo toda chamada Prisma
- Erros do Prisma convertidos via factory functions

### DTO (Data Transfer Object)

- DTOs de input inferidos dos schemas Zod (`z.infer<typeof Schema>`)
- DTOs de output definidos manualmente em `/types/`
- Objetos do Prisma nunca retornados ao client
- Mapper faz a conversão Prisma model → output DTO

### Mapper

- Um mapper por entidade, chamado pelo Service (não pelo Repository)
- Funções puras, sem efeitos colaterais
- Repository retorna `Result<PrismaModel>` bruto, Service mapeia antes de cachear ou retornar

### Unit of Work

- Para escritas atômicas com múltiplos repositories
- Service passa um callback, não conhece detalhes da transação

### Strategy

- Para implementações intercambiáveis (notificações, storage)
- Interface definida explicitamente, implementação escolhida na inicialização

### Convenções de Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Zod Schema | `PascalCaseSchema` | `CreateProjectSchema` |
| Input DTO | Inferido do schema | `CreateProjectDTO` |
| Output DTO | `PascalCaseDTO` | `ProjectDTO` |
| Service | `PascalCaseService` | `ProjectService` |
| Repository | `PascalCaseRepository` | `ProjectRepository` |
| Mapper | `toCamelCaseDTO` | `toProjectDTO` |
| Error factory | `camelCase` | `conflict()`, `notFound()` |
