#!/bin/bash
# Entrypoint dedicado da réplica — substitui o docker-entrypoint.sh padrão
# da imagem postgres:*, que faz initdb (bootstrap de banco novo, não é o
# que uma réplica precisa). No primeiro start, com $PGDATA vazio, clona o
# primary inteiro via pg_basebackup. A flag -R escreve standby.signal +
# primary_conninfo automaticamente (mecanismo padrão do Postgres >= 12) —
# depois disso, cada `postgres` normal já sobe como standby em streaming
# replication, sem precisar rodar pg_basebackup de novo.
set -e

if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
  echo "PGDATA vazio — clonando $PRIMARY_HOST via pg_basebackup..."

  until gosu postgres env PGPASSWORD="$REPLICATOR_PASSWORD" pg_basebackup \
    -h "$PRIMARY_HOST" \
    -U replicator \
    -D "$PGDATA" \
    -Fp -Xs -P -R; do
    echo "pg_basebackup falhou (primary ainda subindo?) — tentando de novo em 3s..."
    sleep 3
  done

  chown -R postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"
  echo "Clone concluído, subindo como standby."
fi

# A imagem oficial roda como root e usa gosu pra derrubar privilégio
# antes do postgres de verdade — bypassei o docker-entrypoint.sh padrão
# (ele faria initdb, que não é o que uma réplica quer), então preciso
# fazer esse drop manualmente aqui.
exec gosu postgres postgres
