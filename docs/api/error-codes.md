# Error codes

## Purpose

Every error the API returns carries a `code` from one registry, `src/errors/codes.ts` (`ERROR_CODES`). The registry is the single source of truth for the HTTP status of each code; nothing else decides it. This page lists all 111 codes grouped by domain. The status column is read straight from the registry; the meaning column is derived from the code name and, where a service uses the code, from that service (cited). Codes whose rule is not visible in the code say `TODO: confirm`.

## How it works

- A service or repository returns `err(...)` with a factory from `src/errors/app-error.ts` (`forbidden()`, `notFound('X')`, `couponInvalid()`, ...). Do not build an `AppError` with an ad-hoc code.
- The route turns it into a response with `handleError(error)` (`utils/http-response.ts`): `{ success: false, statusCode, error: { code, details? }, message? }`. The HTTP status is `ERROR_CODES[code].status`.
- `message` is a human string, mostly pt-BR product copy; clients must branch on `error.code`, never on `message`.
- `RATE_LIMITED` also sets a `Retry-After` header when `details.retryAfterSeconds` is a positive number.
- `VALIDATION_ERROR` is 422, not 400. It carries the Zod issues in `error.details`. `BAD_REQUEST` (400) exists in the registry but body validation uses 422.
- Status families: 401 and 403 (auth), 404/409/410/422/429 (client), 500 and 502 (server and upstream). 502 is used where the fault is an upstream provider (`PAYMENT_ERROR`, `MAIL_ERROR`).

## Adding a code

1. Add it to `src/errors/codes.ts` first, then a factory in `src/errors/app-error.ts`.
2. Document it in `public/openapi.json` under the operations that can return it. The contract test `src/__tests__/contract/openapi-spec.contract.test.ts` checks that every documented error code exists in `ERROR_CODES` at the documented status (see [README.md](./README.md)).
3. Follow the existing naming: `<FEATURE>_NOT_FOUND` (404), `_FORBIDDEN` (403), `_ALREADY_EXISTS` or `_CONFLICT` (409), `_INVALID` (422), `_LIMIT_REACHED` (409 for project links and attachments, 403 for plan seats).

## Codes

### Authentication and authorization

| Code | HTTP | Meaning |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | No valid session (also returned by the proxy for `/api/*` without a session cookie). |
| `INVALID_TOKEN` | 401 | Token rejected. In code it is mapped for Better Auth link errors (`src/lib/auth-errors.ts`); no service returns it directly. |
| `TOKEN_EXPIRED` | 401 | Token expired. Same usage as `INVALID_TOKEN` (`src/lib/auth-errors.ts`). |
| `INVALID_CREDENTIALS` | 401 | Wrong e-mail or password. |
| `FORBIDDEN` | 403 | Authenticated, but not allowed to act on this resource (generic ownership or role failure). |
| `INSUFFICIENT_PERMISSIONS` | 403 | The caller lacks the workspace role the operation needs. |
| `ADMIN_TWO_FACTOR_REQUIRED` | 403 | Platform admin access requires two-factor authentication (see `auth.admin_access.denied` in observability). |

### Plans and billing

| Code | HTTP | Meaning |
| --- | --- | --- |
| `SEAT_LIMIT_REACHED` | 403 | The workspace plan has no seat left for another member. |
| `FEATURE_NOT_IN_PLAN` | 403 | The feature is not included in the workspace plan. |
| `WORKSPACE_HAS_ACTIVE_PLAN` | 409 | A workspace with an active paid plan cannot be deleted. |
| `COUPON_INVALID` | 422 | The coupon is unknown, not `ACTIVE` or has no redemptions left (`coupon.service.ts`). |
| `PAYMENT_ERROR` | 502 | The payment gateway (AbacatePay) failed; 502 because the fault is upstream. |

### Generic client errors

| Code | HTTP | Meaning |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | The request is malformed in a way the schema does not cover. |
| `VALIDATION_ERROR` | 422 | The body or query failed Zod validation; `error.details` carries the issues. |
| `RESOURCE_NOT_FOUND` | 404 | Generic not found, built by `notFound('Resource')`. |
| `CONFLICT` | 409 | Generic conflict with current state. |
| `USERNAME_CONFLICT` | 409 | The username is already taken. |
| `RATE_LIMITED` | 429 | Too many requests; `Retry-After` is set when the delay is known. |

