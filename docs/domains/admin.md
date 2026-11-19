# Platform admin

The admin area is for the operators of Nexo itself, not for workspace owners. It is a small surface: managing public job posts and a dashboard for the BullMQ queues. Access is an allowlist of e-mail addresses plus a mandatory second factor, and everyone else is shown a 404 so the area's existence is not confirmed.

## Access rule

`resolvePlatformAdmin()` in `src/lib/admin-access.ts` is the single gate. In order:

1. Resolve the session (`getAuthSession`); none means `UNAUTHORIZED`.
2. The lower-cased e-mail must be in `PLATFORM_ADMIN_EMAILS`, read through `getPlatformAdminEmails()` (`lib/env/server-admin.ts`, schema in `lib/env/_server-admin.ts`). Read lazily, not at import, so public pages never need admin credentials. Otherwise `FORBIDDEN`.
3. The e-mail must be verified. Otherwise `FORBIDDEN`.
4. `twoFactorEnabled` must be true. Better Auth's cookie cache can serve a stale user for up to five minutes, so a session claiming "no 2FA" is re-checked against the database before the user is refused; a session claiming 2FA is believed. Otherwise `ADMIN_TWO_FACTOR_REQUIRED` (403).

The result is a `PlatformActor` (`id`, `email`, `twoFactorEnabled`). `CareerJobService` repeats the same allowlist and 2FA check (`assertPlatformAdmin` in `src/services/career-job.service.ts`), so the service stays safe if a caller forgets the gate. Authorization therefore lives in both the entry point (early answer) and the service, which is the project rule.

## The three entry points

Each repeats the gate because layouts do not wrap route handlers.

- **Pages** (`app/(private)/admin/layout.tsx`): `instant = false` on purpose (blocking, a handful of users). Admin: `requireConsentedUser('page:admin')` then render. Unauthenticated: redirect to `/sign-in`. Missing 2FA: audited as `auth.admin_access.denied` (`two_factor_required`) and redirect to `/?2fa=required`. Anyone else: audited (`not_allowlisted`) and `notFound()`. A redirect would confirm the route exists.
- **Page metadata** (`src/lib/admin-metadata.ts`, `adminMetadata(title)`): a static `metadata` export is resolved apart from the layout and used to leak the admin title to a signed-in stranger, so metadata goes through the same gate and non-admins get the not-found metadata. Admin pages are `noindex`.
- **API** (`app/api/admin/careers/**`): `resolvePlatformAdmin()` then `handleError` on failure.

## Areas

| Area | Where | Notes |
|---|---|---|
| Index | `app/(private)/admin/page.tsx` | two cards, jobs and queues |
| Career jobs | `app/(private)/admin/careers/` (`new`, `[id]/edit`, `_components/career-job-form.tsx`, `status-control.tsx`) | see [careers-and-marketing.md](./careers-and-marketing.md) |
| Queues | `app/(private)/admin/queues/[[...workbench]]/route.ts` | Workbench (`@getworkbench/next`) over every queue in `QueueName` |

### Queue dashboard

The route handler denies non-admins itself (404, or `ADMIN_TWO_FACTOR_REQUIRED` for a real admin without 2FA). It also has a second lock, basic auth with `WORKBENCH_USER` and `WORKBENCH_PASS` (validated in `lib/env/_server-admin.ts`), because the dashboard can retry, remove and promote jobs. If the credentials are missing it refuses to mount (`workbench.credentials_missing`), because Workbench reads missing credentials as "no auth" and would serve the console open. Handlers are built on first request, not at import. The queue list is derived from `QueueName` (`src/lib/queue/jobs.ts`) via `getQueueByName`, so a new queue appears automatically. See [../architecture/background-jobs.md](../architecture/background-jobs.md).

## API routes

| Route | Methods |
|---|---|
| `app/api/admin/careers/route.ts` | GET (all jobs including drafts), POST |
| `app/api/admin/careers/[id]/route.ts` | GET, PATCH |
| `app/api/admin/careers/[id]/status/route.ts` | PATCH (`DRAFT`, `OPEN`, `CLOSED`) |

None of these use `apiLimiter`. TODO: confirm whether the allowlist makes that acceptable. There is no admin endpoint to list or read career applications; they reach staff by e-mail (see the careers page).

## Error codes

`ADMIN_TWO_FACTOR_REQUIRED` (403), `CAREER_JOB_FORBIDDEN` (403), `FORBIDDEN`, `UNAUTHORIZED` in `src/errors/codes.ts`.

## Caching and queues

No caching. The dashboard reads the queues of the worker process; it does not enqueue its own jobs.

## Gotchas

- Admin 2FA rules are stricter elsewhere too: e-mail OTP is refused for admins with TOTP and the trusted-device cookie is dropped for admins (`src/lib/auth-email-otp-guard.ts`, `src/lib/auth-trusted-device.ts`, see [../architecture/security.md](../architecture/security.md)).
- Under `SKIP_ENV_VALIDATION` the env getters return whatever the environment holds, hence the explicit credential check in the queue route.

## Tests

- E2E: `app/api/admin/careers/__tests__/route.e2e.test.ts`, `[id]/__tests__/`, `[id]/status/__tests__/`, `app/(private)/admin/queues/__tests__/route.e2e.test.ts`.
- Unit: `lib/__tests__/server-admin-env.test.ts`, `src/services/__tests__/career-job.service.test.ts`.
- Component: `app/(private)/admin/careers/_components/__tests__/career-job-form.component.test.tsx`.

## Related files

`src/lib/admin-access.ts`, `src/lib/admin-metadata.ts`, `lib/env/_server-admin.ts`, `app/(private)/admin/layout.tsx`, `src/services/career-job.service.ts`.
