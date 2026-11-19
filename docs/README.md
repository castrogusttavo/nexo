# Nexo documentation

Canonical, versioned documentation for the Nexo platform: a multi-tenant project management app built on Next.js 16 (App Router), PostgreSQL/Prisma 7, Redis and BullMQ. Everything here is written from the code; where the code did not show the answer, the page says `TODO: confirm` instead of guessing.

Language: English. User-facing product copy stays in pt-BR, but this folder is developer documentation.

## Where to start

| If you want to... | Read |
|---|---|
| Understand the system in ten minutes | [architecture/overview](architecture/overview.md) |
| Follow one request from the browser to the database | [architecture/request-flow](architecture/request-flow.md) |
| Set up the project and ship a feature | [development/](development/README.md) |
| Know why we decided something | [adr/](adr/README.md) |
| Debug production | [operations/runbooks](operations/runbooks.md) |
| See the data model | [diagrams/er-model.svg](diagrams/er-model.svg) |

## Sections

| Section | Covers |
|---|---|
| [architecture/](architecture/overview.md) | Layers, request flow, multi-tenancy, auth, caching, background jobs, status page, security, infrastructure |
| [domains/](domains/README.md) | One page per feature area: issues, cycles, modules, projects, wiki, billing, workspace, account, admin and more |
| [api/](api/README.md) | Response envelope, 111 error codes, the endpoint inventory, how `public/openapi.json` is guarded |
| [development/](development/README.md) | Getting started, conventions, the SDD, TDD, Code feature workflow |
| [testing/](testing/README.md) | The test layers, what each one answers, coverage and mutation testing |
| [operations/](operations/README.md) | Deploy, runbooks, observability, environments, releases |
| [adr/](adr/README.md) | Architecture decision records (0001 to 0008) |
| [postmortems/](postmortems/README.md) | Five incidents, with timelines and what changed |
| [changelog/](changelog/README.md) | Where release notes live |
| [diagrams/](diagrams/README.md) | Every SVG diagram, with an index |

## Keeping it honest

- A decision that changes gets a new ADR that supersedes the old one; do not rewrite history.
- If a page and the code disagree, the code wins and the page is a bug. Fix the page in the same commit as the code.
- The SVGs in `diagrams/` are the versioned source. The generator that produced them is a local tool (`diagrams/_tools/` is git-ignored).
- Items marked `TODO: confirm` are facts the repository cannot settle (production layout, scheduler, Axiom monitor, and similar). Resolve them with the operator and remove the marker.
