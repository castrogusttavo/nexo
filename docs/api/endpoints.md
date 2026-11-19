# Endpoint inventory

## Purpose

A flat inventory of the HTTP surface under `app/api/**/route.ts`: method, path, who may call it, and what it does. It was built by walking the route files and exported HTTP methods (the same way the contract suite does), then cross-checked with `public/openapi.json`: 182 operations in route files, plus the Better Auth catch-all documented separately below. For request and response shapes use the OpenAPI spec (rendered by Scalar, see [README.md](./README.md)); for failure modes see [error-codes.md](./error-codes.md).

## Conventions

- Paths are relative to `/api`. `{id}` in `/workspaces/{id}` is the workspace id (not the slug); `{slug}` is the project slug.
- **Auth column.** `session`: the Better Auth session cookie, enforced by `proxy.ts` (optimistic) and by the route (`getAuthSession`, real check). `public`: listed in `PUBLIC_ROUTES` in `proxy.ts` and documented without `security`. `session + platform admin`: the route also calls `resolvePlatformAdmin()` (`src/lib/admin-access.ts`). `x-status-secret` and `x-webhook-secret` are shared-secret headers compared by the handler.
- Authorization beyond the session (workspace role, ownership, project membership) is decided in the service, not the route. See [request-flow](../architecture/request-flow.md).
- Most authenticated routes consume `apiLimiter` (100 requests per 60 s per user); uploads use `uploadLimiter`, data export `exportLimiter`.
- Purposes are written from the route paths and the summaries in `public/openapi.json` (which are pt-BR); they are one-liners, not specs.

## Better Auth (`/api/auth/*`)

`app/api/auth/[...all]/route.ts` is a single catch-all that hands the request to Better Auth after applying `authLimiter` (per IP and path) and `otpLimiter` for OTP paths. `public/openapi.json` documents 13 paths under `/auth/` (sign-up and sign-in with e-mail, social sign-in, sign-out, get-session, e-mail OTP send/verify, password reset request/reset, two-factor enable/disable/send-otp/verify-otp). Their payloads belong to Better Auth and are not wrapped in the project envelope. Sign-out, get-session and two-factor enable/disable declare the session cookie; the rest are public.

## Routes

### Health and status

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Liveness probe: runs `SELECT 1`, answers `{ status }` 200 or 503. |
| POST | `/api/status/collect/core` | `x-status-secret` | Run the core-tier probes (called by the collector). |
| POST | `/api/status/collect/peripheral` | `x-status-secret` | Run the peripheral-tier probes (called by the collector). |
| GET | `/api/status/history` | public | Daily history of one component. |
| GET | `/api/status` | public | Current status snapshot for the public status page. |

### Current user

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/users/me/avatar` | session | Upload the avatar. |
| POST | `/api/users/me/cookie-consent` | session | Record cookie consent. |
| POST | `/api/users/me/cover` | session | Upload the profile cover. |
| DELETE | `/api/users/me/deletion` | session | Cancel a scheduled account deletion. |
| POST | `/api/users/me/export` | session | Request a personal data export (enqueues a job). |
| GET | `/api/users/me/notifications` | session | Read notification settings. |
| PATCH | `/api/users/me/notifications` | session | Update notification settings. |
| GET | `/api/users/me/preferences` | session | Read user preferences. |
| PATCH | `/api/users/me/preferences` | session | Update user preferences. |
| DELETE | `/api/users/me` | session | Schedule account deletion (30-day grace). |
| GET | `/api/users/me` | session | Read the signed-in profile. |
| PATCH | `/api/users/me` | session | Update the signed-in profile. |

### Workspaces, members and invitations

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/invitations/accept` | session | Accept a workspace invitation. |
| POST | `/api/workspaces/{id}/invitations/{invitationId}/resend` | session | Resend the invitation e-mail. |
| DELETE | `/api/workspaces/{id}/invitations/{invitationId}` | session | Delete an invitation. |
| PATCH | `/api/workspaces/{id}/invitations/{invitationId}` | session | Update an invitation. |
| GET | `/api/workspaces/{id}/invitations` | session | List invitations. |
| POST | `/api/workspaces/{id}/invitations` | session | Create an invitation. |
| DELETE | `/api/workspaces/{id}/logo` | session | Remove the workspace logo. |
| POST | `/api/workspaces/{id}/logo` | session | Upload the workspace logo. |
| POST | `/api/workspaces/{id}/members/import` | session | Import members from a CSV file. |
| GET | `/api/workspaces/{id}/members` | session | List members (search, role filter, sort, `page`/`pageSize`). |
| DELETE | `/api/workspaces/{id}` | session | Delete a workspace (refused while a paid plan is active). |
| GET | `/api/workspaces/{id}` | session | Read a workspace. |
| PATCH | `/api/workspaces/{id}` | session | Update a workspace. |
| POST | `/api/workspaces` | session | Create a workspace. |

