import { afterEach, describe, expect, it, vi } from 'vitest'
import { cn, DateFormat } from '../utils'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DateFormat', () => {
  it('formats a date as a short pt-BR weekday, day, month and year in UTC', () => {
    expect(DateFormat(new Date('2026-07-04T00:00:00Z'))).toBe(
      'sáb., 04 de jul. de 2026',
    )
  })

  it('keeps the UTC day for a late-evening instant', () => {
    expect(DateFormat(new Date('2026-07-04T23:59:59Z'))).toBe(
      'sáb., 04 de jul. de 2026',
    )
  })

  // The status page calls it for every bar (7 components x 90 days). Building
  // an Intl.DateTimeFormat per call cost ~40 ms of CPU per request there.
  it('reuses one formatter instead of building one per call', () => {
    const toLocale = vi.spyOn(Date.prototype, 'toLocaleDateString')

    for (let day = 1; day <= 90; day++) {
      DateFormat(new Date(Date.UTC(2026, 6, day)))
    }

    expect(toLocale).not.toHaveBeenCalled()
  })
})

describe('cn', () => {
  it('merges conflicting tailwind classes, the last one wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
