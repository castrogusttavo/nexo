# Contributing to Nexo

Thanks for taking the time to contribute! This document covers how to set
up the project locally, the conventions the codebase follows, and how to
submit a change.

## Code of Conduct

This project and everyone participating in it is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to
uphold it.

## Before you start

- For a small fix (typo, obvious bug), feel free to open a pull request
  directly.
- For anything larger (new feature, behavior change, architectural change),
  please open an issue first to discuss the approach. Nexo has an internal
  spec-first workflow (contract → tests → implementation) for its own
  features, and large external contributions go smoother when we agree on
  the contract before code is written.
- Check open issues and pull requests first to avoid duplicate work.

## Development setup

Requirements: [pnpm](https://pnpm.io) and Docker (for local Postgres +
Redis).

```bash
git clone https://github.com/castrogusttavo/nexo.git
cd nexo
pnpm install
cp .env.example .env   # fill in the required values
pnpm docker:create     # first run only — creates & starts infra containers
pnpm dev                # runs infra + migrations, then starts the app
```

Other useful commands:

```bash
pnpm infra              # docker:start + prisma:migrate:dev, no dev server
pnpm check               # biome check --fix (lint + format + organize imports)
pnpm check:ci            # biome check, no writes — what CI runs
pnpm test:unit           # fast, mocked unit tests
pnpm test:integration    # repository/cache tests against real Postgres + Redis
pnpm test:e2e            # route tests against `next start`
pnpm test:all            # everything
pnpm prisma:studio       # browse the database
```

See [`CLAUDE.md`](CLAUDE.md) for the full command reference and a deeper
tour of the architecture (layered request flow, the `Result` type, auth,
background jobs, etc).

## Making a change

1. **Fork** the repository and create your branch from `main`.
2. Write your change, plus tests. Test file location determines which
   Vitest project picks it up — see the "Tests" section in `CLAUDE.md`.
3. Run `pnpm check` and `pnpm tsc --noEmit` locally — the pre-commit hook
   runs both, so it's faster to catch issues before committing.
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/),
   enforced by commitlint. Allowed types: `feat`, `fix`, `docs`, `style`,
   `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

   ```
   feat(sticky-notes): add color presets
   fix(auth): reject expired reset tokens
   ```

5. Push to your fork and open a pull request against `main`.

## Pull request expectations

- Keep PRs focused — one logical change per PR is easier to review than a
  bundle of unrelated fixes.
- Include or update tests for the behavior you're changing. `pnpm check:ci`
  and the test suites run in CI on every push; a red CI blocks merge and
  deploy (see `.github/workflows/ci.yml`).
- Describe **what** changed and **why** in the PR description. Link the
  issue it resolves, if any.
- Be responsive to review feedback — maintainers will do their best to
  review promptly, but this is a small team, so please be patient.

## Code style

- [Biome](https://biomejs.dev) is the linter/formatter — run `pnpm check`
  before pushing. Don't fight the formatter's output.
- Match the existing layered structure for a feature (schema → repository →
  mapper → service → route). See `CLAUDE.md` → "Creating a new feature" for
  the full pattern.
- Code, comments, commit messages, and PR descriptions are English-only.
  User-facing product strings (UI copy, emails) stay in Portuguese (pt-BR).

## Reporting bugs

Open a [GitHub issue](https://github.com/castrogusttavo/nexo/issues/new)
with steps to reproduce, expected vs. actual behavior, and environment
details. For security vulnerabilities, **do not** open a public issue —
follow [SECURITY.md](SECURITY.md) instead.

## License

By contributing, you agree that your contributions will be licensed under
the project's [AGPL-3.0 license](LICENSE).
