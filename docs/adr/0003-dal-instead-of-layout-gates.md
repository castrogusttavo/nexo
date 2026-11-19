# 0003. Data access layer instead of layout gates

- Status: Accepted
- Date: 2026-10-17
- Commits: `a0227ae5` (adds `src/lib/dal.ts`), `86408ed6` (consent checked wherever workspace data is read), `bad53505` (removes the `(private)` layout gate), all 2026-10-17

## Context

Access to a workspace used to be enforced in the `(private)` layout: it redirected users who were not signed in or had not accepted the terms. Layouts of one path render in parallel, so a redirect in a layout does not stop the layouts and pages below it from rendering. That produced a real leak, tracked as STR-61: an unconsented member received workspace and user ids in the RSC payload whenever the proxy could not tell from the cookie cache. A layout also does not re-render on navigation, so it is not a security boundary (the comment in `src/lib/dal.ts` cites the Next 16 authentication guide, "Layouts and auth checks").

Blocking the whole private tree on a gate in the layout was also a performance cost under Cache Components, where the shell should be prerendered and only per-user parts stream.

## Decision

Rendering reads go through the data access layer, `src/lib/dal.ts`, never through a layout gate.

- `getCurrentUser()`, `requireConsentedUser(resource)` and `requireMembership(slug)` check session, consent and membership next to the data, and redirect or 404 on their own.
- Each is `use cache: private`: it runs at request time on the server and only the client router keeps the result (stale 5 minutes). Redirects throw, so a blocked result is never cached.
- Every server component that reads user or workspace data calls one of them first; `getProjectContext` and `getWikiContext` already do.
- `proxy.ts` keeps an optimistic cookie-cache check in front (no database), but the DAL and the API routes are the real gates.
- API routes keep `getAuthSession()`, which returns a `Result` (see [ADR-0002](0002-result-instead-of-throw.md)).
- `requireConsentedUser` is marked `SECURITY GATE (STR-61) - do not remove or weaken`.
- `app/(private)/__tests__/access.e2e.test.ts` checks every workspace page from outside (anonymous, stranger, unconsented member with and without the cookie cache) and fails on a leaked id; new private pages are added to it.

## Consequences

- The gate sits where the data is read, so a page cannot render data without passing it.
- Revoking a session or consent takes up to 5 minutes to reach a tab that already holds the shell; the server and API routes see it at once. This is documented in `dal.ts`.
- Every new private page must call the DAL, and add itself to the access e2e test; forgetting is the failure mode the test exists to catch.
- Queries made right after the DAL's private cache can trip prerender rules (for example `crypto.getRandomValues()` from a pooled pg connection); `a831aac9` (2026-10-28) calls `io()` before such queries in the shared context helpers.

## Alternatives considered

- Keeping the gate in the layout and adding more layout checks: this was the previous state and the one that leaked (`86408ed6`).
- Checking only in `proxy.ts`: kept as an optimistic front line, but it has no database access, so it cannot be the real gate (stated in `CLAUDE.md`).
- Per-page ad hoc checks (inferred): replaced by shared helpers so the check is not repeated page by page.

Related: [auth](../architecture/auth.md), [multi-tenancy](../architecture/multi-tenancy.md), [security](../architecture/security.md), [caching](../architecture/caching.md).