### Invitations

| Code | HTTP | Meaning |
| --- | --- | --- |
| `INVITATION_EMAIL_MISMATCH` | 403 | The signed-in e-mail differs from the invited e-mail. |
| `INVITATION_NOT_FOUND` | 404 | The invitation does not exist or is not visible to the caller. |
| `INVITATION_NOT_PENDING` | 409 | The invitation was already accepted or revoked. |
| `INVITATION_EXPIRED` | 410 | The invitation passed its expiry date (410 Gone). |
| `INVITATION_DUPLICATE` | 409 | A pending invitation for this e-mail already exists. |
| `INVITATION_ALREADY_MEMBER` | 409 | The invited e-mail already belongs to a member. |

### Members and import

| Code | HTTP | Meaning |
| --- | --- | --- |
| `MEMBER_IMPORT_INVALID_FORMAT` | 422 | The member import file is not in the expected format. |
| `MEMBER_IMPORT_EMPTY` | 422 | The member import file has no rows. |

### Career jobs

| Code | HTTP | Meaning |
| --- | --- | --- |
| `CAREER_JOB_FORBIDDEN` | 403 | The caller may not manage career jobs (TODO: confirm exact rule). |
| `CAREER_JOB_NOT_FOUND` | 404 | The career job does not exist or is not visible to the caller. |
| `CAREER_JOB_CLOSED` | 409 | The job is closed to applications. |
| `CAREER_JOB_SLUG_TAKEN` | 409 | Another career job already uses the slug. |

### Project states and labels

| Code | HTTP | Meaning |
| --- | --- | --- |
| `PROJECT_STATE_NOT_FOUND` | 404 | The project state does not exist or is not visible to the caller. |
| `PROJECT_STATE_FORBIDDEN` | 403 | The caller may not act on this project state. |
| `PROJECT_STATE_ALREADY_EXISTS` | 409 | The project state already exists. |
| `PROJECT_STATE_IS_DEFAULT` | 409 | The default project state cannot be removed. |
| `PROJECT_STATE_LAST_IN_GROUP` | 409 | The project state is the last one in its group. |
| `PROJECT_STATE_INVALID` | 422 | The project state does not exist or belongs to another workspace (`project.service.ts`). |
| `PROJECT_STATES_DISABLED` | 409 | Project states are switched off for the workspace (`projectStatesEnabled`). |
| `PROJECT_LABEL_NOT_FOUND` | 404 | The project label does not exist or is not visible to the caller. |
| `PROJECT_LABEL_FORBIDDEN` | 403 | The caller may not act on this project label. |
| `PROJECT_LABEL_ALREADY_EXISTS` | 409 | The project label already exists. |
| `PROJECT_LABEL_INVALID` | 422 | Some label ids do not belong to the workspace (`project.service.ts`). |
| `PROJECT_LABELS_DISABLED` | 409 | Project labels are switched off for the workspace (`projectLabelsEnabled`). |

### Project links and attachments

| Code | HTTP | Meaning |
| --- | --- | --- |
| `PROJECT_LINK_NOT_FOUND` | 404 | The project link does not exist or is not visible to the caller. |
| `PROJECT_LINK_LIMIT_REACHED` | 409 | The project reached its link limit. |
| `PROJECT_ATTACHMENT_NOT_FOUND` | 404 | The project attachment does not exist or is not visible to the caller. |
| `PROJECT_ATTACHMENT_LIMIT_REACHED` | 409 | The project reached its attachment limit. |

### Projects

| Code | HTTP | Meaning |
| --- | --- | --- |
| `PROJECT_FORBIDDEN` | 403 | The caller is not allowed to act on this project. |
| `PROJECT_NOT_FOUND` | 404 | The project does not exist or is not visible to the caller. |
| `PROJECT_SLUG_CONFLICT` | 409 | Another project in the workspace already uses the slug. |
| `PROJECT_MEMBER_ALREADY_EXISTS` | 409 | The project member already exists. |
| `PROJECT_MEMBER_NOT_FOUND` | 404 | The project member does not exist or is not visible to the caller. |
| `PROJECT_MEMBER_NOT_IN_WORKSPACE` | 409 | Only workspace members can be added to a project. |
| `PROJECT_IDENTIFIER_CONFLICT` | 409 | Another project in the workspace already uses the identifier. |
| `PROJECT_DATE_RANGE_INVALID` | 422 | The project start date is after its due date (`project.service.ts`). |

