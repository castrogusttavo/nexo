import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import {
  ChangeCareerJobStatusSchema,
  CreateCareerJobSchema,
  UpdateCareerJobSchema,
} from '@/src/schemas/career-job.schema'
import {
  CreateCommentSchema,
  UpdateCommentSchema,
} from '@/src/schemas/comment.schema'
import {
  CreateCycleSchema,
  UpdateCycleSchema,
} from '@/src/schemas/cycle.schema'
import { AddCycleMemberSchema } from '@/src/schemas/cycle-member.schema'
import {
  CreateEstimateValueSchema,
  ReorderEstimateValuesSchema,
  UpdateEstimateSettingsSchema,
  UpdateEstimateValueSchema,
} from '@/src/schemas/estimate.schema'
import {
  AcceptInvitationSchema,
  CreateInvitationSchema,
  InviteToProjectSchema,
  UpdateInvitationRoleSchema,
} from '@/src/schemas/invitation.schema'
import {
  CreateIssueSchema,
  UpdateIssueSchema,
} from '@/src/schemas/issue.schema'
import { AssignIssueSchema } from '@/src/schemas/issue-assignee.schema'
import { CreateIssueDependencySchema } from '@/src/schemas/issue-dependency.schema'
import { AddIssueLabelSchema } from '@/src/schemas/issue-label.schema'
import { CreateIssueRelationSchema } from '@/src/schemas/issue-relation.schema'
import {
  CreateIssueTypeSchema,
  ReorderIssueTypesSchema,
  UpdateIssueTypeSchema,
} from '@/src/schemas/issue-type.schema'
import {
  CreateIssueUpdateSchema,
  UpdateIssueUpdateSchema,
} from '@/src/schemas/issue-update.schema'
import { CastIssueVoteSchema } from '@/src/schemas/issue-vote.schema'
import {
  CreateLabelSchema,
  UpdateLabelSchema,
} from '@/src/schemas/label.schema'
import {
  CreateModuleSchema,
  UpdateModuleSchema,
} from '@/src/schemas/module.schema'
import { AddModuleMemberSchema } from '@/src/schemas/module-member.schema'
import { UpdateNotificationSettingSchema } from '@/src/schemas/notification-settings.schema'
import {
  CreateProjectSchema,
  UpdateProjectSchema,
} from '@/src/schemas/project.schema'
import { AddProjectMemberSchema } from '@/src/schemas/project-member.schema'
import {
  CreateShortLinkSchema,
  UpdateShortLinkSchema,
} from '@/src/schemas/short-link.schema'
import {
  CreateStateSchema,
  UpdateStateSchema,
} from '@/src/schemas/state.schema'
import {
  CreateStickyNoteSchema,
  UpdateStickyNoteSchema,
} from '@/src/schemas/sticky-note.schema'
import { CreateSubscriptionSchema } from '@/src/schemas/subscription.schema'
import { TalkToSalesSchema } from '@/src/schemas/talk-to-sales.schema'
import { UpdateUserSchema } from '@/src/schemas/user.schema'
import { UpdateUserPreferenceSchema } from '@/src/schemas/user-preference.schema'
import {
  CreateWikiCommentSchema,
  ResolveWikiCommentSchema,
  UpdateWikiCommentSchema,
} from '@/src/schemas/wiki-comment.schema'
import {
  CreateWikiPageSchema,
  MoveWikiPageSchema,
  UpdateWikiPageSchema,
} from '@/src/schemas/wiki-page.schema'
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from '@/src/schemas/workspace.schema'
import {
  deref,
  formatList,
  isAuthSpecPath,
  type SpecNode,
  spec,
  specOperations,
} from './openapi'

// Test 3 — documented request bodies vs. the Zod schemas the routes validate
// with. The pairing is an explicit map (spec component name -> Zod export),
// never a name-based guess: a documented JSON body that is neither mapped nor
// listed as an exception fails the suite, so the map cannot rot quietly.

