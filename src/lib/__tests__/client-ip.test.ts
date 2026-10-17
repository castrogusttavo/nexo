import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/env/server')>()),
  TRUSTED_PROXIES: ['127.0.0.1', '10.0.0.0/8'],
}))

import { clientIp } from '@/src/lib/client-ip'

function headers(values: Record<string, string> = {}): Headers {
  return new Headers(values)
}

describe('clientIp()', () => {
  it('should return the rightmost entry, the one nginx appended', () => {
    expect(
      clientIp(headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' })),
    ).toBe('3.3.3.3')
  })

  it('should not let a spoofed leftmost entry pick the address', () => {
    const spoofed = headers({ 'x-forwarded-for': '9.9.9.9, 3.3.3.3' })
    const honest = headers({ 'x-forwarded-for': '3.3.3.3' })
    expect(clientIp(spoofed)).toBe(clientIp(honest))
  })

  it('should skip trusted proxies from the right', () => {
    expect(
      clientIp(headers({ 'x-forwarded-for': '4.4.4.4, 10.1.2.3, 127.0.0.1' })),
    ).toBe('4.4.4.4')
  })

  it('should trim whitespace around entries', () => {
    expect(clientIp(headers({ 'x-forwarded-for': '  5.5.5.5 ' }))).toBe(
      '5.5.5.5',
    )
  })

  it('should return null when every hop is a trusted proxy', () => {
    expect(
      clientIp(headers({ 'x-forwarded-for': '10.0.0.1, 127.0.0.1' })),
    ).toBeNull()
  })

  it('should ignore x-real-ip, which nginx derives from the client header', () => {
    expect(clientIp(headers({ 'x-real-ip': '6.6.6.6' }))).toBeNull()
  })

  it('should return null without headers', () => {
    expect(clientIp(headers())).toBeNull()
    expect(clientIp(null)).toBeNull()
    expect(clientIp(undefined)).toBeNull()
  })
})
