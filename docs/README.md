# Nexo documentation

Canonical, versioned documentation for the Nexo platform: a multi-tenant project management app built on Next.js 16 (App Router), PostgreSQL/Prisma 7, Redis and BullMQ. Everything here is written from the code; where the code did not show the answer, the page says `TODO: confirm` instead of guessing.

Language: English. User-facing product copy stays in pt-BR, but this folder is developer documentation.

## Where to start

| If you want to... | Read |
|---|---|
| Understand the system in ten minutes | [architecture/overview.md](architecture/overview.md) |
| Follow one request from the browser to the database | [architecture/request-flow.md](architecture/request-flow.md) |
| Know why we decided something | [adr/README.md](adr/README.md) |
| See the data model | [diagrams/er-model.svg](diagrams/er-model.svg) |

## Architecture

| Page | Covers |
|---|---|
| [overview](architecture/overview.md) | Layers, stack, repository layout |
| [request-flow](architecture/request-flow.md) | Route, service, repository, `Result`, error envelope |
| [multi-tenancy](architecture/multi-tenancy.md) | Workspace slug, membership, isolation |
| [auth](architecture/auth.md) | Better Auth, sessions, OTP, 2FA, cookie cache, consent |
| [caching](architecture/caching.md) | Cache Components, `use cache: private`, Redis read-through |
| [background-jobs](architecture/background-jobs.md) | BullMQ queues, scheduler, failure alarm |
| [status-page](architecture/status-page.md) | Probes, incidents, Slack alerts |
| [security](architecture/security.md) | `proxy.ts`, DAL, CSP, rate limits, audit, secrets |
| [infrastructure](architecture/infrastructure.md) | Image, compose files, nginx, CI/CD |

## Architecture decision records

Index, template and status values live in [adr/README.md](adr/README.md). Current records: 0001 trunk-based development, 0002 `Result` instead of throw, 0003 DAL instead of layout gates, 0004 no `use cache` for runtime data, 0005 Better Auth, 0006 standalone output and browser tests, 0007 Silo storage, 0008 job failure alarm with dedup.

## Diagrams

SVG, generated from scripts so they can be regenerated when the architecture changes. See [diagrams/_tools/README.md](diagrams/_tools/README.md).

| Diagram | Shows |
|---|---|
| [request-flow.svg](diagrams/request-flow.svg) | A request through proxy, route, service, repository |
| [private-access.svg](diagrams/private-access.svg) | Optimistic proxy check versus the real DAL gate |
| [er-model.svg](diagrams/er-model.svg) | Core Prisma models (a subset of the schema) |
| [background-jobs.svg](diagrams/background-jobs.svg) | Queues, worker, failure alarm |
| [deploy-pipeline.svg](diagrams/deploy-pipeline.svg) | Local hooks, CI gate, CD |

## Not written yet

`domains/` (one page per feature area), `api/`, `testing/`, `development/`, `operations/` (runbooks) and `changelog/`. The rules for how tests, features and commits are organised currently live in the root `CLAUDE.md`.

## Keeping it honest

- A decision that changes gets a new ADR that supersedes the old one; do not rewrite history.
- A diagram changes by editing its script in `diagrams/_tools/` and regenerating, not by editing the SVG.
- If a page and the code disagree, the code wins and the page is a bug.
