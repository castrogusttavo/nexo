import { describe, expect, it } from 'vitest'
import {
  CreateUpdateReplySchema,
  CreateUpdateSchema,
  isSingleEmoji,
  ListUpdatesQuerySchema,
  UpdateEmojiSchema,
} from '../update.schema'

describe('CreateUpdateSchema', () => {
  it('accepts a status alone', () => {
    expect(CreateUpdateSchema.safeParse({ status: 'ON_TRACK' }).success).toBe(
      true,
    )
  })
  it('rejects an unknown status', () => {
    expect(CreateUpdateSchema.safeParse({ status: 'DONE' }).success).toBe(false)
  })
  it('rejects content over 2000 characters', () => {
    expect(
      CreateUpdateSchema.safeParse({
        status: 'AT_RISK',
        content: 'x'.repeat(2001),
      }).success,
    ).toBe(false)
  })
})

describe('CreateUpdateReplySchema', () => {
  it('trims the text', () => {
    expect(CreateUpdateReplySchema.parse({ content: '  oi  ' })).toEqual({
      content: 'oi',
    })
  })
  it.each(['', '   '])('rejects an empty reply: %j', (content) => {
    expect(CreateUpdateReplySchema.safeParse({ content }).success).toBe(false)
  })
  it('rejects a reply over 2000 characters', () => {
    expect(
      CreateUpdateReplySchema.safeParse({ content: 'x'.repeat(2001) }).success,
    ).toBe(false)
  })
})

describe('isSingleEmoji', () => {
  it.each([
    '👍',
    '❤️',
    '🎉',
    '🇧🇷',
    '👨‍👩‍👧',
    '👍🏽',
    '1️⃣',
    '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  ])('accepts %s', (value) => expect(isSingleEmoji(value)).toBe(true))
  it.each([
    '',
    'a',
    '1',
    'oi',
    '👍👍',
    '👍a',
    'a👍',
    ' 👍',
    '👍 ',
  ])('rejects %j', (value) => expect(isSingleEmoji(value)).toBe(false))
  it('rejects a very long string even if it is one grapheme', () => {
    expect(isSingleEmoji(`👍${'\u200D'.repeat(40)}`)).toBe(false)
  })
})

describe('UpdateEmojiSchema', () => {
  it('reports a message a person can read', () => {
    const result = UpdateEmojiSchema.safeParse('abc')
    expect(!result.success && result.error.issues[0].message).toBe(
      'Reação deve ser um único emoji',
    )
  })
})

describe('ListUpdatesQuerySchema', () => {
  it('defaults the page size to 20', () => {
    expect(ListUpdatesQuerySchema.parse({}).limit).toBe(20)
  })
  it('coerces the limit fromt he query string and caps it at 50', () => {
    expect(ListUpdatesQuerySchema.parse({ limit: '10' }).limit).toBe(10)
    expect(ListUpdatesQuerySchema.safeParse({ limit: '51' }).success).toBe(
      false,
    )
  })
})
