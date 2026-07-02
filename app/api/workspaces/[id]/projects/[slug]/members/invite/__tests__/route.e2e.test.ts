import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  defaultHeaders,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

async function createProject(workspaceId: string, cookie: string) {
  const slug = `p-${createId().slice(0, 8)}`
  const res = await postJson(
    `/api/workspaces/${workspaceId}/projects`,
    { name: 'Proj', slug },
    cookie,
  )
  const { data } = await res.json()
  return data as { id: string; slug: string }
}

function externalEmail() {
  return `ext-${createId().slice(0, 8)}@example.com`
}

describe('POST /api/workspaces/[id]/projects/[slug]/members/invite', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await fetch(
      `${BASE_URL}/api/workspaces/ws/projects/p/members/invite`,
      {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ email: externalEmail() }),
      },
    )
    expect(res.status).toBe(401)
  })

  it('should return 403 for a plain member who is not the lead', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite`,
      { email: externalEmail() },
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 422 for an invalid email', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite`,
      { email: 'not-an-email' },
      user.cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should invite an external email (201, kind=invited)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite`,
      { email: externalEmail() },
      user.cookie,
    )
    expect(res.status).toBe(201)
    expect((await res.json()).data.kind).toBe('invited')
  })

  it('should add an existing workspace member directly (200, kind=added)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const existing = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite`,
      { email: existing.email },
      user.cookie,
    )
    expect(res.status).toBe(200)
    expect((await res.json()).data.kind).toBe('added')

    const pm = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId: existing.id, projectId: project.id },
      },
    })
    expect(pm).not.toBeNull()
  })

  it('should reject the duplicate external invite (409)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const email = externalEmail()
    const path = `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite`

    expect((await postJson(path, { email }, user.cookie)).status).toBe(201)
    expect((await postJson(path, { email }, user.cookie)).status).toBe(409)
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/members/invite', () => {
  it('should list pending project invites without exposing the token', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite`,
      { email: externalEmail() },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite`,
      user.cookie,
    )
    expect(res.status).toBe(200)

    const { data } = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].token).toBeUndefined()
  })
})

describe('accepting a project invite creates the ProjectMember', () => {
  it('should create both the membership and the project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const invitee = await createAuthenticatedUser()

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite`,
      { email: invitee.email },
      user.cookie,
    )
    const invite = await prisma.workspaceInvitation.findFirstOrThrow({
      where: { workspaceId: workspace.id, email: invitee.email },
    })

    const res = await postJson(
      '/api/invitations/accept',
      { token: invite.token },
      invitee.cookie,
    )
    expect(res.status).toBe(200)

    const [membership, projectMember] = await Promise.all([
      prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: invitee.id,
            workspaceId: workspace.id,
          },
        },
      }),
      prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: invitee.id, projectId: project.id },
        },
      }),
    ])
    expect(membership).not.toBeNull()
    expect(projectMember).not.toBeNull()
  })
})
