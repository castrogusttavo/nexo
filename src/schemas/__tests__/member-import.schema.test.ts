import { describe, expect, it } from 'vitest'
import {
  MemberImportRequiredColumns,
  MemberImportRowSchema,
} from '../member-import.schema'

describe('MemberImportRequiredColumns', () => {
  it('lists the columns the import file must have', () => {
    expect(MemberImportRequiredColumns).toEqual([
      'email',
      'username',
      'name',
      'role',
    ])
  })
})

describe('MemberImportRowSchema', () => {
  it('accepts a row with only email and defaults role to MEMBER', () => {
    const result = MemberImportRowSchema.safeParse({
      email: 'user@example.com',
    })
    expect(result.success && result.data.role).toBe('MEMBER')
  })

  it('accepts a full row', () => {
    expect(
      MemberImportRowSchema.safeParse({
        email: 'user@example.com',
        username: 'user',
        name: 'User Name',
        role: 'ADMIN',
      }).success,
    ).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(
      MemberImportRowSchema.safeParse({ email: 'not-an-email' }).success,
    ).toBe(false)
  })

  it('rejects a role that cannot be invited', () => {
    expect(
      MemberImportRowSchema.safeParse({
        email: 'user@example.com',
        role: 'OWNER',
      }).success,
    ).toBe(false)
  })
})
