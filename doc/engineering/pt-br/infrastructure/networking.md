# Rede

## Rede Docker

Todos os containers compartilham uma única rede bridge: `nexo_default`.

```mermaid
flowchart LR
    subgraph "nexo_default (bridge)"
        App["nexo-app\n:3000"]
        DB["nexo-db\n:5432"]
        Master["redis-master\n:6379"]
        Replica["redis-replica\n:6379"]
        S1["sentinel-1\n:26379"]
        S2["sentinel-2\n:26379"]
        S3["sentinel-3\n:26379"]
        Queue["nexo-queue\n:5672"]
        Storage["nexo-storage\n:9000"]
    end

    App --> DB & Master & S1 & S2 & S3 & Queue & Storage
```

A rede é criada pelo `docker-compose.infra.yml` e declarada como `external` no `docker-compose.yml`. Isso permite que o container da aplicação entre na mesma rede dos serviços de infraestrutura apesar de estarem em arquivos Compose separados.

```yaml
# docker-compose.infra.yml — cria a rede
networks:
  app-network:
    name: nexo_default

# docker-compose.yml — entra na rede existente
networks:
  app-network:
    external: true
    name: nexo_default
```

## Mapeamento de Portas

Portas expostas no host:

| Serviço | Porta do Container | Porta do Host | Protocolo |
|---------|-------------------|---------------|-----------|
| nexo-app | 3000 | 3000 | HTTP |
| nexo-db | 5432 | 5432 | PostgreSQL |
| redis-master | 6379 | 6379 | Redis |
| sentinel-1 | 26379 | 26379 | Redis Sentinel |
| nexo-queue | 5672 | 5656 | AMQP |
| nexo-queue | 15672 | 15672 | HTTP (UI de Gerenciamento) |
| nexo-storage | 9000 | 9000 | HTTP (API S3) |
| nexo-storage | 9001 | 9001 | HTTP (Console) |

Sentinel-2 e sentinel-3 não expõem portas no host — são acessíveis apenas dentro da rede Docker.

## Resolução DNS

Containers se comunicam usando o DNS embutido do Docker. Nomes de serviço resolvem para IPs de container dentro da rede `nexo_default`:

| Hostname | Resolve para |
|----------|-------------|
| `nexo-db-1` | Container PostgreSQL |
| `nexo-redis-master` | Redis master |
| `nexo-redis-replica` | Redis réplica |
| `nexo-sentinel-1` | Sentinel 1 |
| `nexo-sentinel-2` | Sentinel 2 |
| `nexo-sentinel-3` | Sentinel 3 |
| `nexo-mq-1` | RabbitMQ |
| `nexo-minio-1` | MinIO |

A aplicação usa `container_name` para resolução DNS, não o nome do serviço do Compose.

## DNS da Aplicação

O container da aplicação tem DNS externo configurado:

```yaml
dns:
  - 8.8.8.8
  - 8.8.4.4
```

Isso garante que a app consiga resolver hostnames externos (provedores OAuth, API do Resend, Axiom) mesmo que o resolver DNS do host esteja indisponível.

## Strings de Conexão

| Serviço | Conexão | Variável de Ambiente |
|---------|---------|---------------------|
| PostgreSQL | `postgresql://user:pass@nexo-db-1:5432/elo` | `DATABASE_URL` |
| Redis (dev) | `redis://localhost:6379` | `REDIS_URL` |
| Redis (prod) | Descoberta via Sentinel `nexo-sentinel-{1,2,3}:26379` | `REDIS_SENTINEL_HOSTS` |
| RabbitMQ | `amqp://user:pass@nexo-mq-1:5672` | (configurado por consumidor) |
| MinIO | `http://nexo-minio-1:9000` | (configurado no serviço de storage) |