### Issue states and labels

| Code | HTTP | Meaning |
| --- | --- | --- |
| `STATE_NOT_FOUND` | 404 | The state does not exist or is not visible to the caller. |
| `STATE_FORBIDDEN` | 403 | The caller may not act on this state. |
| `STATE_LAST_IN_GROUP` | 409 | The state is the last one in its group and cannot be removed. |
| `STATE_IS_DEFAULT` | 409 | The default state cannot be removed. |
| `LABEL_NOT_FOUND` | 404 | The label does not exist or is not visible to the caller. |
| `LABEL_FORBIDDEN` | 403 | The caller may not act on this label. |

### Estimates

| Code | HTTP | Meaning |
| --- | --- | --- |
| `ESTIMATE_SETTINGS_NOT_FOUND` | 404 | The estimate settings does not exist or is not visible to the caller. |
| `ESTIMATE_SETTINGS_FORBIDDEN` | 403 | The caller may not act on this estimate settings. |
| `ESTIMATE_VALUE_NOT_FOUND` | 404 | The estimate value does not exist or is not visible to the caller. |
| `ESTIMATE_VALUE_FORBIDDEN` | 403 | The caller may not act on this estimate value. |
| `ESTIMATE_VALUE_LAST_REMAINING` | 409 | The last remaining estimate value cannot be deleted. |

### Modules

| Code | HTTP | Meaning |
| --- | --- | --- |
| `MODULE_NOT_FOUND` | 404 | The module does not exist or is not visible to the caller. |
| `MODULE_FORBIDDEN` | 403 | The caller may not act on this module. |
| `MODULE_MEMBER_ALREADY_EXISTS` | 409 | The module member already exists. |
| `MODULE_MEMBER_NOT_FOUND` | 404 | The module member does not exist or is not visible to the caller. |

### Cycles

| Code | HTTP | Meaning |
| --- | --- | --- |
| `CYCLE_NOT_FOUND` | 404 | The cycle does not exist or is not visible to the caller. |
| `CYCLE_FORBIDDEN` | 403 | The caller may not act on this cycle. |
| `CYCLE_ALREADY_ACTIVE` | 409 | The project already has an active cycle. |
| `CYCLE_MEMBER_ALREADY_EXISTS` | 409 | The cycle member already exists. |
| `CYCLE_MEMBER_NOT_FOUND` | 404 | The cycle member does not exist or is not visible to the caller. |

### Issues, comments and attachments

