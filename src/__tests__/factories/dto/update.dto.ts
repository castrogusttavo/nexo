import type { UpdateDTO, UpdateReplyDTO } from '@/types/updates'

export function buildUpdateDTO(overrides: Partial<UpdateDTO> = {}): UpdateDTO {
  return {
    id: 'update-1',
    projectId: 'project-1',
    issueId: null,
    status: 'ON_TRACK',
    content: 'Tudo indo bem',
    author: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
    editedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    replyCount: 0,
    reactions: [],
    ...overrides,
  }
}

export function buildUpdateReplyDTO(
  overrides: Partial<UpdateReplyDTO> = {},
): UpdateReplyDTO {
  return {
    id: 'reply-1',
    updateId: 'update-1',
    content: 'Obrigado pelo aviso',
    author: { id: 'user-2', name: 'Bruno', username: 'bruno', image: null },
    editedAt: null,
    createdAt: '2026-01-01T00:01:00.000Z',
    ...overrides,
  }
}
