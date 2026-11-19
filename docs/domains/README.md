# Domain pages

One page per feature area. Each follows the same outline: contract (Zod schemas), data model (Prisma), service rules and authorization, error codes, routes and UI entry points, caching, gotchas, tests, related files. They describe the code as it is; where the repository cannot answer a question (infrastructure, external services, product decisions) the page says `Not defined in this repository.`, and a behaviour that looks like a defect is stated as `Known issue:`. For how a request travels through the layers, read [../architecture/request-flow.md](../architecture/request-flow.md); for tenancy, [../architecture/multi-tenancy.md](../architecture/multi-tenancy.md).

## Index

| Page | Covers |
|---|---|
| [workspace-and-members.md](./workspace-and-members.md) | Workspace lifecycle, memberships and roles, invitations, onboarding, consent |
| [project.md](./project.md) | Project record and lifecycle, members, favorites, reactions, links, attachments, progress, feature switches |
| [issue.md](./issue.md) | Issues, numbering, assignees, subscribers, labels on issues, hierarchy, dependencies, relations |
| [cycle.md](./cycle.md) | Cycles (time-boxed work), one active cycle rule, cycle members |
| [module.md](./module.md) | Modules (themed work), members, favorites, stored progress |
| [label-state-estimate.md](./label-state-estimate.md) | Issue states, labels, issue types, estimates; workspace-level project states and labels |
| [activity-and-notifications.md](./activity-and-notifications.md) | Activity feed, comments, project status updates, votes, issue attachments, notification settings |
| [wiki.md](./wiki.md) | Workspace wiki pages, comments, editor media and embeds |
| [billing-and-coupons.md](./billing-and-coupons.md) | Plans, trial, AbacatePay checkout and webhook, coupons |
| [careers-and-marketing.md](./careers-and-marketing.md) | Careers, talk to sales, blog, changelog, legal content |
| [short-links-and-sticky-notes.md](./short-links-and-sticky-notes.md) | Personal short links and sticky notes |
| [user-and-account.md](./user-and-account.md) | Profile, preferences, media, consent, data export, account deletion |
| [admin.md](./admin.md) | Platform admin area: job posts and queue dashboard |

## How the project domain fits together

```
Workspace
  Membership (role)             workspace-and-members.md
  ProjectState, ProjectLabel    label-state-estimate.md
  Project                       project.md
    State, Label, IssueType,    label-state-estimate.md
    EstimateSettings
    Cycle, Module               cycle.md, module.md
    Issue                       issue.md
      Comment, Vote,            activity-and-notifications.md
      Attachment, Activity
    Update (status updates)     activity-and-notifications.md
```

Authorization inside a project is the same rule everywhere: `resolveProject` in `src/services/_project-scope.ts` loads the workspace membership and the project, then each service applies read (public project, OWNER/ADMIN, lead or project member) or write (usually OWNER/ADMIN or lead; issues and comments also admit project members).

## Conventions shared by all pages

- Routes are thin and follow `withAxiom`, `getAuthSession`, `consume(apiLimiter, ...)`, Zod `safeParse`, service, `successResponse` or `handleError`.
- Services and repositories return `Result`; error codes come from `src/errors/codes.ts`. See [../adr/0002-result-instead-of-throw.md](../adr/0002-result-instead-of-throw.md).
- User-facing validation and error messages are pt-BR; everything else is English.
- A new endpoint is not done until `public/openapi.json` documents it (the contract suite fails otherwise).
