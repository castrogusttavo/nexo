import type { NextResponse } from 'next/server'
import { NODE_ENV } from '@/lib/env/env'
import type { UserPreferenceDTO } from '@/types/user-preference'

export const PREFERENCE_COOKIES = {
  theme: 'nexo.theme',
  timezone: 'nexo.tz',
  weekStartsOn: 'nexo.wk',
  weekendDays: 'nexo.we',
} as const

const ONE_YEAR = 60 * 60 * 24 * 365

// Preference cookies are deliberately public (no httpOnly): the theme script and
// UI hydration read them client-side so the first server paint is correct. They
// carry only non-sensitive UI hints; the DB remains the source of truth.
const PUBLIC_PREFERENCE_COOKIE_OPTIONS = {
  path: '/',
  maxAge: ONE_YEAR,
  sameSite: 'lax' as const,
  secure: NODE_ENV === 'production',
}

// Mirrors the SSR-relevant fields onto cookies so the first server paint
// (theme / calendar / date formatting) is correct. DB remains the source of truth.
export function mirrorPreferenceCookies(
  response: NextResponse,
  dto: UserPreferenceDTO,
): void {
  response.cookies.set(
    PREFERENCE_COOKIES.theme,
    dto.theme,
    PUBLIC_PREFERENCE_COOKIE_OPTIONS,
  )
  response.cookies.set(
    PREFERENCE_COOKIES.timezone,
    dto.timezone,
    PUBLIC_PREFERENCE_COOKIE_OPTIONS,
  )
  response.cookies.set(
    PREFERENCE_COOKIES.weekStartsOn,
    String(dto.weekStartsOn),
    PUBLIC_PREFERENCE_COOKIE_OPTIONS,
  )
  response.cookies.set(
    PREFERENCE_COOKIES.weekendDays,
    dto.weekendDays.join(','),
    PUBLIC_PREFERENCE_COOKIE_OPTIONS,
  )
}
