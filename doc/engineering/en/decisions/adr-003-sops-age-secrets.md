# ADR-003: SOPS + age for Secrets Management

**Status:** Accepted
**Date:** 2026-03-15

## Context

Production secrets lived in a plain `.env` file on the server. Problems:

- No version control — no history of what changed or when
- No audit trail — no way to know who changed a secret
- No encryption at rest — anyone with server access sees all secrets
- No review process — changes bypass PR review entirely

Options considered:

1. **HashiCorp Vault** — full-featured, but requires running a server + unsealing
2. **AWS Secrets Manager / GCP Secret Manager** — managed, but adds cloud dependency
3. **SOPS + age** — encrypt in git, decrypt at deploy time, no external service
4. **Sealed Secrets (Kubernetes)** — not applicable, we use Docker Compose

## Decision

**SOPS + age**. Secrets are encrypted with age public key and committed to git as `secrets/production.enc.env`. Decrypted at deploy time by the CD pipeline using the age private key stored as a GitHub Actions secret.

### How it works

```
Developer edits secrets:
  SOPS_AGE_KEY_FILE=~/.age/nexo-secrets.key sops secrets/production.enc.env
  → Opens $EDITOR with decrypted content
  → Re-encrypts on save
  → git commit + push

CD pipeline deploys:
  sops --decrypt secrets/production.enc.env > /var/www/nexo/.env
  → Uses SOPS_AGE_KEY from GitHub Secrets
  → Decrypted .env used by docker compose
```

### Files

| File | Purpose |
|------|---------|
| `.sops.yaml` | Creation rules — maps file patterns to age public key |
| `secrets/production.enc.env` | Encrypted secrets (committed to git) |
| `.gitignore` | Allows `*.enc.env`, ignores `*.env` in secrets/ |
| `.dockerignore` | Excludes `secrets/` from Docker build context |

## Consequences

### Positive

- Secrets are version-controlled — full git history of changes
- Encrypted at rest — even if repo is leaked, secrets are safe
- No external service to run or maintain
- Standard PR review process for secret changes
- age is simpler than GPG — single key file, no keyring management

### Negative

- Key rotation requires re-encrypting all secrets with the new key
- Single age key = single point of compromise (mitigated by storing private key only in GitHub Secrets and developer machines)
- Developers need `sops` + `age` installed locally to edit secrets

### One-time setup required

1. Install `sops` + `age` on self-hosted runner
2. Generate age key pair: `age-keygen -o nexo-secrets.key`
3. Store private key as GitHub Actions secret `SOPS_AGE_KEY`
4. Update `.sops.yaml` with the public key