const SPEC_BODY_TO_ZOD: Record<string, ZodType> = {
  AcceptInvitationInput: AcceptInvitationSchema,
  AddCycleMemberInput: AddCycleMemberSchema,
  AddIssueLabelInput: AddIssueLabelSchema,
  AddModuleMemberInput: AddModuleMemberSchema,
  AddProjectMemberInput: AddProjectMemberSchema,
  AssignIssueInput: AssignIssueSchema,
  CastIssueVoteInput: CastIssueVoteSchema,
  ChangeCareerJobStatusInput: ChangeCareerJobStatusSchema,
  CreateCareerJobInput: CreateCareerJobSchema,
  CreateCommentInput: CreateCommentSchema,
  CreateCycleInput: CreateCycleSchema,
  CreateEstimateValueInput: CreateEstimateValueSchema,
  CreateInvitationInput: CreateInvitationSchema,
  CreateIssueDependencyInput: CreateIssueDependencySchema,
  CreateIssueInput: CreateIssueSchema,
  CreateIssueRelationInput: CreateIssueRelationSchema,
  CreateIssueTypeInput: CreateIssueTypeSchema,
  CreateIssueUpdateInput: CreateIssueUpdateSchema,
  CreateLabelInput: CreateLabelSchema,
  CreateModuleInput: CreateModuleSchema,
  CreateProjectInput: CreateProjectSchema,
  CreateShortLinkInput: CreateShortLinkSchema,
  CreateStateInput: CreateStateSchema,
  CreateStickyNoteInput: CreateStickyNoteSchema,
  CreateSubscriptionInput: CreateSubscriptionSchema,
  CreateWikiCommentInput: CreateWikiCommentSchema,
  CreateWikiPageInput: CreateWikiPageSchema,
  CreateWorkspaceInput: CreateWorkspaceSchema,
  InviteToProjectInput: InviteToProjectSchema,
  MoveWikiPageInput: MoveWikiPageSchema,
  ReorderEstimateValuesInput: ReorderEstimateValuesSchema,
  ReorderIssueTypesInput: ReorderIssueTypesSchema,
  ResolveWikiCommentInput: ResolveWikiCommentSchema,
  TalkToSalesInput: TalkToSalesSchema,
  UpdateCareerJobInput: UpdateCareerJobSchema,
  UpdateCommentInput: UpdateCommentSchema,
  UpdateCycleInput: UpdateCycleSchema,
  UpdateEstimateSettingsInput: UpdateEstimateSettingsSchema,
  UpdateEstimateValueInput: UpdateEstimateValueSchema,
  UpdateInvitationRoleInput: UpdateInvitationRoleSchema,
  UpdateIssueInput: UpdateIssueSchema,
  UpdateIssueTypeInput: UpdateIssueTypeSchema,
  UpdateIssueUpdateInput: UpdateIssueUpdateSchema,
  UpdateLabelInput: UpdateLabelSchema,
  UpdateModuleInput: UpdateModuleSchema,
  UpdateNotificationSettingInput: UpdateNotificationSettingSchema,
  UpdateProjectInput: UpdateProjectSchema,
  UpdateShortLinkInput: UpdateShortLinkSchema,
  UpdateStateInput: UpdateStateSchema,
  UpdateStickyNoteInput: UpdateStickyNoteSchema,
  UpdateUserInput: UpdateUserSchema,
  UpdateUserPreferenceInput: UpdateUserPreferenceSchema,
  UpdateWikiCommentInput: UpdateWikiCommentSchema,
  UpdateWikiPageInput: UpdateWikiPageSchema,
  UpdateWorkspaceInput: UpdateWorkspaceSchema,
}

/**
 * Documented JSON bodies that no `src/schemas/*.schema.ts` export covers.
 * Each one is validated somewhere else, and the reason is the point of the
 * entry: it keeps the gap visible instead of silently unchecked.
 */
const JSON_BODIES_WITHOUT_SHARED_SCHEMA: Record<string, string> = {
  'POST /users/me/cookie-consent':
    'single-field body validated by a route-local Zod schema in ' +
    'app/api/users/me/cookie-consent/route.ts',
  'POST /payment/webhook':
    "AbacatePay's payload, validated by a route-local Zod schema in " +
    'app/api/payment/webhook/route.ts (only the fields the handler reads)',
  'POST /workspaces/{id}/projects/{slug}/embed-metadata':
    'no Zod schema at all — the route hand-checks `typeof body.url`',
}

/**
 * Documented bodies that are not JSON: file uploads read straight off a
 * `FormData`, so there is no object schema to line the fields up against.
 */
const NON_JSON_BODIES: Record<string, string> = {
  'POST /users/me/avatar': 'multipart avatar upload',
  'POST /users/me/cover': 'multipart cover upload',
  'POST /workspaces/{id}/members/import': 'multipart CSV member import',
  'POST /careers/{slug}/apply':
    'multipart application — fields plus the resume file',
  'POST /workspaces/{id}/projects/cover-image':
    'multipart project cover upload',
  'POST /workspaces/{id}/projects/{slug}/issues/{issueId}/attachments':
    'multipart issue attachment upload',
  'POST /workspaces/{id}/projects/{slug}/editor-media':
    'multipart editor media upload',
  'POST /workspaces/{id}/wiki/media': 'multipart wiki media upload',
}

