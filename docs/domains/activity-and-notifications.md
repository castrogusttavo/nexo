# Activity, comments, status updates, votes, attachments and notification settings

Everything that records or discusses what happens around an issue or project:

- the **activity feed** (field-level change history for issues, cycles and modules),
- **comments** on issues,
- **project status updates** with replies and emoji reactions,
- **votes** on issues,
- **attachments** on issues (project attachments are in [project.md](./project.md)),
- the per-user **notification settings**.

Notification settings are also summarised in [user-and-account.md](./user-and-account.md). Issues are in [issue.md](./issue.md); cycles and modules in [cycle.md](./cycle.md) and [module.md](./module.md).

## Contract

`src/schemas/`:

- `activity.schema.ts`: `ListActivityQuerySchema` is `{ entityType: ISSUE | CYCLE | MODULE, entityId }`.
- `comment.schema.ts`: `CreateCommentSchema` (`content` is a rich-text object, max 100,000 serialized chars, optional `parentId`), `UpdateCommentSchema` (`content`).
- `update.schema.ts`: `CreateUpdateSchema` (`status` `ON_TRACK | AT_RISK | OFF_TRACK`, optional `content` max 2000), `EditUpdateSchema` (same shape), `CreateUpdateReplySchema` (`content` trimmed, 1 to 2000), `UpdateEmojiSchema` (a single grapheme that starts with an emoji, max 32 chars, via `isSingleEmoji`), `ListUpdatesQuerySchema` (`cursor` string, `limit` 1 to 50, default 20).
- `issue-vote.schema.ts`: `{ type: UP | DOWN }`.
- `attachment.schema.ts`: `CreateAttachmentSchema` (`fileName`, `contentType`, `size` up to 25 MB). The issue upload route reads multipart `formData` with a `file` field, so that schema is metadata-shaped, not the request body. `TODO: confirm` where it is used.
- `notification-settings.schema.ts`: `UpdateNotificationSettingSchema`, booleans `priorityChanges`, `stateChanges`, `comments`, `mentions`, at least one key required.

## Data model

`prisma/schema.prisma`:

- `Activity`: `entityType` (`ActivityEntityType`: `ISSUE | CYCLE | MODULE`), `entityId` (a plain string, not a foreign key), `actorId?` (`SetNull`), `field`, `oldValue` / `newValue` (Json). Indexed on `(entityType, entityId, createdAt)`.
- `Comment`: `content` Json, `issueId` (cascade), `authorId?`, `parentId?` (self relation `CommentThread`, cascade), `editedAt`.
- `Update`: `status`, `content?`, `projectId?`, `issueId?`, `authorId?`, `editedAt`. The model has both a project and an issue link, but the service only handles project updates. `UpdateReply` and `UpdateReaction` (composite id `(updateId, userId, emoji)`) hang off it.
- `IssueVote`: unique `(issueId, userId)`, `type` (`IssueVoteType`).
- `Attachment`: `fileName`, `contentType`, `size`, `bucket`, `key`, `issueId` (cascade), `uploadedById?` (`SetNull`).
- `NotificationSetting`: one row per user (`userId` unique), four booleans defaulting to true.

## Service rules and authorization

**Activity** (`activity.service.ts`, `_activity-diff.ts`)

- `list`: project read rule (public, OWNER/ADMIN, lead or member), then the entity must belong to the project (`ISSUE_NOT_FOUND`, `CYCLE_NOT_FOUND` or `MODULE_NOT_FOUND`).
- Writing is internal. `recordFieldChanges` compares before and after values field by field (dates normalised to ISO strings) and calls `ActivityService.record` for each difference, fire-and-forget. A failed insert is logged as `activity.record_failed` and never fails the request. Callers: `IssueService.update`, `CycleService.update`, `ModuleService.update` only.

**Comments** (`comment.service.ts`)

- All operations need OWNER/ADMIN, lead or project member (`ISSUE_FORBIDDEN`), unlike reads of issues which also allow public projects.
- `create`: a reply's parent must belong to the same issue (`COMMENT_NOT_FOUND`) and must itself be top-level; nesting is one level deep (`COMMENT_NESTING_TOO_DEEP`, 422).
- `update`: only the author (`COMMENT_FORBIDDEN`).
- `delete`: the author, or OWNER/ADMIN, or the project lead. Replies cascade.
- Audit: `entity: 'comment'`.

**Status updates** (`update.service.ts`)

- Every operation goes through `authorize`: see the project (public, privileged, lead or member, else `PROJECT_FORBIDDEN`), the writer must not be workspace `VIEWER` (`UPDATE_FORBIDDEN`), and the project must have `updatesEnabled` (`UPDATE_DISABLED`, 409). Only OWNER/ADMIN can switch `updatesEnabled` (see [project.md](./project.md)).
- `edit` and `editReply`: author only. `delete` and `deleteReply`: author, or moderators (OWNER/ADMIN or lead).
- `list` is cursor-paginated by id (`limit` plus one to detect a next page). `react` and `unreact` add or remove the actor's emoji.

**Votes** (`issue-vote.service.ts`): project member rule. `cast` upserts one vote per user (changing direction overwrites); `retract` deletes it. Both return the summary `{ up, down, myVote }`. A missing vote on retract maps to `ISSUE_VOTE_NOT_FOUND` in the repository.

**Issue attachments** (`attachment.service.ts`, `issue/_attachment.ts`, `src/lib/attachment-limits.ts`)

