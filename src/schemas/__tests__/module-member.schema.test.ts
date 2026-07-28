import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { AddModuleMemberSchema } from '../module-member.schema'

describe('AddModuleMemberSchema', () => {
  it('accepts a valid cuid2 userId', () => {
    expect(
      AddModuleMemberSchema.safeParse({ userId: createId() }).success,
    ).toBe(true)
  })

  it('rejects an invalid userId', () => {
    expect(
      AddModuleMemberSchema.safeParse({ userId: 'not-a-cuid' }).success,
    ).toBe(false)
  })

  it('rejects a missing userId', () => {
    expect(AddModuleMemberSchema.safeParse({}).success).toBe(false)
  })
})
