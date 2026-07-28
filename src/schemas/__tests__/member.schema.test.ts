import { describe, expect, it } from 'vitest'
import { ListMembersQuerySchema } from '../member.schema'

describe('ListMembersQuerySchema', () => {
  it('accepts an empty query and applies defaults', () => {
    const result = ListMembersQuerySchema.safeParse({})
    expect(
      result.success && {
        sortBy: result.data.sortBy,
        sortOrder: result.data.sortOrder,
        page: result.data.page,
        pageSize: result.data.pageSize,
      },
    ).toEqual({
      sortBy: 'joinedAt',
      sortOrder: 'desc',
      page: 1,
      pageSize: 20,
    })
  })

  it('parses a comma-separated roles filter', () => {
    const result = ListMembersQuerySchema.safeParse({ roles: 'ADMIN,MEMBER' })
    expect(result.success && result.data.roles).toEqual(['ADMIN', 'MEMBER'])
  })

  it('rejects an invalid role in the filter', () => {
    expect(
      ListMembersQuerySchema.safeParse({ roles: 'SUPERADMIN' }).success,
    ).toBe(false)
  })

  it('coerces page and pageSize from strings', () => {
    const result = ListMembersQuerySchema.safeParse({
      page: '2',
      pageSize: '50',
    })
    expect(
      result.success && {
        page: result.data.page,
        pageSize: result.data.pageSize,
      },
    ).toEqual({ page: 2, pageSize: 50 })
  })

  it('rejects a pageSize above 100', () => {
    expect(ListMembersQuerySchema.safeParse({ pageSize: 101 }).success).toBe(
      false,
    )
  })

  it('rejects an unknown sortBy', () => {
    expect(
      ListMembersQuerySchema.safeParse({ sortBy: 'lastSeen' }).success,
    ).toBe(false)
  })
})
