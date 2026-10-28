const DAY_MS = 86_400_000

/**
 * Issue start/due dates are calendar days, not instants. They are stored as
 * UTC midnight of the picked day so every viewer reads back the same date,
 * whatever their timezone.
 */
export function toIssueDateISO(day: Date): string {
  return new Date(
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()),
  ).toISOString()
}

/**
 * The calendar day a stored issue date refers to, as local midnight so
 * date-fns and `toLocaleDateString` show that same day.
 *
 * Rounding to the nearest UTC midnight (instead of reading the UTC date)
 * also recovers the day of dates saved before `toIssueDateISO`, which were
 * the picker's local midnight: up to ~12h either side of UTC midnight.
 */
export function parseIssueDate(iso: string): Date {
  const day = new Date(Math.round(Date.parse(iso) / DAY_MS) * DAY_MS)
  return new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())
}
