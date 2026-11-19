# Labels, states, issue types, estimates and project-level states and labels

Two families of configuration data look alike and must not be confused:

- **Per-project, issue-facing**: `State`, `Label`, `IssueType`, `EstimateSettings` / `EstimateValue`. They classify issues and are owned by one project.
- **Per-workspace, project-facing**: `ProjectState` and `ProjectLabel`. They classify projects themselves (a project's lifecycle) and are owned by the workspace.

The issues they classify are in [issue.md](./issue.md); the project record is in [project.md](./project.md).

## Contract

All in `src/schemas/`; colors use `TagColorSchema` from `_shared.ts` (`RED | YELLOW | BLUE | GREEN | PURPLE | ZINC`, default `ZINC`).

| Schema file | Create | Update |
|---|---|---|
| `state.schema.ts` | `name` (1 to 50), optional `description` (max 280), `group` (`BACKLOG | UNSTARTED | STARTED | COMPLETED | CANCELLED`), `color` | `name`, `description`, `color`, `order`; no `group` |
| `label.schema.ts` | `name`, `description`, `color` | same, optional |
| `issue-type.schema.ts` | `name`, `description`, `color`, `icon` (1 to 50) | same, optional; plus `ReorderIssueTypesSchema` (`typeIds`) |
| `estimate.schema.ts` | `CreateEstimateValueSchema` (`value` 1 to 20 chars) | `UpdateEstimateSettingsSchema` (`system` + `model`), `UpdateEstimateValueSchema`, `ReorderEstimateValuesSchema` (`valueIds`) |
| `project-state.schema.ts` | like `state.schema.ts` but `group` is `DRAFT | PLANNING | EXECUTION | MONITORING | COMPLETED | CANCELLED` | no `group`, with a comment: moving between groups could empty one, so delete and recreate |
| `project-label.schema.ts` | `name`, `description`, `color` | same, optional |

Estimate settings refine the pair: `POINTS` allows `FIBONACCI | LINEAR | SQUARES`, `CATEGORIES` allows `T_SHIRT_SIZES | EASY_TO_HARD`, `TIME` allows `HOURS`; any other pair fails with "Modelo incompatível com o sistema escolhido". Names and descriptions in validation messages are pt-BR.

## Data model

`prisma/schema.prisma`:

- `State`: `group` (`StateGroup`), `order`, `isDefault`, `projectId` (cascade). `Issue.stateId` has no `onDelete`.
- `Label` (project, indexed by `projectId`) and `IssueLabel` (the association, see [issue.md](./issue.md)).
- `IssueType`: `icon` (string key), `isSystem`, `order`, `projectId`. `Issue.typeId` has no `onDelete`.
- `EstimateSettings` (one per project, `projectId` unique; `system`, `model`) and `EstimateValue` (`value` string, `order`). `Issue.estimateValueId` is `SetNull`.
- `ProjectState`: `group` (`ProjectStateGroup`), `order`, `isDefault`, `workspaceId`, unique `(workspaceId, name)`. `Project.stateId` references it with `NoAction`.
- `ProjectLabel`: unique `(workspaceId, name)`, joined to projects by `ProjectLabelAssignment` (cascade both ways).

Seeds at project creation (`ProjectRepository.create`): default states `Backlog` (BACKLOG, default), `Pendente` (UNSTARTED), `Em progresso` (STARTED), `Concluído` (COMPLETED), `Cancelado` (CANCELLED) from `DEFAULT_STATES` in `state.repository.ts`; labels `Design` and `Code`; issue types `Task` and `Epic` flagged `isSystem`; estimate values 1, 2, 3, 5, 8, 13, 21, 34, 55 (`DEFAULT_ESTIMATE_VALUES`). Settings default to `POINTS` + `FIBONACCI`.

## Service rules and authorization

All per-project services use `resolveProject` and the common rule: **read** for readers (public project, OWNER/ADMIN, lead or project member), **write** for OWNER/ADMIN or the project lead.

- `state.service.ts`: a state from another project is `STATE_NOT_FOUND`. Delete refuses the default state (`STATE_IS_DEFAULT`, 409) and the last state of its group (`STATE_LAST_IN_GROUP`, 409). `setDefault` swaps the flag in one transaction (`updateMany` to false, then set true). The service does not check whether issues still use the state being deleted, and `Issue.stateId` is restrictive, so deleting a used state surfaces as a database error. `TODO: confirm` the user-visible behavior.
- `label.service.ts`: CRUD with `LABEL_FORBIDDEN` / `LABEL_NOT_FOUND`. Deleting a label cascades its `IssueLabel` rows.
- `issue-type.service.ts`: system types (`isSystem`) cannot be edited or deleted (`ISSUE_TYPE_SYSTEM_PROTECTED`, 409). `reorder` takes the full id list. New issues default to the system type named `Task`.
- `estimate.service.ts`: `get` returns settings with values. Changing `system`/`model` updates the settings only; it does not regenerate or convert values. Deleting the last value is refused (`ESTIMATE_VALUE_LAST_REMAINING`, 409). A value that is not part of the project's settings is `ESTIMATE_VALUE_FORBIDDEN`. Write denial is `ESTIMATE_SETTINGS_FORBIDDEN`.
- `project-state.service.ts` and `project-label.service.ts` are workspace-scoped and use `assertMember` plus a stricter write gate: **OWNER/ADMIN only** (`PROJECT_STATE_FORBIDDEN`, `PROJECT_LABEL_FORBIDDEN`). Any workspace member may list. A state of another workspace answers not found. Delete of a project state refuses the default (`PROJECT_STATE_IS_DEFAULT`) and the last in its group (`PROJECT_STATE_LAST_IN_GROUP`), and otherwise moves the affected projects to the first remaining state of the same group inside one transaction (`deleteMovingProjects`), returning `{ movedTo, count }`.
- A project may use a project state or project labels only when the workspace switches `projectStatesEnabled` / `projectLabelsEnabled` are on; that check lives in `ProjectService.update` (`PROJECT_STATES_DISABLED`, `PROJECT_LABELS_DISABLED`, 409).

Audit: each service calls `auditMutation` with its own entity (`state`, `label`, `issue_type`, `estimate_settings`, `project_state`, `project_label`).

## Error codes

`STATE_NOT_FOUND`, `STATE_FORBIDDEN`, `STATE_LAST_IN_GROUP`, `STATE_IS_DEFAULT`; `LABEL_NOT_FOUND`, `LABEL_FORBIDDEN`; `ISSUE_TYPE_NOT_FOUND`, `ISSUE_TYPE_FORBIDDEN`, `ISSUE_TYPE_SYSTEM_PROTECTED`; `ESTIMATE_SETTINGS_NOT_FOUND`, `ESTIMATE_SETTINGS_FORBIDDEN`, `ESTIMATE_VALUE_NOT_FOUND`, `ESTIMATE_VALUE_FORBIDDEN`, `ESTIMATE_VALUE_LAST_REMAINING`; `PROJECT_STATE_NOT_FOUND`, `PROJECT_STATE_FORBIDDEN`, `PROJECT_STATE_ALREADY_EXISTS`, `PROJECT_STATE_IS_DEFAULT`, `PROJECT_STATE_LAST_IN_GROUP`, `PROJECT_STATE_INVALID` (422), `PROJECT_STATES_DISABLED`; `PROJECT_LABEL_NOT_FOUND`, `PROJECT_LABEL_FORBIDDEN`, `PROJECT_LABEL_ALREADY_EXISTS`, `PROJECT_LABEL_INVALID` (422), `PROJECT_LABELS_DISABLED`. Statuses are in `src/errors/codes.ts`.

## Routes and UI

Per project, under `app/api/workspaces/[id]/projects/[slug]/`:

| Route | Methods |
|---|---|
| `states`, `states/[stateId]`, `states/[stateId]/default` | GET/POST, PATCH/DELETE, PATCH |
| `labels`, `labels/[labelId]` | GET/POST, PATCH/DELETE |
| `issue-types`, `issue-types/[typeId]`, `issue-types/reorder` | GET/POST, PATCH/DELETE, PATCH |
| `estimate` | GET, PATCH |
| `estimate/values`, `values/[valueId]`, `values/reorder` | POST, PATCH/DELETE, PATCH |

Per workspace, under `app/api/workspaces/[id]/`: `project-states` (GET, POST), `project-states/[stateId]` (PATCH, DELETE), `project-states/[stateId]/default` (PATCH), `project-labels` (GET, POST), `project-labels/[labelId]` (PATCH, DELETE).

UI:

- Project settings pages `states`, `labels` and `estimates` under `app/(private)/[workspace-slug]/projects/[slug]/settings/`. There is no settings page for issue types; the hook `src/hooks/use-issue-type.ts` is consumed by `issue/picker/type-picker.tsx`. `TODO: confirm` whether a management UI is planned.
- Workspace-level project states and labels: `app/(private)/[workspace-slug]/settings/resources/project-configuration/` (`workspace-settings-project-states-*`, `workspace-settings-project-labels-*`).
- Pickers in `app/_components/workspace/project/issue/picker/` (`state-picker`, `label-picker`, `type-picker`).
- Hooks: `use-state.ts`, `use-label.ts`, `use-issue-type.ts`, `use-estimate.ts`, `use-project-state.ts`, `use-project-label.ts`.

## Caching

None for these entities; reads go to Postgres and the client caches through TanStack Query.

## Gotchas

- `State` is not `ProjectState`: different groups, scope and permissions. Project progress counts issues by `StateGroup` (see [project.md](./project.md)).
- `order` on states defaults to 0 for all seeded rows and listing orders by `group` then `order`. There is no reorder route for states, only a free-form `order` field on update.
- The `issueTypesEnabled` and `estimatesEnabled` project switches are not enforced by these services.
- Estimate `value` is a free string; numeric models are conventions of the UI, not validated.

## Tests

- Unit: `src/services/__tests__/{state,label,issue-type,estimate,project-state,project-label}.service.test.ts`, mappers and schemas in the matching `__tests__` folders.
- Integration: `src/repositories/__tests__/{state,label,issue-type,estimate,estimate-value,project-state,project-label}.repository.test.ts`.
- E2E: `route.e2e.test.ts` next to each route above.
- Component: `app/(private)/[workspace-slug]/settings/resources/project-configuration/_components/__tests__/`, project settings `_components/__tests__/`.
- Factories: `state`, `label`, `issue-type`, `estimate`, `project-state`, `project-label` in `src/__tests__/factories/`.

## Related files

- `src/services/state.service.ts`, `label.service.ts`, `issue-type.service.ts`, `estimate.service.ts`, `project-state.service.ts`, `project-label.service.ts`
- `src/repositories/state.repository.ts` (`DEFAULT_STATES`), `estimate-value.repository.ts`, `project-state.repository.ts`
- `prisma/schema.prisma` (`State`, `Label`, `IssueType`, `EstimateSettings`, `EstimateValue`, `ProjectState`, `ProjectLabel`)
