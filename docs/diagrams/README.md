# Diagrams

One SVG per topic, in a single visual style (colour by role, dashed orthogonal arrows,
numbered pill labels on flows). The SVGs are the versioned source. They were produced by
a local Python generator that is kept out of the repository (`docs/diagrams/_tools/` is
git-ignored), so to change a diagram edit the SVG by hand or regenerate it from a local
copy of the generator.

| Diagram | What it shows |
| --- | --- |
| [request-flow.svg](request-flow.svg) | The path of a request from the edge through `proxy.ts`, route handler, service and repository. |
| [private-access.svg](private-access.svg) | How private pages are guarded: proxy checks, then the data access layer. |
| [background-jobs.svg](background-jobs.svg) | The BullMQ queues, the worker process and the failure alarm. |
| [er-model.svg](er-model.svg) | The main entities of the Prisma schema and how they relate. |
| [deploy-pipeline.svg](deploy-pipeline.svg) | CI on `main`, then CD, image scan and rollout. |
| [auth-flow.svg](auth-flow.svg) | Sign-in with password, OAuth and e-mail OTP, two-factor, the session cookies, the signed cookie cache and the consent redirect. |
| [status-collection.svg](status-collection.svg) | Probes over eight components, `HealthCheck` / `ComponentDaily`, incidents, flap suppression and Slack. |
| [account-deletion.svg](account-deletion.svg) | Scheduled account deletion, the cancel path, hard delete, and the separate data export job. |
| [deployment-topology.svg](deployment-topology.svg) | Cloudflare, nginx, seven app instances, worker, realtime, Postgres, Redis, Silo, third parties and the deploy path. |
| [issue-lifecycle.svg](issue-lifecycle.svg) | Issue creation and update, the activity log, and what an issue points to (state, cycle, module, assignees, subscribers). |
| [test-layers-map.svg](test-layers-map.svg) | The test layers and the question each one answers. |
| [ci-test-jobs-map.svg](ci-test-jobs-map.svg) | Which CI job runs which tests, and what feeds the gate and Codecov. |
| [sdd-tdd-code-flow.svg](sdd-tdd-code-flow.svg) | The SDD, TDD, Code order of building a feature. |
| [billing-checkout-webhook.svg](billing-checkout-webhook.svg) | Checkout, the payment webhook and what it changes on the subscription. |
| [invitation-lifecycle.svg](invitation-lifecycle.svg) | Creating, accepting, expiring and revoking a workspace invitation. |
| [issue-write-path.svg](issue-write-path.svg) | The write path of an issue through route, service, repository, cache and activity. |
| [project-access-matrix.svg](project-access-matrix.svg) | Who may do what inside a project, by role. |
| [project-bootstrap.svg](project-bootstrap.svg) | What is created when a project is created. |
| [release-flow.svg](release-flow.svg) | How `cd.yml` migrates, deploys and cuts the release tag. |
| [rollback-options.svg](rollback-options.svg) | What rolling back actually means in this setup. |
| [incident-triage.svg](incident-triage.svg) | From symptom to the first check, as in the runbooks. |
| [observability-map.svg](observability-map.svg) | Where logs, audit events, traces and alerts go. |
| [incident-timeline-overview.svg](incident-timeline-overview.svg) | The five postmortem incidents on one axis (not to scale). |
| [csp-proxy-timeline.svg](csp-proxy-timeline.svg) | The missing `proxy.ts` and the CSP that blocked hydration. |
| [delete-account-failure.svg](delete-account-failure.svg) | Why `delete-account` failed silently on a foreign key. |
| [minio-to-silo-migration.svg](minio-to-silo-migration.svg) | The MinIO image withdrawal and the move to Silo. |
| [xff-resolution.svg](xff-resolution.svg) | How `X-Forwarded-For` ended up in one shared sign-in bucket. |
| [str61-leak-and-fix.svg](str61-leak-and-fix.svg) | The consent leak in the RSC payload and the DAL fix. |


Items marked "to confirm" inside a diagram are things the repository does not
settle on its own (for example, whether production points the app at the read
replica or PgBouncer).
