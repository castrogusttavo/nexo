import { logger } from '@/lib/axiom/logger'

type AuditEntity =
  | 'user'
  | 'session'
  | 'workspace'
  | 'subscription'
  | 'incident'
  | 'status_check'
  | 'storage_object'
  | 'short_link'
  | 'consent'

type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'activate'
  | 'cancel'
  | 'upload'
  | 'aggregate'
  | 'prune'
  | 'grant'
  | 'revoke'

type AuditOutcome = 'success' | 'failure'

type AuditAuthEvent =
  | 'user.created'
  | 'user.email_verified'
  | 'user.deletion_canceled_on_login'
  | 'user.deletion_cancel_failed'
  | 'session.created'
  | 'session.revoked'
  | 'auth.email_otp.requested'
  | 'auth.email_otp.send_failed'
  | 'auth.2fa_otp.send_failed'
  | 'auth.welcome_email.send_failed'
  | 'auth.sign_in.success'
  | 'auth.sign_in.failure'
  | 'auth.sign_out'

interface AuditMutationInput {
  entity: AuditEntity
  action: AuditAction
  actorId: string | null
  targetId?: string | null
  outcome?: AuditOutcome
  reason?: string
  meta?: Record<string, unknown>
}

interface AuditAuthInput {
  event: AuditAuthEvent
  userId?: string | null
  outcome?: AuditOutcome
  reason?: string
  meta?: Record<string, unknown>
}

export function auditMutation(input: AuditMutationInput): void {
  const outcome = input.outcome ?? 'success'
  const fields = {
    category: 'audit',
    auditType: 'mutation',
    entity: input.entity,
    action: input.action,
    actorId: input.actorId,
    targetId: input.targetId ?? null,
    outcome,
    reason: input.reason,
    timestamp: new Date().toISOString(),
    ...(input.meta ?? {}),
  }
  if (outcome === 'failure') {
    logger.warn(`audit.mutation.${input.entity}.${input.action}`, fields)
  } else {
    logger.info(`audit.mutation.${input.entity}.${input.action}`, fields)
  }
}

export function auditAuth(input: AuditAuthInput): void {
  const outcome = input.outcome ?? 'success'
  const fields = {
    category: 'audit',
    auditType: 'auth',
    event: input.event,
    actorId: input.userId ?? null,
    outcome,
    reason: input.reason,
    timestamp: new Date().toISOString(),
    ...(input.meta ?? {}),
  }
  if (outcome === 'failure') {
    logger.warn(`audit.auth.${input.event}`, fields)
  } else {
    logger.info(`audit.auth.${input.event}`, fields)
  }
}
