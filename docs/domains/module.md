# Modules

A module groups issues around a theme or deliverable inside a project. It mirrors cycles in shape (lead, members, dates, status) and adds a stored `progress` number and per-user favorites. As with cycles, the backend is complete and the project UI is not built yet. See [cycle.md](./cycle.md) for the time-boxed sibling and [issue.md](./issue.md) for the issues a module collects.

## Contract

`src/schemas/module.schema.ts`:

- `ModuleStatusSchema`: `BACKLOG | PLANNED | IN_PROGRESS | PAUSED | COMPLETED | CANCELLED`.
- `CreateModuleSchema`: `name` 2 to 100 chars, `status` default `BACKLOG`, optional `startDate` and `endDate`.
- `UpdateModuleSchema`: all optional, plus `progress` (integer 0 to 100). Unlike cycles and issues, `startDate` and `endDate` are not nullable here, so a client cannot clear a date through the API.
- `src/schemas/module-member.schema.ts`: add-member body.

DTOs are built by `src/mappers/module.mapper.ts` (`toModuleDTO`, `toModuleMemberDTO` with `isLead`).

## Data model

`prisma/schema.prisma`:

- `Module`: `name`, `progress` (Int, default 0), `status`, `startDate?`, `endDate?`, `leadId?` (`SetNull`), `projectId` (cascade). Note there is no `description` column, unlike `Cycle`.
- `ModuleMember` and `ModuleFavorite`: `(userId, moduleId)` unique, cascade.
- `Issue.moduleId` is `SetNull`.

## Service rules and authorization

`src/services/module.service.ts`, same pattern as cycles:

- **Read** (`list`, `listMembers`, `favorite`, `unfavorite`): public project, OWNER/ADMIN, lead or project member, else `PROJECT_FORBIDDEN`. Favoriting is a read-level action, so any reader can favorite.
- **Write** (`create`, `update`, `delete`, `addMember`, `removeMember`): OWNER/ADMIN or project lead, else `MODULE_FORBIDDEN`.
- **Lead** is the actor on create. `removeMember` refuses to remove the lead (`MODULE_FORBIDDEN`, "Não é possível remover o lead do módulo").
- A module from another project answers `MODULE_NOT_FOUND`.
- `addMember` does not verify that the target belongs to the project (same as cycles). A duplicate becomes `MODULE_MEMBER_ALREADY_EXISTS` through `P2002` in `src/repositories/module.repository.ts`.
- `progress` is writable data, not derived from issue states. The project-level progress view is derived separately (see [project.md](./project.md)). Nothing in the code computes it: it is set only through `UpdateModuleSchema` (`progress`, integer 0 to 100) and `module.service.ts`. A plan to compute it is not defined in this repository.
- Activity: `update` records `status`, `startDate`, `endDate` and `progress` with entity type `MODULE`.
- Audit: `auditMutation` with `entity: 'module'`.

## Error codes

`MODULE_NOT_FOUND` (404), `MODULE_FORBIDDEN` (403), `MODULE_MEMBER_ALREADY_EXISTS` (409), `MODULE_MEMBER_NOT_FOUND` (404).

## Routes and UI

Under `app/api/workspaces/[id]/projects/[slug]/modules/`:

| Route | Methods |
|---|---|
| `modules` | GET, POST |
| `modules/[moduleId]` | PATCH, DELETE |
| `modules/[moduleId]/members` | GET, POST |
| `modules/[moduleId]/members/[userId]` | DELETE |
| `modules/[moduleId]/favorite` | POST, DELETE |

UI: hooks in `src/hooks/use-module.ts`; consumers are `issue/picker/module-picker.tsx`, the issue list view and filters. The "Módulos" tab in `project-tabs.tsx` is `comingSoon`. `settings/features/modules/page.tsx` toggles `Project.modulesEnabled`.

## Caching

None.

## Gotchas

- `modulesEnabled` is not enforced server-side; it only hides the tab.
- No date-order validation (`endDate` before `startDate`). Known behaviour: a module can be saved with `endDate` before `startDate`.
- Deleting a module hard-deletes it and detaches its issues; no activity entry is written for delete.

## Tests

- Unit: `src/services/__tests__/module.service.test.ts`, `src/mappers/__tests__/module.mapper.test.ts`, `src/schemas/__tests__/module*.schema.test.ts`.
- Integration: `src/repositories/__tests__/module.repository.test.ts`.
- E2E: `__tests__/route.e2e.test.ts` under each `modules` route folder.
- Factory: `src/__tests__/factories/module.factory.ts`.

## Related files

- `src/services/module.service.ts`, `src/repositories/module.repository.ts`, `src/mappers/module.mapper.ts`
- `src/hooks/use-module.ts`
- `app/api/workspaces/[id]/projects/[slug]/modules/`
- `prisma/schema.prisma` (`Module`, `ModuleMember`, `ModuleFavorite`, `ModuleStatus`)
