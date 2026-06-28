import type { NextResponse } from 'next/server'
import { NODE_ENV } from '@/lib/env/env'
import type { UserPreferenceDTO } from '@/types/user-preference.factory'

export const PREFERENCE_COOKIES = {
  theme: 'nexo.theme',
  timezone: 'nexo.tz',
  weekStartsOn: 'nexo.wk',
  weekendDays: 'nexo.we',
} as const

const ONE_YEAR = 60 * 60 * 24 * 365

// Mirrors yeh SSR-relevante fields onto cookies so the first server paint
// (theme / calendar / date formatting) is correct. DB remains the source of truth
export function mirrorPreferenceCookies(
  response: NextResponse,
  dto: UserPreferenceDTO,
): void {
  const base = {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax' as const,
    httpOnly: false, // read by client (theme script + UI hydration)
    secure: NODE_ENV === 'production',
  }

  // nosemgrep: javascript.koa.web.cookies-httponly-false-koa -- non-sensitive UI preference, read client-side for anti-FOUC
  response.cookies.set(PREFERENCE_COOKIES.theme, dto.theme, base)
  // nosemgrep: javascript.koa.web.cookies-httponly-false-koa -- non-sensitive UI preference, read client-side for anti-FOUC
  response.cookies.set(PREFERENCE_COOKIES.timezone, dto.timezone, base)
  // nosemgrep: javascript.koa.web.cookies-httponly-false-koa -- non-sensitive UI preference, read client-side for anti-FOUC
  response.cookies.set(
    PREFERENCE_COOKIES.weekStartsOn,
    String(dto.weekStartsOn),
    base,
  )
  // nosemgrep: javascript.koa.web.cookies-httponly-false-koa -- non-sensitive UI preference, read client-side for anti-FOUC
  response.cookies.set(
    PREFERENCE_COOKIES.weekendDays,
    dto.weekendDays.join(','),
    base,
  )
}
