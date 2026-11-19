# Security

## Purpose

This page describes the security controls that exist in the repository: the request gate and headers (`proxy.ts`, `next.config.ts`), the authorization layers, rate limiting, client IP resolution, audit logging, secrets handling and the security checks in CI. It describes what the code does; it is not a threat model.

## How it works

### Layered authorization

No single check is trusted alone:

1. **`proxy.ts`** (the edge entry point, not `middleware.ts`) is an optimistic gate with no database access. Paths in `PUBLIC_ROUTES` pass. Otherwise the `better-auth.session_token` (or `__Secure-` variant) cookie must exist: `/api/*` answers a `401` JSON envelope, pages redirect to `/sign-in?redirect=...`. For page GETs outside `/api` and `/onboarding`, it reads Better Auth's signed cookie cache (`src/lib/auth-cookie.ts`) and sends a user who has not accepted the terms to `/onboarding/consent-setup`. Server actions (`next-action` header) and non-GET requests are skipped, because they cannot follow a redirect.
2. **The Data Access Layer** (`src/lib/dal.ts`) is the rendering gate. `getCurrentUser`, `requireConsentedUser` and `requireMembership` are `use cache: private` and redirect or 404 themselves. Layout redirects are not a security boundary: layouts of one path render in parallel and their children still reach the RSC payload (a leak fixed under STR-61). `app/(private)/__tests__/access.e2e.test.ts` checks every workspace page as anonymous, stranger and unconsented member; new private pages must be added to it.
3. **API routes** resolve the session with `getAuthSession()` (`src/lib/auth-session.ts`), enforce consent (`requireConsent` in `src/lib/consent.ts`, which audits blocked attempts) and consume a rate limiter.
4. **Services own authorization** (ownership and role checks), not routes.

Both optimistic checks in `proxy.ts` are deliberately weaker than the DAL and the API routes. The cookie cache lasts 5 minutes (`session.cookieCache.maxAge` in `src/lib/auth.ts`), so revoking a session or consent can take up to 5 minutes to reach a tab that holds the app shell; the server and API see it at once.

### Authentication

Better Auth (`src/lib/auth.ts`): Prisma adapter, cuid2 ids, e-mail and password with required verification, Google and GitHub OAuth, e-mail OTP and two-factor plugins. Passwords use argon2id with the OWASP preset (`src/lib/argon2-config.ts`: 19 MiB, t=2, p=1); verification is capped by a concurrency gate (`src/lib/auth-concurrency-gate.ts`, env `AUTH_VERIFY_CONCURRENCY`, `AUTH_VERIFY_QUEUE_DEPTH`, `AUTH_VERIFY_QUEUE_WAIT_MS`) that answers `429` with `Retry-After` when the server is overloaded. OAuth tokens are stored encrypted (`encryptOAuthTokens`) using versioned keys from `BETTER_AUTH_SECRETS`, with `BETTER_AUTH_SECRET` as legacy fallback. Platform admin surfaces require a confirmed second factor (`src/lib/admin-access.ts`), e-mail OTP is refused for admins with TOTP and the trusted-device cookie is dropped for admins (`src/lib/auth-email-otp-guard.ts`, `src/lib/auth-trusted-device.ts`).

### Response headers

- **Dynamic responses**: `proxy.ts` adds `Content-Security-Policy` and `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`) to every non-static response (`withSecurityHeaders`).
- **All paths**: `next.config.ts` adds `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation, browsing-topics off), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`. `poweredByHeader` is off.
- **Static assets** (`/_next/static`, icons, images, fonts) get a stricter CSP (`default-src 'none'`) from `next.config.ts`; the proxy matcher excludes them.

### The CSP and its trade-offs

`buildCspHeader()` in `proxy.ts`: `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`. `connect-src` lists exactly the allowed third parties: Axiom, jsDelivr (Scalar API reference), the realtime server (`NEXT_PUBLIC_REALTIME_URL`) and Sentry's ingest origin derived from the DSN when one is set. `frame-src` allows Figma, Loom, YouTube and Google Docs embeds. PostHog is reached through the same-origin `/ingest` rewrite (`next.config.ts`), so it needs no CSP entry.

Two deliberate trade-offs, each justified in comments in `proxy.ts`:

- `style-src 'unsafe-inline'`: UI primitives position themselves with inline `style=""`, which CSP cannot nonce.
- `script-src 'self' 'unsafe-inline'` (no nonce, no `strict-dynamic`): with `cacheComponents` the shell is prerendered at build time, so scripts cannot carry a per-request nonce, and a nonce or `strict-dynamic` blocks the shell so the app never hydrates. It still refuses other origins and refuses `eval` in production (`'unsafe-eval'` only in development). Revisit if `cacheComponents` is ever turned off.

Note: older documentation (including `CLAUDE.md`) describes a per-request `x-nonce` header. `proxy.ts` does not set one today; the code is the reference. This is also why the browser suite runs without `bypassCSP` against the standalone build: see [ADR 0006](../adr/0006-standalone-output-and-browser-tests.md).

### Rate limiting

Two layers.

