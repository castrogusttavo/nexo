import type { ShortLink } from '@prisma/client'
import type { ShortLinkDTO } from '@/types/short-link'
import { withTimestamps } from './_shared'

export function toShortLinkDTO(shortLink: ShortLink): ShortLinkDTO {
  return {
    id: shortLink.id,
    title: shortLink.title,
    url: shortLink.url,
    userId: shortLink.userId,
    ...withTimestamps(shortLink),
  }
}
