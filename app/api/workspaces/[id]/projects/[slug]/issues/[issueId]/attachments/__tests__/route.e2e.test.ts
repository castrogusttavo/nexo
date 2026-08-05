import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { authenticatedOwner, getJson } from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { ProjectRepository } from '@/src/repositories/project.repository'

async function seedProject(workspaceId: string, leadId: string) {
  const result = await ProjectRepository.create({
    name: 'E2E Project',
    slug: `proj-${createId().slice(0, 8)}`,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    leadId,
    workspaceId,
  })
  if (!result.ok) throw new Error('failed to seed project')
  return result.value
}

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

function uploadFile(
  path: string,
  file: { name: string; type: string; bytes: Uint8Array },
  cookie?: string,
) {
  const form = new FormData()
  form.append(
    'file',
    new File([file.bytes as BlobPart], file.name, { type: file.type }),
  )

  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Origin: BASE_URL,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: form,
    redirect: 'manual',
  })
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])

describe('POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/attachments', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await uploadFile(
      '/api/workspaces/ws/projects/slug/issues/issue-1/attachments',
      { name: 'a.png', type: 'image/png', bytes: PNG_BYTES },
    )

    expect(res.status).toBe(401)
  })

  it('should upload an attachment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await uploadFile(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/attachments`,
      { name: 'diagram.png', type: 'image/png', bytes: PNG_BYTES },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.fileName).toBe('diagram.png')
    expect(body.data.contentType).toBe('image/png')
    expect(body.data.url).toContain('http')
  })

  it('should return 422 for a disallowed content type', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await uploadFile(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/attachments`,
      {
        name: 'evil.exe',
        type: 'application/x-msdownload',
        bytes: PNG_BYTES,
      },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 422 when no file is sent', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await fetch(
      `${BASE_URL}/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/attachments`,
      {
        method: 'POST',
        headers: { Origin: BASE_URL, Cookie: user.cookie },
        body: new FormData(),
        redirect: 'manual',
      },
    )

    expect(res.status).toBe(422)
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/issues/[issueId]/attachments', () => {
  it('should list attachments with presigned urls', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    await uploadFile(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/attachments`,
      { name: 'diagram.png', type: 'image/png', bytes: PNG_BYTES },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/attachments`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].url).toContain('http')
  })
})
