import { describe, expect, it } from 'vitest'
import {
  maskQueryString,
  maskSensitiveText,
  maskUrl,
  scrubBreadcrumb,
  scrubEvent,
} from '@/lib/sentry/scrub'

describe('maskSensitiveText', () => {
  it('masks e-mail addresses', () => {
    expect(maskSensitiveText('no user for ana@example.com')).toBe(
      'no user for [email]',
    )
  })

  it('masks bearer tokens', () => {
    expect(maskSensitiveText('Authorization: Bearer abc.def.ghi')).toBe(
      'Authorization: Bearer [redacted]',
    )
  })

  it('masks credentials embedded in a URL', () => {
    expect(
      maskSensitiveText('connect postgresql://nexo:hunter2@db:5432/app'),
    ).toBe('connect postgresql://[redacted]@db:5432/app')
  })

  it('masks a JWT that leaked into a message', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl'
    expect(maskSensitiveText(`token ${jwt} rejected`)).toBe(
      'token [jwt] rejected',
    )
  })

  it('masks a Slack webhook, like sanitizeAlertText does', () => {
    expect(
      maskSensitiveText('POST https://hooks.slack.com/services/T0/B0/xxx failed'),
    ).toBe('POST [webhook] failed')
  })

  it('leaves an ordinary message alone', () => {
    expect(maskSensitiveText('Cannot read properties of undefined')).toBe(
      'Cannot read properties of undefined',
    )
  })
})

describe('maskQueryString', () => {
  it('redacts the reset-password token but keeps the rest', () => {
    expect(maskQueryString('?token=abc123&redirect=%2Fboard')).toBe(
      '?token=[redacted]&redirect=%2Fboard',
    )
  })

  it('redacts OAuth parameters', () => {
    expect(maskQueryString('code=xyz&state=abc&scope=email')).toBe(
      'code=[redacted]&state=[redacted]&scope=email',
    )
  })

  it('leaves a flag without a value alone', () => {
    expect(maskQueryString('?debug')).toBe('?debug')
  })

  it('is case-insensitive about the parameter name', () => {
    expect(maskQueryString('?Token=abc')).toBe('?Token=[redacted]')
  })
})

describe('maskUrl', () => {
  it('redacts secrets in the query without touching the path', () => {
    expect(maskUrl('https://nexopm.com/reset-password?token=abc')).toBe(
      'https://nexopm.com/reset-password?token=[redacted]',
    )
  })

  it('redacts an e-mail used as a path segment', () => {
    expect(maskUrl('https://nexopm.com/invite/ana@example.com')).toBe(
      'https://nexopm.com/invite/[email]',
    )
  })
})

describe('scrubEvent', () => {
  it('keeps the user id and drops every other identity field', () => {
    const event = scrubEvent({
      user: {
        id: 'usr_123',
        email: 'ana@example.com',
        username: 'ana.souza',
        ip_address: '203.0.113.7',
      },
    })
    expect(event.user).toEqual({ id: 'usr_123' })
  })

  it('drops the user object entirely when there is no id', () => {
    const event = scrubEvent({ user: { email: 'ana@example.com' } })
    expect(event.user).toBeNull()
  })

  it('drops cookies, the request body and the environment', () => {
    const event = scrubEvent({
      request: {
        cookies: { 'better-auth.session_token': 'secret' },
        data: { email: 'ana@example.com', password: 'hunter2' },
        env: { SERVER_NAME: 'nexo-1' },
      },
    })
    expect(event.request?.cookies).toBeUndefined()
    expect(event.request?.data).toBeUndefined()
    expect(event.request?.env).toBeUndefined()
  })

  it('redacts credential headers and masks the rest', () => {
    const event = scrubEvent({
      request: {
        headers: {
          Cookie: 'better-auth.session_token=abc',
          Authorization: 'Bearer abc',
          'X-Api-Key': 'k',
          'user-agent': 'Chromium',
          referer: 'https://nexopm.com/u/ana@example.com',
        },
      },
    })
    expect(event.request?.headers).toEqual({
      Cookie: '[redacted]',
      Authorization: '[redacted]',
      'X-Api-Key': '[redacted]',
      'user-agent': 'Chromium',
      referer: 'https://nexopm.com/u/[email]',
    })
  })

  it('masks the request url and query string', () => {
    const event = scrubEvent({
      request: {
        url: 'https://nexopm.com/reset-password',
        query_string: 'token=abc&next=%2Fhome',
      },
    })
    expect(event.request?.query_string).toBe('token=[redacted]&next=%2Fhome')
  })

  it('masks a query string given as an object', () => {
    const event = scrubEvent({
      request: { query_string: { token: 'abc', page: '2' } },
    })
    expect(event.request?.query_string).toEqual({
      token: '[redacted]',
      page: '2',
    })
  })

  it('masks a query string given as pairs', () => {
    const event = scrubEvent({
      request: {
        query_string: [
          ['token', 'abc'],
          ['page', '2'],
        ] as [string, string][],
      },
    })
    expect(event.request?.query_string).toEqual([
      ['token', '[redacted]'],
      ['page', '2'],
    ])
  })

  it('masks exception messages', () => {
    const event = scrubEvent({
      exception: {
        values: [{ type: 'Error', value: 'no account for ana@example.com' }],
      },
    })
    expect(event.exception?.values?.[0].value).toBe('no account for [email]')
  })

  it('masks a string message and a structured one', () => {
    expect(scrubEvent({ message: 'hi ana@example.com' }).message).toBe(
      'hi [email]',
    )
    const structured = scrubEvent({
      message: { message: 'hi %s', formatted: 'hi ana@example.com' },
    })
    expect(structured.message).toEqual({
      message: 'hi %s',
      formatted: 'hi [email]',
    })
  })

  it('masks breadcrumb urls and messages', () => {
    const event = scrubEvent({
      breadcrumbs: [
        {
          message: 'signed in as ana@example.com',
          data: { url: '/api/auth/reset?token=abc' },
        },
      ],
    })
    expect(event.breadcrumbs?.[0].message).toBe('signed in as [email]')
    expect(event.breadcrumbs?.[0].data?.url).toBe(
      '/api/auth/reset?token=[redacted]',
    )
  })

  it('never drops the event', () => {
    const event = { exception: { values: [{ value: 'boom' }] } }
    expect(scrubEvent(event)).toBe(event)
  })
})

describe('scrubBreadcrumb', () => {
  it('masks the url and the message but keeps the breadcrumb', () => {
    const crumb = scrubBreadcrumb({
      category: 'fetch',
      message: 'ana@example.com',
      data: { url: 'https://nexopm.com/x?secret=1' },
    })
    expect(crumb?.message).toBe('[email]')
    expect(crumb?.data?.url).toBe('https://nexopm.com/x?secret=[redacted]')
  })
})