### Projects

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/workspaces/{id}/projects/{slug}/activities` | session | List activity history. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/archive` | session | Archive a project. |
| GET | `/api/workspaces/{id}/projects/{slug}/document` | session | Read the project document. |
| PUT | `/api/workspaces/{id}/projects/{slug}/document` | session | Save the project document snapshot. |
| GET | `/api/workspaces/{id}/projects/{slug}/editor-media` | session | Get a signed URL for an editor media object (`key` query). |
| POST | `/api/workspaces/{id}/projects/{slug}/editor-media` | session | Upload editor media. |
| POST | `/api/workspaces/{id}/projects/{slug}/embed-metadata` | session | Resolve metadata for a link embed. |
| GET | `/api/workspaces/{id}/projects/{slug}/embed-thumbnails/{key}` | session | Serve a stored embed thumbnail. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/favorite` | session | Remove the caller's favorite. |
| POST | `/api/workspaces/{id}/projects/{slug}/favorite` | session | Add the caller's favorite. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/members/{userId}` | session | Remove a member. |
| POST | `/api/workspaces/{id}/projects/{slug}/members/invite/{invitationId}/resend` | session | Resend the invitation e-mail. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/members/invite/{invitationId}` | session | Delete a project invitation. |
| GET | `/api/workspaces/{id}/projects/{slug}/members/invite` | session | List project invitations. |
| POST | `/api/workspaces/{id}/projects/{slug}/members/invite` | session | Create a project invitation. |
| GET | `/api/workspaces/{id}/projects/{slug}/members` | session | List members. |
| POST | `/api/workspaces/{id}/projects/{slug}/members` | session | Add a member. |
| GET | `/api/workspaces/{id}/projects/{slug}/progress` | session | Read issue progress for the project. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/restore` | session | Restore an archived project. |
| DELETE | `/api/workspaces/{id}/projects/{slug}` | session | Delete a project. |
| GET | `/api/workspaces/{id}/projects/{slug}` | session | Read one project. |
| PATCH | `/api/workspaces/{id}/projects/{slug}` | session | Update a project. |
| POST | `/api/workspaces/{id}/projects/cover-image` | session | Upload a project cover image. |
| GET | `/api/workspaces/{id}/projects` | session | List projects. |
| POST | `/api/workspaces/{id}/projects` | session | Create a project. |

### Project states and labels (workspace level)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| DELETE | `/api/workspaces/{id}/project-labels/{labelId}` | session | Delete a project label. |
| PATCH | `/api/workspaces/{id}/project-labels/{labelId}` | session | Update a project label. |
| GET | `/api/workspaces/{id}/project-labels` | session | List project labels. |
| POST | `/api/workspaces/{id}/project-labels` | session | Create a project label. |
| PATCH | `/api/workspaces/{id}/project-states/{stateId}/default` | session | Make the project state the default. |
| DELETE | `/api/workspaces/{id}/project-states/{stateId}` | session | Delete a project state. |
| PATCH | `/api/workspaces/{id}/project-states/{stateId}` | session | Update a project state. |
| GET | `/api/workspaces/{id}/project-states` | session | List project states. |
| POST | `/api/workspaces/{id}/project-states` | session | Create a project state. |

### Project content (links, attachments, updates, reactions, estimate)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| DELETE | `/api/workspaces/{id}/projects/{slug}/attachments/{attachmentId}` | session | Delete an attachment. |
| GET | `/api/workspaces/{id}/projects/{slug}/attachments` | session | List attachments. |
| POST | `/api/workspaces/{id}/projects/{slug}/attachments` | session | Create an attachment. |
| GET | `/api/workspaces/{id}/projects/{slug}/estimate` | session | Read estimate settings. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/estimate` | session | Update estimate system and model. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/estimate/values/{valueId}` | session | Delete an estimate value. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/estimate/values/{valueId}` | session | Update an estimate value. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/estimate/values/reorder` | session | Reorder the estimate value list. |
| POST | `/api/workspaces/{id}/projects/{slug}/estimate/values` | session | Create an estimate value. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/links/{linkId}` | session | Delete a link. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/links/{linkId}` | session | Update a link. |
| GET | `/api/workspaces/{id}/projects/{slug}/links` | session | List links. |
| POST | `/api/workspaces/{id}/projects/{slug}/links` | session | Create a link. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/reactions/{emoji}` | session | Remove the caller's emoji reaction. |
| PUT | `/api/workspaces/{id}/projects/{slug}/reactions/{emoji}` | session | Add the caller's emoji reaction. |
| GET | `/api/workspaces/{id}/projects/{slug}/reactions` | session | List reactions. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/updates/{updateId}/reactions/{emoji}` | session | Remove the caller's emoji reaction. |
| PUT | `/api/workspaces/{id}/projects/{slug}/updates/{updateId}/reactions/{emoji}` | session | Add the caller's emoji reaction. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/updates/{updateId}/replies/{replyId}` | session | Delete an update reply. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/updates/{updateId}/replies/{replyId}` | session | Update an update reply. |
| GET | `/api/workspaces/{id}/projects/{slug}/updates/{updateId}/replies` | session | List update replies. |
| POST | `/api/workspaces/{id}/projects/{slug}/updates/{updateId}/replies` | session | Create an update reply. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/updates/{updateId}` | session | Delete a project update. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/updates/{updateId}` | session | Update a project update. |
| GET | `/api/workspaces/{id}/projects/{slug}/updates` | session | List project updates. |
| POST | `/api/workspaces/{id}/projects/{slug}/updates` | session | Create a project update. |

