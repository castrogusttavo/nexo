import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  userFindUniqueMock,
  sessionFindManyMock,
  accountFindManyMock,
  consentFindManyMock,
  axiomQueryMock,
  ensureBucketMock,
  putObjectMock,
  getPresignedDownloadUrlMock,
  sendExportEmailMock,
  auditMutationMock,
} = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  sessionFindManyMock: vi.fn(),
  accountFindManyMock: vi.fn(),
  consentFindManyMock: vi.fn(),
  axiomQueryMock: vi.fn(),
  ensureBucketMock: vi.fn(),
  putObjectMock: vi.fn(),
  getPresignedDownloadUrlMock: vi.fn(),
  sendExportEmailMock: vi.fn(),
  auditMutationMock: vi.fn(),
}))

vi.mock('@/src/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    session: { findMany: sessionFindManyMock },
    account: { findMany: accountFindManyMock },
    consentEvent: { findMany: consentFindManyMock },
  },
}))
vi.mock('@/lib/axiom/axiom', () => ({
  default: { query: axiomQueryMock },
}))
vi.mock('@/lib/axiom/audit', () => ({
  auditMutation: auditMutationMock,
}))
vi.mock('@/lib/axiom/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/env/env', () => ({
  NEXT_PUBLIC_AXIOM_DATASET: 'nexo-app-test',
}))
vi.mock('@/src/lib/storage/s3', () => ({
  ensureBucket: ensureBucketMock,
  putObject: putObjectMock,
  getPresignedDownloadUrl: getPresignedDownloadUrlMock,
}))
vi.mock('@/src/lib/mail/user/send-export-data', () => ({
  sendExportDataEmail: sendExportEmailMock,
}))

import {
  EXPORT_BUCKET,
  processDataExport,
  SIGNED_URL_TTL_SECONDS,
} from '@/src/lib/queue/processors/data-export'

