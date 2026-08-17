import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  deleteJson,
  getJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { ProjectRepository } from '@/src/repositories/project.repository'

async function seedIssueFor(projectId: string, authorId: string) {
  const state = await seedState(projectId)
  const type = await seedIssueType(projectId)
  return seedIssue({
    stateId: state.id,
    typeId: type.id,
    authorId,
    projectId,
  })
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])

async function uploadAttachment(path: string, cookie: string) {
  const form = new FormData()
  form.append(
    'file',
    new File([PNG_BYTES as BlobPart], 'diagram.png', { type: 'image/png' }),
  )

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Origin: BASE_URL, Cookie: cookie },
    body: form,
    redirect: 'manual',
  })
  const body = await res.json()
  return body.data
}

describe('DELETE /api/workspaces/[id]/projects/[slug]/issues/[issueId]/attachments/[attachmentId]', () => {
  it('should remove the attachment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const attachment = await uploadAttachment(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/attachments`,
      user.cookie,
    )

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/attachments/${attachment.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })

  it('should return 404 for a missing attachment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/attachments/nonexistent`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})
