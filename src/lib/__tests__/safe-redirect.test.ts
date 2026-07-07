import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from '@/src/lib/safe-redirect'

describe('safeRedirectPath', () => {
  it('accepts relative paths with query strings', () => {
    expect(safeRedirectPath('/upgrade')).toBe('/upgrade')
    expect(safeRedirectPath('/upgrade?plan=PRO&billing=yearly')).toBe(
      '/upgrade?plan=PRO&billing=yearly',
    )
  })

  it('rejects absolute URLs', () => {
    expect(safeRedirectPath('https://evil.com')).toBeNull()
    expect(safeRedirectPath('http://evil.com/upgrade')).toBeNull()
  })

  it('rejects protocol-relative and backslash variants', () => {
    expect(safeRedirectPath('//evil.com')).toBeNull()
    expect(safeRedirectPath('/\\evil.com')).toBeNull()
  })

  it('rejects empty and missing values', () => {
    expect(safeRedirectPath('')).toBeNull()
    expect(safeRedirectPath(null)).toBeNull()
    expect(safeRedirectPath(undefined)).toBeNull()
  })

  it('rejects paths that do not start with a slash', () => {
    expect(safeRedirectPath('upgrade')).toBeNull()
    expect(safeRedirectPath('javascript:alert(1)')).toBeNull()
  })
})
