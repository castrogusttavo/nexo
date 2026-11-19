# 0001. Trunk-based development with the CI gate as the safety net

- Status: Accepted
- Date: 2026-03-06
- Commits: `5a10ff01` (restructure CI/CD for trunk-based workflow, 2026-03-06; repeated as `f4d781c0`, `552dae8f` through 2026-03-07), `697da691` (retire workflows with no job left, 2026-09-26)

## Context

The project is built by a very small team. A `develop` branch plus per-feature or per-version pull requests adds a review window nobody is there to use, and a second long-lived branch to keep in sync. At the same time, a direct push to the trunk is only acceptable if something other than a reviewer stops a broken build from reaching production.

## Decision

`main` is the trunk and the only working branch; commits go straight to it. The CI gate replaces the PR review window:

- `ci.yml` runs on `push: [main]`. A single `gate` job waits for `lint` (Biome and `tsc`), `contract-tests`, `e2e-tests` (the browser and visual suites, as a matrix), `coverage-tests` (unit and integration), `component-tests`, `redis-tls-smoke`, `semgrep` and `gitleaks`. `audit` and `snyk` run as advisory jobs outside the gate.
- `cd.yml` deploys only through `workflow_run` of a successful CI run on `main`, so a red CI never reaches production.
- Locally, the pre-commit hook (`pnpm check && pnpm tsc --noEmit`) and `commit-msg` (commitlint) fail fast.
- Commits are small, thematic Conventional Commits. `git push --force` to `main` is never used; release tags are immutable.
- PRs are reserved for external contributors. Dependency bumps are done by hand from the security scans; Dependabot is deliberately off.

The restructuring commit split CI into parallel jobs, removed the redundant tests from CD (build and deploy only) and removed the `develop` branch from the triggers.

## Consequences

- No `dev` branch to resync; integration happens in small steps.
- The test and scan suites carry the weight a reviewer would. A gap in CI is a gap in the safety net, so CI changes deserve the same care as production code.
- Production is only as good as the last green run: CD must keep depending on CI success.
- Because commits land on `main` directly, history hygiene (granular commits, no force push) is enforced by convention and hooks, not by branch protection review.

## Alternatives considered

- Gitflow with a `develop` branch and release PRs: removed by `5a10ff01` ("Remove develop branch from triggers"). Why it was rejected is not stated in the commit; the reasoning above comes from the project instructions in `CLAUDE.md`.
- Short-lived feature branches with mandatory PRs (inferred): kept only for external contributors.

Related: [infrastructure](../architecture/infrastructure.md), [security](../architecture/security.md).
