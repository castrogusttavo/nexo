import { createId } from '@paralleldrive/cuid2'
import type { Prisma, WikiComment } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeWikiComment(
  overrides?: Partial<WikiComment>,
): WikiComment {
  const now = new Date()
  return {
    id: createId(),
    wikiPageId: createId(),
    authorId: createId(),
    parentId: null,
    markId: createId(),
    content: [{ type: 'p', children: [{ text: 'Comentário de teste' }] }],
    resolved: false,
    resolvedAt: null,
    resolvedById: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function seedWikiComment(
  wikiPageId: string,
  authorId: string,
  overrides?: Partial<{
    markId: string
    parentId: string
    content: Prisma.InputJsonValue
    resolved: boolean
    resolvedAt: Date
    resolvedById: string
  }>,
) {
  const content: Prisma.InputJsonValue = [
    { type: 'p', children: [{ text: 'Comentário de teste' }] },
  ]
  return prisma.wikiComment.create({
    data: {
      wikiPageId,
      authorId,
      markId: createId(),
      content,
      ...overrides,
    },
  })
}
