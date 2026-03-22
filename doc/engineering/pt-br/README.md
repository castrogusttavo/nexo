# Nexo Engineering Handbook

Referência técnica da plataforma Nexo. Tudo que um engenheiro precisa para entender, construir e operar o sistema.

## Seções

### [Arquitetura](architecture/)

Como o sistema é estruturado e por quê.

- [Visão Geral](architecture/overview.md) — stack, princípios, estrutura de pastas
- [Service Layer](architecture/service-layer.md) — arquitetura em camadas com diagramas
- [Mapa da Arquitetura](architecture/architecture-map.md) — modelo de dados, fluxo de auth, ciclo de vida da request

### [Decisões](decisions/)

Architecture Decision Records (ADRs) para trade-offs importantes.

- [ADR-001: Redis Cache-Aside com armazenamento de DTO](decisions/adr-001-redis-cache-aside.md)
- [ADR-002: Redis Sentinel ao invés de Cluster](decisions/adr-002-redis-sentinel.md)
- [ADR-003: SOPS + age para Secrets](decisions/adr-003-sops-age-secrets.md)
- [ADR-004: Tipos do Prisma na fronteira Repository–Service](decisions/adr-004-prisma-types-at-boundary.md)
- [Template de ADR](decisions/adr-template.md)

### [Infraestrutura](infrastructure/)

Como o sistema roda em produção.

- [Arquitetura de Infraestrutura](infrastructure/infra-architecture.md) — containers, volumes, rede
- [Deploy](infrastructure/deployment.md) — pipeline CI/CD, fluxo de deploy
- [Rede](infrastructure/networking.md) — rede Docker, portas, DNS

### [Criação de Feature](feature-creation.md)

Guia passo a passo para implementar qualquer nova feature, do banco de dados até a UI.

- [Guia de Criação de Feature](feature-creation.md) — ordem dos arquivos, padrões, checklist

### [Segurança](security/)

Como o sistema protege dados e controla acesso.

- [Modelo de Segurança](security/security-model.md) — autenticação, gerenciamento de sessão
- [RBAC](security/rbac.md) — roles, permissões, enforcement
- [Gerenciamento de Secrets](security/secrets-management.md) — workflow SOPS + age
