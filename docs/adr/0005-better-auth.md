# 0005. Better Auth for authentication

- Status: Accepted
- Date: 2026-02-24
- Commits: `890039ee` (migrate auth to Better Auth, 2026-02-24); follow-ups `71dc7445` (bcrypt to argon2, 2026-03-16), `1ae7cee4` (two-factor state, 2026-06-25), `f3f5cc85` (argon2 tuned to the OWASP preset after CPU saturation under concurrent login, 2026-08-24)

## Context

The project started with a custom JWT-based auth (`890039ee`: "Replace custom JWT auth with Better Auth"). It needed email and password, Google and GitHub OAuth, email OTP and two-factor, with Prisma persistence. The commit does not give a written rationale beyond replacing the custom implementation; the reasoning below is inferred from what the project then built on it.

## Decision

Use Better Auth (`src/lib/auth.ts`) with the Prisma adapter, argon2 password hashing, email and password, Google and GitHub OAuth, and the email-OTP and two-factor plugins. IDs are cuid2. Lifecycle hooks (`sendResetPassword`, `afterEmailVerification`, ...) trigger transactional emails and audit logging.

- API routes and server actions read the session through `getAuthSession()` (returns a `Result`); rendering reads go through the DAL ([ADR-0003](0003-dal-instead-of-layout-gates.md)).
- `proxy.ts` gates by the `better-auth.session_token` cookie and reads Better Auth's signed cookie cache for an optimistic consent check.
- The app runs its own Redis-backed rate limiter on auth routes (`cd1861ba`, STR-15); Better Auth's own limiter is on only in production and off when `DISABLE_AUTH_RATE_LIMIT=true` (set during e2e); when on, it counts in Redis through `customStorage` (`betterAuthRateLimitStorage`), so every app instance shares one bucket per client.

## Consequences

- Session, OAuth, OTP and 2FA flows are maintained by a library instead of in-house code, but the app is coupled to its plugin model and cookie format (the proxy and `src/lib/auth-cookie.ts` depend on it).
- Production behaviours had to be tuned after the fact: trusted origins and base URL (`101234f1`), cookie names (`bb088354`), argon2 cost (`f3f5cc85`), and forwarded-header handling behind the proxy.
- Consent and membership are not part of the library and are enforced by the app's DAL and routes.

## Alternatives considered

- Keeping the custom JWT auth: it was the starting point and was replaced.
- Other libraries or hosted providers (inferred, none evaluated in the history).

Related: [auth](../architecture/auth.md), [security](../architecture/security.md).
