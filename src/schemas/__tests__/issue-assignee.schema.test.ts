import { describe, expect, it } from 'vitest'
import { AssignIssueSchema } from '../issue-assignee.schema'

describe('AssignIssueSchema', () => {
  it('should accept a valid userId', () => {
    const result = AssignIssueSchema.safeParse({
      userId: 'tz4a98xxat96iws9zmbrgj3a',
    })

    expect(result.success).toBe(true)
  })

  it('should reject an invalid userId', () => {
    const result = AssignIssueSchema.safeParse({ userId: 'not-a-cuid' })

    expect(result.success).toBe(false)
  })

  it('should reject when userId is missing', () => {
    const result = AssignIssueSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
