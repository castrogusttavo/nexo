import { auditMutation } from '@/lib/axiom/audit'
import { UserCache } from '@/src/cache/user.cache'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { ok, type Result } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import { assertPrivileged } from '../_authz'
import { dropObject, persistObject, validateImage } from './_media'

export const WORKSPACE_LOGO_BUCKET = 'workspace-logos'
const BUCKET = WORKSPACE_LOGO_BUCKET

export interface WorkspaceLogoUploadInput {
  actorId: string
  workspaceId: string
  contentType: string
  byteSize: number
  readBody: () => Promise<Buffer>
}

async function invalidate(workspaceId: string, actorId: string) {
  await WorkspaceCache.invalidate(workspaceId)
  const ids = await MembershipRepository.listUserIdsByWorkspace(workspaceId)
  await Promise.all(
    (ids.ok ? ids.value : [actorId]).map((id) => UserCache.invalidate(id)),
  )
}

export const WorkspaceMediaService = {
  async uploadLogo(
    input: WorkspaceLogoUploadInput,
  ): Promise<Result<{ url: string }>> {
    const authz = await assertPrivileged(input.actorId, input.workspaceId)
    if (!authz.ok) return authz

    const validation = validateImage(input.contentType, input.byteSize)
    if (!validation.ok) return validation

    const current = await WorkspaceRepository.findById(input.workspaceId)
    if (!current.ok) return current

    const key = `workspace/${input.workspaceId}/${crypto.randomUUID()}.${validation.value}`
    const stored = await persistObject({
      bucket: BUCKET,
      key,
      body: await input.readBody(),
      contentType: input.contentType,
      component: 'WorkspaceMediaService',
      event: 'workspace_media.persist_failed',
    })
    if (!stored.ok) return stored

    const updated = await WorkspaceRepository.update(input.workspaceId, {
      image: stored.value,
    })
    if (!updated.ok) {
      await dropObject(BUCKET, stored.value)
      auditMutation({
        entity: 'workspace',
        action: 'update',
        actorId: input.actorId,
        targetId: input.workspaceId,
        outcome: 'failure',
        reason: updated.error.code,
        meta: { fields: ['image'] },
      })
      return updated
    }

    await dropObject(BUCKET, current.value.image)
    await invalidate(input.workspaceId, input.actorId)

    auditMutation({
      entity: 'workspace',
      action: 'update',
      actorId: input.actorId,
      targetId: input.workspaceId,
      meta: { fields: ['image'] },
    })

    return ok({ url: stored.value })
  },

  async removeLogo(
    actorId: string,
    workspaceId: string,
  ): Promise<Result<void>> {
    const authz = await assertPrivileged(actorId, workspaceId)
    if (!authz.ok) return authz

    const current = await WorkspaceRepository.findById(workspaceId)
    if (!current.ok) return current

    const updated = await WorkspaceRepository.update(workspaceId, {
      image: null,
    })
    if (!updated.ok) return updated

    await dropObject(BUCKET, current.value.image)
    await invalidate(workspaceId, actorId)

    auditMutation({
      entity: 'workspace',
      action: 'update',
      actorId,
      targetId: workspaceId,
      meta: { fields: ['image'], removed: true },
    })

    return ok(undefined)
  },
}
