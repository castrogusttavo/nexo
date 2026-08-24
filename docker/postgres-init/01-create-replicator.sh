#!/bin/bash
# Roda automaticamente via /docker-entrypoint-initdb.d/ só no primeiro
# init do nexo-db (volume vazio) — não afeta um volume já inicializado.
# Pra um nexo-db já rodando, o equivalente foi aplicado manualmente:
#   CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '...';
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPLICATOR_PASSWORD}';
EOSQL
