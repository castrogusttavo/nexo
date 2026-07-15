import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { AddProjectMemberSchema } from '../project-member.schema'

describe('AddProjectMemberSchema', () => {
  it('accepts a valid cuid2 userId', () => {
    expect(
      AddProjectMemberSchema.safeParse({ userId: createId() }).success,
    ).toBe(true)
  })

  it('rejects an invalid userId', () => {
    expect(
      AddProjectMemberSchema.safeParse({ userId: 'not-a-cuid' }).success,
    ).toBe(false)
  })

  it('rejects a missing userId', () => {
    expect(AddProjectMemberSchema.safeParse({}).success).toBe(false)
  })
})