function fakeJob(
  name: string,
  data: unknown,
  id: string | undefined = 'job-1',
): Job {
  return { id, name, data } as unknown as Job
}

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-05-19T12:00:00Z')
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: true,
    image: null,
    twoFactorEnabled: false,
    deletionScheduledAt: null,
    acceptedTermsAt: now,
    acceptedPrivacyAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('processDataExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionFindManyMock.mockResolvedValue([])
    accountFindManyMock.mockResolvedValue([])
    consentFindManyMock.mockResolvedValue([])
    axiomQueryMock.mockResolvedValue({ matches: [] })
    ensureBucketMock.mockResolvedValue(undefined)
    putObjectMock.mockResolvedValue(undefined)
    getPresignedDownloadUrlMock.mockResolvedValue(
      'https://minio.local/user-exports/user-1/job-1.json?sig=abc',
    )
    sendExportEmailMock.mockResolvedValue({ id: 'email-1' })
  })

  it('uploads JSON, signs URL, sends email and audits export_completed', async () => {
    userFindUniqueMock.mockResolvedValue(buildUser())

    const result = await processDataExport(
      fakeJob('export-user-data', { userId: 'user-1' }),
    )

    expect(result.exported).toBe(true)
    expect(typeof result.fileSize).toBe('number')

    expect(ensureBucketMock).toHaveBeenCalledWith(EXPORT_BUCKET)
    expect(putObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: EXPORT_BUCKET,
        key: 'user-1/job-1.json',
        contentType: 'application/json',
      }),
    )

    const uploadCall = putObjectMock.mock.calls[0][0]
    const uploaded = JSON.parse(uploadCall.body)
    expect(uploaded.schemaVersion).toBe('1')
    expect(uploaded.profile.id).toBe('user-1')
    // Defense-in-depth: no token fields should appear anywhere
    expect(uploadCall.body).not.toContain('"accessToken"')
    expect(uploadCall.body).not.toContain('"refreshToken"')
    expect(uploadCall.body).not.toContain('"token"')
    expect(uploadCall.body).not.toContain('"password"')

    expect(getPresignedDownloadUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: EXPORT_BUCKET,
        key: 'user-1/job-1.json',
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      }),
    )

    expect(sendExportEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        username: 'Test User',
        downloadUrl: expect.stringContaining('user-1/job-1.json'),
      }),
    )

    expect(auditMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'user',
        action: 'export_completed',
        actorId: 'user-1',
      }),
    )
  })

  it('strips session token and account tokens from the export', async () => {
    userFindUniqueMock.mockResolvedValue(buildUser())
    sessionFindManyMock.mockResolvedValue([
      {
        id: 'sess-1',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla',
        expiresAt: new Date('2026-06-01T00:00:00Z'),
        createdAt: new Date('2026-05-19T00:00:00Z'),
        updatedAt: new Date('2026-05-19T00:00:00Z'),
      },
    ])
    accountFindManyMock.mockResolvedValue([
      {
        id: 'acc-1',
        providerId: 'github',
        accountId: 'gh-12345',
        scope: 'read:user',
        accessTokenExpiresAt: new Date('2026-06-01T00:00:00Z'),
        refreshTokenExpiresAt: null,
        createdAt: new Date('2026-05-19T00:00:00Z'),
        updatedAt: new Date('2026-05-19T00:00:00Z'),
      },
    ])

    await processDataExport(fakeJob('export-user-data', { userId: 'user-1' }))

    expect(sessionFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ token: expect.anything() }),
      }),
    )
    expect(accountFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({
          accessToken: expect.anything(),
        }),
      }),
    )

    const uploadCall = putObjectMock.mock.calls[0][0]
    const uploaded = JSON.parse(uploadCall.body)
    expect(uploaded.sessions[0]).not.toHaveProperty('token')
    expect(uploaded.accounts[0]).not.toHaveProperty('accessToken')
    expect(uploaded.accounts[0]).not.toHaveProperty('refreshToken')
    expect(uploaded.accounts[0]).not.toHaveProperty('idToken')
    expect(uploaded.accounts[0]).not.toHaveProperty('password')
  })

  it('skips export when user no longer exists', async () => {
    userFindUniqueMock.mockResolvedValue(null)

    const result = await processDataExport(
      fakeJob('export-user-data', { userId: 'ghost' }),
    )

    expect(result.exported).toBe(false)
    expect(result.reason).toBe('user_missing')
    expect(putObjectMock).not.toHaveBeenCalled()
    expect(sendExportEmailMock).not.toHaveBeenCalled()
    expect(auditMutationMock).not.toHaveBeenCalled()
  })

  it('continues with empty auditLog when Axiom query fails', async () => {
    userFindUniqueMock.mockResolvedValue(buildUser())
    axiomQueryMock.mockRejectedValueOnce(new Error('axiom down'))

    const result = await processDataExport(
      fakeJob('export-user-data', { userId: 'user-1' }),
    )

    expect(result.exported).toBe(true)
    const uploadCall = putObjectMock.mock.calls[0][0]
    const uploaded = JSON.parse(uploadCall.body)
    expect(uploaded.auditLog).toEqual([])
  })

  it('does not fail the job when email send throws', async () => {
    userFindUniqueMock.mockResolvedValue(buildUser())
    sendExportEmailMock.mockRejectedValueOnce(new Error('resend boom'))

    const result = await processDataExport(
      fakeJob('export-user-data', { userId: 'user-1' }),
    )

    expect(result.exported).toBe(true)
    expect(auditMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'export_completed' }),
    )
  })

  it('throws on unknown job name', async () => {
    await expect(
      processDataExport(fakeJob('unknown', { userId: 'user-1' })),
    ).rejects.toThrow(/Unknown data-export job/)
  })

  it('rejects when upload to storage fails', async () => {
    userFindUniqueMock.mockResolvedValue(buildUser())
    putObjectMock.mockRejectedValueOnce(new Error('s3 down'))

    await expect(
      processDataExport(fakeJob('export-user-data', { userId: 'user-1' })),
    ).rejects.toThrow(/s3 down/)
    expect(sendExportEmailMock).not.toHaveBeenCalled()
    expect(auditMutationMock).not.toHaveBeenCalled()
  })
})
