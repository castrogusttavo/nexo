# Development

How to get the project running, the conventions the code follows, and the order in which a feature is built. The testing layers have their own section: [../testing/README.md](../testing/README.md).

| Page | Read it to... |
| --- | --- |
| [getting-started](./getting-started.md) | Install, start the infrastructure, run the dev server, understand env validation |
| [conventions](./conventions.md) | Path alias, naming, folders, route colocation, Biome, commits, hooks |
| [feature-workflow](./feature-workflow.md) | Build a vertical slice in the SDD, TDD, Code order, with a worked example |

## The short version

```bash
pnpm install
pnpm docker:create     # first time only
pnpm dev               # starts infra, applies migrations, runs next dev
pnpm check             # lint + format + organize imports
pnpm test:unit         # the fast test loop
```

Work is committed directly to `main` and gated by CI ([ADR 0001](../adr/0001-trunk-based-development.md)). Locally, a pre-commit hook and a commit-msg hook catch problems before code leaves the machine.

## Related files

- `package.json` (the `scripts` block is the command reference)
- `CONTRIBUTING.md`, `CLAUDE.md`
- [Architecture overview](../architecture/overview.md)
