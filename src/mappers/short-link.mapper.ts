import type { ShortLink } from '@prisma/client'
import type { ShortLinkDTO } from '@/types/short-link'

export function toShortLinkDTO(shortLink: ShortLink): ShortLinkDTO {
  return {
    id: shortLink.id,
    title: shortLink.title,
    url: shortLink.url,
    userId: shortLink.userId,
    createdAt: shortLink.createdAt.toISOString(),
    updatedAt: shortLink.updatedAt.toISOString(),
  }
}