### Issues and their relations

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issue-types/{typeId}` | session | Delete an issue type. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/issue-types/{typeId}` | session | Update an issue type. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/issue-types/reorder` | session | Reorder the issue type list. |
| GET | `/api/workspaces/{id}/projects/{slug}/issue-types` | session | List issue types. |
| POST | `/api/workspaces/{id}/projects/{slug}/issue-types` | session | Create an issue type. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/assignees/{userId}` | session | Delete an assignee. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/assignees` | session | List assignees. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/assignees` | session | Assign a user to the issue. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/attachments/{attachmentId}` | session | Delete an attachment. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/attachments` | session | List attachments. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/attachments` | session | Create an attachment. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/children` | session | List sub-issues. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/comments/{commentId}` | session | Delete a comment. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/comments/{commentId}` | session | Update a comment. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/comments` | session | List comments. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/comments` | session | Create a comment. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/dependencies/{dependencyId}` | session | Delete a dependency. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/dependencies` | session | List dependencies. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/dependencies` | session | Create a dependency. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/labels/{labelId}` | session | Delete a label. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/labels` | session | List labels. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/labels` | session | Create a label. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/relations/{relationId}` | session | Delete a relation. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/relations` | session | List relations. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/relations` | session | Create a relation. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}` | session | Delete an issue. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}` | session | Update an issue. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/subscribe` | session | Remove the caller's subscription. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/subscribe` | session | Add the caller's subscription. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/votes` | session | Withdraw the caller's vote. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/votes` | session | Vote summary for an issue. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues/{issueId}/votes` | session | Vote on an issue. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues/by-identifier/{identifier}` | session | Read an issue by its human identifier. |
| GET | `/api/workspaces/{id}/projects/{slug}/issues` | session | List issues. |
| POST | `/api/workspaces/{id}/projects/{slug}/issues` | session | Create an issue. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/labels/{labelId}` | session | Delete a label. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/labels/{labelId}` | session | Update a label. |
| GET | `/api/workspaces/{id}/projects/{slug}/labels` | session | List labels. |
| POST | `/api/workspaces/{id}/projects/{slug}/labels` | session | Create a label. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/states/{stateId}/default` | session | Make the state the default. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/states/{stateId}` | session | Delete a state. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/states/{stateId}` | session | Update a state. |
| GET | `/api/workspaces/{id}/projects/{slug}/states` | session | List states. |
| POST | `/api/workspaces/{id}/projects/{slug}/states` | session | Create a state. |

### Cycles and modules

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| DELETE | `/api/workspaces/{id}/projects/{slug}/cycles/{cycleId}/members/{userId}` | session | Remove a member. |
| GET | `/api/workspaces/{id}/projects/{slug}/cycles/{cycleId}/members` | session | List members. |
| POST | `/api/workspaces/{id}/projects/{slug}/cycles/{cycleId}/members` | session | Add a member. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/cycles/{cycleId}` | session | Delete a cycle. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/cycles/{cycleId}` | session | Update a cycle. |
| GET | `/api/workspaces/{id}/projects/{slug}/cycles` | session | List cycles. |
| POST | `/api/workspaces/{id}/projects/{slug}/cycles` | session | Create a cycle. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/modules/{moduleId}/favorite` | session | Remove the caller's favorite. |
| POST | `/api/workspaces/{id}/projects/{slug}/modules/{moduleId}/favorite` | session | Add the caller's favorite. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/modules/{moduleId}/members/{userId}` | session | Remove a member. |
| GET | `/api/workspaces/{id}/projects/{slug}/modules/{moduleId}/members` | session | List members. |
| POST | `/api/workspaces/{id}/projects/{slug}/modules/{moduleId}/members` | session | Add a member. |
| DELETE | `/api/workspaces/{id}/projects/{slug}/modules/{moduleId}` | session | Delete a module. |
| PATCH | `/api/workspaces/{id}/projects/{slug}/modules/{moduleId}` | session | Update a module. |
| GET | `/api/workspaces/{id}/projects/{slug}/modules` | session | List modules. |
| POST | `/api/workspaces/{id}/projects/{slug}/modules` | session | Create a module. |

