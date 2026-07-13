import { auditMutation } from '@/lib/axiom/audit'
import { COOKIES_VERSION } from '@/lib/legal/versions'
import { ok, type Result } from '@/src/lib/result'
import { ConsentRepository } from '@/src/repositories/consent.repository'

export interface CookieConsentContext {
  ipAddress: string | null
  userAgent: string | null
}

export const ConsentService = {
  async recordCookieConsent(
    actorId: string,
    accepted: boolean,
    context: CookieConsentContext,
  ): Promise<Result<{ accepted: boolean }>> {
    const action = accepted ? 'GRANTED' : 'REVOKED'

    const latest =
      await ConsentRepository.findLatestCookieConsentAction(actorId)
    if (latest.ok && latest.value === action) {
      return ok({ accepted })
    }

    const result = await ConsentRepository.recordCookieConsent({
      userId: actorId,
      version: COOKIES_VERSION,
      action,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'consent',
        action: accepted ? 'grant' : 'revoke',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: result.error.code,
        meta: {
          document: 'COOKIES',
          version: COOKIES_VERSION,
          source: 'banner',
        },
      })
      return result
    }

    auditMutation({
      entity: 'consent',
      action: accepted ? 'grant' : 'revoke',
      actorId,
      targetId: actorId,
      meta: { document: 'COOKIES', version: COOKIES_VERSION, source: 'banner' },
    })

    return ok({ accepted })
  },
}
