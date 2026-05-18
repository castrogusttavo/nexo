#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# redis-tls/generate.sh
#
# Generates a self-signed CA and a Redis server certificate with the correct
# Subject Alternative Names so TLS works from both:
#   - Docker (internal hostname: redis)
#   - Local dev/test (port-forwarded via localhost / 127.0.0.1)
#
# Usage:
#   cd redis-tls && bash generate.sh
#
# Output files (all gitignored):
#   ca.key      CA private key   – keep secret, never copy to containers
#   ca.crt      CA certificate   – mounted into the Redis container and the app
#   redis.key   Server private key
#   redis.crt   Server certificate signed by the CA above
#
# After running this script:
#   1. Restart the Redis container so it picks up the new certs:
#        docker compose -f docker-compose.infra.yml restart nexo-redis
#   2. Remove the checkServerIdentity workarounds from:
#        src/lib/redis.ts
#        src/lib/queue/connection.ts
# ---------------------------------------------------------------------------
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# ---------------------------------------------------------------------------
# 1. CA – private key + self-signed certificate
# ---------------------------------------------------------------------------
openssl genrsa -out ca.key 2048

openssl req -new -x509 \
  -days 3650 \
  -key ca.key \
  -out ca.crt \
  -subj "/CN=NexoRedisCA"

# ---------------------------------------------------------------------------
# 2. Server – private key + CSR
# ---------------------------------------------------------------------------
openssl genrsa -out redis.key 2048

# OpenSSL config with the SANs that cover every scenario:
#   DNS:redis        → Docker internal network (container hostname)
#   DNS:localhost    → local dev / test (port-forwarded)
#   IP:127.0.0.1    → local dev / test (IP-based connections)
#   IP:::1           → IPv6 loopback
cat > openssl.cnf <<'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions     = v3_req
prompt             = no

[req_distinguished_name]
CN = redis

[v3_req]
subjectAltName = @alt_names
keyUsage       = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = redis
DNS.2 = localhost
IP.1  = 127.0.0.1
IP.2  = ::1
EOF

openssl req -new \
  -key redis.key \
  -out redis.csr \
  -config openssl.cnf

# ---------------------------------------------------------------------------
# 3. Sign the CSR with the CA
# ---------------------------------------------------------------------------
openssl x509 -req \
  -days 3650 \
  -in redis.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out redis.crt \
  -extensions v3_req \
  -extfile openssl.cnf

# ---------------------------------------------------------------------------
# 4. Cleanup intermediary files (not needed at runtime)
# ---------------------------------------------------------------------------
rm -f redis.csr ca.srl openssl.cnf

echo ""
echo "✅  Certificates generated in $(pwd):"
echo "    ca.crt    – CA certificate  (mount into app + Redis container)"
echo "    redis.crt – Server certificate"
echo "    redis.key – Server private key"
echo ""
echo "Next steps:"
echo "  1. docker compose -f docker-compose.infra.yml restart nexo-redis"
echo "  2. Remove the checkServerIdentity workarounds from:"
echo "       src/lib/redis.ts"
echo "       src/lib/queue/connection.ts"

# Verify the SAN is present in the new cert
echo ""
echo "SANs in the new certificate:"
openssl x509 -in redis.crt -noout -ext subjectAltName
