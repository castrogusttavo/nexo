'use client'

import { useEffect } from 'react'
import {
  applyTheme,
  useUserPreferences,
} from '@/src/hooks/use-user-preferences'

// Applies the DB theme app-wide and tracks OS changes when theme === SYSTEM.
// The cookie handles the first SSR paint; this keeps it correct after login
// and across devices (the query refetches the source-of-truth from the DB)
export function ThemeSync() {
  const { data } = useUserPreferences()
  const theme = data?.theme

  useEffect(() => {
    if (!theme) return
    applyTheme(theme)

    if (theme !== 'SYSTEM') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('SYSTEM')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return null
}