- **App, Redis-backed** (`src/lib/rate-limit.ts`, `rate-limiter-flexible`): `auth` (10 per 15 min, 30 min block), `otp` (5 per 15 min), `email` (5 per hour), `api` (100 per minute), `export` (1 per day), `upload` (10 per minute). Auth and OTP have an in-memory insurance limiter. `consume()` fails open (logs `rate_limit_store_error`) if Redis is down, so a Redis outage does not lock users out. A violation logs `rate_limit_violation` and returns `RATE_LIMITED` with `Retry-After` (`handleError`). Routes use `withRateLimit` (`src/lib/rate-limit-helpers.ts`); the auth catch-all is `app/api/auth/[...all]/route.ts`.
- **Better Auth's own limiter** is enabled only when `NODE_ENV` is production, off when `DISABLE_AUTH_RATE_LIMIT=true` (e2e runs `next start` in production mode). Its counters live in Redis (`betterAuthRateLimitStorage`) so every instance shares one bucket.
- **nginx** `limit_req` zones (`global_lt`, `api_lt`, `auth_lt`, `upload_lt`) in `infra/nginx/nexo-ratelimit.conf`; a secret header bypasses them for load tests (token never committed; the repo holds a placeholder). See [infrastructure.md](./infrastructure.md).

### Client IP resolution

`src/lib/client-ip.ts` walks `X-Forwarded-For` from the right to the first hop not in `TRUSTED_PROXIES` (default `127.0.0.1,::1`, set in `lib/env/_server.ts`), using the same resolver as Better Auth (`advanced.ipAddress` in `src/lib/auth.ts`). The leftmost entry is client-controlled and nginx derives `X-Real-IP` from it, so neither is read. `clientIpBucket` keys IPv6 by its `/64` for rate limits; `clientIp` keeps the full address for records such as consent. Without `trustedProxies`, Better Auth drops multi-entry headers into one shared sign-in bucket (a production bug).

### Audit and logging

`lib/axiom/audit.ts` exposes typed `auditMutation`, `auditAuth` and `auditAccess` helpers that log structured events (`category: 'audit'`) to Axiom. Services call them for mutations and LGPD-sensitive events (consent, export, deletion, sign-in, 2FA). `lib/axiom/server.ts` wraps route handlers (`withAxiom`) and deliberately does not flush per request: a flush per request once exhausted the heap in production. Slack alert text is sanitized (`sanitizeAlertText` in `src/lib/alerts/slack.ts`); job-failure logs only carry allowlisted ids.

### Legal and consent

`lib/legal/versions.ts` holds `TERMS_VERSION`, `PRIVACY_VERSION` and `COOKIES_VERSION` (dates). The accepted version is stored with each consent event, so a change to a legal document must bump its constant in the same commit.

### Secrets

Production secrets are in `secrets/production.enc.env`, encrypted with sops (`.sops.yaml`) and decrypted by `cd.yml` into the server `.env`; the age key is a GitHub secret. Env vars are validated with Zod in `lib/env/` and read through the typed exports, never `process.env` directly. Never print or diff decrypted values; verify edits by variable names only. The Sentry auth token and HugeIcons token enter the image build as BuildKit secrets so they do not persist in layers (`Dockerfile`).

### Security checks in CI

`.github/workflows/ci.yml`: Semgrep SAST, gitleaks, `pnpm audit`, Snyk, an LPA2v triage job and a Redis TLS smoke test. Semgrep, gitleaks and the Redis smoke test are in the `gate` job's `needs`; audit, Snyk and the LPA2v triage are kept out of the gate on purpose (comments in `ci.yml`: flaky third-party scans must not block deploys). `cd.yml` scans the built image with Trivy and blocks the deploy on CRITICAL findings (unfixed ones ignored). `security-dast.yml` runs an OWASP ZAP baseline scan weekly (rules in `.zap/rules.tsv`). Dependabot is intentionally off; bumps are manual.

## Key decisions and why

- **Defense in depth, DAL as the real gate**, because the edge check cannot see the database and layouts cannot block children.
- **Fail open on limiter store errors**, since availability of the app should not depend on Redis alone.
- **Trade CSP strictness for hydration** with the trade-off documented in code, rather than silently weakening it.
- **Admins get stricter 2FA rules** than ordinary users because of the data they can read.

## Gotchas

- Adding a public path means editing `PUBLIC_ROUTES` in `proxy.ts` and the OpenAPI spec; the contract suite parses `PUBLIC_ROUTES`.
- `proxy.ts` is the file name; a `middleware.ts` would not be picked up the same way.
- When Cloudflare or another proxy sits in front, the client IP is restored in nginx, not by listing ranges in `TRUSTED_PROXIES`.
- The consent redirect only fires for page GETs; API routes enforce consent themselves.

## Related files

- `proxy.ts`, `next.config.ts`
- `src/lib/dal.ts`, `src/lib/auth.ts`, `src/lib/auth-session.ts`, `src/lib/auth-cookie.ts`, `src/lib/consent.ts`, `src/lib/admin-access.ts`
- `src/lib/rate-limit.ts`, `src/lib/rate-limit-helpers.ts`, `src/lib/client-ip.ts`
- `lib/axiom/audit.ts`, `lib/axiom/server.ts`, `lib/legal/versions.ts`, `lib/env/_server.ts`
- `infra/nginx/nexo-ratelimit.conf`, `infra/nginx/cloudflare-realip.conf`
- `.github/workflows/ci.yml`, `cd.yml`, `security-dast.yml`, `.sops.yaml`
- `app/(private)/__tests__/access.e2e.test.ts`
