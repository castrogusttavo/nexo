# Wiki

A workspace-wide knowledge base: a tree of pages written in a rich-text (Plate) editor, with threaded comments tied to text ranges, and uploaded media. This page also covers the editor media and embed endpoints used by the project editors, because they share the same storage and editor stack.

## Contract

`src/schemas/`:

- `wiki-page.schema.ts`: `CreateWikiPageSchema` (`title` up to 255, default empty; optional `parentId` cuid2; optional `icon` up to 16 chars), `UpdateWikiPageSchema` (`title`, `icon` nullable, `coverImage` URL nullable, `content`), `MoveWikiPageSchema` (`parentId` nullable, `position` non-negative int). `content` is an array of Plate nodes capped at 100,000 serialized characters.
- `wiki-comment.schema.ts`: `CreateWikiCommentSchema` (`markId` 1-64, `content`, optional `parentId`), `UpdateWikiCommentSchema`, `ResolveWikiCommentSchema` (`resolved`). Comment content is capped at 20,000 serialized characters.
- `embed-metadata.schema.ts`: `EmbedMetadataSchema` (`url`, https only, max 2048).

## Data model

`prisma/schema.prisma`:

- `WikiPage`: belongs to a `Workspace` (cascade), optional self-parent `parentId` (cascade), `title`, `icon`, `coverImage`, `content` (JSON), `yjsState` (bytes, the collaborative document state), `position`, `createdById` / `updatedById` (set null on user delete), `archivedAt` (soft delete).
- `WikiComment`: belongs to a page (cascade); `authorId` (set null), `parentId` (a thread), `markId` (the discussion id shared by the root and its replies, matching the editor's `comment_<markId>` mark), `content`, `resolved`, `resolvedAt`, `resolvedById`. Index on `(wikiPageId, markId)`.

## Service rules and authorization

Everything is in `src/services/` and every call starts with `assertMember` (`_authz.ts`): any member of the workspace may read and write the wiki. There is no `VIEWER` restriction in the service. Known behaviour: a workspace `VIEWER` can create, edit, move and archive wiki pages, unlike project updates and reactions, which exclude `VIEWER`.

**Pages** (`wiki-page.service.ts`)
- Each method loads the page and compares `page.workspaceId` to the workspace in the URL, returning `WIKI_PAGE_FORBIDDEN` on a mismatch (so a page id from another tenant never resolves).
- `create` validates the parent belongs to the same workspace. `update` autosaves content; a content-only update is deliberately not audited (it would flood the trail), metadata edits and all failures are.
- `move` rejects a page becoming its own parent. It does not check that the new parent is not one of the page's own descendants; the service shows no such check. Known issue: no UI prevents it either, since no component or hook in `app/`, `components/` or `src/hooks/` calls the move route, so a cycle can be created through the API.
- `archive` is a soft delete done in a transaction by `WikiPageRepository.archive`: the page and its entire subtree get one shared `archivedAt`, so a future restore can bring back exactly what went away together. Lists exclude archived pages (`archivedAt: null`). No restore endpoint exists in `app/api`.

**Comments** (`wiki-comment.service.ts`)
- Replies are one level deep only (`WIKI_COMMENT_NESTING_TOO_DEEP`); a reply takes its parent's `markId` regardless of what the client sent.
- Only the author may edit. The author or a privileged member (`OWNER`/`ADMIN`) may delete. Only a thread root can be resolved (`resolve` / `unresolve`).
- All mutations are audited (`entity: wiki_comment`).

**Media** (`wiki-media.service.ts`, `_wiki-media.ts`)
- Upload to bucket `wiki-media`, key `<workspaceId>/<cuid><ext>`. Size limits by type: image 10 MB, video 200 MB, audio 50 MB, anything else 25 MB; an empty file is rejected. Allowed image types include `image/svg+xml`.
- The response carries a presigned download URL valid for one hour. `getDownloadUrl` re-issues one and rejects keys that do not start with the caller's `workspaceId/`.
- There is no content-type allowlist for the generic "file" category: any type is accepted up to 25 MB (`maxBytesFor` in `src/services/_wiki-media.ts` falls through to `MAX_FILE_BYTES`). Known behaviour: no allowlist applies to that category.

**Project editor media and embeds** (project-scoped, not wiki)
- `editor-media.service.ts` (bucket `issue-editor-media`, key `<projectId>/...`): images and videos only. Upload requires a privileged member, the project lead or a project member; download also allows any member for a public project. It uses `resolveProject` from `_project-scope.ts`.
- `embed-metadata.service.ts` resolves a URL through `matchEmbedProvider` (`lib/embed-providers.ts`, https and a host allowlist) and, via `embed-thumbnail.service.ts`, caches a provider thumbnail (bucket `issue-embed-thumbnails`; only YouTube has a fetcher; redirects are refused).

## Real-time collaboration

`realtime/index.ts` is a separate Hocuspocus server (`@hocuspocus/server`, Redis extension) that authenticates the session, runs `assertMember`, and loads and stores the Yjs state through `WikiPageRepository` (`yjsState`). The HTTP `PATCH` of `content` and the Yjs state are two persistence paths for the same page, and the code does not reconcile them: the editor autosaves `content` only as a flat JSON snapshot for listing and search (comment in `wiki-page-editor.tsx`), while the realtime server loads and stores only `yjsState`. A `PATCH` of `content` therefore does not change what live editors see.

## Error codes

`src/errors/codes.ts`: `WIKI_PAGE_FORBIDDEN` (403), `WIKI_PAGE_NOT_FOUND` (404), `WIKI_COMMENT_NOT_FOUND` (404), `WIKI_COMMENT_FORBIDDEN` (403), `WIKI_COMMENT_NESTING_TOO_DEEP`; media failures use `VALIDATION_ERROR` and the storage error.

## Routes and UI

All under `app/api/workspaces/[id]/wiki/`, all with `apiLimiter` per user:

| Route | Methods |
|---|---|
| `route.ts` | GET (list), POST |
| `[wikiPageId]/route.ts` | GET, PATCH |
| `[wikiPageId]/move/route.ts` | PATCH |
| `[wikiPageId]/archive/route.ts` | PATCH |
| `[wikiPageId]/comments/route.ts` | GET, POST |
| `[wikiPageId]/comments/[commentId]/route.ts` | PATCH, DELETE |
| `[wikiPageId]/comments/[commentId]/resolve/route.ts` | PATCH |
| `media/route.ts` | POST (upload), GET (`?key=` download URL) |

Project-side: `app/api/workspaces/[id]/projects/[slug]/{editor-media,embed-metadata,embed-thumbnails/[key]}/route.ts`.

UI: `app/(private)/[workspace-slug]/wiki/` (`layout.tsx`, `page.tsx`, `[wiki-id]/page.tsx`, `_components/wiki-sidebar.tsx`) and `app/_components/workspace/wiki/` (`wiki-page-editor`, `wiki-sidebar-tree`, `wiki-create-page-button`, `wiki-header`). Pages read the tenant through `getWikiContext` / `getWikiPageContext` (`src/lib/wiki-context.ts`), which go through the DAL's `requireMembership` and call `io()` before the query so a prerender does not draw random bytes. Hooks: `src/hooks/use-wiki-page.ts`, `use-wiki-comment.ts`, `use-wiki-media.tsx`, `use-wiki-editor-context.tsx`, `use-editor-media.ts`, `use-embed-metadata.ts`.

## Caching and queues

No Redis cache and no BullMQ job for the wiki. Reads hit the repository every time. Hocuspocus uses Redis for cross-instance sync.

## Tests

- Unit: `src/services/__tests__/{wiki-page,wiki-comment,wiki-media,_wiki-media,editor-media,_editor-media,embed-metadata,embed-thumbnail,_embed-thumbnail}*.test.ts`; schemas and mappers under `src/schemas/__tests__/` and `src/mappers/__tests__/`.
- Integration: `src/repositories/__tests__/wiki-page.repository.test.ts`, `wiki-comment.repository.test.ts`.
- Component: `src/hooks/__tests__/use-wiki-*.component.test.tsx`, `app/_components/workspace/wiki/__tests__/`.
- Browser: `e2e/specs/wiki-editor.spec.ts`.

## Related files

`src/repositories/wiki-page.repository.ts`, `src/repositories/wiki-comment.repository.ts`, `src/mappers/wiki-{page,comment}.mapper.ts`, `src/lib/storage/s3.ts`, `realtime/index.ts`, `src/__tests__/factories/wiki-page.factory.ts`.
