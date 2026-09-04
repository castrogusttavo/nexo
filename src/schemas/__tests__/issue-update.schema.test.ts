import { describe, expect, it } from 'vitest'
import {
  CreateIssueUpdateSchema,
  UpdateIssueUpdateSchema,
} from '../issue-update.schema'

describe('CreateIssueUpdateSchema', () => {
  it('should accept a valid status without content', () => {
    const result = CreateIssueUpdateSchema.safeParse({ status: 'ON_TRACK' })

    expect(result.success).toBe(true)
  })

  it('should accept every defined status', () => {
    for (const status of ['ON_TRACK', 'AT_RISK', 'OFF_TRACK']) {
      const result = CreateIssueUpdateSchema.safeParse({ status })
      expect(result.success, `status=${status}`).toBe(true)
    }
  })

  it('should accept an optional content', () => {
    const result = CreateIssueUpdateSchema.safeParse({
      status: 'AT_RISK',
      content: 'Atrasado por dependência externa',
    })

    expect(result.success).toBe(true)
  })

  it('should reject an unknown status', () => {
    const result = CreateIssueUpdateSchema.safeParse({ status: 'DONE' })

    expect(result.success).toBe(false)
  })

  it('should reject content longer than 2000 chars', () => {
    const result = CreateIssueUpdateSchema.safeParse({
      status: 'ON_TRACK',
      content: 'a'.repeat(2001),
    })

    expect(result.success).toBe(false)
  })

  it('should reject when status is missing', () => {
    const result = CreateIssueUpdateSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('UpdateIssueUpdateSchema', () => {
  it('should accept a valid status', () => {
    const result = UpdateIssueUpdateSchema.safeParse({ status: 'OFF_TRACK' })

    expect(result.success).toBe(true)
  })

  it('should reject when status is missing', () => {
    const result = UpdateIssueUpdateSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
