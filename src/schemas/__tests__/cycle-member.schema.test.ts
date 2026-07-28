import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { AddCycleMemberSchema } from '../cycle-member.schema'

describe('AddCycleMemberSchema', () => {
  it('accepts a valid cuid2 userId', () => {
    expect(AddCycleMemberSchema.safeParse({ userId: createId() }).success).toBe(
      true,
    )
  })

  it('rejects an invalid userId', () => {
    expect(
      AddCycleMemberSchema.safeParse({ userId: 'not-a-cuid' }).success,
    ).toBe(false)
  })

  it('rejects a missing userId', () => {
    expect(AddCycleMemberSchema.safeParse({}).success).toBe(false)
  })
})
