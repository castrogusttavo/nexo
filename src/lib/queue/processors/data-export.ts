import type { Job } from 'bullmq'
import { auditMutation } from '@/lib/axiom/audit'
import axiomClient from '@/lib/axiom/axiom'
import { logger } from '@/lib/axiom/logger'
import { NEXT_PUBLIC_AXIOM_DATASET } from '@/lib/env/env'
import { sendExportDataEmail } from '@/src/lib/mail/user/send-export-data'
import { prisma } from '@/src/lib/prisma'
import {
  ensureBucket,
  getPresignedDownloadUrl,
  putObject,
} from '@/src/lib/storage/s3'
import {
  type ExportAuditEntry,
  USER_EXPORT_SCHEMA_VERSION,
  type UserExportPayload,
  UserExportPayloadSchema,
} from '@/src/schemas/user-export.schema'
import { DataExportJob } from '../jobs'

export const EXPORT_BUCKET = 'user-exports'
export const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60
export const AUDIT_LOG_MAX_ENTRIES = 5000

interface ExportJobPayload {
  userId: string
}

interface ProcessorResult {
  exported: boolean
  reason?: string
  fileSize?: number
}

async function gatherPostgresData(userId: string): Promise<{
  profile: UserExportPayload['profile']
  sessions: UserExportPayload['sessions']
  accounts: UserExportPayload['accounts']
  consents: UserExportPayload['consents']
} | null> {
  const [user, sessions, accounts, consents] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        providerId: true,
        accountId: true,
        scope: true,
        accessTokenExpiresAt: true,
        refreshTokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.consentEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        document: true,
        version: true,
        action: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    }),
  ])

  if (!user) return null

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      twoFactorEnabled: user.twoFactorEnabled,
      deletionScheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
      acceptedTermsAt: user.acceptedTermsAt?.toISOString() ?? null,
      acceptedPrivacyAt: user.acceptedPrivacyAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      providerId: a.providerId,
      accountId: a.accountId,
      scope: a.scope,
      accessTokenExpiresAt: a.accessTokenExpiresAt?.toISOString() ?? null,
      refreshTokenExpiresAt: a.refreshTokenExpiresAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    consents: consents.map((c) => ({
      id: c.id,
      document: c.document,
      version: c.version,
      action: c.action,
      ipAddress: c.ipAddress,
      userAgent: c.userAgent,
      createdAt: c.createdAt.toISOString(),
    })),
  }
}

async function gatherAuditLog(userId: string): Promise<ExportAuditEntry[]> {
  const apl =
    `['${NEXT_PUBLIC_AXIOM_DATASET}']` +
    ` | where category == 'audit' and ['actorId'] == '${userId}'` +
    ' | sort by _time desc' +
    ` | limit ${AUDIT_LOG_MAX_ENTRIES}`

  try {
    const result = await axiomClient.query(apl)
    const matches = result.matches ?? []
    return matches.map((entry) => ({
      timestamp: entry._time,
      ...(entry.data as Record<string, unknown>),
    })) as ExportAuditEntry[]
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('queue.data_export.audit_query_failed', {
      component: 'Worker',
      userId,
      message,
    })
    return []
  }
}

const EXPIRES_AT_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

function formatExpiresAt(expiresAt: Date): string {
  return EXPIRES_AT_FORMATTER.format(expiresAt)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export async function processDataExport(
  job: Job<ExportJobPayload>,
): Promise<ProcessorResult> {
  if (job.name !== DataExportJob.ExportUserData) {
    throw new Error(
      `Unknown data-export job: ${job.name} (id=${job.id ?? 'unknown'})`,
    )
  }

  const { userId } = job.data
  const jobId = job.id ?? userId

  const data = await gatherPostgresData(userId)
  if (!data) {
    logger.warn('queue.data_export.user_missing', {
      component: 'Worker',
      jobId,
      userId,
    })
    return { exported: false, reason: 'user_missing' }
  }

  const auditLog = await gatherAuditLog(userId)

  const payload: UserExportPayload = UserExportPayloadSchema.parse({
    schemaVersion: USER_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: data.profile,
    sessions: data.sessions,
    accounts: data.accounts,
    consents: data.consents,
    auditLog,
  })

  const json = JSON.stringify(payload)
  const fileSizeBytes = Buffer.byteLength(json, 'utf-8')
  const key = `${userId}/${jobId}.json`

  await ensureBucket(EXPORT_BUCKET)
  await putObject({
    bucket: EXPORT_BUCKET,
    key,
    body: json,
    contentType: 'application/json',
  })

  const downloadUrl = await getPresignedDownloadUrl({
    bucket: EXPORT_BUCKET,
    key,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  })
  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000)

  try {
    await sendExportDataEmail({
      email: payload.profile.email,
      username: payload.profile.name,
      downloadUrl,
      expiresAt: formatExpiresAt(expiresAt),
      fileSize: formatFileSize(fileSizeBytes),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('queue.data_export.email_failed', {
      component: 'Worker',
      jobId,
      userId,
      message,
    })
  }

  auditMutation({
    entity: 'user',
    action: 'export_completed',
    actorId: userId,
    targetId: userId,
    meta: {
      jobId,
      fileSizeBytes,
      expiresAt: expiresAt.toISOString(),
    },
  })

  logger.info('queue.data_export.completed', {
    component: 'Worker',
    jobId,
    userId,
    fileSizeBytes,
  })

  return { exported: true, fileSize: fileSizeBytes }
}
