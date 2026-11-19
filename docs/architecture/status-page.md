# Status page

## Purpose

`/status` is a public page that tells the truth about Nexo's infrastructure. It is backed by **proactive probes** that run once a minute, persisted history, automatically managed incidents and Slack alerts for the owner. Pages: `app/(web)/status/page.tsx`, `history/page.tsx`, `incident/[id]/page.tsx`. Public API: `app/api/status/route.ts` (snapshot) and `app/api/status/history/route.ts`. Both are in `PUBLIC_ROUTES` in `proxy.ts`.

## How it works

### Components and tiers

`src/services/status/components.ts` defines eight components in two tiers:

| Tier | Components |
| --- | --- |
| `core` | `app`, `database`, `cache` (Redis), `auth` |
| `peripheral` | `payment` (AbacatePay), `email` (Resend), `jobs` (BullMQ worker), `storage` (Silo) |

Note: older docs mention seven components. `jobs` was added later and is in code.

### Probes

`src/services/status/probes.ts` has one probe per component, each with its own budget (`SPECS`: `slowAboveMs` and `timeoutMs`):

- `app`: `GET {NEXT_PUBLIC_URL}/api/health` through DNS, nginx and TLS, not just "the process runs". `/api/health` itself runs `SELECT 1` (`app/api/health/route.ts`).
- `database`: `SELECT 1`. `cache`: Redis `PING`. `auth`: `auth.api.getSession` with empty headers.
- `email`: `GET https://api.resend.com/domains`. `payment`: `GET https://api.abacatepay.com/v2/customer/list?limit=1`. For both, HTTP 401/403 is an outage: the question is whether we can **use** the provider, not whether it is up (a rejected payment key once broke checkout while the page stayed green).
- `storage`: S3 `ListBuckets` with our credentials, not the server's health endpoint, which answers 200 to anyone.
- `jobs`: for each queue, `getWorkers()` must be non-empty (else outage: "no worker connected") and waiting jobs must be at most 25 (else `DEGRADED` with a reason). Delayed jobs, such as account deletions 30 days out, do not count.

Each probe is raced against its timeout. A failure is retried once after 250 ms before it becomes `MAJOR_OUTAGE`, and the error reported is the first one.

### Collection

`StatusService.collect(tier)` (`src/services/status/status.service.ts`) is called by two authenticated routes, `POST /api/status/collect/core` and `POST /api/status/collect/peripheral` (shared handler `app/api/status/collect/_handler.ts`). They require the `x-status-secret` header to match `STATUS_COLLECTOR_SECRET`, compared in constant time. The scheduler that calls them once a minute is outside this repository (TODO: confirm: the code and `worker/status-collect.ts` refer to "production's cron" with a 60 s interval). For one run:

1. Probe the tier's components in parallel.
2. Read the last 3 hours of `health_checks` for alert history.
3. **Smooth slowness**: a slow-but-successful sample is only recorded `DEGRADED` after 3 consecutive slow samples (`SLOW_SAMPLES_TO_DEGRADE`), judged on recorded latencies. Failures and probes that answered with an explicit problem are recorded on the first sample.
4. Write `HealthCheck` rows, then upsert the day's `ComponentDaily` aggregate (uptime %, worst status, average latency; UTC days).
5. Move incidents (below) and decide alerts.
6. Prune raw checks older than 7 days (`RAW_RETENTION_DAYS`); daily rows power a 90-day history.
7. Invalidate the snapshot cache.

Locally, `pnpm status:collect` runs one collection and prints a table; `pnpm status:watch` repeats it every 60 s (`worker/status-collect.ts`, `src/services/status/collect-report.ts`). It writes to the local DB and posts to Slack if `SLACK_ALERTS_WEBHOOK_URL` is set.

### Incidents

`evaluateIncidentFor` keeps at most one open `Incident` per component. The first non-operational sample opens it with an `INVESTIGATING` update; a worse severity bumps it and adds `IDENTIFIED`; an `OPERATIONAL` sample closes it with a resolved message. The incident records its peak severity. Models: `HealthCheck`, `ComponentDaily`, `Incident`, `IncidentUpdate` in `prisma/schema.prisma`.

### Overall status

`computeOverallStatus`: a core component at `MAJOR_OUTAGE` makes the whole system `MAJOR_OUTAGE`; a core component degraded or worse makes it `PARTIAL_OUTAGE`; only a degraded peripheral makes it `DEGRADED`. A peripheral outage never shows a core-level headline.

### Reading

`StatusService.getCurrentSnapshot()` reads the Redis key `status:snapshot:v1` (TTL 30 s, `src/cache/status.cache.ts`), builds it from the database on a miss, and falls back to the database if Redis is down. The route answers with `maxAge: 30, staleWhileRevalidate: 60` and an IP rate limit (`apiLimiter`).

## Slack alerts

`src/services/status/status-alerts.ts`, delivered by `sendSlackAlert` in `src/lib/alerts/slack.ts` (optional `SLACK_ALERTS_WEBHOOK_URL`; unset means logged no-op; 3 s timeout; never throws; the URL is never logged).

- **Transitions**: the first 3 state changes of a component inside a 30-minute window are announced.
- **Flap suppression**: the 4th change in the window posts one "unstable" message and the component goes quiet. After 15 minutes in a single state, one "stabilized" message resumes alerting. One flapping episode costs at most five messages. The decision is a pure replay of `health_checks` (`decideComponentAlert`), so it survives restarts and needs no Redis key (Redis is itself a component).
- **Reminders**: a held outage posts nothing by itself, so one reminder goes out every 6 h while the incident is open (`OUTAGE_REMINDER_INTERVAL_MS`). Without it App and Storage once sat at 0% for 17 days after a single alert.
- **Collect failure**: if checks cannot be written (database down), no incident can open, so `alertCollectFailed` / `alertCollectRecovered` post once on each edge. That state is per process.

Dead background jobs alert through the same Slack channel; see [background-jobs.md](./background-jobs.md). In production the webhook variable is appended to the server `.env` by `cd.yml` from the CI secret `SLACK_WEBHOOK_URL`, not from sops.

## Key decisions and why

- **Per-component budgets.** One threshold for everything made e-mail show 50-73% uptime while Resend answered correctly (cold TLS from São Paulo). Budgets and the 3-sample smoothing exist because the collector shares a machine with CI and the nightly backup.
- **Probe usability, not liveness**, for third parties and storage.
- **Retry once before declaring an outage**, so one lost packet does not declare `MAJOR_OUTAGE`.
- **History in Postgres, not a vendor.** The page's job is to describe our own infrastructure honestly (see the comment in `components.ts`).

## Gotchas

- The collector authenticates with a shared secret header, not a session. In CI it is set to a fixed test value (`ci.yml`); never document or commit the production value.
- Component display names are pt-BR product strings; keep them in Portuguese.
- `getCurrentSnapshot` can serve up to 30 s stale by design.

## Related files

- `src/services/status/`: `components.ts`, `probes.ts`, `status.service.ts`, `status-alerts.ts`, `status-map.ts`, `collect-report.ts`
- `src/repositories/status.repository.ts`, `src/cache/status.cache.ts`
- `app/api/status/` (snapshot, history, `collect/core`, `collect/peripheral`), `app/api/health/route.ts`
- `app/(web)/status/`
- `worker/status-collect.ts`
- `src/lib/alerts/slack.ts`
- `prisma/schema.prisma` (`HealthCheck`, `ComponentDaily`, `Incident`, `IncidentUpdate`)
