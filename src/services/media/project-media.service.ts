import { auditMutation } from '@/lib/axiom/audit'
import { forbidden } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { persistObject, validateImage } from './_media'

const BUCKET = 'projects-covers'

export interface ProjectCoverUploadInput {
  actorId: string
  workspaceId: string
  contentType: string
  byteSize: number
  // Lazily read so authz + MIME/size are validated before buffering
  readBody: () => Promise<Buffer>
}

export const ProjectMediaService = {
  async uploadCover(
    input: ProjectCoverUploadInput,
  ): Promise<Result<{ url: string }>> {
    const membership = await MembershipRepository.findByUserAndWorkspace(
      input.actorId,
      input.workspaceId,
    )
    if (!membership.ok) return membership
    if (!membership.value) return err(forbidden())

    const validation = validateImage(input.contentType, input.byteSize)
    if (!validation.ok) return validation
    const ext = validation.value

    const key = `${input.workspaceId}/${crypto.randomUUID()}.${ext}`
    const body = await input.readBody()

    const stored = await persistObject({
      bucket: BUCKET,
      key,
      body,
      contentType: input.contentType,
      component: 'ProjectMediaService',
      event: 'project_media.persist_failed',
    })
    if (!stored.ok) return stored

    auditMutation({
      entity: 'storage_object',
      action: 'upload',
      actorId: input.actorId,
      meta: { bucket: BUCKET, key, workspaceId: input.workspaceId },
    })

    return ok({ url: stored.value })
  },
}
