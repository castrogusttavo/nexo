# Operations

## Purpose

How Nexo is deployed, watched and repaired. These pages describe what the workflows, compose files and code do; they do not replace access to the server, which goes through the `server-ops` workflow. Architecture context lives in [infrastructure](../architecture/infrastructure.md); incidents that shaped these rules are in [postmortems](../postmortems/README.md).

## Pages

| Page | Covers |
| --- | --- |
| [deploy.md](./deploy.md) | `cd.yml`: migrate, build, Trivy, rolling restart, health gate, release, what rollback means here |
| [runbooks.md](./runbooks.md) | Symptom, check, action: dead job alarm, status incident, queue backlog, halted rollout, red CI, secrets, infra |
| [observability.md](./observability.md) | Axiom logs and traces, audit events, Sentry, Slack, event names that are contracts |
| [environments.md](./environments.md) | Local, CI and production; variable names only |
| [release-and-versioning.md](./release-and-versioning.md) | CalVer tags, automatic releases |

## Shape of the system, in one paragraph

A push to `main` runs CI; on green, CD migrates the database, builds and scans one image, and replaces seven app instances one at a time behind nginx, plus a BullMQ worker and a realtime server from the same image. Logs, audit lines and traces go to Axiom, crashes to Sentry, status transitions and dead jobs to Slack, and probe history to the public `/status` page.

## Entry points when something is wrong

1. Slack message or `/status` incident: [runbooks.md](./runbooks.md).
2. A deploy failed: Slack "Deploy failed", then [deploy.md](./deploy.md).
3. Need to see what a user or job did: [observability.md](./observability.md).

## Gotchas

- Production access is workflow-only. There are no SSH procedures here, and nothing in this folder should be taken as permission to run commands on the host outside `server-ops`.
- Several things live outside the repository (backup script and cron, nginx server blocks, the collector's scheduler, the Axiom monitor); pages mark them `TODO: confirm`.

## Related files

- `.github/workflows/{ci,cd,server-ops}.yml`
- `infra/`, `Dockerfile`
- `worker/index.ts`, `src/services/status/`