- Project member rule. `upload` validates the content type against `ALLOWED_ATTACHMENT_TYPES` (png, jpeg, gif, webp, svg, mp4, webm, quicktime, pdf, zip, plain text, csv), rejects empty files and files above 25 MB (`VALIDATION_ERROR`), writes the object to the `issue-attachments` bucket under `<issueId>/<cuid>` and then the row; if the row fails the object is removed.
- Listing returns a presigned download URL valid for one hour for each attachment.
- `remove` deletes the row and then the object. Storage is S3-compatible (`src/lib/storage/s3.ts`); see [../adr/0007-silo-storage.md](../adr/0007-silo-storage.md). A storage failure on upload is `storageError`.

**Notification settings** (`notification-setting.service.ts`)

- Strictly the actor's own row: the route takes no user id. `get` reads the Redis cache first, then the database, and lazily creates the row with defaults on first read. `update` upserts, invalidates the cache and audits (`entity: 'notification_setting'`).

## Error codes

`ISSUE_NOT_FOUND`, `ISSUE_FORBIDDEN`, `COMMENT_NOT_FOUND`, `COMMENT_FORBIDDEN`, `COMMENT_NESTING_TOO_DEEP` (422), `ATTACHMENT_NOT_FOUND`, `ISSUE_VOTE_NOT_FOUND`, `UPDATE_NOT_FOUND`, `UPDATE_REPLY_NOT_FOUND`, `UPDATE_FORBIDDEN`, `UPDATE_DISABLED` (409), `PROJECT_FORBIDDEN`. Statuses in `src/errors/codes.ts`. Activity and notification settings define no codes of their own.

## Routes and UI

Under `app/api/workspaces/[id]/projects/[slug]/`:

| Route | Methods |
|---|---|
| `activities` | GET (`?entityType=&entityId=`) |
| `issues/[issueId]/comments`, `comments/[commentId]` | GET/POST, PATCH/DELETE |
| `issues/[issueId]/votes` | GET, POST, DELETE |
| `issues/[issueId]/attachments`, `attachments/[attachmentId]` | GET/POST (multipart), DELETE |
| `updates`, `updates/[updateId]` | GET/POST, PATCH/DELETE |
| `updates/[updateId]/replies`, `replies/[replyId]` | GET/POST, PATCH/DELETE |
| `updates/[updateId]/reactions/[emoji]` | PUT, DELETE |

User settings: `app/api/users/me/notifications/route.ts` (GET, PATCH).

UI:

- Project status updates: `app/(private)/[workspace-slug]/(home)/projects/[slug]/overview/_components/updates/` (card, form, health picker, replies) and the enablement page `projects/[slug]/settings/project-updates/`. Hook: `src/hooks/use-update.ts`.
- Notification settings: `app/_components/user/modal/tabs/user-modal-notifications-tab.tsx` with `src/hooks/user-notification-settings.ts`.
- Hooks `use-activity.ts`, `use-comment.ts`, `use-issue-vote.ts` and `use-attachment.ts` exist, but no component under `app/` or `components/` imports them yet, and `issue-details-panel.tsx` only wires issue updates. The issue-side UI for comments, activity, votes and attachments is therefore not built; the API is.
- The inbox page (`app/(private)/[workspace-slug]/(home)/inbox/page.tsx`) is a placeholder that renders the word "Inbox".

## Caching

- `NotificationSettingCache` (`src/cache/notification-setting.cache.ts`): `createKeyedCache`, prefix `notif:`, TTL 15 minutes, invalidated on update.
- Nothing else here is cached. Activity, comments, votes and updates read the database directly.

## Gotchas

- **Notification settings are stored but nothing consumes them.** A search of `src/`, `app/`, `lib/`, `components/` and `worker/` finds `priorityChanges`, `stateChanges`, `comments` and `mentions` only in the settings schema, repository, cache, service, route and UI. No email, push or in-app delivery reads them, and there is no `Notification` model. `TODO: confirm` the delivery plan.
- The activity feed does not include assignee, label, title or description changes, and cycle/module delete is not recorded.
- `Activity.entityId` is not a foreign key; rows survive when the entity is deleted and are never cleaned up by a cascade. `TODO: confirm` retention.
- Issue subscribers exist (`IssueSubscriber`, subscribe route) and assigning subscribes the assignee, but there is no sender that uses them yet.
- Comment and update write access differs: comments need project membership; updates also admit readers of a public project (except `VIEWER`).

## Tests

- Unit: `src/services/__tests__/{activity,comment,update,issue-vote,attachment,notification-setting}.service.test.ts`, mappers and schemas under `src/mappers/__tests__/` and `src/schemas/__tests__/`.
- Integration: `src/repositories/__tests__/{activity,comment,update,update-reply,update-reaction,issue-vote,attachment,notification-setting}.repository.test.ts`, `src/cache/__tests__/notification-setting.cache.test.ts`.
- E2E: `route.e2e.test.ts` under each route folder, and `app/api/users/me/notifications/__tests__/notification.e2e.test.ts`.
- Factories: `activity`, `comment`, `attachment`, `update`, `notification-setting` in `src/__tests__/factories/`.

## Related files

- `src/services/activity.service.ts`, `_activity-diff.ts`, `comment.service.ts`, `update.service.ts`, `issue-vote.service.ts`, `attachment.service.ts`, `notification-setting.service.ts`
- `src/cache/notification-setting.cache.ts`, `src/lib/attachment-limits.ts`
- `prisma/schema.prisma` (`Activity`, `Comment`, `Update`, `UpdateReply`, `UpdateReaction`, `IssueVote`, `Attachment`, `NotificationSetting`)
