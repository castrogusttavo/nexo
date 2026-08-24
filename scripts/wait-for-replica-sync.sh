#!/bin/bash
# Espera a réplica entrar em modo "streaming" e alcançar o LSN atual do
# primary antes de liberar testes contra ela — sem isso, um teste logo
# depois do seed pode ler dado que ainda não replicou.
#
#   ./scripts/wait-for-replica-sync.sh nexo-db nexo-db-replica
set -e

PRIMARY=${1:-nexo-db}
REPLICA=${2:-nexo-db-replica}
TIMEOUT=${TIMEOUT:-60}

echo "Esperando $REPLICA aparecer em pg_stat_replication no $PRIMARY..."
elapsed=0
until docker exec "$PRIMARY" psql -U root -d nexo -tAc \
  "select state from pg_stat_replication limit 1" 2>/dev/null | grep -q streaming; do
  if [ "$elapsed" -ge "$TIMEOUT" ]; then
    echo "Timeout ($TIMEOUT s) esperando streaming replication subir." >&2
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done
echo "Streaming ok depois de ${elapsed}s."

echo "Comparando LSN primary vs réplica..."
elapsed=0
while true; do
  primary_lsn=$(docker exec "$PRIMARY" psql -U root -d nexo -tAc "select pg_current_wal_lsn()")
  replica_lsn=$(docker exec "$REPLICA" psql -U root -d nexo -tAc "select pg_last_wal_replay_lsn()")

  if [ "$primary_lsn" = "$replica_lsn" ]; then
    echo "LSN igual em ambos ($primary_lsn) — réplica sincronizada."
    exit 0
  fi

  if [ "$elapsed" -ge "$TIMEOUT" ]; then
    echo "Timeout ($TIMEOUT s) esperando LSN convergir (primary=$primary_lsn réplica=$replica_lsn)." >&2
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done
