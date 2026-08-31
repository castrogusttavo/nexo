import { createId } from '@paralleldrive/cuid2'
import { validationError } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { getPresignedDownloadUrl } from '../lib/storage/s3'
import { assertMember } from './_authz'
import {
  persistWikiMedia,
  validateWikiMedia,
  WIKI_MEDIA_BUCKET,
} from './_wiki-media'

const DOWNLOAD_TTL_SECONDS = 60 * 60 // 1h

function extensionForContentType(contentType: string): string {
  const [, subtype] = contentType.split('/')
  return subtype ? `.${subtype.replace('+xml', '')}` : ''
}

function extensionForFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot > 0 ? fileName.slice(lastDot) : ''
}

export const WikiMediaService = {
  async upload(
    actorId: string,
    workspaceId: string,
    file: { buffer: Buffer; contentType: string; fileName: string },
  ): Promise<Result<{ key: string; url: string }>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const validation = validateWikiMedia(file.contentType, file.buffer)
    if (!validation.ok) return validation

    const extension =
      extensionForContentType(file.contentType) ||
      extensionForFileName(file.fileName)
    const key = `${workspaceId}/${createId()}${extension}`

    const persisted = await persistWikiMedia({
      key,
      body: file.buffer,
      contentType: file.contentType,
    })
    if (!persisted.ok) return persisted

    const url = await getPresignedDownloadUrl({
      bucket: WIKI_MEDIA_BUCKET,
      key,
      expiresInSeconds: DOWNLOAD_TTL_SECONDS,
    })

    return ok({ key, url })
  },

  async getDownloadUrl(
    actorId: string,
    workspaceId: string,
    key: string,
  ): Promise<Result<{ url: string }>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    if (!key.startsWith(`${workspaceId}/`)) {
      return err(validationError('Chave de mídia inválida para este workspace'))
    }

    const url = await getPresignedDownloadUrl({
      bucket: WIKI_MEDIA_BUCKET,
      key,
      expiresInSeconds: DOWNLOAD_TTL_SECONDS,
    })

    return ok({ url })
  },
}
