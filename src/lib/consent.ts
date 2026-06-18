import { auditAccess } from '@/lib/axiom/audit'
import { forbidden } from '../errors'
import { UserRepository } from '../repositories/user.repository'
import { err, ok, type Result } from './result'

export async function requireConsent(
  userId: string,
  resource: string,
): Promise<Result<true>> {
  const user = await UserRepository.findById(userId)
  const consented =
    user.ok && !!user.value.acceptedTermsAt && !!user.value.acceptedPrivacyAt

  if (!consented) {
    auditAccess({
      event: 'consent.gate.blocked',
      actorId: userId,
      resource,
      reason: user.ok ? 'CONSENT_MISSING' : 'USER_LOOKUP_FAILED',
    })
    return err(forbidden('Consentimento obrigatório'))
  }

  return ok(true as const)
}
