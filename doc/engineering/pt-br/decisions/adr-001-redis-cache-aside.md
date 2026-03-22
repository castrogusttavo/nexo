# ADR-001: Redis Cache-Aside com Armazenamento de DTO

**Status:** Aceito
**Data:** 2026-03-15

## Contexto

A aplicação precisa de uma estratégia de cache para reduzir a carga no banco de dados para dados acessados frequentemente (perfis de usuário, dados de sessão). Duas perguntas precisavam de resposta:

1. Qual padrão de cache? (cache-aside, read-through, write-through)
2. O que o cache armazena? (models do Prisma vs DTOs)

## Decisão

**Padrão cache-aside** gerenciado pela camada Service, armazenando **DTOs** (não models do Prisma).

- **Caminho de leitura:** Service checa Redis → hit retorna DTO cacheado → miss consulta Repository → Mapper converte para DTO → cache populado → retorna
- **Caminho de escrita:** Service chama Repository → em caso de sucesso, invalida cache → Mapper converte → retorna
- **TTL:** 15 minutos (alinhado com tempo de vida do access token)
- **Formato de armazenamento:** DTO serializado via `JSON.stringify`

### Por que cache-aside?

A camada Service já orquestra Repository + Cache, tornando-a a dona natural da lógica de cache. Read-through/write-through exigiria uma camada de proxy de cache separada que adiciona complexidade sem benefício na nossa escala.

### Por que armazenar DTOs?

- Cache hits pulam o Mapper completamente — leituras mais rápidas
- DTOs são o formato final que os consumidores precisam — sem transformação redundante
- Models do Prisma podem conter campos sensíveis (hashes de senha) que não devem ser serializados no Redis

## Consequências

### Positivas

- Implementação simples — Service chama `Cache.get()` antes de `Repository.find()`
- Cache hits são rápidos — sem pós-processamento necessário
- Campos sensíveis nunca chegam ao Redis

### Negativas

- **Mudanças no formato do DTO requerem invalidação de cache no deploy** — se um campo é adicionado/removido do DTO, entradas stale no cache terão o formato antigo
- Cache e Mapper são acoplados — mudar o DTO significa que ambos devem ser considerados

### Mitigação

- TTL de 15 minutos limita a janela de dados desatualizados
- Pipeline de deploy pode limpar chaves de cache relevantes quando mudanças no DTO são detectadas (passo manual por enquanto)
