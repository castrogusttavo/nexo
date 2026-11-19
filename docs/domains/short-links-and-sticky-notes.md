# Short links and sticky notes

Two small, user-scoped features that belong to a person and not to a workspace: a personal list of saved links ("shortcuts") and personal sticky notes. They are the simplest complete vertical slices in the codebase, and `app/api/sticky-notes/route.ts` is the canonical example cited in `CLAUDE.md`. Neither has a workspace, a project or a sharing model.

## Contract

`src/schemas/short-link.schema.ts`
- `CreateShortLinkSchema`: `title` 2-100 chars, `url` a valid URL up to 2048 chars.
- `UpdateShortLinkSchema`: the same, `.partial()`.

`src/schemas/sticky-note.schema.ts`
- `StickyColorSchema`: `RED | YELLOW | BLUE | GREEN | PURPLE | ZINC`.
- `CreateStickyNoteSchema`: optional `content` (a TipTap JSON object, at most 100,000 serialized characters) and optional `color`. `UpdateStickyNoteSchema` is the partial.

Despite the name, a short link does not shorten anything or redirect: it stores a title and a target URL. No public `/s/<code>` route exists in `app/`. Whether a redirect feature is planned is not defined in this repository.

## Data model

`prisma/schema.prisma`:

- `ShortLink` (`short_links`): `title`, `url`, `userId` (cascade on user delete), index on `createdAt`.
- `StickyNote` (`sticky_notes`): `content` JSON, `color` (`StickyColor`, default `ZINC`), `userId` (cascade), index on `(userId, updatedAt)`.

Both disappear with the user, so account deletion needs no special step for them (see [user-and-account.md](./user-and-account.md)).

## Service rules and authorization

`src/services/short-link.service.ts` and `sticky-note.service.ts` follow the same shape:

- `list` returns only the actor's rows. Repositories filter by `userId` (`listByUserId`); short links order by `createdAt` descending, sticky notes by `updatedAt` descending.
- `getById`, `update` and `delete` load the row and compare `row.userId` with the actor, returning `forbidden()` otherwise. A foreign id answers 403, not 404, so it confirms the id exists.
- `create` stamps `userId` from the session, never from the body.
- Every mutation emits `auditMutation` (`entity: short_link` / `sticky_note`), including failures; the ownership failure is recorded with reason `not_owner`.
- There are no per-user count limits in the services or schemas, so none is enforced today.

## Error codes

No feature-specific codes: they use `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `VALIDATION_ERROR` and `RATE_LIMITED` from `src/errors/codes.ts`.

## Routes

| Route | Methods | Notes |
|---|---|---|
| `app/api/sticky-notes/route.ts` | GET, POST | built with `withAuthenticatedRoute` / `withValidatedBody` from `utils/api-handler.ts` |
| `app/api/sticky-notes/[id]/route.ts` | PATCH, DELETE | |
| `app/api/short-links/route.ts` | GET, POST | same helpers |
| `app/api/short-links/[id]/route.ts` | PATCH, DELETE | hand-written handler with `withAxiom` |

`utils/api-handler.ts` packages the standard chain (session, `apiLimiter` per user, optional consent gate, handler, envelope). The create routes pass `consentResource: 'page:(private)'`, so a user who has not accepted the terms gets the consent error. The `[id]` short-link handler repeats the chain by hand and also calls `requireConsent`. The `/api/short-links` and `/api/sticky-notes` paths are not in `PUBLIC_ROUTES`, so `proxy.ts` requires a session cookie first.

## UI entry points

- Short links: `app/_components/user/shortcut-link/` (`user-shortcut-link-list.tsx`, `user-shortcut-link-dialog.tsx`), hook `src/hooks/use-short-link.ts`.
- Sticky notes: `app/_components/user/sticky/` (`user-sticky.tsx`, `user-sticky-list.tsx`, `user-sticky-create-button.tsx`), hook `src/hooks/use-sticky-note.ts`.

## Caching and queues

No Redis cache and no queues; reads go straight to Prisma.

## Tests

- Unit: `src/services/__tests__/{short-link,sticky-note}.service.test.ts`, `src/schemas/__tests__/{short-link,sticky-note}.schema.test.ts`, `src/mappers/__tests__/`.
- Integration: `src/repositories/__tests__/{short-link,sticky-note}.repository.test.ts`.
- Component: `src/hooks/__tests__/use-{short-link,sticky-note}.component.test.tsx`, `app/_components/user/sticky/__tests__/`.

## Related files

`src/repositories/{short-link,sticky-note}.repository.ts`, `src/mappers/{short-link,sticky-note}.mapper.ts`, `utils/api-handler.ts`, `src/lib/consent.ts`.
