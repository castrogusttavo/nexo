# Diagrams

Generated SVGs, one per topic. Each one is produced by a script in
[`_tools/`](_tools/README.md) (Python 3 standard library only); edit the script and
regenerate, never the SVG.

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

Items marked "to confirm" inside a diagram are things the repository does not
settle on its own (for example, whether production points the app at the read
replica or PgBouncer).

## Regenerate

From the repository root:

```bash
# one diagram
python3 docs/diagrams/_tools/auth-flow.py

# all of them
for f in docs/diagrams/_tools/*.py; do
  [ "$(basename "$f")" = lib.py ] || python3 "$f"
done
```

Preview a diagram as a PNG (keep the PNG out of the repo):

```bash
rsvg-convert -w 1600 docs/diagrams/auth-flow.svg -o /tmp/auth-flow.png
```

To add a new diagram, create `_tools/<name>.py` that uses `lib.py`, add it to the
two lists above and to the table.
