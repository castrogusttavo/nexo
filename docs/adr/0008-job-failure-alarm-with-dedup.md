# 0008. Loud, deduplicated alarm when a background job dies

- Status: Accepted
- Date: 2026-09-21
- Commits: `8be505aa` (raise an alarm when a background job gives up), `807fa5e8` (name stalled deaths and alarm once per death), both 2026-09-21; `f40974bc` (Slack alerts, 2026-09-22)

## Context

A BullMQ job that exhausts its three attempts lands in the `failed` set and nothing tells anyone. That is how account deletion stayed broken for its whole life: every `delete-account` job threw a foreign-key violation, retried, died, and a queue that always fails looked the same as one that never runs (comment in `src/lib/queue/failure-alarm.ts`).

The first version assumed a job that runs out of stall retries reaches `failed` without the Worker noticing. BullMQ 5.79 behaves differently (the stall check parks a deferred failure and requeues; the next worker fails it with an `UnrecoverableError`), so those deaths alarmed, but labelled `unrecoverable`, pointing readers at the wrong problem.

## Decision

- The worker logs one `queue.job.exhausted` error per job death, only when BullMQ gives up; retries that will still happen stay quiet. It also fires for `UnrecoverableError`. A stall that will still be retried only logs `queue.job.stalled` as a warning; a stall-limit death carries `reason: 'stalled'`.
- Event name and fields are a stable contract: an Axiom monitor keys on them, so renaming silently disables the alarm and the monitor must change in the same commit.
- The payload goes through an allowlist (`userId`, `workspaceId`), not a denylist, so a new key in a job's data never leaks into the logs by default.
- A `QueueEvents` listener per queue backs up the Worker, and a bounded ledger (1000 entries, keyed by queue, job id and `finishedOn`) makes a death seen by both paths alarm exactly once, while a job retried by hand that dies again still alarms.
- Shutdown closes workers, then listeners, then queues and the connection, and flushes the logger last.
- The same exhausted event also posts to Slack through the shared dedup ledger (`failure-alarm.ts`, `src/lib/alerts/slack.ts`; per `CLAUDE.md`; introduced with `f40974bc`). Sends are bounded by a 3 second timeout and never throw.

## Consequences

- A permanently failing queue is visible the first time it dies.
- The event schema is frozen; changing it is a coordinated change with the monitor.
- The ledger is a bounded in-memory `Map` (`DeathLedger` in `failure-alarm.ts`, capacity 1000): it is not persisted, so after a worker restart a death still sitting in the `failed` set and reported again by the `QueueEvents` backstop could alarm a second time.
- An integration test against real Redis covers both `maxStalledCount` cases (one stalled alarm, or a requeue with only a warning).

## Alternatives considered

- Only the Worker `failed` event: the first iteration (`8be505aa`), which recorded a known gap and was extended in `807fa5e8`.
- Alarm on every failed attempt (inferred): rejected implicitly, since retries that will still happen are kept quiet.
- Denylist for payload fields (inferred): replaced by an allowlist by design.

Related: [background-jobs](../architecture/background-jobs.md), [status-page](../architecture/status-page.md).