### Wiki

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| PATCH | `/api/workspaces/{id}/wiki/{wikiPageId}/archive` | session | Archive a wiki page. |
| PATCH | `/api/workspaces/{id}/wiki/{wikiPageId}/comments/{commentId}/resolve` | session | Resolve or reopen a wiki comment. |
| DELETE | `/api/workspaces/{id}/wiki/{wikiPageId}/comments/{commentId}` | session | Delete a comment. |
| PATCH | `/api/workspaces/{id}/wiki/{wikiPageId}/comments/{commentId}` | session | Update a comment. |
| GET | `/api/workspaces/{id}/wiki/{wikiPageId}/comments` | session | List comments. |
| POST | `/api/workspaces/{id}/wiki/{wikiPageId}/comments` | session | Create a comment. |
| PATCH | `/api/workspaces/{id}/wiki/{wikiPageId}/move` | session | Move a wiki page in the tree. |
| GET | `/api/workspaces/{id}/wiki/{wikiPageId}` | session | Read one wiki page. |
| PATCH | `/api/workspaces/{id}/wiki/{wikiPageId}` | session | Update a wiki page. |
| GET | `/api/workspaces/{id}/wiki/media` | session | Get a signed URL for a wiki media object (`key` query). |
| POST | `/api/workspaces/{id}/wiki/media` | session | Upload wiki media. |
| GET | `/api/workspaces/{id}/wiki` | session | List wiki pages. |
| POST | `/api/workspaces/{id}/wiki` | session | Create a wiki page. |

### Billing

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/coupons/validate` | session | Preview a coupon code. |
| POST | `/api/payment/plan` | session | Create a plan subscription (AbacatePay checkout). |
| POST | `/api/payment/webhook` | `x-webhook-secret` | Receive AbacatePay billing events. |

### Careers and sales

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/admin/careers/{id}` | session + platform admin | Read one career job. |
| PATCH | `/api/admin/careers/{id}` | session + platform admin | Update a career job. |
| PATCH | `/api/admin/careers/{id}/status` | session + platform admin | Change the status of a career job. |
| GET | `/api/admin/careers` | session + platform admin | List career jobs. |
| POST | `/api/admin/careers` | session + platform admin | Create a career job. |
| POST | `/api/careers/{slug}/apply` | public | Apply to a career job. |
| POST | `/api/talk-to-sales` | public | Submit the sales contact form. |

### Productivity (short links, sticky notes)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| DELETE | `/api/short-links/{id}` | session | Delete a short link. |
| PATCH | `/api/short-links/{id}` | session | Update a short link. |
| GET | `/api/short-links` | session | List short links. |
| POST | `/api/short-links` | session | Create a short link. |
| DELETE | `/api/sticky-notes/{id}` | session | Delete a sticky note. |
| PATCH | `/api/sticky-notes/{id}` | session | Update a sticky note. |
| GET | `/api/sticky-notes` | session | List sticky notes. |
| POST | `/api/sticky-notes` | session | Create a sticky note. |
## Gotchas

- The 182 operations include `GET /health` and `POST /payment/webhook`, which are deliberately not enveloped (`NON_ENVELOPE_OPERATIONS` in `src/__tests__/contract/openapi-spec.contract.test.ts`).
- `GET /status` is public and rate limited by IP (`apiLimiter`, `app/api/status/route.ts`); `GET /health` is public and unlimited; `POST /status/collect/*` pass the proxy as public but fail without `x-status-secret`.
- Some GET list endpoints accept paging parameters that the spec only partly documents; see "Pagination" in [README.md](./README.md).
- `GET /workspaces/{id}/projects/{slug}/issues` reads `cursor` and `limit` through `ListIssuesQuerySchema`, but `public/openapi.json` does not document them (that operation lists only the `id` and `slug` path parameters). Known issue: the spec lags the route, and the contract suite does not compare query parameters. The pagination arrived in `8ba2c60b`.

## Related files

- `app/api/**/route.ts`
- `public/openapi.json`
- `proxy.ts` (`PUBLIC_ROUTES`)
- `src/__tests__/contract/openapi.ts` (route inventory helper)
