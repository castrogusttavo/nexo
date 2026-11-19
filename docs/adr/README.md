# Architecture Decision Records

An ADR records one significant decision: the context that forced it, what was decided, and what it costs. It exists so that someone who finds the code a year later can tell a deliberate trade-off from an accident. ADRs are append-only: when a decision changes, write a new ADR and mark the old one `Superseded`.

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-trunk-based-development.md) | Trunk-based development with the CI gate as the safety net | Accepted | 2026-03-06 |
| [0002](0002-result-instead-of-throw.md) | `Result` instead of thrown errors across layers | Accepted | 2026-02-21 |
| [0003](0003-dal-instead-of-layout-gates.md) | Data access layer instead of layout gates | Accepted | 2026-10-17 |
| [0004](0004-no-use-cache-for-runtime-data.md) | No `'use cache'` for data that changes at runtime | Accepted | 2026-10-17 |
| [0005](0005-better-auth.md) | Better Auth for authentication | Accepted | 2026-02-24 |
| [0006](0006-standalone-output-and-browser-tests.md) | Standalone output, tested as built in a real browser | Accepted | 2026-09-20 |
| [0007](0007-silo-storage.md) | Silo as the S3-compatible object store | Accepted | 2026-09-24 |
| [0008](0008-job-failure-alarm-with-dedup.md) | Loud, deduplicated alarm when a background job dies | Accepted | 2026-09-21 |

## When to write an ADR

Write one when a decision:

- is hard or costly to reverse (storage, auth provider, rendering model, error model);
- constrains how future code is written (a rule a reviewer would enforce);
- was reached after a real incident or a rejected alternative, so the reasoning would otherwise be lost.

Do not write one for a library bump, a refactor with no trade-off, or anything the code makes obvious.

## Status values

- **Proposed**: under discussion, not yet in effect.
- **Accepted**: in effect.
- **Superseded**: replaced by a later ADR. Keep the file, change the status to `Superseded by ADR-NNNN`, and link forward.

## Template

Copy to `NNNN-short-slug.md` (next free number, kebab-case slug).

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by [ADR-NNNN](NNNN-slug.md)
- Date: YYYY-MM-DD (the commit that introduced the decision)
- Commits: `abc1234`

## Context

The forces at play: the problem, the incident, the constraints.

## Decision

What we do, in the active voice.

## Consequences

What gets easier, what gets harder, what must now be maintained.

## Alternatives considered

Each option and why it was not chosen. Label options "inferred" when the
history does not show they were actually weighed.
```
