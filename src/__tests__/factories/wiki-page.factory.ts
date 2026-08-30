import { createId } from '@paralleldrive/cuid2'
import type { Prisma, WikiPage } from '@prisma/client'
import type { Value } from 'platejs'
import { prisma } from '@/src/lib/prisma'
import type { WikiPageDTO } from '@/types/wiki-page'

export function createFakeWikiPage(overrides?: Partial<WikiPage>): WikiPage {
  const now = new Date()
  const content: Prisma.JsonValue = [{ type: 'p', children: [{ text: '' }] }]
  return {
    id: createId(),
    workspaceId: createId(),
    parentId: null,
    title: 'Página de teste',
    icon: null,
    coverImage: null,
    content: content,
    yjsState: null,
    position: 0,
    createdById: createId(),
    updatedById: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeWikiPageDTO(
  overrides?: Partial<WikiPageDTO>,
): WikiPageDTO {
  const now = new Date().toISOString()
  const content: Value = [{ type: 'p', children: [{ text: '' }] }]
  return {
    id: createId(),
    workspaceId: createId(),
    parentId: null,
    title: 'Página de teste',
    icon: null,
    coverImage: null,
    content,
    position: 0,
    createdById: createId(),
    updatedById: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedWikiPage(
  workspaceId: string,
  createdById: string,
  overrides?: Partial<{
    parentId: string | null
    title: string
    icon: string | null
    content: Prisma.InputJsonValue
    position: number
  }>,
) {
  const content: Prisma.InputJsonValue = [
    { type: 'p', children: [{ text: '' }] },
  ]
  return prisma.wikiPage.create({
    data: {
      workspaceId,
      createdById,
      title: 'Página de teste',
      content: content,
      ...overrides,
    },
  })
}
