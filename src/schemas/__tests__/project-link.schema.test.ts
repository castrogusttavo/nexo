import { describe, expect, it } from 'vitest'
import {
  CreateProjectLinkSchema,
  UpdateProjectLinkSchema,
} from '../../schemas/project-link.schema'

describe('CreateProjectLinkSchema', () => {
  it('should accept an https url with a title', () => {
    expect(
      CreateProjectLinkSchema.safeParse({
        url: 'https://nexopm.com/docs',
        title: 'Docs',
      }).success,
    ).toBe(true)
  })

  it('should accept a url without a title', () => {
    expect(
      CreateProjectLinkSchema.safeParse({ url: 'http://exemplo.com' }).success,
    ).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'ftp://exemplo.com',
    'data:text/html,<b>x</b>',
    'nao e url',
    '',
  ])('should reject %s', (url) => {
    expect(CreateProjectLinkSchema.safeParse({ url }).success).toBe(false)
  })

  it('should rejetc a title above 100 characters', () => {
    expect(
      CreateProjectLinkSchema.safeParse({
        url: 'https://a.com',
        title: 'x'.repeat(101),
      }).success,
    ).toBe(false)
  })
})

describe('UpdateProjectLinkSchema', () => {
  it('should accept a null title (clears it)', () => {
    expect(UpdateProjectLinkSchema.safeParse({ title: null }).success).toBe(
      true,
    )
  })

  it('should reject an empty body', () => {
    expect(UpdateProjectLinkSchema.safeParse({}).success).toBe(false)
  })
})
