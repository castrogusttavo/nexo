# Security Policy

Nexo is a multi-tenant project management platform. We take the security of
the software, the infrastructure it runs on, and the data our users trust us
with seriously.

## Supported Versions

Nexo is deployed continuously from `main` (trunk-based development — see
[CONTRIBUTING.md](CONTRIBUTING.md)). There are no long-lived release
branches: the version currently running in production is always the one that
matters, and it is always the latest successful build of `main`. Security
fixes are shipped as soon as they land, not backported to older tags.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub
issues, discussions, or pull requests.**

Instead, report them through one of these private channels:

1. **GitHub Security Advisories (preferred)** — use the
   ["Report a vulnerability"](https://github.com/castrogusttavo/nexo/security/advisories/new)
   button under this repository's Security tab. This creates a private
   advisory thread with maintainers and lets us coordinate a fix before
   disclosure.
2. **Email** — send details to **security@nexopm.com** with the subject
   line `[SECURITY] <short summary>`.

Please include as much of the following as you can:

- A description of the vulnerability and its potential impact
- Steps to reproduce (a minimal repro is ideal)
- Affected component (e.g. `app/api/*`, auth flow, worker, realtime service)
- Any proof-of-concept code, request/response samples, or screenshots

### What to expect

- **Acknowledgment** within 3 business days.
- **Triage and severity assessment** within 7 business days, with an initial
  response on whether the report is accepted, needs more information, or is
  out of scope.
- We will keep you updated as we investigate and work on a fix, and will
  credit you in the advisory (unless you prefer to remain anonymous) once
  the issue is resolved and disclosed.

We ask that you give us a reasonable amount of time to investigate and patch
a vulnerability before any public disclosure, and that you avoid accessing,
modifying, or exfiltrating other users' data while investigating — Nexo is
multi-tenant, so testing against a workspace you don't own is out of scope
unless explicitly authorized.

## Scope

In scope:

- The Next.js application (`app/`, `src/`) and its API routes
- The authentication and authorization layer (Better Auth, session handling,
  rate limiting)
- The background worker and realtime collaboration service
- Infrastructure-as-code and CI/CD pipelines in this repository

Out of scope:

- Third-party services we depend on but don't control (report those to the
  vendor directly)
- Denial-of-service or volumetric attacks against shared infrastructure
- Social engineering against maintainers, staff, or users
- Findings that require physical access to a user's device

## Data Protection

Nexo handles personal data subject to Brazil's LGPD (Lei Geral de Proteção
de Dados). If your report involves exposure of personal data, please flag
that explicitly so it can be prioritized and handled under our data-breach
process.
