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
  | 'sticky_note'
  | 'consent'
  | 'project'
  | 'user_preference'
  | 'notification_setting'
  | 'invitation'

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
  | 'export_requested'
  | 'export_completed'
  | 'archive'
  | 'restore'
  | 'onboarding_step_completed'
  | 'onboarding_role_saved'
  | 'onboarding_goals_saved'
  | 'onboarding_profile_saved'
  | 'onboarding_step_reverted'
  | 'accept'

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
  | 'auth.reset_password.requested'
  | 'auth.reset_password.send_failed'
  | 'auth.reset_password.completed'
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

type AuditAccessEvent = 'consent.gate.blocked'

interface AuditAccessInput {
  event: AuditAccessEvent
  actorId: string | null
  resource: string
  reason: 'CONSENT_MISSING' | 'USER_LOOKUP_FAILED'
  meta?: Record<string, unknown>
}

export function auditAccess(input: AuditAccessInput): void {
  logger.warn(`audit.access.${input.event}`, {
    category: 'audit',
    auditType: 'access',
    event: input.event,
    actorId: input.actorId,
    resource: input.resource,
    reason: input.reason,
    timestamp: new Date().toISOString(),
    ...(input.meta ?? {}),
  })
}
