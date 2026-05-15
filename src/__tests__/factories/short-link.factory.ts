import { createId } from '@paralleldrive/cuid2'
import type { ShortLink } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { ShortLinkDTO } from '@/types/short-link'

export function createFakeShortLink(overrides?: Partial<ShortLink>): ShortLink {
  const now = new Date()
  return {
    id: createId(),
    title: 'Test Link',
    url: 'https://example.com',
    userId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeShortLinkDTO(
  overrides: Partial<ShortLinkDTO>,
): ShortLinkDTO {
  const now = new Date().toISOString()
  return {
    id: createId(),
    title: 'Test Link',
    url: 'https://example.com',
    userId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedShortLink(
  userId: string,
  overrides?: Partial<Pick<ShortLink, 'title' | 'url'>>,
) {
  return prisma.shortLink.create({
    data: {
      title: 'Seed Link',
      url: `https://example.com/${createId().slice(0, 8)}`,
      userId,
      ...overrides,
    },
  })
}
