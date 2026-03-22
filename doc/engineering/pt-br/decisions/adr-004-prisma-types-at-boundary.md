# ADR-004: Tipos do Prisma na Fronteira Repository–Service

**Status:** Aceito
**Data:** 2026-03-15

## Contexto

O Repository retorna `Result<PrismaModel>` (ex: `Result<User>` onde `User` vem de `@prisma/client`). O Service recebe esse tipo e passa para o Mapper, que converte para um DTO.

Isso significa que dois arquivos fora do Repository importam tipos do Prisma:

| Arquivo | Import | Uso |
|---------|--------|-----|
| `src/mappers/user.mapper.ts` | `import type { User } from '@prisma/client'` | Tipo de input de `toUserDTO()` |
| `src/__tests__/factories/user.factory.ts` | `import type { User } from '@prisma/client'` | Tipo de retorno de `createFakeUser()` |

A pergunta: devemos introduzir uma interface de modelo de domínio para desacoplar do Prisma?

## Decisão

**Aceitar o acoplamento.** Tipos do Prisma servem como modelo de domínio na fronteira Repository–Service. Sem interface de domínio intermediária.

### Por que isso é aceitável

1. **O Service nunca importa `@prisma/client`** — ele recebe `result.value` (tipo inferido) e passa para o Mapper. O Service não referencia tipos do Prisma diretamente.

2. **A superfície de acoplamento é mínima** — apenas o Mapper e a factory de teste importam tipos do Prisma. Ambos são nós folha no grafo de dependências sem consumidores downstream.

3. **Se o ORM mudar, o impacto é contido:**

| Camada | Muda? | Razão |
|--------|-------|-------|
| Repository | Sim | Novas queries do ORM |
| Mapper | Sim | Novo tipo de input |
| Factory de teste | Sim | Novo formato de model fake |
| **Service** | **Não** | Só acessa `.id`, `.email` em `result.value` — campos genéricos |
| Route | Não | Só vê DTOs |
| Cache | Não | Só vê DTOs |

4. **Uma interface de modelo de domínio adicionaria cerimônia sem benefício atual** — ela espelharia o tipo do Prisma 1:1 hoje, criando uma camada "pass-through" que existe apenas para satisfazer uma hipotética futura migração de ORM.

## Consequências

### Positivas

- Sem camada de abstração extra para manter
- Assinatura da função do Mapper documenta claramente o que transforma (`User → UserDTO`)
- Testes usam tipos reais do Prisma, capturando incompatibilidades de tipo cedo

### Negativas

- Mudança de ORM requer atualizar Mapper + factory de teste (mas não o Service)
- Tipos do Prisma aparecem fora do Repository (imports apenas de tipo, sem dependência de runtime)

### Quando revisitar

Se o projeto adicionar um segundo ORM ou fonte de dados (ex: uma API externa retornando dados de usuário), introduza uma interface de domínio nesse ponto — o Mapper então aceitaria `DomainUser` ao invés do Prisma `User`, e cada fonte de dados mapeia para `DomainUser` independentemente.
