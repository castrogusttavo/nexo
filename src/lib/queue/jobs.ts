export const QueueName = {
  DataRetention: 'data-retention',
  AccountLifecycle: 'account-lifecycle',
  DataExport: 'data-export',
  TrialLifecycle: 'trial-lifecycle',
} as const

export type QueueName = (typeof QueueName)[keyof typeof QueueName]

export const DataRetentionJob = {
  CleanupExpiredSessions: 'cleanup-expired-sessions',
  CleanupExpiredVerificationTokens: 'cleanup-expired-verification-tokens',
  ExpireStaleInvitations: 'expire-stale-invitations',
} as const

export type DataRetentionJob =
  (typeof DataRetentionJob)[keyof typeof DataRetentionJob]

export type DataRetentionJobPayload = {
  [DataRetentionJob.CleanupExpiredSessions]: Record<string, never>
  [DataRetentionJob.CleanupExpiredVerificationTokens]: Record<string, never>
  [DataRetentionJob.ExpireStaleInvitations]: Record<string, never>
}

export const AccountLifecycleJob = {
  DeleteAccount: 'delete-account',
} as const

export type AccountLifecycleJob =
  (typeof AccountLifecycleJob)[keyof typeof AccountLifecycleJob]

export type AccountLifecycleJobPayload = {
  [AccountLifecycleJob.DeleteAccount]: { userId: string }
}

export const DataExportJob = {
  ExportUserData: 'export-user-data',
} as const

export type DataExportJob = (typeof DataExportJob)[keyof typeof DataExportJob]

export type DataExportJobPayload = {
  [DataExportJob.ExportUserData]: { userId: string }
}

export const TrialLifecycleJob = {
  RevertExpiredTrials: 'revert-expired-trials',
} as const

export type TrialLifecycleJob =
  (typeof TrialLifecycleJob)[keyof typeof TrialLifecycleJob]

export type TrialLifecycleJobPayload = {
  [TrialLifecycleJob.RevertExpiredTrials]: Record<string, never>
}