interface DocumentedBody {
  id: string
  contentType: string
  schemaName?: string
}

function documentedBodies(): DocumentedBody[] {
  const bodies: DocumentedBody[] = []
  for (const { id, path, operation } of specOperations()) {
    // Better Auth owns its request shapes; none of them is a project schema.
    if (isAuthSpecPath(path)) continue
    const content = (operation.requestBody as SpecNode)?.content
    if (!content) continue
    for (const [contentType, media] of Object.entries(content as SpecNode)) {
      const ref = (media as SpecNode)?.schema?.$ref
      bodies.push({
        id,
        contentType,
        schemaName: typeof ref === 'string' ? ref.split('/').pop() : undefined,
      })
    }
  }
  return bodies
}

function zodShape(schema: ZodType): Record<string, ZodType> | undefined {
  return (schema as unknown as { shape?: Record<string, ZodType> }).shape
}

describe('openapi: documented request bodies match their Zod schemas', () => {
  const bodies = documentedBodies()

  it('maps or explicitly excuses every documented body', () => {
    const unaccounted = bodies
      .filter((body) => {
        if (body.contentType !== 'application/json') {
          return !(body.id in NON_JSON_BODIES)
        }
        if (body.id in JSON_BODIES_WITHOUT_SHARED_SCHEMA) return false
        return !(body.schemaName && body.schemaName in SPEC_BODY_TO_ZOD)
      })
      .map((body) => `${body.id} (${body.contentType}, ${body.schemaName})`)

    expect(
      unaccounted.length === 0,
      `${unaccounted.length} documented request body/bodies are neither ` +
        'mapped to a Zod schema nor listed as an exception — add the pair ' +
        'to SPEC_BODY_TO_ZOD or record why it cannot be checked:' +
        formatList(unaccounted),
    ).toBe(true)
  })

  it('keeps the exception lists free of stale entries', () => {
    const jsonIds = new Set(
      bodies
        .filter((body) => body.contentType === 'application/json')
        .map((body) => body.id),
    )
    const otherIds = new Set(
      bodies
        .filter((body) => body.contentType !== 'application/json')
        .map((body) => body.id),
    )
    const schemaNames = new Set(
      bodies.map((body) => body.schemaName).filter(Boolean),
    )

    expect(
      Object.keys(JSON_BODIES_WITHOUT_SHARED_SCHEMA).filter(
        (id) => !jsonIds.has(id),
      ),
    ).toEqual([])
    expect(
      Object.keys(NON_JSON_BODIES).filter((id) => !otherIds.has(id)),
    ).toEqual([])
    expect(
      Object.keys(SPEC_BODY_TO_ZOD).filter((name) => !schemaNames.has(name)),
    ).toEqual([])
  })

  it('agrees on field names and required fields', () => {
    const problems: string[] = []

    for (const [name, schema] of Object.entries(SPEC_BODY_TO_ZOD)) {
      const documented = deref(spec.components.schemas[name])
      const shape = zodShape(schema)

      if (!shape) {
        problems.push(`${name}: the mapped Zod schema is not an object schema`)
        continue
      }

      const zodFields = Object.keys(shape).sort()
      const zodRequired = zodFields
        .filter((field) => !shape[field].safeParse(undefined).success)
        .sort()

      const specFields = Object.keys(documented?.properties ?? {}).sort()
      const specRequired = [
        ...((documented?.required ?? []) as string[]),
      ].sort()

      const undocumented = zodFields.filter((f) => !specFields.includes(f))
      const phantom = specFields.filter((f) => !zodFields.includes(f))
      if (undocumented.length > 0) {
        problems.push(
          `${name}: accepted by Zod but undocumented — ` +
            undocumented.join(', '),
        )
      }
      if (phantom.length > 0) {
        problems.push(
          `${name}: documented but rejected by Zod — ${phantom.join(', ')}`,
        )
      }

      const shouldBeRequired = zodRequired.filter(
        (f) => specFields.includes(f) && !specRequired.includes(f),
      )
      const shouldBeOptional = specRequired.filter(
        (f) => zodFields.includes(f) && !zodRequired.includes(f),
      )
      if (shouldBeRequired.length > 0) {
        problems.push(
          `${name}: required by Zod but optional in the spec — ` +
            shouldBeRequired.join(', '),
        )
      }
      if (shouldBeOptional.length > 0) {
        problems.push(
          `${name}: required in the spec but optional in Zod — ` +
            shouldBeOptional.join(', '),
        )
      }
    }

    expect(
      problems.length === 0,
      `${problems.length} request body mismatch(es) between ` +
        `public/openapi.json and src/schemas:${formatList(problems)}`,
    ).toBe(true)
  })
})
