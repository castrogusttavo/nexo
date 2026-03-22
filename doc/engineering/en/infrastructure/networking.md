# Networking

## Docker Network

All containers share a single bridge network: `nexo_default`.

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

The network is created by `docker-compose.infra.yml` and declared as `external` in `docker-compose.yml`. This allows the application container to join the same network as infrastructure services despite being in separate Compose files.

```yaml
# docker-compose.infra.yml — creates the network
networks:
  app-network:
    name: nexo_default

# docker-compose.yml — joins the existing network
networks:
  app-network:
    external: true
    name: nexo_default
```

## Port Mapping

Ports exposed to the host:

| Service | Container Port | Host Port | Protocol |
|---------|---------------|-----------|----------|
| nexo-app | 3000 | 3000 | HTTP |
| nexo-db | 5432 | 5432 | PostgreSQL |
| redis-master | 6379 | 6379 | Redis |
| sentinel-1 | 26379 | 26379 | Redis Sentinel |
| nexo-queue | 5672 | 5656 | AMQP |
| nexo-queue | 15672 | 15672 | HTTP (Management UI) |
| nexo-storage | 9000 | 9000 | HTTP (S3 API) |
| nexo-storage | 9001 | 9001 | HTTP (Console) |

Sentinel-2 and sentinel-3 do not expose ports to the host — they are only accessible within the Docker network.

## DNS Resolution

Containers communicate using Docker's built-in DNS. Service names resolve to container IPs within the `nexo_default` network:

| Hostname | Resolves to |
|----------|-------------|
| `nexo-db-1` | PostgreSQL container |
| `nexo-redis-master` | Redis master |
| `nexo-redis-replica` | Redis replica |
| `nexo-sentinel-1` | Sentinel 1 |
| `nexo-sentinel-2` | Sentinel 2 |
| `nexo-sentinel-3` | Sentinel 3 |
| `nexo-mq-1` | RabbitMQ |
| `nexo-minio-1` | MinIO |

The application uses `container_name` for DNS resolution, not the Compose service name.

## App DNS

The application container has external DNS configured:

```yaml
dns:
  - 8.8.8.8
  - 8.8.4.4
```

This ensures the app can resolve external hostnames (OAuth providers, Resend API, Axiom) even if the host's DNS resolver is unavailable.

## Connection Strings

| Service | Connection | Environment Variable |
|---------|-----------|---------------------|
| PostgreSQL | `postgresql://user:pass@nexo-db-1:5432/elo` | `DATABASE_URL` |
| Redis (dev) | `redis://localhost:6379` | `REDIS_URL` |
| Redis (prod) | Sentinel discovery via `nexo-sentinel-{1,2,3}:26379` | `REDIS_SENTINEL_HOSTS` |
| RabbitMQ | `amqp://user:pass@nexo-mq-1:5672` | (configured per consumer) |
| MinIO | `http://nexo-minio-1:9000` | (configured in storage service) |
