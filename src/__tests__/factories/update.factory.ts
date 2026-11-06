import { createId } from '@paralleldrive/cuid2'
import type { Update, UpdateReply } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeUpdate(overrides?: Partial<Update>): Update {
  const now = new Date()
  return {
    id: createId(),
    status: 'ON_TRACK',
    content: 'Tudo indo bem',
    projectId: createId(),
    issueId: null,
    authorId: createId(),
    editedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeUpdateReply(
  overrides?: Partial<UpdateReply>,
): UpdateReply {
  const now = new Date()
  return {
    id: createId(),
    updateId: createId(),
    authorId: createId(),
    content: 'Obrigado pelo aviso',
    editedAt: null,
    createdAt: now,
    ...overrides,
  }
}

export function seedProjectUpdate(
  projectId: string,
  authorId: string,
  overrides?: {
    status?: Update['status']
    content?: string | null
    createdAt?: Date
    editedAt?: Date
  },
) {
  return prisma.update.create({
    data: {
      status: 'ON_TRACK',
      content: 'Tudo indo bem',
      projectId,
      authorId,
      ...overrides,
    },
  })
}

export function seedUpdateReply(
  updateId: string,
  authorId: string,
  overrides?: { content?: string; createdAt?: Date },
) {
  return prisma.updateReply.create({
    data: { updateId, authorId, content: 'Obrigado pelo aviso', ...overrides },
  })
}

export function seedUpdateReaction(
  updateId: string,
  userId: string,
  emoji = '👍',
  overrides?: { createdAt?: Date },
) {
  return prisma.updateReaction.create({
    data: { updateId, userId, emoji, ...overrides },
  })
}
