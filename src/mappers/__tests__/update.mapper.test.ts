import { describe, expect, it } from 'vitest'
import {
  createFakeUpdate,
  createFakeUpdateReply,
} from '@/src/__tests__/factories/update.factory'
import { toUpdateDTO, toUpdateReplyDTO } from '../update.mapper'

const AUTHOR = { id: 'user-1', name: 'Ana', username: 'ana', image: null }

function row(overrides = {}) {
  return {
    ...createFakeUpdate({ id: 'update-1', projectId: 'project-1' }),
    author: AUTHOR,
    reactions: [] as { emoji: string; userId: string }[],
    _count: { replies: 0 },
    ...overrides,
  }
}

describe('toUpdateDTO()', () => {
  it('maps the fields and serializes the dates', () => {
    const createdAt = new Date('2026-01-15T10:30:00.000Z')
    const dto = toUpdateDTO(
      row({ createdAt, editedAt: new Date('2026-01-16T08:00:00.000Z') }),
      'viewer',
    )

    expect(dto).toMatchObject({
      id: 'update-1',
      projectId: 'project-1',
      issueId: null,
      status: 'ON_TRACK',
      content: 'Tudo indo bem',
      author: AUTHOR,
      createdAt: '2026-01-15T10:30:00.000Z',
      editedAt: '2026-01-16T08:00:00.000Z',
    })
  })

  it('has no editedAt for an update never edited', () => {
    expect(toUpdateDTO(row(), 'viewer').editedAt).toBeNull()
  })

  it('has no author for an update whose author was removed', () => {
    expect(toUpdateDTO(row({ author: null }), 'viewer').author).toBeNull()
  })

  it('does no leak anything beyond the author fields it names', () => {
    const dto = toUpdateDTO(
      row({ author: { ...AUTHOR, email: 'ana@nexo.dev' } }),
      'viewer',
    )

    expect(dto.author).toEqual(AUTHOR)
  })

  it('reports the number of replies', () => {
    expect(
      toUpdateDTO(row({ _count: { replies: 3 } }), 'viewer').replyCount,
    ).toBe(3)
  })

  describe('reactions', () => {
    const rows = [
      { emoji: '👍', userId: 'a' },
      { emoji: '🎉', userId: 'b' },
      { emoji: '👍', userId: 'viewer' },
      { emoji: '👍', userId: 'c' },
    ]

    it('counts people per emoji', () => {
      const dto = toUpdateDTO(row({ reactions: rows }), 'nobody')

      expect(dto.reactions).toEqual([
        { emoji: '👍', count: 3, reactedByMe: false },
        { emoji: '🎉', count: 1, reactedByMe: false },
      ])
    })

    it('marks the emojis the viewer user, and only those', () => {
      const dto = toUpdateDTO(row({ reactions: rows }), 'viewer')

      expect(dto.reactions.find((r) => r.emoji === '👍')?.reactedByMe).toBe(
        true,
      )
      expect(dto.reactions.find((r) => r.emoji === '🎉')?.reactedByMe).toBe(
        false,
      )
    })

    it('orders by count, then by who came first', () => {
      const dto = toUpdateDTO(
        row({
          reactions: [
            { emoji: '🎉', userId: 'a' },
            { emoji: '👍', userId: 'b' },
            { emoji: '👀', userId: 'c' },
            { emoji: '👍', userId: 'd' },
          ],
        }),
        'nobody',
      )

      expect(dto.reactions.map((r) => r.emoji)).toEqual(['👍', '🎉', '👀'])
    })

    it('is empty when nobody reacted', () => {
      expect(toUpdateDTO(row(), 'viewer').reactions).toEqual([])
    })

    it('never exposes who reacted', () => {
      const dto = toUpdateDTO(row({ reactions: rows }), 'viewer')

      expect(JSON.stringify(dto.reactions)).not.toContain('userId')
    })
  })
})

describe('toUpdateReplyDTO()', () => {
  it('maps the fields and serializes tha dates', () => {
    const reply = {
      ...createFakeUpdateReply({
        id: 'reply-1',
        updateId: 'update-1',
        createdAt: new Date('2026-01-15T10:30:00.000Z'),
      }),
      author: AUTHOR,
    }

    expect(toUpdateReplyDTO(reply)).toEqual({
      id: 'reply-1',
      updateId: 'update-1',
      content: 'Obrigado pelo aviso',
      author: AUTHOR,
      editedAt: null,
      createdAt: '2026-01-15T10:30:00.000Z',
    })
  })

  it('has no author for a reply whose author was removed', () => {
    const reply = { ...createFakeUpdateReply(), author: null }

    expect(toUpdateReplyDTO(reply).author).toBeNull()
  })
})
