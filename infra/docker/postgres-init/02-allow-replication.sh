#!/bin/bash
# Mesma ressalva do 01-create-replicator.sh — só roda no primeiro init.
# Escopo amplo (0.0.0.0/0) de propósito: subnet do docker bridge não é
# previsível entre ambientes, e isso é infra local efêmera, não produção
# (mesmo desvio já aceito pra TLS entre primary/réplica). Restrito só ao
# usuário "replicator" e ao pseudo-banco "replication" — não abre acesso
# geral.
set -e

echo "host    replication     replicator      0.0.0.0/0               scram-sha-256" \
  >> "$PGDATA/pg_hba.conf"