| Code | HTTP | Meaning |
| --- | --- | --- |
| `ISSUE_TYPE_NOT_FOUND` | 404 | The issue type does not exist or is not visible to the caller. |
| `ISSUE_TYPE_FORBIDDEN` | 403 | The caller may not act on this issue type. |
| `ISSUE_TYPE_SYSTEM_PROTECTED` | 409 | A system issue type cannot be changed or deleted. |
| `ISSUE_NOT_FOUND` | 404 | The issue does not exist or is not visible to the caller. |
| `ISSUE_FORBIDDEN` | 403 | The caller may not act on this issue. |
| `ISSUE_STATE_INVALID` | 422 | The state is not valid for the issue (`issue.service.ts`). |
| `ISSUE_TYPE_INVALID` | 422 | The issue type is not valid, or the project has no default `Task` system type (`issue.service.ts`). |
| `ISSUE_ASSIGNEE_ALREADY_EXISTS` | 409 | The issue assignee already exists. |
| `ISSUE_ASSIGNEE_NOT_FOUND` | 404 | The issue assignee does not exist or is not visible to the caller. |
| `ISSUE_SUBSCRIBER_NOT_FOUND` | 404 | The issue subscriber does not exist or is not visible to the caller. |
| `ISSUE_LABEL_ALREADY_EXISTS` | 409 | The issue label already exists. |
| `ISSUE_LABEL_NOT_FOUND` | 404 | The issue label does not exist or is not visible to the caller. |
| `ISSUE_PARENT_CYCLE` | 409 | The parent link would create a cycle in the issue tree. |
| `ISSUE_DEPENDENCY_ALREADY_EXISTS` | 409 | The issue dependency already exists. |
| `ISSUE_DEPENDENCY_NOT_FOUND` | 404 | The issue dependency does not exist or is not visible to the caller. |
| `ISSUE_DEPENDENCY_CYCLE` | 409 | The dependency would create a cycle. |
| `ISSUE_RELATION_ALREADY_EXISTS` | 409 | The issue relation already exists. |
| `ISSUE_RELATION_NOT_FOUND` | 404 | The issue relation does not exist or is not visible to the caller. |
| `ISSUE_RELATION_SELF` | 422 | An issue cannot be related to itself. |
| `ATTACHMENT_NOT_FOUND` | 404 | The attachment does not exist or is not visible to the caller. |
| `ISSUE_VOTE_NOT_FOUND` | 404 | The issue vote does not exist or is not visible to the caller. |
| `COMMENT_NOT_FOUND` | 404 | The comment does not exist or is not visible to the caller. |
| `COMMENT_FORBIDDEN` | 403 | The caller may not act on this comment. |
| `COMMENT_NESTING_TOO_DEEP` | 422 | Replies cannot nest beyond the allowed depth. |

### Wiki

| Code | HTTP | Meaning |
| --- | --- | --- |
| `WIKI_PAGE_FORBIDDEN` | 403 | The caller may not act on this wiki page. |
| `WIKI_PAGE_NOT_FOUND` | 404 | The wiki page does not exist or is not visible to the caller. |
| `WIKI_COMMENT_NOT_FOUND` | 404 | The wiki comment does not exist or is not visible to the caller. |
| `WIKI_COMMENT_FORBIDDEN` | 403 | The caller may not act on this wiki comment. |
| `WIKI_COMMENT_NESTING_TOO_DEEP` | 422 | Wiki replies cannot nest beyond the allowed depth. |

### Project updates

| Code | HTTP | Meaning |
| --- | --- | --- |
| `UPDATE_NOT_FOUND` | 404 | The update does not exist or is not visible to the caller. |
| `UPDATE_REPLY_NOT_FOUND` | 404 | The update reply does not exist or is not visible to the caller. |
| `UPDATE_FORBIDDEN` | 403 | The caller may not act on this update. |
| `UPDATE_DISABLED` | 409 | Updates are switched off for the project (`updatesEnabled` is false). |

### Server and upstream errors

| Code | HTTP | Meaning |
| --- | --- | --- |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected failure. |
| `DATABASE_ERROR` | 500 | A Prisma call failed (built by repositories with `databaseError`). |
| `STORAGE_ERROR` | 500 | The object store (Silo) call failed. |
| `MAIL_ERROR` | 502 | The mail provider (Resend) failed; 502 because the fault is upstream. |
## Gotchas

- Not every response is an enveloped error. `/api/auth/**` (Better Auth) returns its own payloads, `POST /api/payment/webhook` answers `{ received }` or `{ error }` with a flat 500 so the provider retries, and `GET /api/health` answers `{ status }` (see [README.md](./README.md)).
- The proxy answers a missing session on `/api/*` with `{ success: false, statusCode: 401, error: { code: 'UNAUTHORIZED' } }` and no `message` (`proxy.ts`).
- `INVALID_TOKEN` and `TOKEN_EXPIRED` are only mapped for Better Auth link errors; do not expect them from workspace endpoints.
- `PROJECT_FORBIDDEN` and `INSUFFICIENT_PERMISSIONS` are both 403; which one a route returns depends on the service, so clients should treat the 403 family alike.

## Related files

- `src/errors/codes.ts`, `src/errors/app-error.ts`
- `utils/http-response.ts`, `types/http-response.d.ts`
- `src/__tests__/contract/openapi-spec.contract.test.ts`
- `public/openapi.json`
