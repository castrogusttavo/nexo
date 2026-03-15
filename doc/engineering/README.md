# Nexo Engineering Handbook

Technical reference for the Nexo platform. Everything an engineer needs to understand, build, and operate the system.

## Sections

### [Architecture](architecture/)

How the system is structured and why.

- [Overview](architecture/overview.md) — tech stack, principles, folder structure
- [Service Layer](architecture/service-layer.md) — layered architecture with diagrams
- [Architecture Map](architecture/architecture-map.md) — data model, auth flow, request lifecycle

### [Decisions](decisions/)

Architecture Decision Records (ADRs) for key trade-offs.

- [ADR-001: Redis Cache-Aside with DTO Storage](decisions/adr-001-redis-cache-aside.md)
- [ADR-002: Redis Sentinel over Cluster](decisions/adr-002-redis-sentinel.md)
- [ADR-003: SOPS + age for Secrets](decisions/adr-003-sops-age-secrets.md)
- [ADR Template](decisions/adr-template.md)

### [Infrastructure](infrastructure/)

How the system runs in production.

- [Infrastructure Architecture](infrastructure/infra-architecture.md) — containers, volumes, networking
- [Deployment](infrastructure/deployment.md) — CI/CD pipeline, deploy flow
- [Networking](infrastructure/networking.md) — Docker network, ports, DNS

### [Security](security/)

How the system protects data and controls access.

- [Security Model](security/security-model.md) — authentication, session management
- [RBAC](security/rbac.md) — roles, permissions, enforcement
- [Secrets Management](security/secrets-management.md) — SOPS + age workflow
