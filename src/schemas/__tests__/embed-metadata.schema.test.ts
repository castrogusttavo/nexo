import { describe, expect, it } from 'vitest'
import { EmbedMetadataSchema } from '../embed-metadata.schema'

describe('EmbedMetadataSchema', () => {
  it('accepts an https url', () => {
    const result = EmbedMetadataSchema.safeParse({
      url: 'https://www.youtube.com/watch?v=abc',
    })

    expect(result.success).toBe(true)
  })

  it.each([
    ['a missing body', undefined],
    ['a body without url', {}],
    ['a non-string url', { url: 42 }],
    ['a plain http url', { url: 'http://www.youtube.com/watch?v=abc' }],
    ['a javascript: url', { url: 'javascript:alert(1)' }],
    ['a file: url', { url: 'file:///etc/passwd' }],
    ['something that is not a url at all', { url: 'youtube' }],
  ])('rejects %s', (_label, input) => {
    expect(EmbedMetadataSchema.safeParse(input).success).toBe(false)
  })

  it('rejects a url past the length cap', () => {
    const url = `https://www.youtube.com/watch?v=${'a'.repeat(2048)}`

    expect(EmbedMetadataSchema.safeParse({ url }).success).toBe(false)
  })
})
