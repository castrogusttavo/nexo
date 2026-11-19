# 2026-10-15: Better Auth's shared rate-limit bucket from `X-Forwarded-For`

## Summary

Behind nginx, Better Auth resolved the client IP from `X-Forwarded-For` but, without `trustedProxies`, only trusted a single-entry header. nginx appends the client's address to whatever the client sent, so any request that already carried the header had two entries and was dropped into one shared sign-in rate-limit bucket for everyone. The same reading of the header also let a client choose the address that was rate limited and stored. Fixed in `590bfc8c` (2026-10-15 22:47 -0300) by resolving the address from the rightmost untrusted hop.

## Impact

- Sign-in attempts by unrelated users could count against one bucket and be rejected (comment in `src/lib/auth.ts`). **(Operator-provided)** the shared bucket allowed only 3 sign-ins per 10 seconds; the repository does not show that figure.
- A client could also pick the address the app used: the leftmost `X-Forwarded-For` entry and `X-Real-IP` (set from it by nginx) were client-controlled. For consent records, which are LGPD evidence, this meant a request could store any address (`5fd075fa`, 2026-10-17).
- How many sign-ins were refused is not recorded.

## Timeline

- Before 2026-10-15: `getClientIp` took the first `X-Forwarded-For` entry, then `X-Real-IP`; Better Auth's `ipAddress` option listed `x-forwarded-for` without `trustedProxies` (inferred from the diff).
- 2026-10-15 22:47, `590bfc8c`: new `TRUSTED_PROXIES` variable (default `127.0.0.1,::1`); `getClientIp` walks the header from the right to the first untrusted hop with Better Auth's own `getIPFromHeader`; `advanced.ipAddress.trustedProxies` set in `src/lib/auth.ts`.
- 2026-10-16, `dd34816f`: Better Auth's own limiter counters moved to Redis (they lived in process memory, so each app instance had its own bucket; three-instance rollout began the same day with `d5626518`).
- 2026-10-17, `464e964b`: nginx trusts `CF-Connecting-IP` only from Cloudflare's published ranges, since the site now sits behind Cloudflare, so the hop the app reads is the visitor.
- 2026-10-17, `5fd075fa`: consent records use the resolved address (`clientIp()`), `null` when there is none.
- 2026-10-18, `da4ba764`: consent records keep the whole IPv6 address.

<!-- DIAGRAM NEEDED: xff-resolution: how X-Forwarded-For is built (client, Cloudflare, nginx) and which hop is chosen before and after 590bfc8c, including the shared bucket failure; read src/lib/rate-limit-helpers.ts, src/lib/auth.ts, infra/nginx/cloudflare-realip.conf, infra/nginx/nexo-ratelimit.conf -->

## Root cause

Trusting a header whose leftmost value is written by the client, and a library default that treats multi-entry headers as untrusted and falls back to one global key. Both are consequences of one fact: nginx appends rather than replaces, so the rightmost entry is the only one a proxy we control wrote.

## Detection

Not stated in the commit (its body is empty). **(Operator-provided)** it was seen in production as a global sign-in limit; TODO: confirm how it was noticed.

## Resolution

- `TRUSTED_PROXIES`: proxies whose entries are stripped from the right; default loopback only switches multi-entry parsing on. List a CDN's ranges there if one ever sits directly in front (comment in `lib/env/_server.ts`).
- One resolver for the app limiter, Better Auth and consent records.
- Better Auth's limiter now shares state across instances via Redis.

## Guards added

- Unit tests in `src/lib/__tests__/rate-limit-helpers.test.ts` for the rightmost-hop resolution (updated in the fix commit).
- nginx `real_ip` from Cloudflare ranges only (`infra/nginx/cloudflare-realip.conf`), so a direct hit to the origin cannot spoof the header.

## Lessons

- Never read the leftmost `X-Forwarded-For` entry for anything that matters.
- A rate limiter keyed on a derived identity needs a test with realistic multi-hop headers.
- Per-process counters are wrong the moment there is more than one instance.

## Related files

- `src/lib/auth.ts`, `src/lib/rate-limit-helpers.ts`, `src/lib/client-ip.ts`, `lib/env/_server.ts` (`TRUSTED_PROXIES`)
- `infra/nginx/cloudflare-realip.conf`, `infra/nginx/nexo-ratelimit.conf`
- [../architecture/security.md](../architecture/security.md), [../api/README.md](../api/README.md)
