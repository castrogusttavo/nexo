'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_DATA_COOKIE } from '@/src/lib/auth-cookie'
import { getAuthSession } from '@/src/lib/auth-session'
import { AcceptConsentSchema } from '@/src/schemas/user.schema'
import { UserService } from '@/src/services/user.service'
import { onboardingDestination } from '../_lib/destination'

export type AcceptConsentState = { ok: boolean; error?: string }

export async function acceptOnboardingConsent(
  _prev: AcceptConsentState,
  formData: FormData,
): Promise<AcceptConsentState> {
  const auth = await getAuthSession()
  if (!auth.ok)
    return { ok: false, error: 'Sessão expirada. Faça login novamente' }

  const parsed = AcceptConsentSchema.safeParse({
    acceptedTerms: formData.get('acceptedTerms') === 'on',
    acceptedPrivacy: formData.get('acceptedPrivacy') === 'on',
  })
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        'Você precisa aceitar ambos os documentos',
    }
  }

  const reqHeaders = await headers()
  const ipAddress =
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    reqHeaders.get('x-real-ip') ||
    null
  const userAgent = reqHeaders.get('user-agent') ?? null

  const result = await UserService.acceptConsents(auth.value.user.id, {
    ipAddress,
    userAgent,
  })
  if (!result.ok) {
    return {
      ok: false,
      error: 'Não foi possível salvar seu consentimento. Tente novamente',
    }
  }

  // The signed cookie cache still says "no consent" for up to 5 min, and the
  // proxy would sen the user straight back here. Drop it; the netx session
  // read re-issues it from the database. A __Secure- cookie can only be
  // overwritten by a Secure Set-Cookir
  const jar = await cookies()
  for (const { name } of jar.getAll()) {
    if (SESSION_DATA_COOKIE.test(name)) {
      jar.set(name, '', {
        maxAge: 0,
        path: '/',
        secure: name.startsWith('__Secure-'),
      })
    }
  }

  redirect(await onboardingDestination(auth.value.user.id))
}
