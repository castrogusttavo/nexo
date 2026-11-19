# Authentication and authorization

This document covers how users prove who they are (Better Auth), how that identity reaches API routes and server-rendered pages, and the layered checks (proxy, DAL, API wrappers, services) that decide what they may see. Layering is the key idea: the early checks are optimistic and cheap, the late ones are authoritative.

## Better Auth

`src/lib/auth.ts` configures a single `betterAuth` instance:

- **Storage:** Prisma adapter on PostgreSQL; ids are generated with cuid2 (`advanced.database.generateId`). Tables: `User`, `Session`, `Account`, `Verification`, `TwoFactor`.
- **Email and password:** enabled, with `requireEmailVerification: true`. Hashing is argon2 (`src/lib/argon2-config.ts`). Verification is guarded by a concurrency gate (`src/lib/auth-concurrency-gate.ts`) so a burst of logins cannot exhaust CPU; when it is overloaded it answers `TOO_MANY_REQUESTS` with `Retry-After`. Password reset revokes the other sessions (`revokeSessionsOnPasswordReset`).
- **Social:** Google and GitHub, with `accountLinking` enabled and OAuth tokens encrypted at rest (`encryptOAuthTokens`).
- **Plugins:** `emailOTP` (verification and sign-in codes, mails sent from `src/lib/mail/user/`) and `twoFactor` (issuer `Nexo`, hashed OTP storage, lockout after 5 failed attempts for 900 seconds).
- **Hooks:** `before` and `after` hooks refuse email OTP for admins who have TOTP (`src/lib/auth-email-otp-guard.ts`) and drop the trusted-device cookie for platform admins (`src/lib/auth-trusted-device.ts`).
- **Database hooks:** on user creation a unique username is derived from the email, and consent timestamps are overwritten with the server clock so a client cannot backdate them; `ConsentEvent` rows record each grant with IP and user agent. On session creation a pending account deletion is cancelled (logging back in counts as changing one's mind).
- **Rate limiting:** Better Auth's limiter is enabled only in production and disabled when `DISABLE_AUTH_RATE_LIMIT=true`; its counters live in Redis through `betterAuthRateLimitStorage` (`src/lib/rate-limit.ts`) so all instances share a bucket. Client IP comes from `X-Forwarded-For` with `trustedProxies` configured.

The browser side uses `authClient` (`src/lib/auth-client.ts`). Better Auth's HTTP endpoints are served from `app/api/auth/[...all]`.

## The session cookie and its cache

The session token lives in the `better-auth.session_token` cookie (`__Secure-` prefixed over HTTPS). `session.cookieCache` is enabled with `maxAge: 5 * 60`: Better Auth also writes a signed `better-auth.session_data` cookie holding the session and user (including `acceptedTermsAt` and `acceptedPrivacyAt`) so it can answer for five minutes without a database read.

`src/lib/auth-cookie.ts` reads that cache for `proxy.ts` via `getCookieCache` and returns `consented`, `missing` or `unknown`. Only `missing` ever blocks. A missing, expired or tampered cache all collapse into `unknown`, which lets the request through; the definitive check comes later.

## Layer 1: `proxy.ts` (optimistic)

Public routes pass. Otherwise no session cookie means `401` for `/api/*` or a redirect to `/sign-in?redirect=...`. For page GETs a cookie-cache `missing` consent redirects to `/onboarding/consent-setup`. Nothing here touches the database, so it can only route early; it is not a security boundary. See [request-flow.md](./request-flow.md).

## Layer 2: the DAL for pages

`src/lib/dal.ts` is where page authorization happens:

- `getCurrentUser()`: session or redirect to `/sign-in`.
- `requireConsentedUser(resource)`: the above plus `requireConsent`; redirects to `/onboarding/consent-setup`. Marked in the source as a security gate (STR-61), not to be removed or weakened.
- `requireMembership(slug)`: the above plus a membership lookup, returning `{ user, membership }` or redirecting/404ing. See [multi-tenancy.md](./multi-tenancy.md).

Each is `'use cache: private'` with `cacheLife({ stale: 300 })`. Per the Next.js docs (`node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md`), a private cache function may read `cookies()` and `headers()`, is excluded from the static shell, and in production is not stored in a server cache across requests; only the client router keeps the result. In practice the check runs on every server request, and a tab that already holds the shell can show stale access for up to five minutes after a session or consent is revoked. `redirect()` throws, so a blocked result is never cached.

Why not a layout: layouts of one path render in parallel, so a redirect in a layout does not stop its children from rendering and streaming data into the payload. This was a real leak (STR-61). The Next.js guide `authentication-with-cache-components.md` says the same. See [ADR 0003](../adr/0003-dal-instead-of-layout-gates.md). Context helpers that wrap the DAL, `getProjectContext` and `getWikiContext`, call `requireMembership` first.

## Layer 3: API routes

`getAuthSession()` (`src/lib/auth-session.ts`) is the accessor for routes and server actions. It is wrapped in React `cache` (one lookup per request), awaits `connection()` so it only runs at request time, and returns `err(unauthorized(...))` or `ok(session)`. `withAuthenticatedRoute` adds the rate limit and an optional `requireConsent` check. The consent check re-reads the user row (`src/lib/consent.ts`) and records an `auditAccess` event when it blocks.

## Layer 4: services

Services authorize against the data: ownership (`userId` equals the actor), membership (`assertMember`), role (`assertPrivileged`). This is the authoritative layer for mutations.

## Consent as an access condition

Terms and privacy acceptance (`User.acceptedTermsAt`, `acceptedPrivacyAt`, with `ConsentEvent` as the audit trail) gate access on every path: the proxy (optimistic, from the cookie cache), the DAL (`requireConsentedUser`, `requireMembership`) and the API (`requireConsent` via `consentResource`). `requireConsent` is the single server-side predicate; it returns `forbidden('Consentimento obrigatório')` and audits `consent.gate.blocked` with a reason (`CONSENT_MISSING` or `USER_LOOKUP_FAILED`). `app/onboarding` hosts the consent step, and the proxy deliberately skips `/onboarding` and server actions (a POST cannot follow a redirect).

## Failure modes by layer

| Situation | Proxy | DAL (pages) | API |
| --- | --- | --- | --- |
| No session cookie | redirect to `/sign-in` | not reached | `401 UNAUTHORIZED` |
| Cookie but invalid or expired session | passes | redirect to `/sign-in` | `UNAUTHORIZED` from `getAuthSession` |
| Terms not accepted | redirect (if cache says so) | redirect to consent | `FORBIDDEN` |
| Not a member of the workspace | passes | onboarding, `/create-workspace` or 404 | `FORBIDDEN` from the service |

## Key decisions

- **Better Auth over a hand-rolled or hosted solution.** See [ADR 0005](../adr/0005-better-auth.md).
- **DAL for pages instead of layout gates.** See [ADR 0003](../adr/0003-dal-instead-of-layout-gates.md).
- **Server clock for consent.** Client-supplied acceptance times are replaced in `databaseHooks.user.create.before`.

## Gotchas

- Do not use `getAuthSession()` in a server component on a prerendered path; use the DAL.
- Cookie-cache consent only says `missing` when the cache decodes. A user whose cache expired sails through the proxy and is caught by the DAL or the API.
- The cookie cache signing secret comes from the first `BETTER_AUTH_SECRETS` entry when set (`cookieCacheSecret`), else `BETTER_AUTH_SECRET`; rotating secrets must keep these in agreement.
- OAuth sign-ups skip the signup form, so `acceptedTermsAt` stays null until the consent step collects it.
- Never log or diff real secrets while changing this configuration.

## Related files

- `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth-session.ts`, `src/lib/auth-cookie.ts`
- `src/lib/dal.ts`, `src/lib/consent.ts`, `proxy.ts`
- `src/lib/auth-concurrency-gate.ts`, `src/lib/auth-email-otp-guard.ts`, `src/lib/auth-trusted-device.ts`
- `app/api/auth/[...all]`, `app/(private)/__tests__/access.e2e.test.ts`
