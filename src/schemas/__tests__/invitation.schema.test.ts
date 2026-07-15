import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  AcceptInvitationSchema,
  CreateInvitationSchema,
  InviteToProjectSchema,
} from '../invitation.schema'

describe('CreateInvitationSchema', () => {
  it('accepts a valid payload', () => {
    const result = CreateInvitationSchema.safeParse({
      email: 'ana@example.com',
      role: 'ADMIN',
    })
    expect(result.success).toBe(true)
  })

  it('defaults role to MEMBER when omitted', () => {
    const result = CreateInvitationSchema.safeParse({
      email: 'ana@example.com',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe('MEMBER')
  })

  it('rejects an invalid email', () => {
    const result = CreateInvitationSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid role', () => {
    const result = CreateInvitationSchema.safeParse({
      email: 'ana@example.com',
      role: 'OWNER',
    })
    expect(result.success).toBe(false)
  })

  it('accepts an optional projectId as a valid cuid2', () => {
    const result = CreateInvitationSchema.safeParse({
      email: 'ana@example.com',
      projectId: createId(),
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid projectId', () => {
    const result = CreateInvitationSchema.safeParse({
      email: 'ana@example.com',
      projectId: 'not-a-cuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('AcceptInvitationSchema', () => {
  it('accepts a non-empty token', () => {
    expect(AcceptInvitationSchema.safeParse({ token: 'abc123' }).success).toBe(
      true,
    )
  })

  it('rejects an empty token', () => {
    expect(AcceptInvitationSchema.safeParse({ token: '' }).success).toBe(false)
  })

  it('rejects a missing token', () => {
    expect(AcceptInvitationSchema.safeParse({}).success).toBe(false)
  })
})

describe('InviteToProjectSchema', () => {
  it('accepts a valid payload', () => {
    const result = InviteToProjectSchema.safeParse({
      email: 'ana@example.com',
      role: 'VIEWER',
    })
    expect(result.success).toBe(true)
  })

  it('defaults role to MEMBER when omitted', () => {
    const result = InviteToProjectSchema.safeParse({
      email: 'ana@example.com',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe('MEMBER')
  })

  it('rejects an invalid email', () => {
    expect(InviteToProjectSchema.safeParse({ email: 'nope' }).success).toBe(
      false,
    )
  })
})
