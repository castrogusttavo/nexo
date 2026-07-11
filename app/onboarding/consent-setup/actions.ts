'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { AcceptConsentSchema } from '@/src/schemas/user.schema'
import { UserService } from '@/src/services/user.service'

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
        'Você previsa aceitar ambos os documentos',
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

  redirect('/onboarding')
}
