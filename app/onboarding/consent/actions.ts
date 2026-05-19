'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/server'
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/versions'
import { unauthorized } from '@/src/errors'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'

const ConsentInputSchema = z.object({
  acceptedTerms: z.literal(true, {
    message: 'Você precisa aceitar os Termos de Serviço',
  }),
  acceptedPrivacy: z.literal(true, {
    message: 'Você precisa aceitar a Política de Privacidade',
  }),
})

export type AcceptConsentState = {
  ok: boolean
  error?: string
}

export async function acceptOnboardingConsent(
  _prev: AcceptConsentState,
  formData: FormData,
): Promise<AcceptConsentState> {
  const auth = await getAuthSession()
  if (!auth.ok)
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  const parsed = ConsentInputSchema.safeParse({
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

  const userId = auth.value.user.id
  const reqHeaders = await headers()
  const ipAddress =
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    reqHeaders.get('x-real-ip') ||
    null
  const userAgent = reqHeaders.get('user-agent') ?? null
  const now = new Date()

  const persist: Result<true> = await prisma
    .$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { acceptedTermsAt: now, acceptedPrivacyAt: now },
      }),
      prisma.consentEvent.createMany({
        data: [
          {
            userId,
            document: 'TERMS',
            version: TERMS_VERSION,
            action: 'GRANTED',
            ipAddress,
            userAgent,
          },
          {
            userId,
            document: 'PRIVACY',
            version: PRIVACY_VERSION,
            action: 'GRANTED',
            ipAddress,
            userAgent,
          },
        ],
      }),
    ])
    .then(() => ok(true as const))
    .catch((error: unknown) => {
      logger.error('consent.onboarding.persist_failed', {
        component: 'acceptOnboardingConsent',
        userId,
        message: error instanceof Error ? error.message : String(error),
      })
      return err(unauthorized('Falha ao registrar consentimento'))
    })

  if (!persist.ok) {
    return {
      ok: false,
      error: 'Não foi possível salvar seu consentimento. Tente novamente.',
    }
  }

  auditMutation({
    entity: 'consent',
    action: 'grant',
    actorId: userId,
    targetId: userId,
    meta: {
      documents: ['TERMS', 'PRIVACY'],
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      source: 'onboarding',
    },
  })

  redirect('/')
}
