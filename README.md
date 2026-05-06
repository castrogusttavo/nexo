<br />
<br />

<p  align="center">
    <a href="https://nexo.coodee.dev" target="_blank" align="center">
      <img
        src="./public/brand/nexo-readme.png"
        alt="Nexo"
        width="50%"
        align="center"
      />
    </a>
</p>
<p align="center"><b>Project management that actually works for your team</b></p>

<p align="center">
    <a href="https://nexo.coodee.dev/"><b>Website</b></a> •
    <a href="https://nexo.coodee.dev/status"><b>Status</b></a> •
    <a href="https://x.com/nexopowers"><b>X</b></a> •
    <a href="https://nexo.coodee.dev/docs"><b>Documentation</b></a>
</p>



Meet [Nexo](https://nexo.coodee.dev/), a project management platform built for teams that want to ship without fighting their tools. Multi-tenant by default, opinionated where it matters, and ready to grow with you.

> Nexo is in active development. The foundation — auth, workspaces, billing, status, and docs — is in place, and project tracking primitives are landing next. Suggestions, ideas, and reported bugs help us immensely.

## Installation

Two ways to run Nexo:

- **Nexo Cloud.** Sign up at [nexo.coodee.dev](https://nexo.coodee.dev) — the fastest path to get started, with no infrastructure to manage.
- **Self-host with Docker.** Bring your own infrastructure. The full stack runs from a single Compose file. See the [self-hosting documentation](https://nexo.coodee.dev/docs).

| Installation method | Documentation                                          |
| ------------------- | ------------------------------------------------------ |
| Docker              | [Docker Compose guide](https://nexo.coodee.dev/docs)   |

## Features

- **Workspaces.** Multi-tenant from day one. Slug-based URLs, role-based access (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), and isolated data per team.
- **Authentication.** Email and password, Google and GitHub OAuth, two-factor auth via OTP, email verification, and password reset.
- **Billing.** Plans (`BASIC`, `PRO`, `ENTERPRISE`) with AbacatePay integration and a webhook-driven subscription lifecycle.
- **Status page.** Built-in `/status` with proactive probes across seven components (app, database, cache, auth, payment, email, storage), incident timelines, post-mortems, and uptime history.
- **Transactional email.** React Email templates for welcome, OTP, password reset, account deletion, data export, invites, trial promotions, and incident post-mortems.
- **API documentation.** OpenAPI reference rendered with Scalar at `/docs`.

## Roadmap

Project management primitives are next on deck:

- **Work items** — rich-text issues with sub-tasks, links, and file uploads.
- **Cycles** — time-boxed sprints with burn-down charts.
- **Modules** — break large initiatives into manageable units.
- **Views** — saved filters and shared queries.
- **Pages** — collaborative documents with rich editing.
- **Analytics** — real-time insights across projects.

## Stack

- **Backend** — Next.js 16 (App Router), PostgreSQL, Prisma 7, Redis, RabbitMQ, MinIO, Better Auth, Resend.
- **Frontend** — React 19, Tailwind CSS 4, Base UI, TanStack Query, React Email, Hugeicons.
- **Quality** — Vitest, Biome, Commitlint, Husky.
- **Observability** — Axiom, Vercel Analytics and Speed Insights.

## Screenshots

<!--
  Drop product screenshots in the slots below — one per feature or flow.
  Suggested folder: ./public/brand/screens/<name>.png
-->

<p>
    <a href="https://nexo.coodee.dev" target="_blank">
      <!-- <img src="./public/brand/screens/workspaces.png" alt="Workspaces" width="100%" /> -->
    </a>
</p>

<p>
    <a href="https://nexo.coodee.dev" target="_blank">
      <!-- <img src="./public/brand/screens/auth.png" alt="Authentication" width="100%" /> -->
    </a>
</p>

<p>
    <a href="https://nexo.coodee.dev" target="_blank">
      <!-- <img src="./public/brand/screens/billing.png" alt="Billing" width="100%" /> -->
    </a>
</p>

<p>
    <a href="https://nexo.coodee.dev" target="_blank">
      <!-- <img src="./public/brand/screens/status.png" alt="Status page" width="100%" /> -->
    </a>
</p>

<p>
    <a href="https://nexo.coodee.dev" target="_blank">
      <!-- <img src="./public/brand/screens/docs.png" alt="API docs" width="100%" /> -->
    </a>
</p>

## Local development

Spin up the infrastructure (Postgres, Redis, RabbitMQ, MinIO) with Docker Compose, then run the dev server:

```bash
pnpm install
pnpm docker:create        # first run only — creates and starts containers
pnpm prisma:migrate:dev   # apply migrations
pnpm dev
```

For subsequent runs, `pnpm infra` starts the containers and applies pending migrations in one step. See `docker-compose.infra.yml` and the `scripts` block in `package.json` for the full picture.

## Documentation

API reference and product documentation live at [nexo.coodee.dev/docs](https://nexo.coodee.dev/docs).

## Security

If you discover a security vulnerability, please report it responsibly instead of opening a public issue. Email **security@nexo.coodee.dev** with a description and reproduction steps. We take all legitimate reports seriously and investigate them promptly.

## License

Proprietary. All rights reserved.
