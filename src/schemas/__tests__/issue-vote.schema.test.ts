import { describe, expect, it } from 'vitest'
import { CastIssueVoteSchema } from '../issue-vote.schema'

describe('CastIssueVoteSchema', () => {
  it('should accept every defined vote type', () => {
    for (const type of ['UP', 'DOWN']) {
      const result = CastIssueVoteSchema.safeParse({ type })
      expect(result.success, `type=${type}`).toBe(true)
    }
  })

  it('should reject an unknown vote type', () => {
    const result = CastIssueVoteSchema.safeParse({ type: 'NEUTRAL' })

    expect(result.success).toBe(false)
  })

  it('should reject when type is missing', () => {
    const result = CastIssueVoteSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
