'use client'

import { useMemo } from 'react'
import { useHydrated } from '@/components/hooks/use-hydrated'

type LocalDateProps = {
  value: string | number | Date
  options?: Intl.DateTimeFormatOptions
}

// An instant (createdAt, a scheduled deletion, a trial end) shown in the
// viewer's own timezone. The server only knows UTC, so the text appears
// once hydrated: formatting it during SSR rendered the server's day and
// broke hydration around midnight. Calendar days (issue dates) are not
// instants and use formatIssueDay instead.
export function LocalDate({ value, options }: LocalDateProps) {
  const hydrated = useHydrated()
  // Keyed by the serialized options, so a new object literal on every
  // render does not rebuild the formatter.
  const optionsKey = JSON.stringify(options ?? {})
  const formatter = useMemo(
    () => new Intl.DateTimeFormat('pt-BR', JSON.parse(optionsKey)),
    [optionsKey],
  )
  if (!hydrated) return null
  // Only reached after hydration (see useHydrated), in the viewer's timezone.
  // react-doctor-disable-next-line react-doctor/no-locale-format-in-render
  return <time dateTime={new Date(value).toISOString()}>{formatter.format(new Date(value))}</time>
}
