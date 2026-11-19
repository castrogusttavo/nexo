# Careers, talk to sales and marketing content

The public, logged-out side of the product: job posts and applications, the enterprise contact form, and file-based content (blog, changelog, legal documents). These routes are public in `proxy.ts` (`/careers`, `/api/careers`, `/talk-to-sales`, `/api/talk-to-sales`, `/blog`), so they protect themselves with IP rate limits and validation.

## Careers

### Contract

`src/schemas/career-job.schema.ts`: `CreateCareerJobSchema` (`slug`, `title`, `department`, `summary` 10-700, structured `content` with `about`, `responsibilities`, `requirements`, `niceToHave`, `stack`, `location`, `locationType`, `employmentType`), `UpdateCareerJobSchema` (partial), `ChangeCareerJobStatusSchema`. New jobs always start as `DRAFT`, set by the service, not the client. Status changes are a separate admin action with their own endpoint.

`src/schemas/career-application.schema.ts`: `CreateCareerApplicationSchema` (`name`, `email`, optional `phone`, `linkedinUrl`, `portfolioUrl`, `lastJobTitle`, `experienceYears`, `message` up to 2000, `consent` must be literally true, `honeypot` must be empty).

### Data model

`CareerJob` (unique `slug`, `status` `DRAFT | OPEN | CLOSED`, `locationType`, `employmentType`, JSON `content`) and `CareerApplication` (cascade from the job; resume bucket, key and file name, `consentAt`, `ipAddress`, `status` `RECEIVED | REVIEWING | REJECTED | HIRED`), in `prisma/schema.prisma`.

### Service rules

- Public read: `CareerJobService.listPublic` returns `OPEN` and `CLOSED` jobs, open first (`CareerJobRepository.listPublic`). `getBySlug` calls `findBySlug`, which filters nothing by status. `app/(web)/careers/[slug]/page.tsx` only calls `notFound()` when the lookup fails, so a `DRAFT` job appears to be reachable by its slug. TODO: confirm; this may leak unpublished posts.
- Admin operations (`getById`, `listAll`, `create`, `update`, `changeStatus`) call `assertPlatformAdmin` and are audited. See [admin.md](./admin.md). Slug conflicts return `CAREER_JOB_SLUG_TAKEN`.
- `CareerApplicationService.submit` (`src/services/career-application.service.ts`): job must be `OPEN` (else `CAREER_JOB_CLOSED`, 409); the resume must be a PDF, at most 10 MB, starting with the `%PDF-` magic bytes (`src/services/career/_resume.ts`); it is stored in bucket `career-applications` under `<jobId>/<cuid>.pdf`; the row is written with consent time and IP; an audit event with `actorId: null` is emitted; then an e-mail to staff with a presigned resume link valid 7 days (`sendCareerApplicationEmail`). An e-mail failure is logged (`career_application.notification_failed`) and does not fail the submission.

### Route

`POST /api/careers/[slug]/apply` (multipart): `withRateLimit` with `apiLimiter` keyed by IP. A filled `honeypot` returns a fake 201 so bots learn nothing. Success returns `{ received: true }` with 201.

### UI

`app/(web)/careers/` (list, `[slug]` with `JobPosting` structured data, `career-application-form`), admin forms under `app/(private)/admin/careers/`. Hook: `src/hooks/use-career-jobs.ts`; labels in `src/lib/career-labels.ts`, params in `src/lib/career-params.ts`.

## Talk to sales

`POST /api/talk-to-sales` validates `TalkToSalesSchema` (`name`, `email`, `teamSize` from `1-10` to `500+`, `message` 10-2000) and calls `TalkToSalesService.submit`, which only sends an e-mail (`sendTalkToSalesEmail`); nothing is stored. A send failure returns `mailError()`. IP rate limited like the careers route. UI: `app/(web)/talk-to-sales/` (`talk-to-sales-form`). Note the `TEAM_SIZES` here differ from the onboarding list in `workspace.schema.ts` (no `1`, `2-10`).

## File-based content

No database: Markdown with front matter under `content/`, validated by Zod when read.

| Content | Source | Schema | Loader |
|---|---|---|---|
| Blog | `content/blog/*.md` | `blog-post.schema.ts` (`title`, `slug`, `date`, `excerpt`, optional `cover`, `tag` from `BLOG_POST_TAGS`) | `src/lib/blog/post.ts` |
| Changelog | `content/changelog/*.md` (folder absent today; the loader returns an empty list) | `changelog-entry.schema.ts` (`improvements`, `fixes`; slug `page` reserved) | `src/lib/changelog.ts` |
| Legal | `content/legals/` | `legal-doc.schema.ts` | `src/lib/legal/legal-doc.ts`, versions in `lib/legal/versions.ts` |

Loaders use gray-matter, remark and `rehype-sanitize`, and run under `'use cache'` with `cacheLife('max')` for blog and changelog, which is safe because the content only changes with a deploy (this does not conflict with the rule against caching runtime data). Pages: `app/(web)/{blog,changelog,legals,...}`, feed at `app/blog/feed.xml`. Consent versions that users accept come from `lib/legal/versions.ts` (see [workspace-and-members.md](./workspace-and-members.md)).

## Error codes

`CAREER_JOB_NOT_FOUND` (404), `CAREER_JOB_CLOSED` (409), `CAREER_JOB_SLUG_TAKEN` (409), `CAREER_JOB_FORBIDDEN` (403), `ADMIN_TWO_FACTOR_REQUIRED` (403), plus the mail and storage errors.

## Caching and queues

Only the file-content `'use cache'` above. No queues.

## Tests

- Unit: `src/services/__tests__/{career-job,career-application,talk-to-sales}.service.test.ts`, schema tests (career, talk-to-sales, blog, changelog).
- Integration: `src/repositories/__tests__/career-{job,application}.repository.test.ts`.
- Component: `app/(web)/careers/[slug]/_components/__tests__/`, `app/(web)/talk-to-sales/_components/__tests__/`, `app/_components/changelog/__tests__/`, `app/(web)/blog/_components/__tests__/`, `src/hooks/__tests__/use-career-jobs.component.test.tsx`.

## Related files

`src/repositories/career-{job,application}.repository.ts`, `src/services/career/_resume.ts`, `src/lib/rate-limit-helpers.ts`, `proxy.ts` (public routes).
