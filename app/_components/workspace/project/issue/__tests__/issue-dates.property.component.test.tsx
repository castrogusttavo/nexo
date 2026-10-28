import fc from 'fast-check'
import { afterAll, describe, expect, it } from 'vitest'
import { parseIssueDate, toIssueDateISO } from '../issue-dates'

const RUNS = { numRuns: 100 }

const ORIGINAL_TZ = process.env.TZ

// Offsets around the world, including the half-hour and quarter-hour ones
// and the extremes on both sides of the date line.
const TIMEZONES = [
  'UTC',
  'America/Sao_Paulo',
  'America/Los_Angeles',
  'Europe/Lisbon',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Pacific/Chatham',
  'Pacific/Kiritimati',
  'Pacific/Midway',
]

/** A calendar day the picker can produce, as its year/month/day parts. */
const calendarDay = () =>
  fc
    .record({
      year: fc.integer({ min: 2000, max: 2060 }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    // The day is drawn from the month's real length, so the parts always
    // name an existing date instead of rolling into the next month.
    .chain(({ year, month }) =>
      fc
        .integer({ min: 1, max: new Date(year, month, 0).getDate() })
        .map((day) => ({ year, month, day })),
    )

function withTimezone<T>(timezone: string, run: () => T): T {
  process.env.TZ = timezone
  try {
    return run()
  } finally {
    process.env.TZ = ORIGINAL_TZ
  }
}

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
})

describe('issue dates (properties)', () => {
  it('a picked day round-trips to the same calendar day in every timezone', () => {
    for (const timezone of TIMEZONES) {
      withTimezone(timezone, () => {
        fc.assert(
          fc.property(calendarDay(), ({ year, month, day }) => {
            const picked = new Date(year, month - 1, day)
            const parsed = parseIssueDate(toIssueDateISO(picked))

            expect([
              parsed.getFullYear(),
              parsed.getMonth() + 1,
              parsed.getDate(),
            ]).toEqual([year, month, day])
          }),
          RUNS,
        )
      })
    }
  })

  it('a stored issue date is always UTC midnight', () => {
    for (const timezone of TIMEZONES) {
      withTimezone(timezone, () => {
        fc.assert(
          fc.property(
            calendarDay(),
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            ({ year, month, day }, hours, minutes) => {
              // The picker hands over whatever time of day the Date carries.
              const iso = toIssueDateISO(
                new Date(year, month - 1, day, hours, minutes),
              )

              expect(iso).toMatch(/T00:00:00\.000Z$/)
              expect(iso.slice(0, 10)).toBe(
                `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
              )
            },
          ),
          RUNS,
        )
      })
    }
  })

  it('storing a parsed date is idempotent', () => {
    for (const timezone of TIMEZONES) {
      withTimezone(timezone, () => {
        fc.assert(
          fc.property(calendarDay(), ({ year, month, day }) => {
            const stored = toIssueDateISO(new Date(year, month - 1, day))

            expect(toIssueDateISO(parseIssueDate(stored))).toBe(stored)
            expect(
              toIssueDateISO(
                parseIssueDate(toIssueDateISO(parseIssueDate(stored))),
              ),
            ).toBe(stored)
          }),
          RUNS,
        )
      })
    }
  })

  it('a legacy local-midnight value recovers its day for any offset from UTC-11 to UTC+12', () => {
    for (const timezone of TIMEZONES) {
      withTimezone(timezone, () => {
        fc.assert(
          fc.property(
            calendarDay(),
            // Whole and half-hour offsets, the range the rounding covers.
            fc.integer({ min: -22, max: 24 }).map((half) => half / 2),
            ({ year, month, day }, offsetHours) => {
              // What the picker saved before `toIssueDateISO`: midnight of
              // the chosen day at the viewer's own offset.
              const legacy = new Date(
                Date.UTC(year, month - 1, day) - offsetHours * 3_600_000,
              ).toISOString()
              const parsed = parseIssueDate(legacy)

              expect([
                parsed.getFullYear(),
                parsed.getMonth() + 1,
                parsed.getDate(),
              ]).toEqual([year, month, day])
            },
          ),
          RUNS,
        )
      })
    }
  })

  it('parsing depends only on the calendar day, not on the time of day stored', () => {
    for (const timezone of TIMEZONES) {
      withTimezone(timezone, () => {
        fc.assert(
          fc.property(
            calendarDay(),
            // Within ±11h of UTC midnight every instant names the same day.
            fc.integer({ min: -11 * 60, max: 11 * 60 }),
            fc.integer({ min: -11 * 60, max: 11 * 60 }),
            ({ year, month, day }, minutesA, minutesB) => {
              const base = Date.UTC(year, month - 1, day)
              const first = parseIssueDate(
                new Date(base + minutesA * 60_000).toISOString(),
              )
              const second = parseIssueDate(
                new Date(base + minutesB * 60_000).toISOString(),
              )

              expect(first.getTime()).toBe(second.getTime())
            },
          ),
          RUNS,
        )
      })
    }
  })
})
