import { z } from 'zod'

export const USER_EXPORT_SCHEMA_VERSION = '1' as const

const IsoDate = z.iso.datetime({ offset: true })

export const ExportProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
  deletionScheduledAt: IsoDate.nullable(),
  acceptedTermsAt: IsoDate.nullable(),
  acceptedPrivacyAt: IsoDate.nullable(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
})

export const ExportSessionSchema = z.object({
  id: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  expiresAt: IsoDate,
  createdAt: IsoDate,
  updatedAt: IsoDate,
})

export const ExportAccountSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  accountId: z.string(),
  scope: z.string().nullable(),
  accessTokenExpiresAt: IsoDate.nullable(),
  refreshTokenExpiresAt: IsoDate.nullable(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
})

export const ExportConsentSchema = z.object({
  id: z.string(),
  document: z.enum(['TERMS', 'PRIVACY', 'COOKIES']),
  version: z.string(),
  action: z.enum(['GRANTED', 'REVOKED']),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: IsoDate,
})

export const ExportAuditEntrySchema = z.looseObject({
  timestamp: IsoDate,
  auditType: z.enum(['mutation', 'auth']).optional(),
  entity: z.string().optional(),
  action: z.string().optional(),
  event: z.string().optional(),
  outcome: z.enum(['success', 'failure']).optional(),
  reason: z.string().optional(),
})

export const UserExportPayloadSchema = z.object({
  schemaVersion: z.literal(USER_EXPORT_SCHEMA_VERSION),
  exportedAt: IsoDate,
  profile: ExportProfileSchema,
  sessions: z.array(ExportSessionSchema),
  accounts: z.array(ExportAccountSchema),
  consents: z.array(ExportConsentSchema),
  auditLog: z.array(ExportAuditEntrySchema),
})

export type ExportProfile = z.infer<typeof ExportProfileSchema>
export type ExportSession = z.infer<typeof ExportSessionSchema>
export type ExportAccount = z.infer<typeof ExportAccountSchema>
export type ExportConsent = z.infer<typeof ExportConsentSchema>
export type ExportAuditEntry = z.infer<typeof ExportAuditEntrySchema>
export type UserExportPayload = z.infer<typeof UserExportPayloadSchema>
