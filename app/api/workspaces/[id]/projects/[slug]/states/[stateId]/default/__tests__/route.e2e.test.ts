import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { authenticatedOwner, patchJson } from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

describe('PATCH /api/workspaces/[id]/projects/[slug]/states/[stateId]/default', () => {
  it('should set the state as default and unset the previous one', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const oldDefault = await seedState(project.id, {
      group: 'UNSTARTED',
      isDefault: true,
    })
    const newDefault = await seedState(project.id, { group: 'STARTED' })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states/${newDefault.id}/default`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.isDefault).toBe(true)

    const previous = await prisma.state.findUnique({
      where: { id: oldDefault.id },
    })
    expect(previous?.isDefault).toBe(false)
  })
})
