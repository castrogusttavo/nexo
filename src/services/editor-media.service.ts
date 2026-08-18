import { createId } from '@paralleldrive/cuid2'
import { projectForbidden, validationError } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { getPresignedDownloadUrl } from '../lib/storage/s3'
import {
  ISSUE_EDITOR_MEDIA_BUCKET,
  persistEditorMedia,
  validateEditorMedia,
} from './_editor-media'
import { resolveProject } from './_project-scope'

const DOWNLOAD_TTL_SECONDS = 60 * 60 // 1h

function extensionFor(contentType: string): string {
  const [_, subtype] = contentType.split('/')
  return subtype ? `.${subtype.replace('+xml', '')}` : ''
}

export const EditorMediaService = {
  async upload(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    file: { buffer: Buffer; contentType: string },
  ): Promise<Result<{ key: string; url: string }>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const validation = validateEditorMedia(file.contentType, file.buffer)
    if (!validation.ok) return validation

    const key = `${project.id}/${createId()}${extensionFor(file.contentType)}`
    const persisted = await persistEditorMedia({
      key,
      body: file.buffer,
      contentType: file.contentType,
    })
    if (!persisted.ok) return persisted

    const url = await getPresignedDownloadUrl({
      bucket: ISSUE_EDITOR_MEDIA_BUCKET,
      key,
      expiresInSeconds: DOWNLOAD_TTL_SECONDS,
    })

    return ok({ key, url })
  },

  async getDownloadUrl(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    key: string,
  ): Promise<Result<{ url: string }>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    if (!key.startsWith(`${project.id}/`)) {
      return err(validationError('Chave de mídia inválida para este projeto'))
    }

    const url = await getPresignedDownloadUrl({
      bucket: ISSUE_EDITOR_MEDIA_BUCKET,
      key,
      expiresInSeconds: DOWNLOAD_TTL_SECONDS,
    })

    return ok({ url })
  },
}
